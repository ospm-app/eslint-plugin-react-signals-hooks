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
	node: TSESTree.Node;
	isTopLevel: boolean;
	signalName: string;
	updateType: "assignment" | "method" | "update";
	scopeDepth: number;
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
	statements: Array<TSESTree.Statement>,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	options: Option = {},
	perfKey: string,
	scopeDepth = 0,
	inBatch = false,
): Array<SignalUpdate> {
	const updatesInScope: Array<SignalUpdate> = [];

	const allUpdates: Array<SignalUpdate> = [];

	recordMetric(perfKey, "processBlockStart", {
		scopeDepth,
		inBatch,
		statementCount: statements.length,
	});

	// Check for batch import
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

	// Track if we're inside a batch call
	let currentInBatch = inBatch;

	for (const stmt of statements) {
		// Skip non-expression statements
		if (stmt.type !== "ExpressionStatement") {
			// Process block statements (if, for, while, etc.)
			if (isBlockStatement(stmt)) {
				const nestedUpdates = processBlock(
					stmt.body,
					context,
					options,
					perfKey,
					scopeDepth + 1,
					currentInBatch,
				);

				allUpdates.push(...nestedUpdates);
			}

			continue;
		}

		// Check if this is a batch call
		if (isBatchCall(stmt.expression, context)) {
			currentInBatch = true;
			// Process the batch callback
			if (
				stmt.expression.type === "CallExpression" &&
				stmt.expression.arguments.length > 0 &&
				stmt.expression.arguments[0]?.type === "ArrowFunctionExpression"
			) {
				const body = stmt.expression.arguments[0].body;
				if (body.type === "BlockStatement") {
					processBlock(
						body.body,
						context,
						options,
						perfKey,
						scopeDepth + 1,
						true,
					);
				}
			}

			continue;
		}

		// Check for signal updates
		if (isSignalUpdate(stmt.expression) && !currentInBatch) {
			const updateType = getUpdateType(stmt.expression);
			const signalName = getSignalName(stmt.expression);

			recordMetric(perfKey, "signalUpdateFound", {
				type: updateType,
				location: scopeDepth === 0 ? "top-level" : `nested-${scopeDepth}`,
				signalName,
				hasBatchImport,
			});

			updatesInScope.push({
				node: stmt.expression,
				isTopLevel: scopeDepth === 0,
				signalName,
				updateType,
				scopeDepth,
			});
		}
	}

	recordMetric(perfKey, "processBlockEnd", {
		scopeDepth,
		totalUpdates: updatesInScope.length,
		uniqueSignals: new Set(updatesInScope.map((u) => u.signalName)).size,
		hasBatchImport,
		minUpdatesRequired: options.minUpdates,
	});

	// Add updates from this scope to all updates
	allUpdates.push(...updatesInScope);

	// Only suggest batching if we have enough updates (min 2 by default)
	const minUpdates = options.minUpdates ?? 2;

	if (updatesInScope.length < minUpdates) {
		recordMetric(perfKey, "batchUpdateNotNeeded", {
			scopeDepth,
			updateCount: updatesInScope.length,
			minUpdates,
		});

		return allUpdates;
	}

	const firstNode = updatesInScope[0]?.node;

	const signalCount = updatesInScope.length;

	recordMetric(perfKey, "batchUpdateSuggested", {
		updateCount: updatesInScope.length,
		uniqueSignals: new Set(updatesInScope.map((u) => u.signalName)).size,
	});

	if (!firstNode) {
		return allUpdates;
	}

	const messageId = "useBatch";

	const severity = getSeverity(messageId, options);

	if (severity !== "off" && updatesInScope.length > 0) {
		context.report({
			node: firstNode,
			messageId,
			data: {
				count: signalCount,
				signals: Array.from(
					new Set(
						allUpdates.map((update: SignalUpdate): string => {
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
						const updatesText = allUpdates
							.map(({ node }: SignalUpdate): string => {
								return context.sourceCode.getText(node);
							})
							.join("; ");

						const firstUpdate = updatesInScope[0]?.node;

						const lastUpdate = updatesInScope[updatesInScope.length - 1]?.node;

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

						recordMetric(perfKey, "batchFixApplied", {
							updateCount: updatesInScope.length,
						});

						return null;
					},
				},
				{
					messageId: "useBatchSuggestion",
					data: { count: signalCount },
					*fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
						const updatesText = allUpdates
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
								allUpdates[allUpdates.length - 1]?.node.range[1] ?? 0,
							],
							`batch(() => { ${updatesText} })`,
						);

						recordMetric(perfKey, "batchFixApplied", {
							updateCount: allUpdates.length,
						});

						return null;
					},
				},
				{
					messageId: "addBatchImport",
					data: {
						count: updatesInScope.length,
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

	return allUpdates;
}

/**
 * Checks if a node is a block statement (if, for, while, etc.)
 */
function isBlockStatement(
	node: TSESTree.Node,
): node is TSESTree.BlockStatement {
	return node.type === "BlockStatement";
}

/**
 * Checks if a node is a batch call (batch(() => {}))
 */
function isBatchCall(
	node: TSESTree.Node,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): boolean {
	if (node.type !== "CallExpression") return false;

	const { callee } = node;
	if (callee.type !== "Identifier") return false;

	// Check if it's a direct call to 'batch'
	if (callee.name === "batch") return true;

	// Check if it's an imported batch function
	const scope = context.sourceCode.getScope(node);
	const variable = scope.variables.find((v) => v.name === callee.name);

	if (variable) {
		return variable.defs.some((def) => {
			if (def.type === "ImportBinding") {
				return (
					"imported" in def.node &&
					"name" in def.node.imported &&
					def.node.imported.name === "batch"
				);
			}
			return false;
		});
	}

	return false;
}

/**
 * Gets the type of update operation
 */
function getUpdateType(
	node: TSESTree.Node,
): "assignment" | "method" | "update" {
	if (node.type === "AssignmentExpression") {
		return "assignment";
	}
	if (node.type === "CallExpression") {
		return "method";
	}
	return "update";
}

/**
 * Gets the name of the signal being updated
 */
function getSignalName(node: TSESTree.Node): string {
	if (node.type === "AssignmentExpression") {
		if (
			node.left.type === "MemberExpression" &&
			!node.left.computed &&
			node.left.property.type === "Identifier" &&
			node.left.property.name === "value" &&
			node.left.object.type === "Identifier"
		) {
			return node.left.object.name;
		}
	} else if (
		node.type === "CallExpression" &&
		node.callee.type === "MemberExpression" &&
		!node.callee.computed &&
		node.callee.property.type === "Identifier" &&
		(node.callee.property.name === "set" ||
			node.callee.property.name === "update") &&
		node.callee.object.type === "Identifier"
	) {
		return node.callee.object.name;
	}

	return "signal";
}

function isSignalUpdate(
	node: TSESTree.Node,
): node is
	| TSESTree.AssignmentExpression
	| TSESTree.CallExpression
	| TSESTree.UpdateExpression
	| TSESTree.UnaryExpression {
	// Handle direct assignments (signal.value = x)
	if (node.type === "AssignmentExpression") {
		// Check for direct assignment to signal.value
		if (
			node.left.type === "MemberExpression" &&
			node.left.property.type === "Identifier" &&
			node.left.property.name === "value" &&
			isSignalReference(node.left.object)
		) {
			return true;
		}

		// Handle compound assignments (signal.value += x, etc.)
		if (
			node.operator !== "=" && // Skip simple assignments as they're handled above
			node.left.type === "MemberExpression" &&
			node.left.property.type === "Identifier" &&
			node.left.property.name === "value" &&
			isSignalReference(node.left.object)
		) {
			return true;
		}
	}

	// Handle method calls (signal.set(x) or signal.update())
	if (
		node.type === "CallExpression" &&
		node.callee.type === "MemberExpression" &&
		node.callee.property.type === "Identifier" &&
		["set", "update"].includes(node.callee.property.name) &&
		isSignalReference(node.callee.object)
	) {
		return true;
	}

	// Handle increment/decrement (signal.value++, --signal.value)
	if (
		node.type === "UpdateExpression" &&
		node.argument.type === "MemberExpression" &&
		node.argument.property.type === "Identifier" &&
		node.argument.property.name === "value" &&
		isSignalReference(node.argument.object)
	) {
		return true;
	}

	return false;
}

/**
 * Checks if a node is a reference to a signal (either directly or through a property access)
 */
function isSignalReference(node: TSESTree.Node): boolean {
	if (node.type === "Identifier") {
		// Check if the identifier name suggests it's a signal
		return (
			node.name.endsWith("Signal") ||
			node.name.endsWith("signal") ||
			node.name.endsWith("Sig") || // Common shorthand
			node.name.endsWith("sig") // Common shorthand
		);
	}

	// Handle nested member expressions (e.g., this.signal.value)
	if (
		node.type === "MemberExpression" &&
		node.property.type === "Identifier" &&
		node.property.name === "value"
	) {
		return isSignalReference(node.object);
	}

	return false;
}

// Default minimum number of updates before suggesting batching
const DEFAULT_MIN_UPDATES = 2;

// Helper to report batch violations with proper fixes and suggestions
function reportBatchViolation(
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
	updates: Array<SignalUpdate>,
): void {
	if (updates.length < 2) return;

	const sourceCode = context.sourceCode;
	const firstUpdate: SignalUpdate | undefined = updates[0];

	// Check if batch is already imported
	const hasBatchImport = sourceCode.ast.body.some(
		(node: TSESTree.ProgramStatement): boolean => {
			return (
				node.type === "ImportDeclaration" &&
				node.source.value === "@preact/signals-react" &&
				node.specifiers.some((s: TSESTree.ImportClause): boolean => {
					return (
						s.type === "ImportSpecifier" &&
						s.imported.type === "Identifier" &&
						s.imported.name === "batch"
					);
				})
			);
		},
	);

	// Get the severity level for this message
	const severity = getSeverity("useBatch", context.options[0]);

	if (severity === "off") return;

	if (!firstUpdate) return;

	// Report the issue with fix suggestions
	context.report({
		node: firstUpdate.node,
		messageId: "useBatch",
		data: { count: updates.length },
		suggest: [
			{
				messageId: "useBatchSuggestion",
				data: { count: updates.length },
				fix: (fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> => {
					const fixes: Array<TSESLint.RuleFix> = [];

					// Add batch import if needed
					if (!hasBatchImport) {
						const importFix = (
							fixer: TSESLint.RuleFixer,
						): ReadonlyArray<TSESLint.RuleFix> => {
							const batchImport =
								"import { batch } from '@preact/signals-react';\n";

							// Find the first import or the program start
							const firstImport = context.sourceCode.ast.body.find(
								(
									n: TSESTree.ProgramStatement,
								): n is TSESTree.ImportDeclaration => {
									return n.type === "ImportDeclaration";
								},
							);

							if (firstImport) {
								return [fixer.insertTextBefore(firstImport, batchImport)];
							} else if (context.sourceCode.ast.body[0]) {
								// Insert at the beginning of the file if no imports exist
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast.body[0],
								);

								return firstToken
									? [fixer.insertTextBefore(firstToken, batchImport)]
									: [fixer.insertTextBeforeRange([0, 0], batchImport)];
							} else {
								// If the file is empty, just add the import
								return [fixer.insertTextBeforeRange([0, 0], batchImport)];
							}
						};

						fixes.push(...importFix(fixer));
					}

					// Sort updates by their position in the file
					const sortedUpdates = [...updates].sort(
						(a: SignalUpdate, b: SignalUpdate): number => {
							return a.node.range[0] - b.node.range[0];
						},
					);

					// Create a single batch wrapper for all updates
					const updatesText = sortedUpdates
						.map((update: SignalUpdate): string => {
							return sourceCode.getText(update.node);
						})
						.join(";\n  ");

					// Replace the original code with batched version
					fixes.push(
						fixer.replaceTextRange(
							[
								sortedUpdates[0]?.node.range[0] ?? 0,
								sortedUpdates[sortedUpdates.length - 1]?.node.range[1] ?? 0,
							],
							`batch(() => {\n  ${updatesText}\n})`,
						),
					);

					return fixes;
				},
			},
		],
	});
}

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
						default: DEFAULT_MIN_UPDATES,
						description: "Minimum number of signal updates to trigger the rule",
					},
					performance: {
						type: "object",
						properties: {
							maxTime: {
								type: "number",
								minimum: 1,
								description:
									"Maximum time in milliseconds to spend analyzing a file",
							},
							maxMemory: {
								type: "number",
								minimum: 1,
								description: "Maximum memory in MB to use for analysis",
							},
							maxNodes: {
								type: "number",
								minimum: 1,
								description: "Maximum number of AST nodes to process",
							},
							enableMetrics: {
								type: "boolean",
								description: "Whether to enable performance metrics collection",
							},
							logMetrics: {
								type: "boolean",
								description: "Whether to log performance metrics",
							},
							maxUpdates: {
								type: "number",
								minimum: 1,
								description: "Maximum number of signal updates to process",
							},
							maxDepth: {
								type: "number",
								minimum: 1,
								description: "Maximum depth of nested scopes to analyze",
							},
							maxOperations: {
								type: "object",
								description: "Limits for specific operations",
								properties: Object.fromEntries(
									Object.entries(PerformanceOperations).map(([key]) => [
										key,
										{
											type: "number",
											minimum: 1,
											description: `Maximum number of ${key} operations`,
										},
									]),
								),
							},
						},
						additionalProperties: false,
					},
					severity: {
						type: "object",
						properties: {
							arrayUpdateInLoop: {
								type: "string",
								enum: ["error", "warn", "off"],
								description: "Severity for array updates in loops",
							},
							suggestBatchArrayUpdate: {
								type: "string",
								description: "Severity for suggesting batch for array updates",
							},
							// Add other severity options from the spec
							useBatch: { type: "string", enum: ["error", "warn", "off"] },
							suggestUseBatch: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							addBatchImport: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							wrapWithBatch: { type: "string", enum: ["error", "warn", "off"] },
							useBatchSuggestion: {
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
			minUpdates: 2,
			performance: DEFAULT_PERFORMANCE_BUDGET,
			severity: {
				useBatch: "error",
				suggestUseBatch: "error",
				addBatchImport: "error",
				wrapWithBatch: "error",
				useBatchSuggestion: "error",
				performanceLimitExceeded: "error",
			},
		},
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option]: readonly [Option?],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		const perf = createPerformanceTracker(
			perfKey,
			DEFAULT_PERFORMANCE_BUDGET,
			context,
		);

		if (option?.performance?.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		// Track signal updates across the file
		const signalUpdates: Array<SignalUpdate> = [];

		// Check if we should continue processing based on performance limits
		let nodeCount = 0;

		function shouldContinue(): boolean {
			nodeCount++;

			if (nodeCount > (option?.performance?.maxNodes ?? 2000)) {
				trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

				return false;
			}

			return true;
		}

		// Process a block of code to find signal updates
		function processStatements(statements: Array<TSESTree.Statement>): void {
			if (!shouldContinue()) return;

			try {
				// Process the block and collect signal updates
				const blockUpdates = processBlock(
					statements,
					context,
					option,
					perfKey,
					0,
					false,
				);

				if (blockUpdates.length > 0) {
					signalUpdates.push(...blockUpdates);

					// Check if we should report for this block
					const minUpdates = option?.minUpdates ?? DEFAULT_MIN_UPDATES;

					if (blockUpdates.length >= minUpdates) {
						reportBatchViolation(context, blockUpdates);
					}
				}
			} catch (error: unknown) {
				// Log the error but don't crash the rule
				console.error("Error in prefer-batch-updates rule:", error);
			}
		}

		return {
			// Process all nodes for performance tracking
			"*": (node: TSESTree.Node): void => {
				perf.trackNode(node);
			},

			// Process function bodies and blocks
			BlockStatement: (node: TSESTree.BlockStatement): void => {
				processStatements(node.body);
			},

			// Process arrow function expressions with block bodies
			'ArrowFunctionExpression[body.type="BlockStatement"]': (
				node: TSESTree.ArrowFunctionExpression,
			): void => {
				if ("body" in node.body && Array.isArray(node.body.body)) {
					processStatements(node.body.body);
				}
			},
			// Handle various node types that might contain signal updates
			"CallExpression:exit"(node: TSESTree.CallExpression): void {
				if (!shouldContinue()) {
					return;
				}
				startPhase(perfKey, "callExpression");

				try {
					if (isSignalUpdate(node)) {
						signalUpdates.push({
							node,
							isTopLevel: true,
							signalName: getSignalName(node),
							updateType: getUpdateType(node),
							scopeDepth: 0,
						});
					}

					// Check if this is a batch call
					if (isBatchCall(node, context)) {
						recordMetric(perfKey, "batchCallFound", {
							isTopLevel: true,
							hasCallback: node.arguments.length > 0,
						});
					}
				} catch (error: unknown) {
					recordMetric(perfKey, "callExpressionError", {
						error: String(error),
					});
				} finally {
					endPhase(perfKey, "callExpression");
				}
			},

			// Handle assignment expressions (e.g., signal.value = x)
			"AssignmentExpression:exit"(node: TSESTree.AssignmentExpression): void {
				if (!shouldContinue()) {
					return;
				}

				startPhase(perfKey, "assignmentExpression");

				try {
					if (isSignalUpdate(node)) {
						signalUpdates.push({
							node,
							isTopLevel: false, // Will be set correctly in processBlock
							signalName: getSignalName(node),
							updateType: "assignment",
							scopeDepth: 0, // Will be set correctly in processBlock
						});
					}
				} catch (error) {
					recordMetric(perfKey, "assignmentExpressionError", {
						error: String(error),
					});
				} finally {
					endPhase(perfKey, "assignmentExpression");
				}
			},

			// Handle update expressions (e.g., signal.value++)
			"UpdateExpression:exit"(node: TSESTree.UpdateExpression): void {
				if (!shouldContinue()) {
					return;
				}
				startPhase(perfKey, "updateExpression");

				try {
					if (isSignalUpdate(node)) {
						signalUpdates.push({
							node,
							isTopLevel: false, // Will be set correctly in processBlock
							signalName: getSignalName(node),
							updateType: "update",
							scopeDepth: 0, // Will be set correctly in processBlock
						});
					}
				} catch (error) {
					recordMetric(perfKey, "updateExpressionError", {
						error: String(error),
					});
				} finally {
					endPhase(perfKey, "updateExpression");
				}
			},

			// Process blocks of code (function bodies, if blocks, etc.)
			"BlockStatement:exit"(node: TSESTree.BlockStatement): void {
				if (!shouldContinue()) {
					return;
				}
				startPhase(perfKey, "blockStatement");

				try {
					processBlock(
						node.body,
						context,
						option,
						perfKey,
						1, // scopeDepth
						false, // inBatch
					);
				} catch (error: unknown) {
					// Log the error but don't crash the rule
					recordMetric(perfKey, "processBlockError", { error: String(error) });
				}

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
					perfKey,
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
