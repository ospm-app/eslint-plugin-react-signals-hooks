import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import type {
	RuleContext,
	SourceCode,
} from "@typescript-eslint/utils/ts-eslint";

import {
	endPhase,
	startPhase,
	recordMetric,
	stopTracking,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
	PerformanceLimitExceededError,
} from "./utils/performance.js";
import { getRuleDocUrl } from "./utils/urls.js";
import type { PerformanceBudget } from "./utils/types.js";
import { PerformanceOperations } from "./utils/performance-constants.js";

type Option = {
	performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
	| "preferComputedWithSignal"
	| "preferComputedWithSignals"
	| "suggestComputed"
	| "addComputedImport"
	| "suggestAddComputedImport"
	| "performanceLimitExceeded";

type SignalDependencyInfo = {
	signalName: string;
	isDirectAccess: boolean;
	node: TSESTree.Node;
};

function getOrCreateComputedImport(
	sourceCode: SourceCode,
	program: TSESTree.Program | null,
): TSESTree.ImportDeclaration | undefined {
	if (program === null) {
		program = sourceCode.ast;
	}

	return program.body.find((n): n is TSESTree.ImportDeclaration => {
		return (
			n.type === "ImportDeclaration" &&
			n.source.value === "@preact/signals-react"
		);
	});
}

function getSignalDependencyInfo(
	dep: TSESTree.Node | null,
): SignalDependencyInfo | null {
	if (dep === null) {
		return null;
	}

	// Check for signal.value
	if (
		dep.type === "MemberExpression" &&
		dep.property.type === "Identifier" &&
		dep.property.name === "value" &&
		dep.object.type === "Identifier" &&
		(dep.object.name.endsWith("Signal") || dep.object.name.endsWith("signal"))
	) {
		return {
			signalName: dep.object.name,
			isDirectAccess: false,
			node: dep,
		};
	}

	// Check for direct signal usage
	if (
		dep.type === "Identifier" &&
		(dep.name.endsWith("Signal") || dep.name.endsWith("signal"))
	) {
		return {
			signalName: dep.name,
			isDirectAccess: true,
			node: dep,
		};
	}

	return null;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
	return getRuleDocUrl(name);
});

let hasComputedImport = false;
let program: TSESTree.Program | null = null;
let performanceBudgetExceeded = false;

const ruleName = "prefer-computed";

export const preferComputedRule = createRule<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Encourages using `computed()` from @preact/signals-react instead of `useMemo` when working with signals. This provides better performance through automatic dependency tracking and more predictable reactivity behavior in React components.",
			url: getRuleDocUrl(ruleName),
		},
		fixable: "code",
		hasSuggestions: true,
		messages: {
			preferComputedWithSignal:
				'Prefer `computed()` over `useMemo` when using signal "{{ signalName }}" for better performance and automatic reactivity.',
			preferComputedWithSignals:
				"Prefer `computed()` over `useMemo` when using signals ({{ signalNames }}) for better performance and automatic reactivity.",
			suggestComputed: "Replace `useMemo` with `computed()`",
			addComputedImport: "Add `computed` import from @preact/signals-react",
			suggestAddComputedImport: "Add missing import for `computed`",
			performanceLimitExceeded:
				"Performance limit exceeded: {{message}}. Some checks may have been skipped.",
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
			option.performance,
			context,
		);

		if (option.performance.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		console.info(
			`${ruleName}: Initializing rule for file: ${context.filename}`,
		);
		console.info(`${ruleName}: Rule configuration:`, option);

		recordMetric(perfKey, "config", {
			performance: {
				enableMetrics: option.performance.enableMetrics,
				logMetrics: option.performance.logMetrics,
			},
		});

		trackOperation(perfKey, PerformanceOperations.ruleInit);

		endPhase(perfKey, "ruleInit");

		let nodeCount = 0;

		function shouldContinue(): boolean {
			nodeCount++;

			if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
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

			Program(node: TSESTree.Program): void {
				startPhase(perfKey, "program-analysis");

				try {
					program = node;

					hasComputedImport = program.body.some(
						(n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
							trackOperation(perfKey, PerformanceOperations.importCheck);

							return (
								n.type === "ImportDeclaration" &&
								n.source.value === "@preact/signals-react" &&
								n.specifiers.some((s: TSESTree.ImportClause): boolean => {
									return (
										s.type === "ImportSpecifier" &&
										"name" in s.imported &&
										s.imported.name === "computed"
									);
								})
							);
						},
					);

					endPhase(perfKey, "program-analysis");
				} catch (error: unknown) {
					if (error instanceof PerformanceLimitExceededError) {
						performanceBudgetExceeded = true;

						context.report({
							loc: { line: 1, column: 0 },
							messageId: "performanceLimitExceeded",
							data: {
								message: error.message,
								ruleName,
							},
						});
					} else {
						throw error; // Re-throw unexpected errors
					}
				}
			},

			CallExpression(node: TSESTree.CallExpression): void {
				if (performanceBudgetExceeded) {
					return;
				}

				// Track the number of useMemo calls analyzed
				recordMetric(perfKey, "useMemoCallsAnalyzed", 1);

				if (performanceBudgetExceeded) {
					return;
				}

				trackOperation(perfKey, PerformanceOperations.callExpressionCheck);

				// Track the depth of nested call expressions
				let depth = 0;

				let parent: TSESTree.Node | undefined = node.parent;

				while (parent) {
					if (parent.type === "CallExpression") depth++;

					parent = parent.parent;
				}

				// Track the maximum nested call depth
				recordMetric(perfKey, "currentCallDepth", depth);

				if (
					node.callee.type !== "Identifier" ||
					node.callee.name !== "useMemo" ||
					node.arguments.length < 2 ||
					node.arguments[1]?.type !== "ArrayExpression"
				) {
					return;
				}

				startPhase(perfKey, "signal-analysis");

				try {
					const signalDeps = [];

					for (const dep of node.arguments[1].elements) {
						trackOperation(perfKey, PerformanceOperations.dependencyCheck);

						const depInfo = getSignalDependencyInfo(dep);

						if (depInfo) {
							signalDeps.push(depInfo);
							recordMetric(
								perfKey,
								"totalSignalDependencies",
								signalDeps.length,
							);
						}
					}

					if (signalDeps.length === 0) {
						endPhase(perfKey, "signal-analysis");

						return;
					}

					recordMetric(perfKey, "useMemoCallsWithSignals", 1);

					const uniqueSignalNames = [
						...new Set(signalDeps.map((s) => s.signalName)),
					];

					const hasMultipleSignals = uniqueSignalNames.length > 1;

					recordMetric(
						perfKey,
						"uniqueSignalsPerUseMemo",
						uniqueSignalNames.length,
					);
					if (hasMultipleSignals) {
						recordMetric(perfKey, "useMemoWithMultipleSignals", 1);
					}

					const suggestionType = hasMultipleSignals
						? "multipleSignals"
						: "singleSignal";
					recordMetric(perfKey, `suggestions.${suggestionType}`, 1);

					trackOperation(perfKey, PerformanceOperations.reportGeneration);

					context.report({
						node,
						messageId: hasMultipleSignals
							? "preferComputedWithSignals"
							: "preferComputedWithSignal",
						data: {
							signalName: uniqueSignalNames[0],
							signalNames: uniqueSignalNames.join(", "),
						},
						suggest: [
							{
								messageId: "suggestComputed",
								*fix(
									fixer: TSESLint.RuleFixer,
								): Generator<TSESLint.RuleFix> | null {
									const callback = node.arguments[0];

									if (!callback) {
										return;
									}

									// Replace useMemo with computed
									yield fixer.replaceText(
										node,
										`computed(${context.sourceCode.getText(callback)})`,
									);

									// Don't add import if it already exists
									if (hasComputedImport) {
										return;
									}

									// Add suggestion to add import if not already present
									context.report({
										node,
										messageId: "suggestAddComputedImport",
										fix: (
											fixer: TSESLint.RuleFixer,
										): Array<TSESLint.RuleFix> | null => {
											const computedImport = getOrCreateComputedImport(
												context.getSourceCode(),
												program,
											);
											const hasComputedImport = !!computedImport;

											// Track computed import status
											recordMetric(
												perfKey,
												"computedImportStatus",
												hasComputedImport ? "present" : "missing",
											);

											if (computedImport) {
												// Check if 'computed' is already imported
												const hasComputed = computedImport.specifiers.some(
													(s: TSESTree.ImportClause): boolean => {
														return (
															s.type === "ImportSpecifier" &&
															"name" in s.imported &&
															s.imported.name === "computed"
														);
													},
												);

												if (hasComputed) {
													return null;
												}

												return [
													fixer.insertTextAfter(
														computedImport.specifiers[
															computedImport.specifiers.length - 1
														],
														", computed",
													),
												];
											}

											if (typeof program?.body[0] === "undefined") {
												return null;
											}
											// No existing import, add a new one at the top
											return [
												fixer.insertTextBefore(
													program.body[0],
													"import { computed } from '@preact/signals-react';\n",
												),
											];
										},
									});
								},
							},
						],
					});
				} catch (error: unknown) {
					if (error instanceof PerformanceLimitExceededError) {
						performanceBudgetExceeded = true;

						context.report({
							loc: { line: 1, column: 0 },
							messageId: "performanceLimitExceeded",
							data: {
								message: error.message,
								ruleName,
							},
						});
					} else {
						throw error; // Re-throw unexpected errors
					}
				}
			},

			// Clean up
			"Program:exit"(): void {
				startPhase(perfKey, "programExit");

				try {
					startPhase(perfKey, "recordMetrics");

					const finalMetrics = stopTracking(perfKey);

					if (finalMetrics) {
						console.info(
							`\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget ? "EXCEEDED" : "OK"}):`,
						);
						console.info(`  File: ${context.filename}`);
						console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
						console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

						if (finalMetrics.exceededBudget) {
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
