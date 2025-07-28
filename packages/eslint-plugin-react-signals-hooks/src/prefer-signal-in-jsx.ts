/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";

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
import { getRuleDocUrl } from "./utils/urls.js";
import type { PerformanceBudget } from "./utils/types.js";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import { PerformanceOperations } from "./utils/performance-constants.js";

type Option = {
	performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds = "preferDirectSignalUsage";

function isInJSXAttribute(node: TSESTree.Node): boolean {
	let current: TSESTree.Node | undefined = node.parent;

	while (current) {
		if (current.type === "JSXAttribute") {
			return true;
		}

		if (current.type === "JSXElement" || current.type === "JSXFragment") {
			return false;
		}

		current = current.parent;
	}

	return false;
}

function isInFunctionProp(node: TSESTree.Node): boolean {
	let current: TSESTree.Node | undefined = node.parent;

	while (current) {
		if (
			current.type === "ArrowFunctionExpression" ||
			current.type === "FunctionExpression"
		) {
			// Check if the function is a direct child of a JSX attribute
			if (
				current.parent?.type === "JSXExpressionContainer" &&
				current.parent.parent?.type === "JSXAttribute"
			) {
				return true;
			}

			// Check if the function is a prop value
			if (
				current.parent?.type === "Property" &&
				current.parent.parent?.type === "ObjectExpression" &&
				current.parent.parent.parent?.type === "JSXExpressionContainer" &&
				current.parent.parent.parent.parent?.type === "JSXAttribute"
			) {
				return true;
			}

			return false;
		}

		if (current.type === "JSXElement" || current.type === "JSXFragment") {
			return false;
		}

		current = current.parent;
	}

	return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
	return getRuleDocUrl(name);
});

let jsxDepth = 0;

const ruleName = "prefer-signal-in-jsx";

export const preferSignalInJsxRule = createRule<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Enforces direct signal usage in JSX by preferring the signal itself over explicit `.value` access. In JSX, signals are automatically unwrapped, so there's no need to access the `.value` property. This rule helps maintain cleaner JSX code by removing unnecessary property access.",
			url: getRuleDocUrl(ruleName),
		},
		fixable: "code",
		messages: {
			preferDirectSignalUsage:
				"Use the signal directly in JSX instead of accessing .value",
		},
		hasSuggestions: true,
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

			// Track JSX depth to determine if we're inside JSX
			JSXElement(): void {
				jsxDepth++;
			},
			"JSXElement:exit"(): void {
				jsxDepth--;
			},
			JSXFragment(): void {
				jsxDepth++;
			},
			"JSXFragment:exit"(): void {
				jsxDepth--;
			},

			MemberExpression(node: TSESTree.MemberExpression): void {
				if (jsxDepth === 0) {
					return;
				}

				if (
					!(
						node.property.type === "Identifier" &&
						node.property.name === "value" &&
						node.object.type === "Identifier" &&
						node.object.name.endsWith("Signal")
					)
				) {
					return;
				}

				if (
					(
						[
							"MemberExpression",
							"ChainExpression",
							"OptionalMemberExpression",
							"BinaryExpression",
							"UnaryExpression",
							"LogicalExpression",
						] as const
					).some((type): boolean => {
						return (
							typeof node.parent !== "undefined" && node.parent.type === type
						);
					})
				) {
					return;
				}

				if (isInJSXAttribute(node) || isInFunctionProp(node)) {
					return;
				}

				context.report({
					node,
					messageId: "preferDirectSignalUsage",
					fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
						if ("name" in node.object) {
							return fixer.replaceText(node, node.object.name);
						}

						return null;
					},
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
