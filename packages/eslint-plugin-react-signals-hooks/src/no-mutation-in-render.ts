// FIXED by @ospm/eslint-plugin-react-signals-hooks
/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

import { PerformanceOperations } from "./utils/performance-constants.js";
import {
	endPhase,
	startPhase,
	recordMetric,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
} from "./utils/performance.js";
import { buildSuffixRegex, hasSignalSuffix } from "./utils/suffix.js";
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

type MessageIds =
	| "signalValueAssignment"
	| "signalValueUpdate"
	| "signalPropertyAssignment"
	| "suggestUseEffect"
	| "suggestEventHandler"
	| "signalArrayIndexAssignment"
	| "signalNestedPropertyAssignment";

type Severity = {
	[key in MessageIds]?: "error" | "warn" | "off";
};

type Option = {
	/** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
	signalNames?: Array<string>;
	/** Patterns where mutations are allowed (e.g., ['^test/', '.spec.ts$']) */
	allowedPatterns?: Array<string>;
	/** Custom severity levels for different violation types */
	severity?: Severity;
	/** Enable unsafe autofixes in suggestions (off by default) */
	unsafeAutofix?: boolean;
	/** Variable name suffix used to detect signal variables (default: "Signal") */
	suffix?: string;
	/** Performance tuning option */
	performance?: PerformanceBudget;
};

type Options = [Option?];

function getAssignmentType(
	node: TSESTree.AssignmentExpression,
):
	| "computedMemberAssignment"
	| "memberAssignment"
	| "identifierAssignment"
	| "otherAssignment" {
	if (node.left.type === AST_NODE_TYPES.MemberExpression) {
		if (node.left.computed) {
			return "computedMemberAssignment";
		}

		return "memberAssignment";
	}

	if (node.left.type === AST_NODE_TYPES.Identifier) {
		return "identifierAssignment";
	}

	return "otherAssignment";
}

function trackIdentifier(
	name: string,
	perfKey: string,
	resolvedIdentifiers: Map<string, number>,
): void {
	const count = resolvedIdentifiers.get(name) ?? 0;

	resolvedIdentifiers.set(name, count + 1);

	if (count === 0) {
		trackOperation(perfKey, PerformanceOperations.identifierResolution);
	}
}

function getSeverity(
	messageId: MessageIds,
	option?: Option,
): "error" | "warn" | "off" {
	if (!option?.severity) {
		return "error";
	}

	switch (messageId) {
		case "signalValueAssignment": {
			return option.severity.signalValueAssignment ?? "error";
		}

		case "signalValueUpdate": {
			return option.severity.signalValueUpdate ?? "error";
		}

		case "signalPropertyAssignment": {
			return option.severity.signalPropertyAssignment ?? "error";
		}

		case "suggestUseEffect": {
			return option.severity.suggestUseEffect ?? "error";
		}

		case "suggestEventHandler": {
			return option.severity.suggestEventHandler ?? "error";
		}

		case "signalArrayIndexAssignment": {
			return option.severity.signalArrayIndexAssignment ?? "error";
		}

		case "signalNestedPropertyAssignment": {
			return option.severity.signalNestedPropertyAssignment ?? "error";
		}

		default: {
			return "error";
		}
	}
}

// Resolve the base identifier name for patterns like:
//   foo.value = ...
//   foo.value.bar = ...
//   foo.value[expr] = ...
// Returns the identifier name (e.g., "foo") if resolvable, else null
function resolveBaseIdentifierFromValueChain(
	node: TSESTree.ChainElement | TSESTree.Expression,
): string | null {
	// Unwrap ChainExpression if present (optional chaining not valid on LHS, but be safe)
	if (node.type === AST_NODE_TYPES.ChainExpression) {
		const inner = node.expression;

		return resolveBaseIdentifierFromValueChain(inner);
	}

	if (node.type === AST_NODE_TYPES.Identifier) {
		return node.name;
	}

	if (node.type === AST_NODE_TYPES.MemberExpression) {
		// We want base.value[...]/base.value or base.value.prop
		if (
			node.object.type === AST_NODE_TYPES.MemberExpression &&
			!node.object.computed &&
			node.object.property.type === AST_NODE_TYPES.Identifier &&
			node.object.property.name === "value" &&
			node.object.object.type === AST_NODE_TYPES.Identifier
		) {
			return node.object.object.name;
		}

		// Also support the direct base.value (no further nesting)
		if (
			!node.computed &&
			node.property.type === AST_NODE_TYPES.Identifier &&
			node.property.name === "value" &&
			node.object.type === AST_NODE_TYPES.Identifier
		) {
			return node.object.name;
		}
	}

	return null;
}

function looksLikeSignal(
	baseName: string | null,
	suffixRegex: RegExp | null,
	option?: Option,
): boolean {
	if (baseName === null) {
		return false;
	}

	// Suffix-based heuristic
	if (suffixRegex !== null && hasSignalSuffix(baseName, suffixRegex)) {
		return true;
	}

	// Explicit configured names (creator/import-based detection to be added separately)
	const names = option?.signalNames ?? [];

	return names.some((n: string): boolean => {
		return baseName === n || baseName.endsWith(n.replace(/^[A-Z]/, ""));
	});
}

const resolvedIdentifiers = new Map<string, number>();
// Track variables created via signal/computed/effect creators in this file
const knownCreatorSignals = new Set<string>();

let inRenderContext = false;
let renderDepth = 0;
let hookDepth = 0;
let functionDepth = 0;

const ruleName = "no-mutation-in-render";

export const noMutationInRenderRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "problem",
		docs: {
			description: "Disallow direct signal mutation during render",
			url: getRuleDocUrl(ruleName),
		},
		hasSuggestions: true,
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					signalNames: {
						type: "array",
						items: {
							type: "string",
						},
						uniqueItems: true,
						description: "Custom signal function names",
					},
					allowedPatterns: {
						type: "array",
						items: {
							type: "string",
						},
						uniqueItems: true,
						description: "Patterns where mutations are allowed",
					},
					severity: {
						type: "object",
						properties: {
							signalValueAssignment: {
								type: "string",
								enum: ["error", "warn", "off"],
								default: "error",
							},
							signalPropertyAssignment: {
								type: "string",
								enum: ["error", "warn", "off"],
								default: "error",
							},
							signalArrayIndexAssignment: {
								type: "string",
								enum: ["error", "warn", "off"],
								default: "error",
							},
							signalNestedPropertyAssignment: {
								type: "string",
								enum: ["error", "warn", "off"],
								default: "error",
							},
							unsafeAutofix: { type: "boolean" },
							suffix: { type: "string" },
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
		messages: {
			signalValueAssignment:
				"Avoid mutating signal.value directly in render. Move this to an effect or event handler.",
			signalValueUpdate:
				"Avoid updating signal.value with operators (++, --, +=, etc.) in render. Move this to an effect or event handler.",
			signalPropertyAssignment:
				"Avoid mutating signal properties directly in render. Move this to an effect or event handler.",
			signalArrayIndexAssignment:
				"Avoid mutating array indexes of signal values in render. Move this to an effect or event handler.",
			signalNestedPropertyAssignment:
				"Avoid mutating nested properties of signal values in render. Move this to an effect or event handler.",
			suggestUseEffect: "Wrap in useEffect",
			suggestEventHandler: "Move to event handler",
		},
	},
	defaultOptions: [
		{
			signalNames: ["signal", "useSignal", "createSignal"],
			allowedPatterns: [],
			severity: {
				suggestUseEffect: "error",
				signalValueUpdate: "error",
				suggestEventHandler: "error",
				signalValueAssignment: "error",
				signalPropertyAssignment: "error",
				signalArrayIndexAssignment: "error",
				signalNestedPropertyAssignment: "error",
			},
			unsafeAutofix: false,
			suffix: "Signal",
			performance: DEFAULT_PERFORMANCE_BUDGET,
		},
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		startPhase(perfKey, "ruleInit");

		const perf = createPerformanceTracker(perfKey, option?.performance);

		// Build suffix regex for variable-name based signal detection
		const suffixRegex = buildSuffixRegex(option?.suffix);

		// Early bail if file matches any of the allowed patterns
		if (
			Array.isArray(option?.allowedPatterns) &&
			option.allowedPatterns.length > 0
		) {
			try {
				const allowed = option.allowedPatterns.some((p) => {
					try {
						// eslint-disable-next-line security/detect-non-literal-regexp
						const re = new RegExp(p);

						return re.test(context.filename);
					} catch {
						return false;
					}
				});

				if (allowed) {
					return {};
				}
			} catch {
				// ignore pattern errors and continue
			}
		}

		if (option?.performance?.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		if (
			option?.performance?.enableMetrics === true &&
			option.performance.logMetrics === true
		) {
			console.info(
				`${ruleName}: Initializing rule for file: ${context.filename}`,
			);
			console.info(`${ruleName}: Rule configuration:`, option);
		}

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

		if (
			option?.allowedPatterns?.some((pattern: string): boolean => {
				try {
					// eslint-disable-next-line security/detect-non-literal-regexp
					return new RegExp(pattern).test(context.filename);
				} catch (error: unknown) {
					if (
						option.performance?.enableMetrics === true &&
						option.performance.logMetrics === true
					) {
						console.error(`Invalid regex pattern: ${pattern}`, error);
					}

					// Invalid regex pattern, ignore it
					return false;
				}
			}) ??
			false
		) {
			trackOperation(perfKey, PerformanceOperations.fileAnalysis);

			endPhase(perfKey, "fileAnalysis");

			return {};
		}

		startPhase(perfKey, "ruleExecution");

		return {
			"*": (node: TSESTree.Node): void => {
				if (!shouldContinue()) {
					endPhase(perfKey, "recordMetrics");

					return;
				}

				perf.trackNode(node);

				trackOperation(
					perfKey,
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					PerformanceOperations[`${node.type}Processing`] ??
						PerformanceOperations.nodeProcessing,
				);
			},

			// Capture creator-based signals: const x = signal(...)
			[AST_NODE_TYPES.VariableDeclarator](
				node: TSESTree.VariableDeclarator,
			): void {
				if (
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
					!node.id ||
					node.id.type !== AST_NODE_TYPES.Identifier ||
					!node.init ||
					node.init.type !== AST_NODE_TYPES.CallExpression
				) {
					return;
				}

				let creatorName: string | null = null;

				if (node.init.callee.type === AST_NODE_TYPES.Identifier) {
					creatorName = node.init.callee.name;
				} else if (
					node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
					!node.init.callee.computed &&
					node.init.callee.property.type === AST_NODE_TYPES.Identifier
				) {
					creatorName = node.init.callee.property.name;
				}

				if (
					creatorName !== null &&
					["signal", "computed", "effect"].includes(creatorName)
				) {
					knownCreatorSignals.add(node.id.name);
				}
			},

			[AST_NODE_TYPES.FunctionDeclaration](
				node: TSESTree.FunctionDeclaration,
			): void {
				trackOperation(
					perfKey,
					PerformanceOperations.FunctionDeclarationProcessing,
				);

				if (!(node.id !== null && /^[A-Z]/.test(node.id.name))) {
					return;
				}

				trackOperation(
					perfKey,
					PerformanceOperations.reactComponentFunctionDeclarationProcessing,
				);

				inRenderContext = true;

				renderDepth++;

				trackIdentifier(node.id.name, perfKey, resolvedIdentifiers);

				startPhase(perfKey, `render:${node.id.name}`);
			},

			[AST_NODE_TYPES.ArrowFunctionExpression](
				node: TSESTree.ArrowFunctionExpression,
			): void {
				trackOperation(
					perfKey,
					PerformanceOperations.ArrowFunctionExpressionProcessing,
				);

				if (
					node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
					node.parent.id.type === AST_NODE_TYPES.Identifier &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					trackOperation(
						perfKey,
						PerformanceOperations.reactComponentArrowFunctionExpressionProcessing,
					);

					inRenderContext = true;

					renderDepth++;

					trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

					startPhase(perfKey, `render:${node.parent.id.name}`);

					return;
				}

				functionDepth++;

				if (functionDepth === 1 && renderDepth >= 1) {
					inRenderContext = false;
				}
			},

			[AST_NODE_TYPES.FunctionExpression](
				node: TSESTree.FunctionExpression,
			): void {
				trackOperation(
					perfKey,
					PerformanceOperations.FunctionExpressionProcessing,
				);

				functionDepth++;

				if (
					node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
					node.parent.id.type === AST_NODE_TYPES.Identifier &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					trackOperation(
						perfKey,
						PerformanceOperations.reactComponentFunctionExpressionProcessing,
					);

					inRenderContext = true;

					renderDepth++;

					trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

					startPhase(perfKey, `render:${node.parent.id.name}`);
				} else if (functionDepth === 1 && renderDepth >= 1) {
					inRenderContext = false;
				}
			},

			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				if (
					!inRenderContext ||
					renderDepth < 1 ||
					hookDepth > 0 ||
					functionDepth > 0
				) {
					return;
				}

				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					!node.callee.computed &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
					!node.callee.object.computed &&
					node.callee.object.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.property.name === "value" &&
					node.callee.object.object.type === AST_NODE_TYPES.Identifier
				) {
					const method = node.callee.property.name;
					const targetName = node.callee.object.object.name;

					const mutatingArrayMethods = new Set([
						"push",
						"pop",
						"splice",
						"sort",
						"reverse",
						"copyWithin",
						"fill",
						"shift",
						"unshift",
					]);
					const mutatingMapSetMethods = new Set([
						"set",
						"add",
						"delete",
						"clear",
					]);

					if (
						mutatingArrayMethods.has(method) ||
						mutatingMapSetMethods.has(method)
					) {
						// Best-effort signal identification via suffix or explicit allowlist of names
						const looksLikeSignal =
							hasSignalSuffix(targetName, suffixRegex) ||
							(option?.signalNames ?? []).some(
								(n) =>
									n === targetName ||
									targetName.endsWith(n.replace(/^[A-Z]/, "")),
							);

						if (!looksLikeSignal) {
							return;
						}

						if (getSeverity("signalPropertyAssignment", option) === "off") {
							return;
						}

						context.report({
							node,
							messageId: "signalPropertyAssignment",
							suggest:
								option?.unsafeAutofix === true
									? [
											{
												messageId: "suggestUseEffect",
												fix(
													fixer: TSESLint.RuleFixer,
												): TSESLint.RuleFix | null {
													return fixer.replaceText(
														node,
														`useEffect(() => { ${context.sourceCode.getText(node)} }, [${targetName}])`,
													);
												},
											},
											{
												messageId: "suggestEventHandler",
												fix(
													fixer: TSESLint.RuleFixer,
												): TSESLint.RuleFix | null {
													return fixer.replaceText(
														node,
														`const handleEvent = () => { ${context.sourceCode.getText(node)} }`,
													);
												},
											},
										]
									: [],
						});
					}
				}
			},

			[AST_NODE_TYPES.AssignmentExpression](
				node: TSESTree.AssignmentExpression,
			): void {
				trackOperation(
					perfKey,
					PerformanceOperations.AssignmentExpressionProcessing,
				);

				// Skip if not in a render context or inside hooks/functions
				if (
					!inRenderContext ||
					renderDepth < 1 ||
					hookDepth > 0 ||
					functionDepth > 0
				) {
					return;
				}

				startPhase(perfKey, PerformanceOperations.assignmentAnalysis);

				const assignmentType = getAssignmentType(node);

				trackOperation(
					perfKey,
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					PerformanceOperations[`assignmentType:${assignmentType}`] ??
						PerformanceOperations.assignmentAnalysis,
				);

				// Resolve base name for any .value-based assignment
				const baseName = resolveBaseIdentifierFromValueChain(node.left);
				const isSignal = looksLikeSignal(baseName, suffixRegex, option);

				if (isSignal) {
					// Determine specific assignment category
					const isDirectValue =
						node.left.type === AST_NODE_TYPES.MemberExpression &&
						!node.left.computed &&
						node.left.property.type === AST_NODE_TYPES.Identifier &&
						node.left.property.name === "value";

					const isIndexedOnValue =
						node.left.type === AST_NODE_TYPES.MemberExpression &&
						node.left.computed &&
						node.left.object.type === AST_NODE_TYPES.MemberExpression &&
						!node.left.object.computed &&
						node.left.object.property.type === AST_NODE_TYPES.Identifier &&
						node.left.object.property.name === "value";

					const isNestedOnValue =
						node.left.type === AST_NODE_TYPES.MemberExpression &&
						!node.left.computed &&
						node.left.object.type === AST_NODE_TYPES.MemberExpression &&
						!node.left.object.computed &&
						node.left.object.property.type === AST_NODE_TYPES.Identifier &&
						node.left.object.property.name === "value";

					// Decide message based on operator
					const isCompoundOperator = node.operator !== "=";

					if (isDirectValue) {
						const msg: MessageIds = isCompoundOperator
							? "signalValueUpdate"
							: "signalValueAssignment";

						if (getSeverity(msg, option) !== "off") {
							context.report({
								node,
								messageId: msg,
								suggest:
									option?.unsafeAutofix === true
										? [
												{
													messageId: "suggestUseEffect",
													fix(
														fixer: TSESLint.RuleFixer,
													): TSESLint.RuleFix | null {
														return fixer.replaceText(
															node,
															`useEffect(() => { ${context.sourceCode.getText(node)} }, [])`,
														);
													},
												},
												{
													messageId: "suggestEventHandler",
													fix(
														fixer: TSESLint.RuleFixer,
													): TSESLint.RuleFix | null {
														return fixer.replaceText(
															node,
															`const handleEvent = () => { ${context.sourceCode.getText(node)} }`,
														);
													},
												},
											]
										: [],
							});
						}

						return;
					}

					if (isIndexedOnValue) {
						if (getSeverity("signalArrayIndexAssignment", option) !== "off") {
							context.report({
								node,
								messageId: "signalArrayIndexAssignment",
								suggest:
									option?.unsafeAutofix === true
										? [
												{
													messageId: "suggestUseEffect",
													fix(
														fixer: TSESLint.RuleFixer,
													): TSESLint.RuleFix | null {
														return fixer.replaceText(
															node,
															`useEffect(() => { ${context.sourceCode.getText(node)} }, [${baseName ?? ""}])`,
														);
													},
												},
											]
										: [],
							});
						}

						return;
					}

					if (isNestedOnValue) {
						if (
							getSeverity("signalNestedPropertyAssignment", option) !== "off"
						) {
							context.report({
								node,
								messageId: "signalNestedPropertyAssignment",
								suggest:
									option?.unsafeAutofix === true
										? [
												{
													messageId: "suggestUseEffect",
													fix(
														fixer: TSESLint.RuleFixer,
													): TSESLint.RuleFix | null {
														return fixer.replaceText(
															node,
															`useEffect(() => { ${context.sourceCode.getText(node)} }, [])`,
														);
													},
												},
											]
										: [],
							});
						}
					}
				}

				if (
					node.left.type === AST_NODE_TYPES.MemberExpression &&
					node.left.computed &&
					node.left.object.type === AST_NODE_TYPES.MemberExpression &&
					node.left.object.property.type === AST_NODE_TYPES.Identifier &&
					node.left.object.property.name === "value" &&
					node.left.object.object.type === AST_NODE_TYPES.Identifier &&
					option?.signalNames?.some((name: string): boolean => {
						return (
							("object" in node.left &&
								"object" in node.left.object &&
								"name" in node.left.object.object &&
								node.left.object.object.name.endsWith(
									name.replace(/^[A-Z]/, ""),
								)) ||
							("object" in node.left &&
								"object" in node.left.object &&
								"name" in node.left.object.object &&
								node.left.object.object.name === name)
						);
					}) === true
				) {
					if (getSeverity("signalArrayIndexAssignment", option) !== "off") {
						context.report({
							node,
							messageId: "signalArrayIndexAssignment",
							suggest: [
								{
									messageId: "suggestUseEffect",
									fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
										return fixer.replaceText(
											node,
											`useEffect(() => { ${context.sourceCode.getText(node)} }, [${
												"object" in node.left &&
												"object" in node.left.object &&
												"name" in node.left.object.object &&
												node.left.object.object.name
											}])`,
										);
									},
								},
							],
						});
					}

					return;
				}

				if (
					node.left.type === AST_NODE_TYPES.MemberExpression &&
					!node.left.computed &&
					node.left.object.type === AST_NODE_TYPES.MemberExpression &&
					node.left.object.property.type === AST_NODE_TYPES.Identifier &&
					node.left.object.property.name === "value" &&
					node.left.object.object.type === AST_NODE_TYPES.Identifier &&
					option?.signalNames?.some((name: string): boolean => {
						return (
							("object" in node.left &&
								"object" in node.left.object &&
								"name" in node.left.object.object &&
								node.left.object.object.name.endsWith(
									name.replace(/^[A-Z]/, ""),
								)) ||
							("object" in node.left &&
								"object" in node.left.object &&
								"name" in node.left.object.object &&
								node.left.object.object.name === name)
						);
					}) === true &&
					getSeverity("signalNestedPropertyAssignment", option) !== "off"
				) {
					context.report({
						node,
						messageId: "signalNestedPropertyAssignment",
						suggest: [
							{
								messageId: "suggestUseEffect",
								fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
									return fixer.replaceText(
										node,
										`useEffect(() => { ${context.sourceCode.getText(node)} }, [])`,
									);
								},
							},
						],
					});
				}
			},

			[AST_NODE_TYPES.UpdateExpression](node: TSESTree.UpdateExpression): void {
				if (
					!inRenderContext ||
					renderDepth < 1 ||
					hookDepth > 0 ||
					functionDepth > 0
				) {
					return;
				}

				// Check for signal.value++ or ++signal.value
				if (
					node.argument.type === AST_NODE_TYPES.MemberExpression &&
					node.argument.property.type === AST_NODE_TYPES.Identifier &&
					node.argument.property.name === "value"
				) {
					const baseName = resolveBaseIdentifierFromValueChain(node.argument);

					if (!looksLikeSignal(baseName, suffixRegex, option)) {
						return;
					}

					if (getSeverity("signalValueUpdate", option) === "off") {
						return;
					}

					context.report({
						node,
						messageId: "signalValueUpdate",
						suggest:
							option?.unsafeAutofix === true
								? [
										{
											messageId: "suggestUseEffect",
											fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
												return fixer.replaceText(
													node,
													`useEffect(() => { ${context.sourceCode.getText(node)} }, [${baseName ?? ""}])`,
												);
											},
										},
										{
											messageId: "suggestEventHandler",
											fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
												return fixer.replaceText(
													node,
													`const handleEvent = () => { ${context.sourceCode.getText(node)} }`,
												);
											},
										},
									]
								: [],
					});
				}
			},

			"FunctionDeclaration > :not(FunctionDeclaration)"(
				node: TSESTree.FunctionDeclaration,
			): void {
				if (
					node.id != null &&
					typeof node.id.name === "string" &&
					node.id.name !== "" &&
					/^[A-Z]/.test(node.id.name)
				) {
					renderDepth--;

					if (renderDepth === 0) {
						inRenderContext = false;
					}
				}
			},

			"ArrowFunctionExpression > :not(ArrowFunctionExpression)"(
				node: TSESTree.ArrowFunctionExpression,
			): void {
				// Check if this is the main component arrow function
				if (
					node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
					node.parent.id.type === AST_NODE_TYPES.Identifier &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					// This is a main component - exit render context
					renderDepth--;

					if (renderDepth === 0) {
						inRenderContext = false;
					}
				} else {
					// This is a nested arrow function - back to render context if appropriate
					functionDepth--;

					if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
						inRenderContext = true;
					}
				}
			},

			"FunctionExpression > :not(FunctionExpression)"(
				_node: TSESTree.FunctionExpression,
			): void {
				functionDepth--;

				if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
					inRenderContext = true; // Back in render context
				}
			},

			"CallExpression:exit"(node: TSESTree.CallExpression): void {
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					[
						"useEffect",
						"useLayoutEffect",
						"useCallback",
						"useMemo",
						"useImperativeHandle",
						"effect", // @preact/signals-core effect
						"computed", // @preact/signals-core computed
					].includes(node.callee.name)
				) {
					hookDepth--;

					if (hookDepth === 0 && renderDepth >= 1 && functionDepth === 0) {
						inRenderContext = true;
					}
				}
			},
			[`${AST_NODE_TYPES.Program}:exit`](): void {
				startPhase(perfKey, "programExit");

				perf["Program:exit"]();

				endPhase(perfKey, "programExit");
			},
		};
	},
});
