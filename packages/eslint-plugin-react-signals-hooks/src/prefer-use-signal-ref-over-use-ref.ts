/** biome-ignore-all assist/source/organizeImports: off */
import type {
	Scope,
	Variable,
	GlobalScope,
} from "@typescript-eslint/scope-manager";
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
	| "preferUseSignalRef"
	| "addUseSignalRefImport"
	| "convertToUseSignalRef";

type Severity = {
	[key in MessageIds]?: "error" | "warn" | "off";
};

type Option = {
	onlyWhenReadInRender?: boolean;
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error";
	}

	switch (messageId) {
		case "preferUseSignalRef": {
			return options.severity.preferUseSignalRef ?? "error";
		}

		case "addUseSignalRefImport": {
			return options.severity.addUseSignalRefImport ?? "error";
		}

		case "convertToUseSignalRef": {
			return options.severity.convertToUseSignalRef ?? "error";
		}

		default: {
			return "error";
		}
	}
}

function isUseRefCall(
	expr: TSESTree.CallExpression,
	useRefLocalNames: Set<string>,
	reactNamespaces: Set<string>,
): boolean {
	if (
		expr.callee.type === AST_NODE_TYPES.Identifier &&
		useRefLocalNames.has(expr.callee.name)
	) {
		return true;
	}

	if (
		expr.callee.type === AST_NODE_TYPES.MemberExpression &&
		expr.callee.object.type === AST_NODE_TYPES.Identifier &&
		reactNamespaces.has(expr.callee.object.name) &&
		expr.callee.property.type === AST_NODE_TYPES.Identifier &&
		expr.callee.property.name === "useRef"
	) {
		return true;
	}

	return false;
}

function isInsideEffectCallback(
	node: TSESTree.Node,
	useEffectLocalNames: Set<string>,
	reactNamespaces: Set<string>,
): boolean {
	let cur: TSESTree.Node | undefined = node.parent;

	while (cur) {
		if (
			cur.type === AST_NODE_TYPES.ArrowFunctionExpression ||
			cur.type === AST_NODE_TYPES.FunctionExpression
		) {
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
			if (cur.parent && cur.parent.type === AST_NODE_TYPES.CallExpression) {
				if (
					cur.parent.callee.type === AST_NODE_TYPES.Identifier &&
					useEffectLocalNames.has(cur.parent.callee.name)
				) {
					return true;
				}
				if (
					cur.parent.callee.type === AST_NODE_TYPES.MemberExpression &&
					cur.parent.callee.object.type === AST_NODE_TYPES.Identifier &&
					reactNamespaces.has(cur.parent.callee.object.name) &&
					cur.parent.callee.property.type === AST_NODE_TYPES.Identifier &&
					useEffectLocalNames.has(cur.parent.callee.property.name)
				) {
					return true;
				}
			}
		}

		cur = cur.parent;
	}
	return false;
}

const ruleName = "prefer-use-signal-ref-over-use-ref";

export const preferUseSignalRefOverUseRefRule = ESLintUtils.RuleCreator(
	(name: string): string => getRuleDocUrl(name),
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		hasSuggestions: true,
		docs: {
			description:
				"Encourage using `useSignalRef` instead of `useRef` when reading .current during render/JSX to make the value reactive and aligned with Signals.",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			preferUseSignalRef:
				"Prefer useSignalRef over useRef when reading .current during render",
			addUseSignalRefImport:
				"Add `useSignalRef` import from '@preact/signals-react/utils'",
			convertToUseSignalRef: "Convert this useRef to useSignalRef",
		},
		schema: [
			{
				type: "object",
				properties: {
					onlyWhenReadInRender: {
						type: "boolean",
						default: true,
						description:
							"When true, only suggest for refs whose .current is read during render/JSX.",
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
							preferUseSignalRef: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							addUseSignalRefImport: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							convertToUseSignalRef: {
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
		fixable: "code",
	},
	defaultOptions: [
		{
			onlyWhenReadInRender: true,
			performance: DEFAULT_PERFORMANCE_BUDGET,
			severity: {
				preferUseSignalRef: "error",
				addUseSignalRefImport: "error",
				convertToUseSignalRef: "error",
			},
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

		const useRefLocalNames = new Set<string>(["useRef"]);
		const reactNamespaces = new Set<string>();
		const useEffectLocalNames = new Set<string>([
			"useEffect",
			"useLayoutEffect",
			"useInsertionEffect",
		]);

		// Track declarations and reads
		const refDeclMap = new Map<string, TSESTree.CallExpression>();
		const refIdNodeMap = new Map<string, TSESTree.Identifier>();
		const refVarDeclMap = new Map<string, TSESTree.VariableDeclarator>();
		const refReadInRender = new Set<string>();

		let inComponentOrHook = false;

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
								spec.imported.name === "useRef"
							) {
								useRefLocalNames.add(spec.local.name);
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
				// Heuristic for components declared as const MyComp = () => {}
				if (
					(node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
						node.init?.type === AST_NODE_TYPES.FunctionExpression) &&
					node.id.type === AST_NODE_TYPES.Identifier &&
					/^[A-Z]/.test(node.id.name)
				) {
					inComponentOrHook = true;
				}

				if (
					node.id.type === AST_NODE_TYPES.Identifier &&
					node.init?.type === AST_NODE_TYPES.CallExpression &&
					isUseRefCall(node.init, useRefLocalNames, reactNamespaces)
				) {
					refDeclMap.set(node.id.name, node.init);
					refIdNodeMap.set(node.id.name, node.id);
					refVarDeclMap.set(node.id.name, node);
				}
			},

			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				if (
					node.callee.type === AST_NODE_TYPES.Identifier &&
					(node.callee.name === "useEffect" ||
						node.callee.name === "useLayoutEffect" ||
						node.callee.name === "useInsertionEffect")
				) {
					useEffectLocalNames.add(node.callee.name);
				}
			},

			[AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
				if (!inComponentOrHook) {
					return;
				}

				if (
					node.object.type === AST_NODE_TYPES.Identifier &&
					node.property.type === AST_NODE_TYPES.Identifier &&
					node.property.name === "current" &&
					refDeclMap.has(node.object.name)
				) {
					if (
						option?.onlyWhenReadInRender !== false &&
						isInsideEffectCallback(node, useEffectLocalNames, reactNamespaces)
					) {
						return;
					}

					refReadInRender.add(node.object.name);
				}
			},

			[`${AST_NODE_TYPES.Program}:exit`](): void {
				for (const name of refReadInRender) {
					const init = refDeclMap.get(name);

					if (!init) {
						continue;
					}

					if (getSeverity("preferUseSignalRef", option) === "off") {
						continue;
					}

					const suggestions: TSESLint.ReportSuggestionArray<MessageIds> = [];

					suggestions.push({
						messageId: "addUseSignalRefImport",
						fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
							const fixes: Array<TSESLint.RuleFix> = [];

							const importDeclarations = context.sourceCode.ast.body.filter(
								(
									n: TSESTree.ProgramStatement,
								): n is TSESTree.ImportDeclaration => {
									return n.type === AST_NODE_TYPES.ImportDeclaration;
								},
							);

							const utilsImport = importDeclarations.find(
								(d: TSESTree.ImportDeclaration): boolean => {
									return d.source.value === "@preact/signals-react/utils";
								},
							);

							if (utilsImport) {
								const hasUseSignalRef = utilsImport.specifiers.some(
									(s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
										return (
											s.type === AST_NODE_TYPES.ImportSpecifier &&
											s.imported.type === AST_NODE_TYPES.Identifier &&
											s.imported.name === "useSignalRef"
										);
									},
								);

								if (!hasUseSignalRef) {
									const hasNamespace = utilsImport.specifiers.some(
										(
											s: TSESTree.ImportClause,
										): s is TSESTree.ImportNamespaceSpecifier => {
											return s.type === AST_NODE_TYPES.ImportNamespaceSpecifier;
										},
									);

									const defaultSpec = utilsImport.specifiers.find(
										(
											s: TSESTree.ImportClause,
										): s is TSESTree.ImportDefaultSpecifier => {
											return s.type === AST_NODE_TYPES.ImportDefaultSpecifier;
										},
									);

									const lastNamed = [...utilsImport.specifiers]
										.reverse()
										.find(
											(
												s: TSESTree.ImportClause,
											): s is TSESTree.ImportSpecifier => {
												return s.type === AST_NODE_TYPES.ImportSpecifier;
											},
										);
									if (hasNamespace) {
										fixes.push(
											fixer.insertTextAfter(
												utilsImport,
												"\nimport { useSignalRef } from '@preact/signals-react/utils';\n",
											),
										);
									} else if (lastNamed) {
										fixes.push(
											fixer.insertTextAfter(lastNamed, ", useSignalRef"),
										);
									} else if (defaultSpec) {
										fixes.push(
											fixer.replaceText(
												utilsImport,
												`import ${defaultSpec.local.name}, { useSignalRef } from '@preact/signals-react/utils';`,
											),
										);
									} else {
										fixes.push(
											fixer.insertTextBefore(
												utilsImport,
												"import { useSignalRef } from '@preact/signals-react/utils';\n",
											),
										);
									}
								}
							} else {
								const firstImport = context.sourceCode.ast.body.find(
									(
										n: TSESTree.ProgramStatement,
									): n is TSESTree.ImportDeclaration => {
										return n.type === AST_NODE_TYPES.ImportDeclaration;
									},
								);

								if (firstImport) {
									fixes.push(
										fixer.insertTextBefore(
											firstImport,
											"import { useSignalRef } from '@preact/signals-react/utils';\n",
										),
									);
								} else {
									fixes.push(
										fixer.insertTextAfterRange(
											[0, 0],
											"import { useSignalRef } from '@preact/signals-react/utils';\n",
										),
									);
								}
							}

							return fixes;
						},
					});

					suggestions.push({
						messageId: "convertToUseSignalRef",
						fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
							const fixes: Array<TSESLint.RuleFix> = [];

							if (init.callee.type === AST_NODE_TYPES.Identifier) {
								fixes.push(fixer.replaceText(init.callee, "useSignalRef"));
							} else if (
								init.callee.type === AST_NODE_TYPES.MemberExpression &&
								init.callee.property.type === AST_NODE_TYPES.Identifier &&
								init.callee.property.name === "useRef"
							) {
								fixes.push(
									fixer.replaceText(init.callee.property, "useSignalRef"),
								);
							}

							const idNode = refIdNodeMap.get(name);
							const varDecl = refVarDeclMap.get(name);

							function computeNewName(orig: string): string {
								if (orig.endsWith("SignalRef")) return orig;
								if (orig.endsWith("Ref"))
									return `${orig.slice(0, -3)}SignalRef`;
								if (orig.endsWith("ref"))
									return `${orig.slice(0, -3)}SignalRef`;
								return `${orig}SignalRef`;
							}

							const newName = computeNewName(name);

							if (
								typeof idNode !== "undefined" &&
								typeof varDecl !== "undefined" &&
								context.sourceCode.scopeManager !== null &&
								newName !== name
							) {
								fixes.push(fixer.replaceText(idNode, newName));

								const visited = new Set<GlobalScope | Scope>();

								function collectScopes(
									scope: GlobalScope | Scope | null,
								): Array<GlobalScope | Scope> {
									if (scope === null || visited.has(scope)) {
										return [];
									}

									const out: Array<GlobalScope | Scope> = [];

									visited.add(scope);

									out.push(scope);

									for (const child of scope.childScopes) {
										collectScopes(child);
									}

									return out;
								}

								const allScopes = collectScopes(
									context.sourceCode.scopeManager.globalScope,
								);

								let targetVar: Variable | null = null;

								for (const sc of allScopes) {
									const found = sc.variables.find((v: Variable): boolean => {
										if (v.name !== name) {
											return false;
										}

										return (
											typeof v.defs[0] !== "undefined" &&
											v.defs[0].node === varDecl
										);
									});

									if (typeof found !== "undefined") {
										targetVar = found;

										break;
									}
								}

								if (targetVar !== null) {
									const seen = new Set<string>();

									for (const ref of targetVar.references) {
										const key = `${ref.identifier.range[0]}:${ref.identifier.range[1]}`;

										if (!seen.has(key)) {
											fixes.push(fixer.replaceText(ref.identifier, newName));

											seen.add(key);
										}
									}
								}
							}

							return fixes.length > 0 ? fixes : null;
						},
					});

					context.report({
						node: init,
						messageId: "preferUseSignalRef",
						suggest: suggestions,
					});
				}

				endPhase(perfKey, "ruleExecution");
			},
		};
	},
});
