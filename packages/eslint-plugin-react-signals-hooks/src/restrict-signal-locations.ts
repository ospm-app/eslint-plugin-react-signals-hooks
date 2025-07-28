import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

import {
	endPhase,
	startPhase,
	stopTracking,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
	recordMetric,
} from "./utils/performance.js";
import { getRuleDocUrl } from "./utils/urls.js";
import type { PerformanceBudget } from "./utils/types.js";
import { PerformanceOperations } from "./utils/performance-constants.js";

type Option = {
	allowedDirs: string[];
	allowComputedInComponents: boolean;
	customHookPattern: string;
	performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
	| "signalInComponent"
	| "computedInComponent"
	| "exportedSignal";

type ComponentStackItem = {
	isComponent: boolean;
	isHook: boolean;
	node: TSESTree.Node;
};

// Track if we're in a component or hook
const componentStack: Array<ComponentStackItem> = [];

// Create rule with performance tracking
const createRule = ESLintUtils.RuleCreator((name: string): string => {
	return getRuleDocUrl(name);
});

const ruleName = "restrict-signal-locations";

export const restrictSignalLocations = createRule<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Enforces best practices for signal creation by restricting where signals can be created. Signals should typically be created at the module level or within custom hooks, not inside component bodies. This helps prevent performance issues and unexpected behavior in React components.",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			signalInComponent:
				"Avoid creating signals in component bodies. Move to module level or a custom hook.",
			computedInComponent:
				"Avoid creating computed values in component bodies. Consider using useMemo instead.",
			exportedSignal:
				"Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. Use @biomejs/biome for circular imports diagnostic.",
		},
		hasSuggestions: true,
		schema: [
			{
				type: "object",
				properties: {
					allowedDirs: {
						type: "array",
						items: { type: "string" },
						default: [],
					},
					allowComputedInComponents: {
						type: "boolean",
						default: false,
					},
					customHookPattern: {
						type: "string",
						default: "^use[A-Z]",
					},
					performance: {
						type: "object",
						properties: {
							maxNodeCount: { type: "number" },
							maxNodeCountPerRun: { type: "number" },
							maxFixCount: { type: "number" },
							maxFixCountPerRun: { type: "number" },
							maxFixIterations: { type: "number" },
							maxFixTimeMs: { type: "number" },
							maxTotalTimeMs: { type: "number" },
							enableMetrics: { type: "boolean" },
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
			allowedDirs: [],
			allowComputedInComponents: false,
			customHookPattern: "^use[A-Z]",
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

			if (nodeCount > (option.performance?.maxNodes ?? 2_000)) {
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

			FunctionDeclaration(node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						"id" in node &&
						node.id !== null &&
						node.id.type === "Identifier" &&
						/^[A-Z]/.test(node.id.name),
					isHook:
						("id" in node &&
							node.id !== null &&
							"id" in node &&
							node.id &&
							"name" in node.id) ||
						"name" in node
							? new RegExp(option.customHookPattern).test(
									"id" in node && node.id && "name" in node.id
										? node.id.name
										: node.type,
								)
							: false,
					node,
				});
			},
			"FunctionDeclaration:exit"(): void {
				componentStack.pop();
			},

			ArrowFunctionExpression(node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						"id" in node &&
						node.id !== null &&
						node.id.type === "Identifier" &&
						/^[A-Z]/.test(node.id.name),
					isHook:
						("id" in node &&
							node.id !== null &&
							"id" in node &&
							node.id &&
							"name" in node.id) ||
						"name" in node
							? new RegExp(option.customHookPattern).test(
									"id" in node && node.id && "name" in node.id
										? node.id.name
										: node.type,
								)
							: false,
					node,
				});
			},
			"ArrowFunctionExpression:exit"(): void {
				componentStack.pop();
			},

			FunctionExpression(node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						"id" in node &&
						node.id !== null &&
						node.id.type === "Identifier" &&
						/^[A-Z]/.test(node.id.name),
					isHook:
						("id" in node &&
							node.id !== null &&
							"id" in node &&
							node.id &&
							"name" in node.id) ||
						"name" in node
							? new RegExp(option.customHookPattern).test(
									"id" in node && node.id && "name" in node.id
										? node.id.name
										: node.type,
								)
							: false,
					node,
				});
			},
			"FunctionExpression:exit"(): void {
				componentStack.pop();
			},

			MethodDefinition(node: TSESTree.MethodDefinition): void {
				if (node.kind === "method" || node.kind === "constructor") {
					componentStack.push({
						isComponent:
							"id" in node &&
							typeof node.id !== "undefined" &&
							typeof node.id === "object" &&
							node.id !== null &&
							"type" in node.id &&
							node.id.type === "Identifier" &&
							"name" in node.id &&
							typeof node.id.name === "string" &&
							/^[A-Z]/.test(node.id.name),
						isHook:
							("id" in node &&
								node.id !== null &&
								"id" in node &&
								typeof node.id === "object" &&
								node.id !== null &&
								"name" in node.id) ||
							"name" in node
								? new RegExp(option.customHookPattern).test(
										"id" in node &&
											typeof node.id === "object" &&
											node.id !== null &&
											"name" in node.id &&
											typeof node.id.name === "string"
											? node.id.name
											: node.type,
									)
								: false,
						node,
					});
				}
			},
			"MethodDefinition:exit"(node: TSESTree.MethodDefinition): void {
				if (node.kind === "method" || node.kind === "constructor") {
					componentStack.pop();
				}
			},

			// Check signal creation
			CallExpression(node: TSESTree.CallExpression): void {
				if (
					node.callee.type === "Identifier"
						? node.callee.name === "signal" || node.callee.name === "computed"
						: false
				) {
					((node: TSESTree.CallExpression) => {
						if (
							option.allowedDirs?.some((dir: string): boolean => {
								const normalizedDir = dir.replace(/\\/g, "/");

								const normalizedFilename = context.filename.replace(/\\/g, "/");

								return normalizedFilename.includes(normalizedDir);
							}) ??
							false
						) {
							return;
						}

						const currentContext = componentStack[componentStack.length - 1];

						// Module level is fine
						if (!currentContext) {
							return;
						}

						const { isComponent, isHook } = currentContext;

						// Allow signals in custom hooks
						if (isHook) {
							return;
						}

						// Check for signal creation in components
						if (isComponent || isHook) {
							const isComputed =
								node.callee.type === "Identifier" &&
								node.callee.name === "computed";

							if (isComputed && option.allowComputedInComponents) {
								return;
							}

							context.report({
								node,
								messageId: isComputed
									? "computedInComponent"
									: "signalInComponent",
							});
						}
					})(node);
				}
			},

			// Check exported signals
			ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration): void {
				if (
					option.allowedDirs?.some((dir: string): boolean => {
						const normalizedDir = dir.replace(/\\/g, "/");

						const normalizedFilename = context.filename.replace(/\\/g, "/");

						return normalizedFilename.includes(normalizedDir);
					}) ??
					false
				) {
					return;
				}

				if (node.declaration?.type === "VariableDeclaration") {
					for (const decl of node.declaration.declarations) {
						if (
							decl.init?.type === "CallExpression" &&
							decl.init.callee.type === "Identifier"
								? decl.init.callee.name === "signal" ||
									decl.init.callee.name === "computed"
								: false
						) {
							context.report({
								node: decl,
								messageId: "exportedSignal",
							});
						}
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
