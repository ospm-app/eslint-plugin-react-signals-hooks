/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition, Variable } from "@typescript-eslint/scope-manager";
import { ESLintUtils, AST_NODE_TYPES } from "@typescript-eslint/utils";
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
	perfKey: string,
	scopeDepth = 0,
	inBatch: boolean = false,
): Array<SignalUpdate> {
	// If we are already inside a batch, skip processing to avoid false positives
	if (inBatch) {
		recordMetric(perfKey, PerformanceOperations.skipProcessing, {
			scopeDepth,
			statementCount: statements.length,
		});
		// Return empty array - no signal updates should be collected in batch scope
		return [];
	}

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

	for (const stmt of statements) {
		// Skip non-expression statements
		if (stmt.type !== AST_NODE_TYPES.ExpressionStatement) {
			// Process block statements (if, for, while, etc.)
			if (stmt.type === AST_NODE_TYPES.BlockStatement) {
				const nestedUpdates = processBlock(
					stmt.body,
					context,
					perfKey,
					scopeDepth + 1,
					inBatch,
				);

				allUpdates.push(...nestedUpdates);
			}

			continue;
		}

		// Check if this is a batch call
		if (isBatchCall(stmt.expression, context)) {
			// Process the batch callback
			if (
				stmt.expression.type === AST_NODE_TYPES.CallExpression &&
				stmt.expression.arguments.length > 0 &&
				(stmt.expression.arguments[0]?.type ===
					AST_NODE_TYPES.ArrowFunctionExpression ||
					stmt.expression.arguments[0]?.type ===
						AST_NODE_TYPES.FunctionExpression)
			) {
				const arg = stmt.expression.arguments[0];
				const body =
					arg.type === AST_NODE_TYPES.ArrowFunctionExpression
						? arg.body
						: arg.body;

				if (body.type === AST_NODE_TYPES.BlockStatement) {
					// For batch calls, we don't collect any signal updates inside them
					// so just skip processing the body entirely
					recordMetric(perfKey, "skipBatchBody", { scopeDepth });
				}
			}

			continue;
		}

		// Check for signal updates
		if (isSignalUpdate(stmt.expression)) {
			const updateType = getUpdateType(stmt.expression);
			const signalName = getSignalName(stmt.expression);

			recordMetric(perfKey, "signalUpdateFound", {
				type: updateType,
				location: scopeDepth === 0 ? "top-level" : `nested-${scopeDepth}`,
				signalName,
				hasBatchImport,
				inBatchScope: inBatch,
			});

			// Only collect updates if not in a batch scope
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
		uniqueSignals: new Set(
			updatesInScope.map((u: SignalUpdate): string => {
				return u.signalName;
			}),
		).size,
		hasBatchImport,
		minUpdatesRequired: context.options[0]?.minUpdates,
	});

	allUpdates.push(...updatesInScope);

	// Only suggest batching if we have enough updates (min 2 by default)
	const minUpdates = context.options[0]?.minUpdates ?? 2;

	if (updatesInScope.length < minUpdates) {
		recordMetric(perfKey, "batchUpdateNotNeeded", {
			scopeDepth,
			updateCount: updatesInScope.length,
			minUpdates,
		});

		return allUpdates;
	}

	const firstNode = updatesInScope[0]?.node;

	recordMetric(perfKey, "batchUpdateSuggested", {
		updateCount: updatesInScope.length,
		uniqueSignals: new Set(
			updatesInScope.map((u: SignalUpdate): string => {
				return u.signalName;
			}),
		).size,
	});

	if (!firstNode) {
		return allUpdates;
	}

	const messageId = "useBatch";

	const severity = getSeverity(messageId, context.options[0]);

	// Before reporting, ensure the first node is not inside a batch call
	if (
		severity !== "off" &&
		updatesInScope.length > 0 &&
		!isInsideBatchCall(firstNode, context)
	) {
		context.report({
			node: firstNode,
			messageId,
			data: {
				count: updatesInScope.length,
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
					data: { count: updatesInScope.length },
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
					data: { count: updatesInScope.length },
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
									n.type === AST_NODE_TYPES.ImportDeclaration,
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
								return n.type === AST_NODE_TYPES.ImportDeclaration;
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

const batchScopeStack: Array<boolean> = [false];

function pushBatchScope(inBatch: boolean): void {
	batchScopeStack.push(inBatch);
}

function popBatchScope(): boolean {
	const popped = batchScopeStack.pop();

	if (batchScopeStack.length === 0) {
		batchScopeStack.push(false);
	}

	console.info(
		`🔽 Popped batch scope: ${popped}, stack size: ${batchScopeStack.length}`,
	);
	return popped ?? false;
}

/**
 * Checks if a node is inside a batch call by checking the batch scope stack
 */
function isInsideBatchCall(
	node: TSESTree.Node,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): boolean {
	const nodeInfo = `${node.type} at line ${node.loc.start.line}`;
	console.info(`🔄 Checking if node is inside batch call: ${nodeInfo}`);

	// Check if we're in a batch scope
	if (
		batchScopeStack.length > 0 &&
		batchScopeStack[batchScopeStack.length - 1] === true
	) {
		console.info(`✅ In batch scope (stack) - ${nodeInfo}`);

		return true;
	}

	// Then check if we're inside a batch callback
	const ancestors = context.sourceCode.getAncestors(node);

	for (const ancestor of ancestors) {
		// If we find a batch call
		if (
			ancestor.type === AST_NODE_TYPES.CallExpression &&
			isBatchCall(ancestor, context)
		) {
			console.info("🔍 Found batch call ancestor");
			// The first argument is the callback function
			if (ancestor.arguments.length > 0) {
				const callback = ancestor.arguments[0];

				// If the node is inside the callback body, it's batched
				if (
					typeof callback !== "undefined" &&
					"body" in callback &&
					"range" in callback.body
				) {
					const bodyRange = callback.body.range;

					const isInside =
						node.range[0] >= bodyRange[0] && node.range[1] <= bodyRange[1];
					if (isInside) {
						console.info("✅ Inside batch callback body");
					} else {
						console.info("❌ Outside batch callback body ranges:", {
							nodeStart: node.range[0],
							bodyStart: bodyRange[0],
							nodeEnd: node.range[1],
							bodyEnd: bodyRange[1],
						});
					}
					return isInside;
				}
			}
		}
	}

	console.info("❌ Not in any batch context");
	return false;
}

function isBatchCall(
	node: TSESTree.Node,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): boolean {
	if (node.type !== AST_NODE_TYPES.CallExpression) {
		return false;
	}

	// Check for direct batch identifier
	if (
		node.callee.type === AST_NODE_TYPES.Identifier &&
		node.callee.name === "batch"
	) {
		return true;
	}

	// Check for member expression like React.batch or imported batch with alias
	if (node.callee.type === AST_NODE_TYPES.Identifier) {
		// Check if it's an imported batch function with potential aliasing
		const scope = context.sourceCode.getScope(node);

		const variable = scope.variables.find((v: Variable): boolean => {
			return "name" in node.callee && v.name === node.callee.name;
		});

		if (typeof variable !== "undefined") {
			return variable.defs.some((def: Definition): boolean => {
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
	}

	return false;
}

/**
 * Gets the type of update operation
 */
function getUpdateType(
	node: TSESTree.Node,
): "assignment" | "method" | "update" {
	if (node.type === AST_NODE_TYPES.AssignmentExpression) {
		return "assignment";
	}

	if (node.type === AST_NODE_TYPES.CallExpression) {
		return "method";
	}

	return "update";
}

/**
 * Gets the name of the signal being updated
 */
function getSignalName(node: TSESTree.Node): string {
	if (node.type === AST_NODE_TYPES.AssignmentExpression) {
		if (
			node.left.type === AST_NODE_TYPES.MemberExpression &&
			!node.left.computed &&
			node.left.property.type === AST_NODE_TYPES.Identifier &&
			node.left.property.name === "value" &&
			node.left.object.type === AST_NODE_TYPES.Identifier
		) {
			return node.left.object.name;
		}
	} else if (
		node.type === AST_NODE_TYPES.CallExpression &&
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		!node.callee.computed &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		(node.callee.property.name === "set" ||
			node.callee.property.name === "update") &&
		node.callee.object.type === AST_NODE_TYPES.Identifier
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
	if (node.type === AST_NODE_TYPES.AssignmentExpression) {
		// Check for direct assignment to signal.value
		if (
			node.left.type === AST_NODE_TYPES.MemberExpression &&
			node.left.property.type === AST_NODE_TYPES.Identifier &&
			node.left.property.name === "value" &&
			isSignalReference(node.left.object)
		) {
			return true;
		}

		// Handle compound assignments (signal.value += x, etc.)
		if (
			node.operator !== "=" && // Skip simple assignments as they're handled above
			node.left.type === AST_NODE_TYPES.MemberExpression &&
			node.left.property.type === AST_NODE_TYPES.Identifier &&
			node.left.property.name === "value" &&
			isSignalReference(node.left.object)
		) {
			return true;
		}
	}

	// Handle method calls (signal.set(x) or signal.update())
	if (
		node.type === AST_NODE_TYPES.CallExpression &&
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		["set", "update"].includes(node.callee.property.name) &&
		isSignalReference(node.callee.object)
	) {
		return true;
	}

	// Handle increment/decrement (signal.value++, --signal.value)
	if (
		node.type === AST_NODE_TYPES.UpdateExpression &&
		node.argument.type === AST_NODE_TYPES.MemberExpression &&
		node.argument.property.type === AST_NODE_TYPES.Identifier &&
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
	if (node.type === AST_NODE_TYPES.Identifier) {
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
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === "value"
	) {
		return isSignalReference(node.object);
	}

	return false;
}

// Track signal updates across the file
let signalUpdates: Array<SignalUpdate> = [];

// Default minimum number of updates before suggesting batching
const DEFAULT_MIN_UPDATES = 2;

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

		// Check if we should continue processing or reached performance limits
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

		return {
			// Process all nodes for performance tracking
			"*": (node: TSESTree.Node): void => {
				perf.trackNode(node);
			},

			// Track batch call entry
			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				if (!shouldContinue()) {
					return;
				}

				// If this is a batch call, mark its callback for batch scope
				if (isBatchCall(node, context)) {
					recordMetric(perfKey, "batchCallDetected", {
						location: context.getSourceCode().getLocFromIndex(node.range[0]),
						hasCallback:
							node.arguments.length > 0 &&
							(node.arguments[0]?.type ===
								AST_NODE_TYPES.ArrowFunctionExpression ||
								node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression),
					});

					// Push batch scope before processing the callback
					if (
						node.arguments.length > 0 &&
						(node.arguments[0]?.type ===
							AST_NODE_TYPES.ArrowFunctionExpression ||
							node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression)
					) {
						// Mark all expressions inside this batch callback as batched
						pushBatchScope(true);

						// If the batch callback has a BlockStatement body, manually process it with inBatch=true
						const callback = node.arguments[0];
						if (
							callback.type === AST_NODE_TYPES.ArrowFunctionExpression &&
							callback.body.type === AST_NODE_TYPES.BlockStatement
						) {
							// Skip processing to avoid collecting any signal updates inside
							recordMetric(perfKey, "skipArrowBatchBody", {
								location: context
									.getSourceCode()
									.getLocFromIndex(callback.body.range[0]),
							});
						} else if (callback.type === AST_NODE_TYPES.FunctionExpression) {
							// Skip processing to avoid collecting any signal updates inside
							recordMetric(perfKey, "skipFunctionBatchBody", {
								location: context
									.getSourceCode()
									.getLocFromIndex(callback.body.range[0]),
							});
						}
					}
				}
			},

			// Handle batch call exit and restore scope
			[`${AST_NODE_TYPES.CallExpression}:exit`](
				node: TSESTree.CallExpression,
			): void {
				if (!shouldContinue()) {
					return;
				}

				// Pop batch scope when exiting a batch call
				if (isBatchCall(node, context)) {
					if (
						node.arguments.length > 0 &&
						(node.arguments[0]?.type ===
							AST_NODE_TYPES.ArrowFunctionExpression ||
							node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression)
					) {
						// Get the exact body of the batch callback
						const callbackBodyRange = node.arguments[0].body.range;

						// Filter out signal updates that are inside the batch callback body
						signalUpdates = signalUpdates.filter(
							(update: SignalUpdate): boolean => {
								return !(
									update.node.range[0] >= callbackBodyRange[0] &&
									update.node.range[1] <= callbackBodyRange[1]
								);
							},
						);

						const removedCount = signalUpdates.length - signalUpdates.length;

						if (removedCount > 0) {
							recordMetric(perfKey, "batchUpdatesRemoved", {
								removedCount,
								location: context.sourceCode.getLocFromIndex(node.range[1]),
							});
						}

						// Pop the batch scope after removing updates
						popBatchScope();
					}
				}
			},

			// Process function bodies and blocks
			[AST_NODE_TYPES.BlockStatement]: (
				node: TSESTree.BlockStatement,
			): void => {
				pushBatchScope(batchScopeStack[batchScopeStack.length - 1] === true);

				processBlock(node.body, context, perfKey);
			},

			// Process arrow function expressions with block bodies
			[`${AST_NODE_TYPES.ArrowFunctionExpression}[body.type="${AST_NODE_TYPES.BlockStatement}"]`]:
				(node: TSESTree.ArrowFunctionExpression): void => {
					if (!shouldContinue()) {
						return;
					}

					startPhase(perfKey, "callExpression");

					try {
						// Check if we're exiting a batch call - restore previous scope state
						if (
							isBatchCall(node, context) &&
							"arguments" in node &&
							Array.isArray(node.arguments) &&
							node.arguments.length > 0 &&
							typeof node.arguments[0] === "object" &&
							node.arguments[0] !== null &&
							"type" in node.arguments[0] &&
							(node.arguments[0].type ===
								AST_NODE_TYPES.ArrowFunctionExpression ||
								node.arguments[0].type === AST_NODE_TYPES.FunctionExpression)
						) {
							popBatchScope();
						}

						// Only add signal updates if we're not inside a batch function
						if (
							isSignalUpdate(node) &&
							batchScopeStack[batchScopeStack.length - 1] !== true
						) {
							signalUpdates.push({
								node,
								isTopLevel: true,
								signalName: getSignalName(node),
								updateType: getUpdateType(node),
								scopeDepth: 0,
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
					// Only add signal updates if not inside batch function
					if (
						isSignalUpdate(node) &&
						batchScopeStack[batchScopeStack.length - 1] !== true
					) {
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
			[`${AST_NODE_TYPES.UpdateExpression}:exit`](
				node: TSESTree.UpdateExpression,
			): void {
				if (!shouldContinue()) {
					return;
				}

				startPhase(perfKey, "updateExpression");

				try {
					// Only add signal updates if not inside batch function
					if (
						isSignalUpdate(node) &&
						batchScopeStack[batchScopeStack.length - 1] !== true
					) {
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

			[`${AST_NODE_TYPES.BlockStatement}:exit`](
				node: TSESTree.BlockStatement,
			): void {
				// disabled to prevent double processing
				if (!shouldContinue()) {
					return;
				}

				startPhase(perfKey, "blockStatement");

				try {
					processBlock(
						node.body,
						context,
						perfKey,
						1, // scopeDepth
						batchScopeStack[batchScopeStack.length - 1] === true, // inBatch based on current scope
					);
				} catch (error: unknown) {
					// Log the error but don't crash the rule
					recordMetric(perfKey, "processBlockError", { error: String(error) });
				} finally {
					// Pop the current batch scope
					popBatchScope();

					endPhase(perfKey, "blockStatement");
				}
			},

			// Process program top level
			[`${AST_NODE_TYPES.Program}:exit`](node: TSESTree.Program): void {
				startPhase(perfKey, "programExit");

				processBlock(
					node.body.filter(
						(
							n: TSESTree.ProgramStatement,
						): n is
							| TSESTree.ExpressionStatement
							| TSESTree.VariableDeclaration =>
							n.type === AST_NODE_TYPES.ExpressionStatement ||
							n.type === AST_NODE_TYPES.VariableDeclaration,
					),
					context,
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
		} satisfies ESLintUtils.RuleListener;
	},
});
