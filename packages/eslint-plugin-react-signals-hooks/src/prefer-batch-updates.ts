/** biome-ignore-all assist/source/organizeImports: off */
import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
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

type SignalUpdate = {
	node: TSESTree.AssignmentExpression | TSESTree.CallExpression;
	isTopLevel: boolean;
	signalName: string;
	updateType: "assignment" | "method";
};

type Severity = {
	useBatch?: "error" | "warn" | "off";
	suggestUseBatch?: "error" | "warn" | "off";
	addBatchImport?: "error" | "warn" | "off";
	wrapWithBatch?: "error" | "warn" | "off";
	useBatchSuggestion?: "error" | "warn" | "off";
	performanceLimitExceeded?: "error" | "warn" | "off";
};

type Option = {
	minUpdates?: number;
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

type MessageIds =
	| "useBatch"
	| "suggestUseBatch"
	| "addBatchImport"
	| "wrapWithBatch"
	| "useBatchSuggestion"
	| "performanceLimitExceeded";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error"; // Default to 'error' if no severity is specified
	}

	// Handle performance limit exceeded as a special case
	if (messageId === "performanceLimitExceeded") {
		return options.severity.performanceLimitExceeded || "warn"; // Default to 'warn' for performance issues
	}

	// Handle specific message IDs with their corresponding severity settings
	switch (messageId) {
		case "useBatch":
			return options.severity.useBatch ?? "error";
		case "suggestUseBatch":
			return options.severity.suggestUseBatch ?? "warn";
		case "addBatchImport":
			return options.severity.addBatchImport ?? "error";
		case "wrapWithBatch":
			return options.severity.wrapWithBatch ?? "error";
		case "useBatchSuggestion":
			return options.severity.useBatchSuggestion ?? "warn";
		default:
			return "error"; // Default to 'error' for any other message IDs
	}
}

function processBlock(
	statements: Array<
		TSESTree.ExpressionStatement | TSESTree.VariableDeclaration
	>,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	option?: Option | undefined,
): void {
	const key = context.getFilename();

	recordMetric(key, "processBlockStart", { statementCount: statements.length });

	const hasBatchImport = context.sourceCode.ast.body.some(
		(node: TSESTree.ProgramStatement): boolean => {
			return (
				node.type === "ImportDeclaration" &&
				node.source.value === "@preact/signals-react" &&
				node.specifiers.some((specifier: TSESTree.ImportClause): boolean => {
					return (
						"imported" in specifier &&
						"name" in specifier.imported &&
						specifier.imported.name === "batch"
					);
				})
			);
		},
	);

	const updatesInBlock: Array<SignalUpdate> = [];

	let signalUpdateCount = 0;

	for (const stmt of statements) {
		// Skip non-expression statements and variable declarations
		if (stmt.type !== "ExpressionStatement") {
			continue;
		}

		// Handle expression statements (direct assignments or function calls)

		if (isSignalUpdate(stmt.expression)) {
			const updateType =
				stmt.expression.type === "AssignmentExpression"
					? "assignment"
					: "method";

			recordMetric(key, "signalUpdateFound", {
				type: updateType,
				location: "expression",
			});

			updatesInBlock.push({
				node: stmt.expression,
				isTopLevel: true,
				signalName:
					stmt.expression.type === "AssignmentExpression"
						? "object" in stmt.expression.left &&
							stmt.expression.left.object.type === "Identifier"
							? stmt.expression.left.object.name
							: "signal"
						: "object" in stmt.expression.callee &&
								stmt.expression.callee.object.type === "Identifier"
							? stmt.expression.callee.object.name
							: "signal",
				updateType,
			});

			signalUpdateCount++;
		}
	}

	recordMetric(key, "processBlockEnd", {
		totalUpdates: updatesInBlock.length,
		uniqueSignals: new Set(updatesInBlock.map((u) => u.signalName)).size,
		hasBatchImport,
		minUpdatesRequired: option?.minUpdates,
	});

	// Only suggest batching if we have enough updates ( min 2 )
	if (
		typeof option?.minUpdates !== "undefined" &&
		updatesInBlock.length < (option.minUpdates || 2)
	) {
		recordMetric(key, "batchUpdateNotNeeded", {
			updateCount: updatesInBlock.length,
		});

		return;
	}

	const firstNode = updatesInBlock[0]?.node;

	const signalCount = updatesInBlock.length;

	recordMetric(key, "batchUpdateSuggested", {
		updateCount: updatesInBlock.length,
		uniqueSignals: new Set(updatesInBlock.map((u) => u.signalName)).size,
	});

	if (!firstNode) {
		return;
	}

	const messageId = "useBatch" as const;
	const severity = getSeverity(messageId, option);

	if (severity !== "off") {
		context.report({
			node: firstNode,
			messageId,
			data: {
				count: signalCount,
				signals: Array.from(
					new Set(
						updatesInBlock.map((update: SignalUpdate): string => {
							return update.signalName;
						}),
					),
				).join(", "),
			},
			suggest: [
				{
					messageId: "useBatchSuggestion",
					data: { count: signalCount },
					*fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
						const updatesText = updatesInBlock
							.map(({ node }: SignalUpdate): string => {
								return context.sourceCode.getText(node);
							})
							.join("; ");

						const firstUpdate = updatesInBlock[0]?.node;
						const lastUpdate = updatesInBlock[updatesInBlock.length - 1]?.node;

						if (!firstUpdate || !lastUpdate) {
							return null;
						}

						// Get the range of the entire block of updates
						const range: TSESTree.Range = [
							firstUpdate.range[0],
							lastUpdate.range[1],
						];

						// Create the batch wrapper
						const batchPrefix = `batch(() => {\n  `;
						const batchSuffix = `\n});`;

						const b = context.sourceCode.ast.body[0];

						if (!b) {
							return null;
						}

						// If we need to add the import, do it first
						if (!hasBatchImport) {
							yield fixer.insertTextBefore(
								b,
								"import { batch } from '@preact/signals-react';\n\n",
							);
						}

						// Replace the updates with the batched version
						yield fixer.replaceTextRange(
							range,
							batchPrefix + updatesText + batchSuffix,
						);

						recordMetric(key, "batchFixApplied", {
							updateCount: updatesInBlock.length,
						});
						return null;
					},
				},
				{
					messageId: "useBatchSuggestion",
					data: { count: signalCount },
					*fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
						const updatesText = updatesInBlock
							.map(({ node }: SignalUpdate): string => {
								return context.sourceCode.getText(node);
							})
							.join("; ");

						if (!hasBatchImport) {
							const batchImport =
								"import { batch } from '@preact/signals-react';\n";

							const firstImport = context.sourceCode.ast.body.find(
								(n): n is TSESTree.ImportDeclaration =>
									n.type === "ImportDeclaration",
							);

							if (typeof firstImport === "undefined") {
								const b = context.sourceCode.ast.body[0];

								if (!b) {
									return null;
								}

								yield fixer.insertTextBefore(b, batchImport);
							} else {
								yield fixer.insertTextBefore(firstImport, batchImport);
							}
						}

						yield fixer.replaceTextRange(
							[
								firstNode.range[0],
								updatesInBlock[updatesInBlock.length - 1]?.node.range[1] ?? 0,
							],
							`batch(() => { ${updatesText} })`,
						);

						recordMetric(key, "batchFixApplied", {
							updateCount: updatesInBlock.length,
						});

						return null;
					},
				},
				{
					messageId: "addBatchImport",
					data: {
						count: signalUpdateCount,
					},
					*fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
						if (hasBatchImport) {
							return;
						}

						const batchImport =
							"import { batch } from '@preact/signals-react';\n";

						const firstImport = context.sourceCode.ast.body.find(
							(
								n: TSESTree.ProgramStatement,
							): n is TSESTree.ImportDeclaration => {
								return n.type === "ImportDeclaration";
							},
						);

						if (typeof firstImport === "undefined") {
							const b = context.sourceCode.ast.body[0];

							if (!b) {
								return;
							}

							yield fixer.insertTextBefore(b, batchImport);
						} else {
							yield fixer.insertTextBefore(firstImport, batchImport);
						}
					},
				},
			],
		});
	}
}

function isSignalUpdate(
	node: TSESTree.Node,
): node is TSESTree.AssignmentExpression | TSESTree.CallExpression {
	// Handle direct assignments (signal.value = x)
	if (
		node.type === "AssignmentExpression" &&
		node.left.type === "MemberExpression" &&
		node.left.property.type === "Identifier" &&
		node.left.property.name === "value" &&
		node.left.object.type === "Identifier" &&
		(node.left.object.name.endsWith("Signal") ||
			node.left.object.name.endsWith("signal"))
	) {
		return true;
	}

	// Handle method calls (signal.set(x) or signal.update())
	if (
		node.type === "CallExpression" &&
		node.callee.type === "MemberExpression" &&
		node.callee.property.type === "Identifier" &&
		["set", "update"].includes(node.callee.property.name) &&
		node.callee.object.type === "Identifier" &&
		(node.callee.object.name.endsWith("Signal") ||
			node.callee.object.name.endsWith("signal"))
	) {
		return true;
	}

	return false;
}

const signalUpdates: Array<SignalUpdate> = [];

const ruleName = "prefer-batch-updates";

export const preferBatchUpdatesRule = ESLintUtils.RuleCreator(
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
				"Suggest batching multiple signal updates to optimize performance",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			useBatch:
				"{{count}} signal updates detected in the same scope. Use `batch` to optimize performance by reducing renders.",
			performanceLimitExceeded: "Performance limit exceeded: {{message}}",
			suggestUseBatch: "Use `batch` to group {{count}} signal updates",
			addBatchImport: "Add `batch` import from '@preact/signals-react'",
			wrapWithBatch: "Wrap with `batch` to optimize signal updates",
			useBatchSuggestion: "Use `batch` to group {{count}} signal updates",
		},
		schema: [
			{
				type: "object",
				properties: {
					minUpdates: {
						type: "number",
						minimum: 2,
						default: 2,
						description: "Minimum number of signal updates to trigger the rule",
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
			minUpdates: 2,
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

		startPhase(perfKey, "ruleExecution");

		return {
			"*": (node: TSESTree.Node): void => {
				if (!shouldContinue()) {
					endPhase(perfKey, "recordMetrics");

					stopTracking(perfKey);

					return;
				}

				perf.trackNode(node);

				trackOperation(perfKey, PerformanceOperations.nodeProcessingExpression);
			},

			// Track signal updates in the current scope
			AssignmentExpression(node: TSESTree.AssignmentExpression): void {
				startPhase(perfKey, "assignmentExpression");

				if (isSignalUpdate(node)) {
					signalUpdates.push({
						node,
						isTopLevel: true,
						signalName:
							"left" in node && node.left.type === "MemberExpression"
								? node.left.object.type === "Identifier"
									? node.left.object.name
									: "signal"
								: node.left.type,
						updateType: "assignment",
					});
				}

				endPhase(perfKey, "assignmentExpression");
			},

			CallExpression(node: TSESTree.CallExpression): void {
				startPhase(perfKey, "callExpression");

				if (isSignalUpdate(node)) {
					signalUpdates.push({
						node,
						isTopLevel: true,
						signalName:
							"callee" in node && node.callee.type === "MemberExpression"
								? node.callee.object.type === "Identifier"
									? node.callee.object.name
									: "signal"
								: node.callee.type,
						updateType: "method",
					});
				}

				endPhase(perfKey, "callExpression");
			},

			// Process blocks of code (function bodies, if blocks, etc.)
			"BlockStatement:exit"(node: TSESTree.BlockStatement): void {
				startPhase(perfKey, "blockStatement");

				processBlock(
					node.body.filter(
						(
							n,
						): n is
							| TSESTree.ExpressionStatement
							| TSESTree.VariableDeclaration => {
							return (
								n.type === "ExpressionStatement" ||
								n.type === "VariableDeclaration"
							);
						},
					),
					context,
					option,
				);

				endPhase(perfKey, "blockStatement");
			},

			// Process program top level
			"Program:exit"(node: TSESTree.Program): void {
				startPhase(perfKey, "programExit");

				processBlock(
					node.body.filter(
						(
							n: TSESTree.ProgramStatement,
						): n is
							| TSESTree.ExpressionStatement
							| TSESTree.VariableDeclaration =>
							n.type === "ExpressionStatement" ||
							n.type === "VariableDeclaration",
					),
					context,
					option,
				);

				try {
					startPhase(perfKey, "recordMetrics");

					if (option?.performance?.logMetrics === true) {
						const finalMetrics = stopTracking(perfKey);

						if (typeof finalMetrics !== "undefined") {
							console.info(
								`\n[prefer-batch-updates] Performance Metrics (${finalMetrics.exceededBudget === true ? "EXCEEDED" : "OK"}):`,
							);
							console.info(`  File: ${context.filename}`);
							console.info(
								`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`,
							);
							console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

							if (finalMetrics.exceededBudget === true) {
								console.warn("\n⚠️  Performance budget exceeded!");
							}
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
