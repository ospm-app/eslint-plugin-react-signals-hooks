/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition } from "@typescript-eslint/scope-manager";
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
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
	PerformanceLimitExceededError,
} from "./utils/performance.js";
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error"; // Default to 'error' if no severity is specified
	}

	// Handle performance limit exceeded as a special case
	if (messageId === "performanceLimitExceeded") {
		return "warn"; // Default to 'warn' for performance issues
	}

	// Handle specific message IDs with their corresponding severity settings
	switch (messageId) {
		case "avoidSignalAssignmentInEffect":
			return options.severity.signalAssignmentInEffect ?? "error";
		case "avoidSignalAssignmentInLayoutEffect":
			return options.severity.signalAssignmentInLayoutEffect ?? "error";
		default:
			// Default to 'error' for any other message IDs
			return "error";
	}
}

type Severity = {
	signalAssignmentInEffect?: "error" | "warn" | "off";
	signalAssignmentInLayoutEffect?: "error" | "warn" | "off";
};

type Option = {
	/** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
	signalNames?: Array<string>;
	/** Patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
	allowedPatterns?: Array<string>;
	/** Custom severity levels for different violation types */
	severity?: Severity;
	/** Performance tuning options */
	performance?: PerformanceBudget;
};

type Options = [Option?];

type MessageIds =
	| "avoidSignalAssignmentInEffect"
	| "suggestUseSignalsEffect"
	| "suggestUseSignalsLayoutEffect"
	| "performanceLimitExceeded"
	| "missingDependencies"
	| "unnecessaryDependencies"
	| "duplicateDependencies"
	| "avoidSignalAssignmentInLayoutEffect";

type Effect = {
	isEffect: boolean;
	isLayoutEffect: boolean;
	signalAssignments: Array<TSESTree.MemberExpression>;
	node: TSESTree.CallExpression;
};

function isSignalAssignment(
	node: TSESTree.Node,
	signalNames: Array<string>,
	perfKey: string,
	signalNameCache: Map<string, boolean>,
	signalVariables: Set<string>,
): node is TSESTree.MemberExpression {
	if (node.type !== AST_NODE_TYPES.MemberExpression) {
		return false;
	}

	try {
		trackOperation(perfKey, PerformanceOperations.signalCheck);

		// Check if this is a property access like `something.value`
		if (
			!node.computed &&
			node.property.type === AST_NODE_TYPES.Identifier &&
			node.property.name === "value" &&
			node.object.type === AST_NODE_TYPES.Identifier
		) {
			const object = node.object;
			const cacheKey = `${object.name}:${signalNames.join(",")}`;

			// Check if we've already identified this as a signal variable
			if (signalVariables.has(object.name)) {
				return true;
			}

			// Check cache next
			if (signalNameCache.has(cacheKey)) {
				const cached = signalNameCache.get(cacheKey) ?? false;

				if (cached) {
					signalVariables.add(object.name);
				}

				return cached;
			}

			// Check if the variable name matches any signal names
			const isSignal = signalNames.some((name: string): boolean => {
				return object.name.endsWith(name);
			});

			signalNameCache.set(cacheKey, isSignal);

			if (isSignal) {
				signalVariables.add(object.name);
			}

			return isSignal;
		}

		return false;
	} catch (error: unknown) {
		if (error instanceof PerformanceLimitExceededError) {
			throw error; // Re-throw to be handled by the caller
		}

		// For other errors, assume it's not a signal assignment
		return false;
	}
}

function isEffectHook(
	node: TSESTree.CallExpression,
	perfKey: string,
): { isEffect: boolean; isLayoutEffect: boolean } | null {
	try {
		trackOperation(perfKey, PerformanceOperations.hookCheck);

		// Must be an identifier (not a member expression)
		if (node.callee.type !== AST_NODE_TYPES.Identifier) {
			return null;
		}

		// Check if this is one of our target effect hooks
		if (["useEffect", "useLayoutEffect"].includes(node.callee.name)) {
			return {
				isEffect: true,
				isLayoutEffect: node.callee.name === "useLayoutEffect",
			};
		}

		return null;
	} catch (error: unknown) {
		if (error instanceof PerformanceLimitExceededError) {
			throw error; // Re-throw to be handled by the caller
		}

		// For other errors, assume it's not an effect hook
		return null;
	}
}

function visitNode(
	node: TSESTree.Node,
	effectStack: Array<Effect>,
	signalNames: Array<string>,
	signalNameCache: Map<string, boolean>,
	signalVariables: Set<string>,
	perfKey: string,
): void {
	// Track variable declarations that might be signals
	if (
		node.type === AST_NODE_TYPES.VariableDeclarator &&
		node.init?.type === AST_NODE_TYPES.CallExpression &&
		node.init.callee.type === AST_NODE_TYPES.Identifier &&
		signalNames.some((name: string): boolean => {
			return (
				node.init !== null &&
				"callee" in node.init &&
				"name" in node.init.callee &&
				node.init.callee.name.endsWith(name)
			);
		}) &&
		node.id.type === AST_NODE_TYPES.Identifier
	) {
		signalVariables.add(node.id.name);
	}

	if (effectStack.length === 0) {
		return;
	}

	try {
		trackOperation(perfKey, PerformanceOperations.nodeProcessing);

		// Check for signal assignments
		if (
			node.type === "AssignmentExpression" &&
			node.operator === "=" &&
			isSignalAssignment(
				node.left,
				signalNames,
				perfKey,
				signalNameCache,
				signalVariables,
			)
		) {
			const currentEffect = effectStack[effectStack.length - 1];

			if (currentEffect) {
				currentEffect.signalAssignments.push(node.left);
			}

			return; // No need to visit children of an assignment
		}

		// Only process object values that might contain AST nodes
		if (typeof node !== "object") {
			return;
		}

		// Process child nodes, skipping known non-node properties
		for (const key in node) {
			if (
				key === "parent" ||
				key === "range" ||
				key === "loc" ||
				key === "comments"
			) {
				continue;
			}

			const value = node[key as "parent" | "loc" | "range" | "type"];

			// Array.isArray produces incorrect item type number, which down the line converts to never
			if (Array.isArray(value)) {
				for (const item of value) {
					if (typeof item === "object" && "type" in item) {
						visitNode(
							item as TSESTree.Node,
							effectStack,
							signalNames,
							signalNameCache,
							signalVariables,
							perfKey,
						);
					}
				}
			} else if (typeof value === "object" && "type" in value) {
				visitNode(
					value as TSESTree.Node,
					effectStack,
					signalNames,
					signalNameCache,
					signalVariables,
					perfKey,
				);
			}
		}
	} catch (error: unknown) {
		if (error instanceof PerformanceLimitExceededError) {
			throw error; // Re-throw to be handled by the caller
		}
		// For other errors, assume it's not an effect hook
		return;
	}
}

const effectStack: Array<Effect> = [];
const signalVariables = new Set<string>();
const patternCache = new Map<string, RegExp>();
const signalNameCache = new Map<string, boolean>();

const ruleName = "no-signal-assignment-in-effect";

export const noSignalAssignmentInEffectRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "problem",
		fixable: "code",
		hasSuggestions: true,
		docs: {
			description:
				"Prevent direct signal assignments in useEffect and useLayoutEffect",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			avoidSignalAssignmentInEffect:
				"Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode. Use useSignalsEffect instead.",
			avoidSignalAssignmentInLayoutEffect:
				"Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode. Use useSignalsLayoutEffect instead.",
			suggestUseSignalsEffect: "Use useSignalsEffect for signal assignments",
			suggestUseSignalsLayoutEffect:
				"Use useSignalsLayoutEffect for signal assignments in layout effects",
			performanceLimitExceeded:
				"Performance limit exceeded: {{message}}. Some checks may have been skipped.",
			missingDependencies: "Missing dependencies: {{dependencies}}",
			unnecessaryDependencies: "Unnecessary dependencies: {{dependencies}}",
			duplicateDependencies: "Duplicate dependencies: {{dependencies}}",
		},
		schema: [
			{
				type: "object",
				properties: {
					signalNames: {
						type: "array",
						items: { type: "string" },
						default: ["signal", "useSignal", "createSignal"],
						description: "Custom signal function names to check",
					},
					allowedPatterns: {
						type: "array",
						items: { type: "string" },
						default: [],
						description: "File patterns where signal assignments are allowed",
					},
					severity: {
						type: "object",
						properties: {
							signalAssignmentInEffect: {
								type: "string",
								enum: ["off", "warn", "error"],
								default: "error",
								description: "Severity for signal assignments in useEffect",
							},
							signalAssignmentInLayoutEffect: {
								type: "string",
								enum: ["off", "warn", "error"],
								default: "error",
								description:
									"Severity for signal assignments in useLayoutEffect",
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
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [
		{
			signalNames: ["signal", "useSignal", "createSignal"],
			allowedPatterns: [],
			severity: {
				signalAssignmentInEffect: "error",
				signalAssignmentInLayoutEffect: "error",
			},
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

			if (nodeCount > (option?.performance?.maxNodes ?? 2000)) {
				trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

				return false;
			}

			return true;
		}

		startPhase(perfKey, "fileAnalysis");

		if ((option?.allowedPatterns?.length ?? 0) > 0) {
			const fileMatchesPattern = option?.allowedPatterns?.some(
				(pattern: string): boolean => {
					if (patternCache.has(pattern)) {
						return patternCache.get(pattern)?.test(context.filename) ?? false;
					}

					try {
						// User defined value
						// eslint-disable-next-line security/detect-non-literal-regexp
						const regex = new RegExp(pattern);

						patternCache.set(pattern, regex);

						return regex.test(context.filename);
					} catch (error: unknown) {
						if (error instanceof Error) {
							console.error(
								`Invalid regex pattern: ${pattern}. Error: ${error.message}`,
							);
						} else if (typeof error === "string") {
							console.error(
								`Invalid regex pattern: ${pattern}. Error: ${error}`,
							);
						} else {
							console.error(
								`Invalid regex pattern: ${pattern}. Error: ${JSON.stringify(error)}`,
							);
						}

						return false;
					}
				},
			);

			if (fileMatchesPattern === true) {
				return {};
			}
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
								variable.defs.some((def: Definition): boolean => {
									trackOperation(perfKey, PerformanceOperations.signalCheck);

									return (
										"init" in def.node &&
										def.node.init?.type === AST_NODE_TYPES.CallExpression &&
										def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
										option?.signalNames?.includes(def.node.init.callee.name) ===
											true
									);
								}) === true
							) {
								signalVariables.add(variable.name);
							}
						}
					} catch (error: unknown) {
						if (error instanceof PerformanceLimitExceededError) {
							const messageId = "performanceLimitExceeded";

							const severity = getSeverity(messageId, option);

							if (severity !== "off") {
								context.report({
									node,
									messageId,
									data: { message: error.message, ruleName },
								});
							}
						} else {
							throw error;
						}
					}
				}
			},

			// Track effect hooks
			CallExpression(node: TSESTree.CallExpression): void {
				if (!shouldContinue()) {
					return;
				}

				try {
					trackOperation(perfKey, PerformanceOperations.hookCheck);
					const effectInfo = isEffectHook(node, perfKey);

					if (!effectInfo) {
						return;
					}

					// Push new effect context
					effectStack.push({
						isEffect: effectInfo.isEffect,
						isLayoutEffect: effectInfo.isLayoutEffect,
						signalAssignments: [],
						node,
					});

					// Check for signal assignments in the effect callback
					if (node.arguments.length > 0) {
						if (
							node.arguments[0]?.type ===
								AST_NODE_TYPES.ArrowFunctionExpression ||
							node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression
						) {
							if (
								node.arguments[0].body.type === AST_NODE_TYPES.BlockStatement
							) {
								// Process block statement body
								for (const statement of node.arguments[0].body.body) {
									if (
										typeof option?.signalNames !== "undefined" &&
										statement.type === AST_NODE_TYPES.ExpressionStatement
									) {
										visitNode(
											statement.expression,
											effectStack,
											option.signalNames,
											signalNameCache,
											signalVariables,
											perfKey,
										);
									}
								}
							} else if (
								typeof option?.signalNames !== "undefined" &&
								node.arguments[0].body.type === AST_NODE_TYPES.CallExpression
							) {
								// Handle direct function call in arrow function
								visitNode(
									node.arguments[0].body,
									effectStack,
									option.signalNames,
									signalNameCache,
									signalVariables,
									perfKey,
								);
							}
						}
					}
				} catch (error: unknown) {
					if (error instanceof PerformanceLimitExceededError) {
						context.report({
							node,
							messageId: "performanceLimitExceeded",
							data: { message: error.message, ruleName },
						});
					} else {
						throw error;
					}
				}
			},

			// Track signal assignments
			AssignmentExpression(node: TSESTree.AssignmentExpression): void {
				if (!shouldContinue() || effectStack.length === 0) {
					return;
				}

				try {
					trackOperation(perfKey, PerformanceOperations.signalAccess);

					if (
						option?.signalNames &&
						node.left.type === AST_NODE_TYPES.MemberExpression
					) {
						const isSignal = isSignalAssignment(
							node.left,
							option.signalNames,
							perfKey,
							signalNameCache,
							signalVariables,
						);

						if (isSignal) {
							effectStack[effectStack.length - 1]?.signalAssignments.push(
								node.left,
							);
						}
					}
				} catch (error: unknown) {
					if (error instanceof PerformanceLimitExceededError) {
						context.report({
							node,
							messageId: "performanceLimitExceeded",
							data: { message: error.message, ruleName },
						});
					} else {
						throw error;
					}
				}
			},

			// Track signal value access
			MemberExpression(node: TSESTree.MemberExpression): void {
				if (!shouldContinue() || effectStack.length === 0) {
					return;
				}

				try {
					trackOperation(perfKey, PerformanceOperations.signalAccess);

					if (
						typeof option?.signalNames !== "undefined" &&
						isSignalAssignment(
							node,
							option.signalNames,
							perfKey,
							signalNameCache,
							signalVariables,
						)
					) {
						effectStack[effectStack.length - 1]?.signalAssignments.push(node);
					}
				} catch (error: unknown) {
					if (error instanceof PerformanceLimitExceededError) {
						context.report({
							node,
							messageId: "performanceLimitExceeded",
							data: { message: error.message, ruleName },
						});
					} else {
						throw error;
					}
				}
			},

			"CallExpression > :not(CallExpression)"(
				node: TSESTree.CallExpression,
			): void {
				if (!shouldContinue() || effectStack.length === 0) {
					return;
				}

				if (!isEffectHook(node, perfKey)) {
					return;
				}

				const currentEffect = effectStack[effectStack.length - 1];

				if (currentEffect?.node !== node) {
					return;
				}

				if (currentEffect.signalAssignments.length > 0) {
					const suggest: Array<{
						messageId: MessageIds;
						fix: (fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null;
					}> = [];

					if (currentEffect.isLayoutEffect) {
						suggest.push({
							messageId: "suggestUseSignalsLayoutEffect",
							fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
								const callback = node.arguments[0];

								if (
									!callback ||
									(callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
										callback.type !== AST_NODE_TYPES.FunctionExpression)
								) {
									return null;
								}

								// if (!callback.body) {
								//   return null;
								// }

								// Get the range of the effect callback body
								const [start] = callback.body.range;

								const [end] = node.arguments[1]?.range ?? node.range;

								return fixer.replaceTextRange(
									[node.range[0], node.range[1]],
									`useSignalsLayoutEffect(() => ${context.sourceCode.text.slice(start, end).trim()})`,
								);
							},
						});
					} else {
						suggest.push({
							messageId: "suggestUseSignalsEffect",
							fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
								const callback = node.arguments[0];

								if (
									!callback ||
									(callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
										callback.type !== AST_NODE_TYPES.FunctionExpression)
								) {
									return null;
								}

								// if (!callback.body) {
								//   return null;
								// }

								// Get the range of the effect callback body
								const [start] = callback.body.range;

								const [end] = node.arguments[1]?.range ?? node.range;

								return fixer.replaceTextRange(
									[node.range[0], node.range[1]],
									`useSignals(() => ${context.sourceCode.text.slice(start, end).trim()})`,
								);
							},
						});
					}

					const messageId = currentEffect.isLayoutEffect
						? "avoidSignalAssignmentInLayoutEffect"
						: ("avoidSignalAssignmentInEffect" as const);
					const severity = getSeverity(messageId, option);
					if (severity !== "off") {
						context.report({
							node,
							messageId,
							suggest,
							data: {
								hookName: currentEffect.isLayoutEffect
									? "useLayoutEffect"
									: "useEffect",
								signalNames: currentEffect.signalAssignments
									.map((assign: TSESTree.MemberExpression): string => {
										if (assign.object.type === AST_NODE_TYPES.Identifier) {
											return assign.object.name;
										}

										return context.getSourceCode().getText(assign.object);
									})
									.join(", "),
							},
						});
					}
				}

				effectStack.pop();
			},

			"Program:exit"(node: TSESTree.Program): void {
				if (!shouldContinue()) {
					return;
				}

				startPhase(perfKey, "programExit");

				perf.trackNode(node);

				try {
					startPhase(perfKey, "recordMetrics");

					const finalMetrics = stopTracking(perfKey);

					if (typeof finalMetrics !== "undefined") {
						console.info(
							`\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget === true ? "EXCEEDED" : "OK"}):`,
						);
						console.info(`  File: ${context.filename}`);
						console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
						console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

						if (finalMetrics.exceededBudget === true) {
							const messageId = "performanceLimitExceeded" as const;

							const severity = getSeverity(messageId, option);

							if (severity !== "off") {
								context.report({
									node,
									messageId,
									data: {
										message: "Performance budget exceeded",
										ruleName,
									},
								});
							}
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
