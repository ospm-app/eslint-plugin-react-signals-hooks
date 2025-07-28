import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

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
import { PerformanceOperations } from "./utils/performance-constants.js";

type MessageIds = "invalidSignalName" | "invalidComputedName";

type Option = {
	performance: PerformanceBudget;
};

type Options = [Option];

function isValidSignalName(name: string): boolean {
	if (!name.endsWith("Signal")) {
		return false;
	}

	if (!/^[a-z]/.test(name)) {
		return false;
	}

	// Only forbid 'use' prefix when followed by a capital letter
	// (e.g., 'useSignal' is invalid, but 'userSignal' is valid)
	if (name.startsWith("use") && name.length > 2 && /^[A-Z]/.test(name[2])) {
		return false;
	}

	return true;
}

function getFixedName(originalName: string): string {
	let fixedName = originalName;

	if (fixedName.startsWith("use")) {
		fixedName = fixedName.slice(3);
	}

	if (fixedName.length > 0) {
		fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
	}

	if (!fixedName.endsWith("Signal")) {
		fixedName += "Signal";
	}

	return fixedName;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
	return getRuleDocUrl(name);
});

const ruleName = "signal-variable-name";

export const signalVariableNameRule = createRule<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				'Enforces consistent naming conventions for signal and computed variables. Signal variables should end with "Signal" (e.g., `countSignal`), start with a lowercase letter, and not use the "use" prefix to avoid confusion with React hooks. This improves code readability and maintainability by making signal usage immediately obvious.',
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			invalidSignalName:
				"Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
			invalidComputedName:
				"Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
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
		fixable: "code",
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

			VariableDeclarator(node: TSESTree.VariableDeclarator): void {
				if (
					node.id.type === "Identifier" &&
					node.init &&
					node.init.type === "CallExpression" &&
					node.init.callee.type === "Identifier" &&
					(node.init.callee.name === "signal" ||
						node.init.callee.name === "computed")
				) {
					const variableName = node.id.name;

					if (!isValidSignalName(variableName)) {
						context.report({
							node: node.id,
							messageId:
								"name" in node.init.callee && node.init.callee.name === "signal"
									? "invalidSignalName"
									: "invalidComputedName",
							data: {
								name: variableName,
							},
							fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
								return fixer.replaceText(node.id, getFixedName(variableName));
							},
						});
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
