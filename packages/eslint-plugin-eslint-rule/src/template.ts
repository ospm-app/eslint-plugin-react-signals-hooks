import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
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

type Option = {
	// Add your rule-specific options here
	performance?: PerformanceBudget;
};

type Options = [Option?];

type MessageIds = "exampleMessageId";

const ruleName = "rule-name";

export const rule = ESLintUtils.RuleCreator((name: string): string => {
	return getRuleDocUrl(name);
})<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion", // or 'problem' or 'layout'
		docs: {
			description: "Brief description of what the rule does",
			url: getRuleDocUrl(ruleName),
		},
		fixable: "code",
		hasSuggestions: false,
		schema: [
			{
				type: "object",
				properties: {
					performance: {
						type: "object",
						additionalProperties: false,
						properties: {
							maxNodes: { type: "number", minimum: 1 },
							maxTime: { type: "number", minimum: 1 },
						},
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			exampleMessageId: "Your error message here",
		},
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

		if (option.performance?.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		console.info(
			`${ruleName}: Initializing rule for file: ${context.filename}`,
		);
		console.info(`${ruleName}: Rule configuration:`, option);

		recordMetric(perfKey, "config", {
			performance: {
				enableMetrics: option.performance?.enableMetrics,
				logMetrics: option.performance?.logMetrics,
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

				trackOperation(perfKey, PerformanceOperations.nodeProcessing);
			},

			// Example for specific node types
			// CallExpression: (node) => {
			//   trackOperation(perf, perfKey, 'CallExpression', () => {
			//     // Your validation logic here
			//   });
			// },

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
