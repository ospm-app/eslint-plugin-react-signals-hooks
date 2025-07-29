/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

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

type MessageIds = "missingUseSignals";

type Severity = {
	missingUseSignals?: "error" | "warn" | "off";
};

type Option = {
	ignoreComponents?: Array<string>;
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error"; // Default to 'error' if no severity is specified
	}

	// eslint-disable-next-line security/detect-object-injection
	const severity = options.severity[messageId];

	// Default to 'error' if no severity is specified for this messageId
	return severity ?? "error";
}

function isSignalUsage(node: TSESTree.Node): boolean {
	if (node.type === "MemberExpression") {
		return (
			node.property.type === "Identifier" &&
			node.property.name === "value" &&
			node.object.type === "Identifier" &&
			node.object.name.endsWith("Signal")
		);
	}

	if (node.type === "Identifier") {
		return (
			node.name.endsWith("Signal") && node.parent.type !== "MemberExpression"
		);
	}

	return false;
}

let hasUseSignals = false;

let hasSignalUsage = false;

let componentName = "";
let componentNode: TSESTree.Node | null = null;

const ruleName = "require-use-signals";

export const requireUseSignalsRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "problem", // Changed from 'suggestion' to 'problem' as missing useSignals() can break reactivity
		docs: {
			description:
				"Ensures that components using signals properly import and call the `useSignals()` hook. This hook is essential for signal reactivity in React components. The rule helps prevent subtle bugs by ensuring that any component using signals has the necessary hook in place.",
			url: getRuleDocUrl(ruleName),
		},
		hasSuggestions: true,
		messages: {
			missingUseSignals:
				"Component '{{componentName}}' uses signals but is missing useSignals() hook",
		},
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					ignoreComponents: {
						type: "array",
						items: { type: "string" },
						description: "List of component names to ignore",
					},
					severity: {
						type: "object",
						properties: {
							missingUseSignals: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
						},
						additionalProperties: false,
					},
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
				},
			},
		],
		fixable: "code",
	},
	defaultOptions: [
		{
			ignoreComponents: [],
			performance: DEFAULT_PERFORMANCE_BUDGET,
		} satisfies Option,
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

		startPhase(perfKey, "ruleExecution");

		let nodeCount = 0;

		function shouldContinue(): boolean {
			nodeCount++;

			if (
				typeof option?.performance?.maxNodes === "number" &&
				nodeCount > option.performance.maxNodes
			) {
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

			FunctionDeclaration(node: TSESTree.FunctionDeclaration): void {
				if (typeof node.id?.name === "string" && /^[A-Z]/.test(node.id.name)) {
					componentName = node.id.name;

					componentNode = node;

					hasUseSignals = false;

					hasSignalUsage = false;
				}
			},

			ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
				if (
					node.parent.type === "VariableDeclarator" &&
					node.parent.id.type === "Identifier" &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					componentName = node.parent.id.name;

					componentNode = node;

					hasUseSignals = false;

					hasSignalUsage = false;
				}
			},

			CallExpression(node: TSESTree.CallExpression): void {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "useSignals"
				) {
					hasUseSignals = true;
				}
			},

			MemberExpression(node: TSESTree.MemberExpression): void {
				if (isSignalUsage(node)) {
					hasSignalUsage = true;
				}
			},

			Identifier(node: TSESTree.Identifier): void {
				if (isSignalUsage(node)) {
					hasSignalUsage = true;
				}
			},

			"Program:exit"(): void {
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

					if (
						hasSignalUsage &&
						!hasUseSignals &&
						componentName &&
						!new Set(context.options[0]?.ignoreComponents ?? []).has(
							componentName,
						) &&
						componentNode
					) {
						const severity = getSeverity("missingUseSignals", option);
						if (severity !== "off") {
							context.report({
								node: componentNode,
								messageId: "missingUseSignals",
								data: { componentName },
								fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
									const fixes: Array<TSESLint.RuleFix> = [];

									if (!componentNode) {
										return null;
									}

									const insertionPoint =
										(componentNode.type === "FunctionDeclaration" ||
											componentNode.type === "ArrowFunctionExpression") &&
										componentNode.body.type === "BlockStatement" &&
										componentNode.body.body.length > 0
											? componentNode.body.body[0]
											: null;

									if (
										insertionPoint !== null &&
										typeof insertionPoint !== "undefined"
									) {
										fixes.push(
											fixer.insertTextBefore(
												insertionPoint,
												"\tuseSignals();\n",
											),
										);
									}

									if (
										!context.sourceCode.ast.body
											.filter(
												(
													node: TSESTree.ProgramStatement,
												): node is TSESTree.ImportDeclaration => {
													return node.type === "ImportDeclaration";
												},
											)
											.some((node: TSESTree.ImportDeclaration): boolean => {
												return (
													node.source.value === "@preact/signals-react" &&
													node.specifiers.some(
														(s: TSESTree.ImportClause): boolean => {
															return (
																s.type === "ImportSpecifier" &&
																s.imported.type === "Identifier" &&
																s.imported.name === "useSignals"
															);
														},
													)
												);
											}) &&
										context.sourceCode.ast.body.length > 0
									) {
										const b = context.sourceCode.ast.body[0];

										if (!b) {
											return null;
										}

										fixes.push(
											fixer.insertTextBefore(
												b,
												"import { useSignals } from '@preact/signals-react';\n",
											),
										);
									}

									return fixes.length > 0 ? fixes : null;
								},
							});
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
