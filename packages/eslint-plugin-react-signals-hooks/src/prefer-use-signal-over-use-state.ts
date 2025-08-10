/** biome-ignore-all assist/source/organizeImports: off */
import type { Variable } from "@typescript-eslint/scope-manager";
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
import type { PerformanceBudget } from "./utils/types.js";
import { getRuleDocUrl } from "./utils/urls.js";

type MessageIds =
	| "preferUseSignal"
	| "addUseSignalImport"
	| "convertToUseSignal";

type Severity = {
	[key in MessageIds]?: "error" | "warn" | "off";
};

type Option = {
	ignoreComplexInitializers?: boolean;
	performance?: PerformanceBudget;
	severity?: Severity;
	suffix?: string;
};

type Options = [Option?];

const ruleName = "prefer-use-signal-over-use-state";

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error";
	}

	switch (messageId) {
		case "preferUseSignal": {
			return options.severity.preferUseSignal ?? "error";
		}

		case "addUseSignalImport": {
			return options.severity.addUseSignalImport ?? "error";
		}

		case "convertToUseSignal": {
			return options.severity.convertToUseSignal ?? "error";
		}

		default: {
			return "error";
		}
	}
}

export const preferUseSignalOverUseStateRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		hasSuggestions: true,
		docs: {
			description:
				"Encourages using `useSignal` instead of `useState` for primitive values and simple initializers. `useSignal` often provides better performance and ergonomics for local component state that doesn't require the full React reconciliation cycle. This rule helps migrate simple state management to signals while still allowing complex state to use `useState` when needed.",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			preferUseSignal: "Prefer useSignal over useState for {{type}} values",
			addUseSignalImport: "Add `useSignal` import from '@preact/signals-react'",
			convertToUseSignal: "Convert this useState to useSignal",
		},
		schema: [
			{
				type: "object",
				properties: {
					ignoreComplexInitializers: {
						type: "boolean",
						default: true,
						description: "Skip non-primitive initializers",
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
					severity: {
						type: "object",
						properties: {
							preferUseSignal: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							addUseSignalImport: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							convertToUseSignal: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
						},
						additionalProperties: false,
					},
					suffix: { type: "string", minLength: 1 },
				},
				additionalProperties: false,
			},
		],
		fixable: "code",
	},
	defaultOptions: [
		{
			ignoreComplexInitializers: true,
			performance: DEFAULT_PERFORMANCE_BUDGET,
			severity: {
				preferUseSignal: "error",
				addUseSignalImport: "error",
				convertToUseSignal: "error",
			},
			suffix: "Signal",
		} satisfies Option,
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		startPhase(perfKey, "ruleInit");

		const perf = createPerformanceTracker(perfKey, option?.performance);

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

		const useStateLocalNames = new Set<string>(["useState"]);

		const reactNamespaces = new Set<string>();

		let inComponentOrHook: boolean = false;

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

		startPhase(perfKey, "ruleExecution");

		return {
			"*": (node: TSESTree.Node): void => {
				if (!shouldContinue()) {
					endPhase(perfKey, "recordMetrics");

					return;
				}

				perf.trackNode(node);

				const dynamicOp =
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					PerformanceOperations[`${node.type}Processing`] ??
					PerformanceOperations.nodeProcessing;

				trackOperation(perfKey, dynamicOp);
			},

			[AST_NODE_TYPES.Program](node: TSESTree.Program): void {
				for (const stmt of node.body) {
					if (
						stmt.type === AST_NODE_TYPES.ImportDeclaration &&
						stmt.source.value === "react"
					) {
						for (const spec of stmt.specifiers) {
							if (
								spec.type === AST_NODE_TYPES.ImportSpecifier &&
								spec.imported.type === AST_NODE_TYPES.Identifier &&
								spec.imported.name === "useState"
							) {
								useStateLocalNames.add(spec.local.name);
							} else if (
								spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
								spec.type === AST_NODE_TYPES.ImportDefaultSpecifier
							) {
								reactNamespaces.add(spec.local.name);
							}
						}
					}
				}
			},

			[AST_NODE_TYPES.FunctionDeclaration](
				node: TSESTree.FunctionDeclaration,
			): void {
				if (node.id && /^[A-Z]/.test(node.id.name)) {
					inComponentOrHook = true;
				}
			},
			[`${AST_NODE_TYPES.FunctionDeclaration}:exit`]() {
				inComponentOrHook = false;
			},

			[AST_NODE_TYPES.VariableDeclarator](
				node: TSESTree.VariableDeclarator,
			): void {
				if (
					(node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
						node.init?.type === AST_NODE_TYPES.FunctionExpression) &&
					node.id.type === AST_NODE_TYPES.Identifier &&
					/^[A-Z]/.test(node.id.name)
				) {
					inComponentOrHook = true;
				}

				if (
					!(
						node.init?.type === AST_NODE_TYPES.CallExpression &&
						((node.init.callee.type === AST_NODE_TYPES.Identifier &&
							useStateLocalNames.has(node.init.callee.name)) ||
							(node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
								node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
								reactNamespaces.has(node.init.callee.object.name) &&
								node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
								node.init.callee.property.name === "useState")) &&
						node.id.type === AST_NODE_TYPES.ArrayPattern &&
						node.id.elements.length === 2
					) ||
					!inComponentOrHook ||
					// If ignoring complex initializers (default), only allow simple initializer node types
					(context.options[0]?.ignoreComplexInitializers !== false &&
					typeof node.init.arguments[0] === "undefined"
						? false
						: ![
								AST_NODE_TYPES.Literal,
								AST_NODE_TYPES.Identifier,
								AST_NODE_TYPES.MemberExpression,
								AST_NODE_TYPES.UnaryExpression,
								AST_NODE_TYPES.BinaryExpression,
								AST_NODE_TYPES.ConditionalExpression,
								AST_NODE_TYPES.TemplateLiteral,
							].includes(node.init.arguments[0]?.type ?? ""))
				) {
					return;
				}

				const [stateVar, setterVar] = node.id.elements;

				const initialValue: TSESTree.CallExpressionArgument | undefined =
					node.init.arguments[0];

				if (
					stateVar?.type === AST_NODE_TYPES.Identifier &&
					setterVar?.type === AST_NODE_TYPES.Identifier &&
					setterVar.name.startsWith("set")
				) {
					if (getSeverity("preferUseSignal", option) === "off") {
						return;
					}

					const suffix =
						typeof option?.suffix === "string" && option.suffix.length > 0
							? option.suffix
							: "Signal";

					const suggestions: TSESLint.ReportSuggestionArray<MessageIds> = [];

					// Suggestion 1: add import only (non-destructive)
					suggestions.push({
						messageId: "addUseSignalImport",
						fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
							const fixes: Array<TSESLint.RuleFix> = [];
							const importDeclarations = context.sourceCode.ast.body.filter(
								(
									n: TSESTree.ProgramStatement,
								): n is TSESTree.ImportDeclaration => {
									return n.type === AST_NODE_TYPES.ImportDeclaration;
								},
							);

							const signalsImport = importDeclarations.find(
								(
									d: TSESTree.ImportDeclaration,
								): d is TSESTree.ImportDeclaration => {
									return d.source.value === "@preact/signals-react";
								},
							);

							if (signalsImport) {
								const hasUseSignal = signalsImport.specifiers.some(
									(s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
										return (
											s.type === AST_NODE_TYPES.ImportSpecifier &&
											s.imported.type === AST_NODE_TYPES.Identifier &&
											s.imported.name === "useSignal"
										);
									},
								);

								if (!hasUseSignal) {
									const hasNamespace = signalsImport.specifiers.some(
										(s) => s.type === AST_NODE_TYPES.ImportNamespaceSpecifier,
									);
									const defaultSpec = signalsImport.specifiers.find(
										(s): s is TSESTree.ImportDefaultSpecifier =>
											s.type === AST_NODE_TYPES.ImportDefaultSpecifier,
									);
									const lastNamed = [...signalsImport.specifiers]
										.reverse()
										.find(
											(s): s is TSESTree.ImportSpecifier =>
												s.type === AST_NODE_TYPES.ImportSpecifier,
										);

									if (hasNamespace) {
										// Cannot mix namespace with named specifiers in the same import; add a new line import
										fixes.push(
											fixer.insertTextAfter(
												signalsImport,
												"\nimport { useSignal } from '@preact/signals-react';\n",
											),
										);
									} else if (lastNamed) {
										fixes.push(fixer.insertTextAfter(lastNamed, ", useSignal"));
									} else if (defaultSpec) {
										// Rewrite default-only import to include named specifier group
										const defaultName = defaultSpec.local.name;
										fixes.push(
											fixer.replaceText(
												signalsImport,
												`import ${defaultName}, { useSignal } from '@preact/signals-react';`,
											),
										);
									} else {
										// No specifiers at all; just add a new line import
										fixes.push(
											fixer.insertTextAfter(
												signalsImport,
												"\nimport { useSignal } from '@preact/signals-react';\n",
											),
										);
									}
								}
							} else {
								const lastImport =
									importDeclarations[importDeclarations.length - 1];

								const importText =
									"\nimport { useSignal } from '@preact/signals-react';\n";

								const b = context.sourceCode.ast.body[0];

								if (!b) {
									return null;
								}

								fixes.push(
									typeof lastImport === "undefined"
										? fixer.insertTextBefore(b, importText.trimStart())
										: fixer.insertTextAfter(lastImport, importText),
								);
							}

							return fixes.length > 0 ? fixes : null;
						},
					});

					if (
						(typeof initialValue === "undefined" ||
							initialValue.type === AST_NODE_TYPES.Literal ||
							initialValue.type === AST_NODE_TYPES.Identifier) &&
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						stateVar.type === AST_NODE_TYPES.Identifier
					) {
						suggestions.push({
							messageId: "convertToUseSignal",
							fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
								const fixes: Array<TSESLint.RuleFix> = [];

								const importDeclarations = context.sourceCode.ast.body.filter(
									(
										n: TSESTree.ProgramStatement,
									): n is TSESTree.ImportDeclaration => {
										return n.type === AST_NODE_TYPES.ImportDeclaration;
									},
								);

								const signalsImport = importDeclarations.find(
									(
										d: TSESTree.ImportDeclaration,
									): d is TSESTree.ImportDeclaration => {
										return d.source.value === "@preact/signals-react";
									},
								);

								if (signalsImport) {
									const hasUseSignal = signalsImport.specifiers.some(
										(s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier =>
											s.type === AST_NODE_TYPES.ImportSpecifier &&
											s.imported.type === AST_NODE_TYPES.Identifier &&
											s.imported.name === "useSignal",
									);

									if (!hasUseSignal) {
										const hasNamespace = signalsImport.specifiers.some(
											(s) => s.type === AST_NODE_TYPES.ImportNamespaceSpecifier,
										);
										const defaultSpec = signalsImport.specifiers.find(
											(s): s is TSESTree.ImportDefaultSpecifier =>
												s.type === AST_NODE_TYPES.ImportDefaultSpecifier,
										);
										const lastNamed = [...signalsImport.specifiers]
											.reverse()
											.find(
												(s): s is TSESTree.ImportSpecifier =>
													s.type === AST_NODE_TYPES.ImportSpecifier,
											);

										if (hasNamespace) {
											fixes.push(
												fixer.insertTextAfter(
													signalsImport,
													"\nimport { useSignal } from '@preact/signals-react';\n",
												),
											);
										} else if (lastNamed) {
											fixes.push(
												fixer.insertTextAfter(lastNamed, ", useSignal"),
											);
										} else if (defaultSpec) {
											const defaultName = defaultSpec.local.name;
											fixes.push(
												fixer.replaceText(
													signalsImport,
													`import ${defaultName}, { useSignal } from '@preact/signals-react';`,
												),
											);
										} else {
											fixes.push(
												fixer.insertTextAfter(
													signalsImport,
													"\nimport { useSignal } from '@preact/signals-react';\n",
												),
											);
										}
									}
								} else {
									const lastImport =
										importDeclarations[importDeclarations.length - 1];

									const importText =
										"\nimport { useSignal } from '@preact/signals-react';\n";

									const b = context.sourceCode.ast.body[0];

									if (!b) {
										return null;
									}

									fixes.push(
										typeof lastImport === "undefined"
											? fixer.insertTextBefore(b, importText.trimStart())
											: fixer.insertTextAfter(lastImport, importText),
									);
								}

								{
									const initText = initialValue
										? context.sourceCode.getText(initialValue)
										: "undefined";

									// Preserve generic type arguments from useState<T>(...)
									// Support both legacy `typeParameters` and newer `typeArguments` fields from @typescript-eslint
									const typeParamsNode =
										(node.init &&
											("typeParameters" in node.init
												? node.init.typeParameters
												: "typeArguments" in node.init
													? node.init.typeArguments
													: null)) ??
										null;

									const typeParamsText = typeParamsNode
										? context.sourceCode.getText(typeParamsNode)
										: "";

									if (
										// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
										node.parent &&
										// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
										node.parent.type === AST_NODE_TYPES.VariableDeclaration &&
										node.parent.declarations.length === 1
									) {
										fixes.push(
											fixer.replaceText(
												node.parent,
												`const ${stateVar.name}${suffix} = useSignal${typeParamsText}(${initText})`,
											),
										);
									} else {
										fixes.push(
											fixer.replaceText(
												node,
												`${stateVar.name}${suffix} = useSignal${typeParamsText}(${initText})`,
											),
										);
									}

									const variable = context.sourceCode
										.getScope(node)
										.variables.find((v: Variable): boolean => {
											return v.name === stateVar.name;
										});

									if (variable) {
										for (const ref of variable.references) {
											const id = ref.identifier;
											// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
											if (!id || id.range[0] === stateVar.range[0]) {
												continue;
											}

											const ancestors = context.sourceCode.getAncestors(id);

											const isJsx = ancestors.some(
												(
													a: TSESTree.Node,
												): a is
													| TSESTree.JSXElement
													| TSESTree.JSXFragment
													| TSESTree.JSXAttribute
													| TSESTree.JSXExpressionContainer
													| TSESTree.JSXSpreadAttribute => {
													return (
														a.type === AST_NODE_TYPES.JSXElement ||
														a.type === AST_NODE_TYPES.JSXFragment ||
														a.type === AST_NODE_TYPES.JSXAttribute ||
														a.type === AST_NODE_TYPES.JSXExpressionContainer ||
														a.type === AST_NODE_TYPES.JSXSpreadAttribute
													);
												},
											);

											// In JSX attribute context? (either directly under JSXAttribute, or inside its expression container)
											const inJsxAttribute = ancestors.some(
												(a: TSESTree.Node, idx: number): boolean => {
													if (a.type === AST_NODE_TYPES.JSXAttribute) {
														return true;
													}

													if (
														a.type === AST_NODE_TYPES.JSXExpressionContainer &&
														idx > 0 &&
														ancestors[idx - 1]?.type ===
															AST_NODE_TYPES.JSXAttribute
													) {
														return true;
													}
													return false;
												},
											);

											// Determine if inside a component/hook function
											let inComponentScope = false;

											for (let i = ancestors.length - 1; i >= 0; i--) {
												// eslint-disable-next-line security/detect-object-injection
												const anc = ancestors[i];

												if (!anc) {
													continue;
												}

												if (anc.type === AST_NODE_TYPES.FunctionDeclaration) {
													if (anc.id && /^[A-Z]/.test(anc.id.name)) {
														inComponentScope = true;
													}

													break;
												}

												if (
													anc.type === AST_NODE_TYPES.FunctionExpression ||
													anc.type === AST_NODE_TYPES.ArrowFunctionExpression
												) {
													// Look for enclosing variable declarator with Uppercase name
													const vd = ancestors.find(
														(
															x: TSESTree.Node,
														): x is
															| TSESTree.VariableDeclaratorDefiniteAssignment
															| TSESTree.VariableDeclaratorMaybeInit
															| TSESTree.VariableDeclaratorNoInit
															| TSESTree.UsingInForOfDeclarator
															| TSESTree.UsingInNormalContextDeclarator => {
															return (
																x.type === AST_NODE_TYPES.VariableDeclarator
															);
														},
													);

													if (
														typeof vd !== "undefined" &&
														vd.id.type === AST_NODE_TYPES.Identifier &&
														/^[A-Z]/.test(vd.id.name)
													) {
														inComponentScope = true;
													}

													break;
												}
											}

											// Detect if inside a mathematical operation within JSX
											const inJsxMathOperation =
												isJsx &&
												ancestors.some((a: TSESTree.Node): boolean => {
													if (a.type === AST_NODE_TYPES.BinaryExpression) {
														return (
															a.operator === "+" ||
															a.operator === "-" ||
															a.operator === "*" ||
															a.operator === "/" ||
															a.operator === "%" ||
															a.operator === "**"
														);
													}
													if (a.type === AST_NODE_TYPES.UnaryExpression) {
														return a.operator === "+" || a.operator === "-";
													}
													if (a.type === AST_NODE_TYPES.UpdateExpression) {
														return true; // ++x, --x, x++, x--
													}
													if (a.type === AST_NODE_TYPES.AssignmentExpression) {
														return [
															"+=",
															"-=",
															"*=",
															"/=",
															"%=",
															"**=",
														].includes(a.operator);
													}
													return false;
												});

											const accessor =
												inJsxAttribute ||
												// Used as an argument to a call within JSX
												(isJsx &&
													ancestors.some((a: TSESTree.Node): boolean => {
														if (a.type !== AST_NODE_TYPES.CallExpression) {
															return false;
														}

														// If identifier is within callee, it's not an argument
														if (
															// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
															a.callee &&
															id.range[0] >= a.callee.range[0] &&
															id.range[1] <= a.callee.range[1]
														) {
															return false;
														}
														// Identifier lies within one of the arguments' ranges
														return a.arguments.some(
															(
																arg: TSESTree.CallExpressionArgument,
															): boolean => {
																// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
																if (!arg) {
																	return false;
																}

																return (
																	id.range[0] >= arg.range[0] &&
																	id.range[1] <= arg.range[1]
																);
															},
														);
													})) ||
												// In JSX math expressions, require .value
												inJsxMathOperation
													? ".value"
													: isJsx
														? ""
														: inComponentScope
															? ".value"
															: ".peek()";

											fixes.push(
												fixer.replaceText(
													id,
													`${stateVar.name}${suffix}${accessor}`,
												),
											);
										}
									}
								}

								return fixes;
							},
						});
					}

					context.report({
						node: node.init,
						messageId: "preferUseSignal",
						data: {
							type:
								typeof initialValue === "undefined"
									? "state"
									: initialValue.type === AST_NODE_TYPES.Literal
										? initialValue.value === null
											? "null"
											: typeof initialValue.value
										: initialValue.type === AST_NODE_TYPES.TemplateLiteral
											? "string"
											: initialValue.type === AST_NODE_TYPES.Identifier
												? "identifier"
												: "state",
						},
						suggest: suggestions,
					});
				}
			},

			[`${AST_NODE_TYPES.VariableDeclarator}:exit`](
				node: TSESTree.VariableDeclarator,
			): void {
				if (
					node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
					node.init?.type === AST_NODE_TYPES.FunctionExpression
				) {
					if (
						node.id.type === AST_NODE_TYPES.Identifier &&
						/^[A-Z]/.test(node.id.name)
					) {
						inComponentOrHook = false;
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
