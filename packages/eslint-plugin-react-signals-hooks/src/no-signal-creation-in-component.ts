/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import type {
	SourceCode,
	RuleContext,
} from "@typescript-eslint/utils/ts-eslint";

import { PerformanceOperations } from "./utils/performance-constants.js";
import {
	endPhase,
	startPhase,
	stopTracking,
	recordMetric,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
} from "./utils/performance.js";
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

type Severity = {
	avoidSignalInComponent?: "error" | "warn" | "off";
	suggestMoveToModuleLevel?: "error" | "warn" | "off";
	suggestMoveToCustomHook?: "error" | "warn" | "off";
	moveToModuleLevel?: "error" | "warn" | "off";
	createCustomHook?: "error" | "warn" | "off";
};

type Option = {
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

type MessageIds =
	| "avoidSignalInComponent"
	| "suggestMoveToModuleLevel"
	| "suggestMoveToCustomHook"
	| "moveToModuleLevel"
	| "createCustomHook";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error"; // Default to 'error' if no severity is specified
	}

	// eslint-disable-next-line security/detect-object-injection
	const severity = options.severity[messageId];

	// Default to 'error' if no severity is specified for this messageId
	return severity ?? "error";
}

function getSignalInfo(
	node: TSESTree.CallExpression,
	sourceCode: Readonly<SourceCode>,
): { signalName: string; signalValue: string; varName: string } {
	return {
		signalName: node.callee.type === "Identifier" ? node.callee.name : "signal",
		signalValue:
			node.arguments.length > 0
				? sourceCode.getText(node.arguments[0])
				: "undefined",
		varName:
			(node.callee.type === "Identifier" ? node.callee.name : "signal") ===
			"signal"
				? "value"
				: "computedValue",
	};
}

function generateUniqueHookName(
	context: Readonly<RuleContext<MessageIds, Options>>,
	baseName: string,
): string {
	const usedNames = new Set<string>();

	function collectNames(node: TSESTree.Node): void {
		if (node.type === "Identifier" && node.parent.type !== "MemberExpression") {
			usedNames.add(node.name);
		}

		if ("body" in node && Array.isArray(node.body)) {
			node.body.forEach(collectNames);
		} else if ("body" in node && node.body) {
			collectNames(node.body as TSESTree.Node);
		}

		if ("declarations" in node && Array.isArray(node.declarations)) {
			node.declarations.forEach(collectNames);
		}
	}

	collectNames(context.sourceCode.ast);

	let hookName = `use${baseName.charAt(0).toUpperCase() + baseName.slice(1)}`;
	let counter = 1;

	while (usedNames.has(hookName)) {
		hookName = `use${baseName.charAt(0).toUpperCase() + baseName.slice(1)}${counter++}`;
	}

	return hookName;
}

function getLeadingCommentsText(
	node: TSESTree.Node,
	sourceCode: Readonly<SourceCode>,
): { text: string; range: [number, number] } | null {
	const leadingComments = sourceCode.getCommentsBefore(node);

	if (leadingComments.length === 0) {
		return null;
	}

	const firstComment = leadingComments[0];
	const lastComment = leadingComments[leadingComments.length - 1];

	if (!firstComment || !lastComment) {
		return null;
	}

	return {
		text: sourceCode.text.slice(firstComment.range[0], lastComment.range[1]),
		range: [
			firstComment.range[0],
			lastComment.range[1] +
				(sourceCode.text[lastComment.range[1]] === "\n" ? 1 : 0),
		],
	};
}

function isReactComponent(
	node:
		| TSESTree.ArrowFunctionExpression
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression,
	parent: TSESTree.Node | undefined,
): boolean {
	if (node.type === "FunctionDeclaration" && node.id) {
		return /^[A-Z]/.test(node.id.name);
	}

	if (
		parent?.type === "VariableDeclarator" &&
		parent.id.type === "Identifier"
	) {
		return /^[A-Z]/.test(parent.id.name);
	}

	return false;
}

function isHookFunction(node: TSESTree.Node): boolean {
	if (
		![
			"FunctionDeclaration",
			"ArrowFunctionExpression",
			"FunctionExpression",
		].includes(node.type)
	) {
		return false;
	}

	// For function declarations, check the name directly first
	if (node.type === "FunctionDeclaration" && node.id) {
		return (
			node.id.name.startsWith("use") &&
			node.id.name.length > 3 &&
			node.id.name[3] === node.id.name[3]?.toUpperCase()
		);
	}

	if (
		node.parent?.type === "VariableDeclarator" &&
		node.parent.id.type === "Identifier"
	) {
		return (
			node.parent.id.name.startsWith("use") &&
			node.parent.id.name.length > 3 &&
			node.parent.id.name[3] === node.parent.id.name[3]?.toUpperCase()
		);
	}

	return false;
}

const functionStack: Array<{ isComponent: boolean; isHook: boolean }> = [];

let inComponent = false;
let inHook = false;
let inEffect = false;

const ruleName = "no-signal-creation-in-component";

export const noSignalCreationInComponentRule = ESLintUtils.RuleCreator(
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
				"Prevent signal creation inside React components, hooks, or effects",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			avoidSignalInComponent:
				"Avoid creating {{ signalType }} signals inside {{ context }}. Move signal creation to module level or a custom hook.",
			suggestMoveToModuleLevel: "Move {{ signalType }} signal to module level",
			suggestMoveToCustomHook:
				"Extract {{ signalType }} signal to a custom hook",
			moveToModuleLevel: "Move to module level",
			createCustomHook: "Create custom hook for {{ signalType }} signal",
		},
		schema: [
			{
				type: "object",
				properties: {
					severity: {
						type: "object",
						properties: {
							avoidSignalInComponent: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							suggestMoveToModuleLevel: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							suggestMoveToCustomHook: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							moveToModuleLevel: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							createCustomHook: {
								type: "string",
								enum: ["error", "warn", "off"],
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

				trackOperation(
					perfKey,
					PerformanceOperations[`${node.type}Processing`],
				);
			},

			"FunctionDeclaration, ArrowFunctionExpression, FunctionExpression"(
				node:
					| TSESTree.ArrowFunctionExpression
					| TSESTree.FunctionDeclaration
					| TSESTree.FunctionExpression,
			): void {
				const parent = node.parent;

				const isComponent = isReactComponent(node, parent);

				const isHook = isHookFunction(node);

				functionStack.push({ isComponent, isHook });

				if (isComponent) {
					inComponent = true;
				} else if (isHook) {
					inHook = true;
				}
			},
			"FunctionDeclaration > :not(FunctionDeclaration), ArrowFunctionExpression > :not(ArrowFunctionExpression), FunctionExpression > :not(FunctionExpression)"(
				_node:
					| TSESTree.ArrowFunctionExpression
					| TSESTree.FunctionDeclaration
					| TSESTree.FunctionExpression,
			): void {
				const state = functionStack.pop();

				if (typeof state === "undefined") {
					return;
				}

				if (state.isComponent) {
					inComponent = false;
				} else if (state.isHook) {
					inHook = false;
				}
			},

			CallExpression(node: TSESTree.CallExpression): void {
				const wasInEffect = inEffect;

				if (
					node.callee.type === "Identifier"
						? [
								"useEffect",
								"useCallback",
								"useMemo",
								"useLayoutEffect",
							].includes(node.callee.name)
						: false
				) {
					inEffect = true;
				}

				if (
					node.callee.type === "Identifier" &&
					(node.callee.name === "signal" || node.callee.name === "computed") &&
					(inComponent || inHook || wasInEffect)
				) {
					const sourceCode = context.sourceCode;

					const { signalName, signalValue, varName } = getSignalInfo(
						node,
						sourceCode,
					);

					const signalType = signalName === "signal" ? "reactive" : "computed";

					const severity = getSeverity("avoidSignalInComponent", option);

					if (severity !== "off") {
						context.report({
							node,
							messageId: "avoidSignalInComponent",
							data: {
								signalName,
								location: inComponent
									? "component"
									: inHook
										? "hook"
										: "effect",
							},
							suggest: [
								{
									messageId: "suggestMoveToModuleLevel",
									data: { signalType },
									*fix(
										fixer: TSESLint.RuleFixer,
									): Generator<TSESLint.RuleFix, void, unknown> {
										const firstNode = sourceCode.ast.body[0];
										const newLine = sourceCode.getText().includes("\r\n")
											? "\r\n"
											: "\n";

										if (!firstNode) {
											return;
										}

										// Add the signal to the top of the file
										yield fixer.insertTextBefore(
											firstNode,
											`const ${varName} = ${signalName}(${signalValue});${newLine}${newLine}`,
										);

										// Replace the original signal creation with the variable name
										yield fixer.replaceText(node, varName);

										// Handle comments if any
										const comments = getLeadingCommentsText(node, sourceCode);

										if (comments !== null) {
											yield fixer.insertTextBefore(
												firstNode,
												comments.text + newLine,
											);

											yield fixer.removeRange(comments.range);
										}
									},
								},
								{
									messageId: "suggestMoveToCustomHook",
									data: { signalType },
									*fix(
										fixer: TSESLint.RuleFixer,
									): Generator<TSESLint.RuleFix, void, unknown> {
										const newLine = sourceCode.getText().includes("\r\n")
											? "\r\n"
											: "\n";

										if (typeof sourceCode.ast.body[0] === "undefined") {
											return;
										}

										yield fixer.insertTextBefore(
											sourceCode.ast.body[0],
											`const ${varName} = ${signalName}(${signalValue});${newLine}${newLine}`,
										);

										yield fixer.replaceText(node, varName);
									},
								},
								{
									messageId: "createCustomHook",
									*fix(
										fixer: TSESLint.RuleFixer,
									): Generator<TSESLint.RuleFix, void, unknown> {
										// eslint-disable-next-line n/no-unsupported-features/es-syntax
										const lastImport = sourceCode.ast.body.findLast(
											(
												node: TSESTree.ProgramStatement,
											): node is TSESTree.ImportDeclaration => {
												return node.type === "ImportDeclaration";
											},
										);

										const insertPosition =
											typeof lastImport === "undefined"
												? 0
												: lastImport.range[1] + 1;

										const hookName = `use${signalName.charAt(0).toUpperCase() + signalName.slice(1)}`;
										const newLine = sourceCode.getText().includes("\r\n")
											? "\r\n"
											: "\n";

										yield fixer.insertTextAfterRange(
											[insertPosition, insertPosition],
											`${newLine}function ${hookName}() {${newLine}  return ${signalName}(${signalValue});${newLine}}${newLine}${newLine}`,
										);

										yield fixer.replaceText(node, `${hookName}()`);
									},
								},
								{
									messageId: "suggestMoveToCustomHook",
									data: { signalType },
									*fix(
										fixer: TSESLint.RuleFixer,
									): Generator<TSESLint.RuleFix, void, unknown> {
										// Find the last import or the start of the file
										const lastImport = sourceCode.ast.body
											.slice()
											.reverse()
											.find(
												(
													node: TSESTree.ProgramStatement,
												): node is TSESTree.ImportDeclaration => {
													return node.type === "ImportDeclaration";
												},
											);

										const insertPosition = lastImport
											? lastImport.range[1] + 1
											: 0;

										const hookName = generateUniqueHookName(
											context,
											signalName === "signal" ? "value" : "computedValue",
										);

										const newLine = sourceCode.getText().includes("\r\n")
											? "\r\n"
											: "\n";

										// Add the new custom hook after the last import
										yield fixer.insertTextAfterRange(
											[insertPosition, insertPosition],
											`${newLine}function ${hookName}() {${newLine}  return ${signalName}(${signalValue});${newLine}}${newLine}${newLine}`,
										);

										// Replace the signal creation with a call to the hook
										yield fixer.replaceText(node, `${hookName}()`);

										// Handle comments if any
										const comments = getLeadingCommentsText(node, sourceCode);

										if (comments !== null) {
											yield fixer.insertTextBeforeRange(
												[insertPosition, insertPosition],
												comments.text + newLine,
											);

											yield fixer.removeRange(comments.range);
										}
									},
								},
							],
						});
					}
				}

				if (
					node.callee.type === "Identifier"
						? [
								"useEffect",
								"useCallback",
								"useMemo",
								"useLayoutEffect",
							].includes(node.callee.name)
						: false
				) {
					inEffect = wasInEffect;
				}
			},

			"ClassDeclaration, PropertyDefinition, MethodDefinition"(): void {
				inComponent = true;
			},

			"ClassDeclaration > :not(ClassDeclaration)"(): void {
				inComponent = false;
			},

			"MethodDefinition, PropertyDefinition"(): void {
				if (inComponent) {
					functionStack.push({ isComponent: true, isHook: false });
				}
			},

			"MethodDefinition > :not(MethodDefinition), PropertyDefinition > :not(PropertyDefinition)"(): void {
				if (inComponent) {
					functionStack.pop();
				}
			},

			"Program:exit"(_node: TSESTree.Program): void {
				startPhase(perfKey, "programExit");

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
