/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import type {
	RuleContext,
	SuggestionReportDescriptor,
} from "@typescript-eslint/utils/ts-eslint";

import { PerformanceOperations } from "./utils/performance-constants.js";
import {
	endPhase,
	startPhase,
	recordMetric,
	stopTracking,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
} from "./utils/performance.js";
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

type Severity = {
	preferSignalEffect?: "error" | "warn" | "off";
	suggestEffect?: "error" | "warn" | "off";
	addEffectImport?: "error" | "warn" | "off";
};

type Option = {
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

type MessageIds = "preferSignalEffect" | "suggestEffect" | "addEffectImport";

function isSignalDependency(
	dep: TSESTree.Expression | TSESTree.SpreadElement | null,
): boolean {
	if (!dep || dep.type === "SpreadElement") {
		return false;
	}

	if (
		dep.type === "MemberExpression" &&
		dep.property.type === "Identifier" &&
		dep.property.name === "value" &&
		dep.object.type === "Identifier" &&
		dep.object.name.endsWith("Signal")
	) {
		return true;
	}

	if (dep.type === "Identifier" && dep.name.endsWith("Signal")) {
		return true;
	}

	return false;
}

const ruleName = "prefer-signal-effect";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return messageId === "addEffectImport" ? "warn" : "error";
	}

	// eslint-disable-next-line security/detect-object-injection
	const severity = options.severity[messageId];

	return severity ?? "error";
}

export const preferSignalEffectRule = ESLintUtils.RuleCreator(
	(name: string) => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "problem", // Changed from 'suggestion' to 'problem' as this helps prevent critical issues like infinite loops
		fixable: "code",
		hasSuggestions: true,
		docs: {
			description:
				"Encourages using `effect()` from @preact/signals instead of `useEffect` when working with signals. This provides better performance through automatic dependency tracking and more predictable reactivity behavior.",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			preferSignalEffect:
				"Prefer using `effect()` instead of `useEffect` for signal-only dependencies",
			suggestEffect: "Replace `useEffect` with `effect()`",
			addEffectImport: "Add `effect` import from @preact/signals",
		},
		schema: [
			{
				type: "object",
				properties: {
					performance: {
						type: "object",
						properties: {
							maxTime: { type: "number", minimum: 1 },
							maxMemory: { type: "number", minimum: 1 },
							maxNodes: { type: "number", minimum: 1 },
							enableMetrics: { type: "boolean" },
							logMetrics: { type: "boolean" },
							maxOperations: {
								type: "object",
								properties: Object.fromEntries(
									Object.entries(PerformanceOperations).map(([key]) => [
										key,
										{ type: "number", minimum: 1 },
									]),
								),
							},
						},
						additionalProperties: false,
					},
					severity: {
						type: "object",
						properties: {
							preferSignalEffect: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							suggestEffect: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							addEffectImport: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
						},
						additionalProperties: false,
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [
		{
			performance: DEFAULT_PERFORMANCE_BUDGET,
		},
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		startPhase(perfKey, "ruleInit");

		const perf = createPerformanceTracker<Options>(
			perfKey,
			option?.performance,
			context,
		);

		if (option?.performance?.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		console.info(
			`${ruleName}: Initializing rule for file: ${context.filename}`,
		);
		console.info(`${ruleName}: Rule configuration:`, option);

		recordMetric(perfKey, "config", {
			performance: {
				enableMetrics: option?.performance?.enableMetrics,
				logMetrics: option?.performance?.logMetrics,
			},
		});

		trackOperation(perfKey, PerformanceOperations.ruleInit);

		endPhase(perfKey, "ruleInit");

		let nodeCount = 0;

		function shouldContinue(): boolean {
			nodeCount++;

			if (nodeCount > (option?.performance?.maxNodes ?? 2_000)) {
				trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

				return false;
			}

			return true;
		}

		startPhase(perfKey, "ruleExecution");

		return {
			"*": (node: TSESTree.Node): void => {
				if (!shouldContinue()) {
					endPhase(perfKey, "recordMetrics");

					stopTracking(perfKey);

					return;
				}

				perf.trackNode(node);

				trackOperation(
					perfKey,
					PerformanceOperations[`${node.type}Processing`],
				);
			},

			CallExpression(node: TSESTree.CallExpression): void {
				// Check if this is a useEffect call
				if (
					node.callee.type !== "Identifier" ||
					node.callee.name !== "useEffect" ||
					node.arguments.length < 2 ||
					node.arguments[1]?.type !== "ArrayExpression"
				) {
					return;
				}

				if (
					!(
						node.arguments[1].elements.length > 0 &&
						node.arguments[1].elements.every(isSignalDependency)
					)
				) {
					return;
				}

				const hasEffectImport = context.sourceCode.ast.body.some(
					(node): node is TSESTree.ImportDeclaration => {
						return (
							node.type === "ImportDeclaration" &&
							node.source.value === "@preact/signals" &&
							node.specifiers.some((s: TSESTree.ImportClause): boolean => {
								return (
									s.type === "ImportSpecifier" &&
									"name" in s.imported &&
									s.imported.name === "effect"
								);
							})
						);
					},
				);

				// Report the issue
				const severity = getSeverity("preferSignalEffect", option);

				if (severity === "off") {
					return;
				}

				context.report({
					node,
					messageId: "preferSignalEffect",
					fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
						const fixes = [];

						// Replace useEffect with effect()
						const [callback] = node.arguments;

						fixes.push(
							fixer.replaceText(
								node,
								`effect(() => ${context.sourceCode.getText(callback as TSESTree.Node)})`,
							),
						);

						// Add effect import if needed
						if (!hasEffectImport) {
							const effectImport =
								"import { effect } from '@preact/signals';\n";

							const firstImport = context.sourceCode.ast.body.find(
								(n): n is TSESTree.ImportDeclaration => {
									return n.type === "ImportDeclaration";
								},
							);

							if (firstImport) {
								fixes.push(fixer.insertTextBefore(firstImport, effectImport));
							} else {
								const b = context.sourceCode.ast.body[0];

								if (!b) {
									return null;
								}

								fixes.push(fixer.insertTextBefore(b, effectImport));
							}
						}

						return fixes;
					},
					suggest: [
						{
							messageId: "suggestEffect",
							fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
								const fixes: Array<TSESLint.RuleFix> = [];

								// Replace useEffect with effect()
								const [callback] = node.arguments;

								fixes.push(
									fixer.replaceText(
										node,
										`effect(() => ${context.sourceCode.getText(callback as TSESTree.Node)})`,
									),
								);

								// Add effect import if needed
								if (!hasEffectImport) {
									const effectImport =
										"import { effect } from '@preact/signals';\n";

									const firstImport = context.sourceCode.ast.body.find(
										(
											n: TSESTree.ProgramStatement,
										): n is TSESTree.ImportDeclaration => {
											return n.type === "ImportDeclaration";
										},
									);

									if (firstImport) {
										fixes.push(
											fixer.insertTextBefore(firstImport, effectImport),
										);
									} else {
										const b = context.sourceCode.ast.body[0];

										if (!b) {
											return null;
										}

										fixes.push(fixer.insertTextBefore(b, effectImport));
									}
								}

								return fixes;
							},
						},
						...(hasEffectImport
							? []
							: ([
									{
										messageId: "addEffectImport",
										fix(
											fixer: TSESLint.RuleFixer,
										): Array<TSESLint.RuleFix> | null {
											const signalsImport = context.sourceCode.ast.body.find(
												(
													n: TSESTree.ProgramStatement,
												): n is TSESTree.ImportDeclaration => {
													return (
														n.type === "ImportDeclaration" &&
														n.source.value === "@preact/signals"
													);
												},
											);

											if (signalsImport) {
												const last =
													signalsImport.specifiers[
														signalsImport.specifiers.length - 1
													];

												if (!last) {
													return null;
												}

												return [fixer.insertTextAfter(last, ", effect")];
											}

											const b = context.sourceCode.ast.body[0];

											if (!b) {
												return null;
											}

											return [
												fixer.insertTextBefore(
													b,
													"import { effect } from '@preact/signals';\n",
												),
											];
										},
									} satisfies SuggestionReportDescriptor<MessageIds>,
								] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
					],
				});
			},

			// Clean up
			"Program:exit"(): void {
				startPhase(perfKey, "programExit");

				try {
					startPhase(perfKey, "recordMetrics");

					const finalMetrics = stopTracking(perfKey);

					if (finalMetrics) {
						console.info(
							`\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget === true ? "EXCEEDED" : "OK"}):`,
						);
						console.info(`  File: ${context.filename}`);
						console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
						console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

						if (finalMetrics.exceededBudget === true) {
							console.warn("\n⚠️  Performance budget exceeded!");
						}
					}
				} catch (error: unknown) {
					console.error("Error recording metrics:", error);
				} finally {
					endPhase(perfKey, "recordMetrics");

					stopTracking(perfKey);
				}

				perf["Program:exit"]();

				endPhase(perfKey, "programExit");
			},
		};
	},
});
