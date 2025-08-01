/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition } from "@typescript-eslint/scope-manager";
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
	AST_NODE_TYPES,
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
	PerformanceLimitExceededError,
} from "./utils/performance.js";
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

type Severity = {
	preferShowOverTernary?: "error" | "warn" | "off";
	suggestShowComponent?: "error" | "warn" | "off";
	addShowImport?: "error" | "warn" | "off";
	performanceLimitExceeded?: "error" | "warn" | "off";
};

type Option = {
	/** Minimum complexity score to trigger the rule */
	minComplexity?: number;
	/** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
	signalNames?: Array<string>;
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

type MessageIds =
	| "preferShowOverTernary"
	| "suggestShowComponent"
	| "addShowImport"
	| "performanceLimitExceeded";

function isJSXNode(node: TSESTree.Node): boolean {
	return (
		node.type === "JSXElement" ||
		node.type === "JSXFragment" ||
		(node.type === "ExpressionStatement" &&
			"expression" in node &&
			"type" in node.expression &&
			(node.expression.type === "JSXElement" ||
				node.expression.type === "JSXFragment"))
	);
}

function getComplexity(
	node: TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier,
	visited = new Set<
		TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier
	>(),
): number {
	if (visited.has(node)) {
		return 0;
	}

	visited.add(node);

	let complexity = 0;

	if (isJSXNode(node)) {
		complexity++;
	} else if ("type" in node && node.type === "CallExpression") {
		complexity++;
	} else if ("type" in node && node.type === "ConditionalExpression") {
		complexity += 2;
	}

	for (const key of [
		"body",
		"consequent",
		"alternate",
		"test",
		"left",
		"right",
		"argument",
		"callee",
		"arguments",
		"elements",
		"properties",
	] as const) {
		const value = node[key as keyof typeof node];

		if (typeof value !== "undefined") {
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item === "object" && "type" in item) {
						complexity += getComplexity(item, visited);
					}
				}
			} else if (typeof value === "object" && "type" in value) {
				complexity += getComplexity(value, visited);
			}
		}
	}

	visited.delete(node);

	return complexity;
}

let hasShowImport = false;

const signalVariables = new Set<string>();

const ruleName = "prefer-show-over-ternary";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error";
	}

	// eslint-disable-next-line security/detect-object-injection
	const severity = options.severity[messageId];
	return severity ?? "error";
}

export const preferShowOverTernaryRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		fixable: "code",
		hasSuggestions: true,
		docs: {
			description:
				"Prefer Show component over ternary for conditional rendering with signals",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			preferShowOverTernary:
				"Prefer using the `<Show>` component instead of ternary for better performance with signal conditions.",
			suggestShowComponent: "Replace ternary with `<Show>` component",
			addShowImport: "Add `Show` import from @preact/signals-react",
			performanceLimitExceeded: "Performance limit exceeded ",
		},
		schema: [
			{
				type: "object",
				properties: {
					minComplexity: {
						type: "number",
						minimum: 1,
						default: 2,
					},
					signalNames: {
						type: "array",
						items: { type: "string" },
						default: ["signal", "useSignal", "createSignal"],
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
					severity: {
						type: "object",
						properties: {
							preferShowOverTernary: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							suggestShowComponent: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							addShowImport: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							performanceLimitExceeded: {
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
			minComplexity: 2,
			signalNames: ["signal", "useSignal", "createSignal"],
			performance: DEFAULT_PERFORMANCE_BUDGET,
		},
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}${Date.now()}`;

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

		trackOperation(perfKey, PerformanceOperations.ruleInit);

		endPhase(perfKey, "ruleInit");

		hasShowImport = context.sourceCode.ast.body.some(
			(node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
				if (node.type !== "ImportDeclaration") {
					return false;
				}

				if (
					typeof node.source.value !== "string" ||
					node.source.value !== "@preact/signals-react"
				) {
					return false;
				}

				return node.specifiers.some((s: TSESTree.ImportClause): boolean => {
					return (
						s.type === "ImportSpecifier" &&
						"name" in s.imported &&
						s.imported.name === "Show"
					);
				});
			},
		);

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

				// Handle function declarations and variables
				if (
					node.type === AST_NODE_TYPES.FunctionDeclaration ||
					node.type === AST_NODE_TYPES.FunctionExpression ||
					node.type === AST_NODE_TYPES.ArrowFunctionExpression
				) {
					try {
						const scope = context.sourceCode.getScope(node);

						for (const variable of scope.variables) {
							if (
								variable.defs.some((def: Definition) => {
									trackOperation(perfKey, PerformanceOperations.signalCheck);
									return (
										"init" in def.node &&
										def.node.init?.type === AST_NODE_TYPES.CallExpression &&
										def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
										new Set(
											option?.signalNames ?? [
												"signal",
												"useSignal",
												"createSignal",
											],
										).has(def.node.init.callee.name)
									);
								})
							) {
								signalVariables.add(variable.name);
							}
						}
					} catch (error: unknown) {
						if (error instanceof PerformanceLimitExceededError) {
							const severity = getSeverity("performanceLimitExceeded", option);
							if (severity === "off") return;

							context.report({
								node,
								messageId: "performanceLimitExceeded",
								data: { message: error.message, ruleName },
							});
						} else {
							throw error;
						}
					}
				}
			},

			Program(node: TSESTree.Program): void {
				// Track node processing
				perf.trackNode(node);

				// Start analysis phase
				startPhase(perfKey, "importAnalysis");

				const hasJSX = node.body.some(
					(n: TSESTree.ProgramStatement): boolean => {
						return isJSXNode(n);
					},
				);

				if (!hasJSX) {
					endPhase(perfKey, "importAnalysis");
					return;
				}

				// Check if Show is already imported
				hasShowImport = node.body.some(
					(n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
						return (
							n.type === "ImportDeclaration" &&
							n.source.value === "@preact/signals-react" &&
							n.specifiers.some(
								(s) =>
									s.type === "ImportSpecifier" &&
									"name" in s.imported &&
									s.imported.name === "Show",
							)
						);
					},
				);

				endPhase(perfKey, "importAnalysis");
			},

			ConditionalExpression(node: TSESTree.ConditionalExpression): void {
				perf.trackNode(node);

				if (!("type" in node.parent) || !isJSXNode(node.parent)) {
					return;
				}

				// Check if the condition contains any signal variables
				const testText = context.sourceCode.getText(node.test);

				const containsSignal = [...signalVariables].some(
					(signal: string): boolean => {
						// eslint-disable-next-line security/detect-non-literal-regexp
						return new RegExp(`\\b${signal}\\b`).test(testText);
					},
				);

				// Skip if no signal variables are found in the condition
				if (!containsSignal) {
					return;
				}

				// Track conditional analysis
				trackOperation(perfKey, PerformanceOperations.conditionalAnalysis);

				const complexity = getComplexity(node);

				trackOperation(perfKey, PerformanceOperations.complexityAnalysis);

				if (
					typeof option?.minComplexity === "number" &&
					complexity >= option.minComplexity
				) {
					const severity = getSeverity("preferShowOverTernary", option);

					if (severity === "off") {
						return;
					}

					const suggestShowComponentSeverity = getSeverity(
						"suggestShowComponent",
						option,
					);
					const addShowImportSeverity = getSeverity("addShowImport", option);

					const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

					if (suggestShowComponentSeverity !== "off") {
						suggestions.push({
							messageId: "suggestShowComponent",
							*fix(
								fixer: TSESLint.RuleFixer,
							): Generator<TSESLint.RuleFix, void, unknown> {
								const consequentText = context.sourceCode.getText(
									node.consequent,
								);

								const alternateText = context.sourceCode.getText(
									node.alternate,
								);

								const fixText =
									alternateText === ""
										? `{/* @ts-expect-error Server Component */}
                        <Show when={${context.sourceCode.getText(node.test)}}>
                        {${consequentText}}
                        </Show>
                      `
										: `{/* @ts-expect-error Server Component */}
                        <Show when={${context.sourceCode.getText(node.test)}} fallback={${alternateText}}>
                        {${consequentText}}
                        </Show>`;

								yield fixer.replaceText(node, fixText);

								if (hasShowImport) {
									return;
								}
							},
						});
					}

					if (!hasShowImport && addShowImportSeverity !== "off") {
						suggestions.push({
							messageId: "addShowImport",
							fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
								const signalsImport = context.sourceCode.ast.body.find(
									(
										n: TSESTree.ProgramStatement,
									): n is TSESTree.ImportDeclaration => {
										return (
											n.type === "ImportDeclaration" &&
											n.source.value === "@preact/signals-react"
										);
									},
								);

								if (!signalsImport) {
									return null;
								}

								const last =
									signalsImport.specifiers[signalsImport.specifiers.length - 1];

								if (!last) {
									return null;
								}

								const b = context.sourceCode.ast.body[0];

								if (!b) {
									return null;
								}

								return [fixer.insertTextAfter(last, ", Show")];
							},
						});
					}

					context.report({
						node,
						messageId: "preferShowOverTernary",
						suggest: suggestions,
					});
				}
			},

			"Program:exit"(node: TSESTree.Node): void {
				startPhase(perfKey, "programExit");

				perf.trackNode(node);

				try {
					startPhase(perfKey, "recordMetrics");

					const finalMetrics = stopTracking(perfKey);

					if (finalMetrics) {
						console.info(
							`\n[prefer-batch-updates] Performance Metrics (${finalMetrics.exceededBudget === true ? "EXCEEDED" : "OK"}):`,
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
