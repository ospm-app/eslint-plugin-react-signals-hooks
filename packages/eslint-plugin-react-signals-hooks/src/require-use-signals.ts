/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	type TSESTree,
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

import {
	buildNamedImport,
	getPreferredQuote,
	getPreferredSemicolon,
} from "./utils/import-format.js";
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
	| "missingUseSignalsInComponent"
	| "missingUseSignalsInCustomHook"
	| "wrongUseSignalsArg";

type Severity = {
	[key in MessageIds]?: "error" | "warn" | "off";
};

type Option = {
	ignoreComponents?: Array<string>;
	performance?: PerformanceBudget;
	severity?: Severity;
	/** Configurable suffix to recognize as signals (default: 'Signal') */
	suffix?: string;
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
		case "missingUseSignalsInComponent": {
			return options.severity.missingUseSignalsInComponent ?? "error";
		}

		case "missingUseSignalsInCustomHook": {
			return options.severity.missingUseSignalsInCustomHook ?? "error";
		}

		case "wrongUseSignalsArg": {
			return options.severity.wrongUseSignalsArg ?? "error";
		}

		default: {
			return "error";
		}
	}
}

function isSignalUsageLocal(node: TSESTree.Node, suffixRegex: RegExp): boolean {
	if (node.type === AST_NODE_TYPES.ChainExpression) {
		return isSignalUsageLocal(node.expression, suffixRegex);
	}

	if (node.type === AST_NODE_TYPES.MemberExpression) {
		if (
			node.property.type === AST_NODE_TYPES.Identifier &&
			(node.property.name === "value" || node.property.name === "peek")
		) {
			if (
				node.property.name === "peek" && // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
				(!node.parent ||
					!(
						(node.parent.type === AST_NODE_TYPES.CallExpression &&
							node.parent.callee === node) ||
						(node.parent.type === AST_NODE_TYPES.ChainExpression &&
							node.parent.expression.type === AST_NODE_TYPES.CallExpression &&
							node.parent.expression.callee === node)
					))
			) {
				return false;
			}

			let base: TSESTree.Expression | TSESTree.PrivateIdentifier = node.object;

			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
			while (base && base.type === AST_NODE_TYPES.MemberExpression) {
				base = base.object;
			}
			// Unwrap chain at base as well
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
			if (base && base.type === AST_NODE_TYPES.ChainExpression) {
				base = base.expression;
			}

			return (
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
				!!base &&
				base.type === AST_NODE_TYPES.Identifier &&
				hasSignalSuffix(base.name, suffixRegex)
			);
		}

		return false;
	}

	if (node.type === AST_NODE_TYPES.Identifier) {
		// Exclude various non-value or declaration/name positions to reduce false positives
		const parent = node.parent;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
		if (!parent) {
			return false;
		}

		// Skip when part of a MemberExpression (handled above when accessing .value/.peek)
		if (
			parent.type === AST_NODE_TYPES.MemberExpression &&
			parent.object === node
		) {
			return false;
		}
		// Skip import/export specifiers and type positions
		if (
			parent.type === AST_NODE_TYPES.ImportSpecifier ||
			parent.type === AST_NODE_TYPES.ExportSpecifier ||
			parent.type === AST_NODE_TYPES.TSTypeReference ||
			parent.type === AST_NODE_TYPES.TSTypeAnnotation ||
			parent.type === AST_NODE_TYPES.TSQualifiedName ||
			parent.type === AST_NODE_TYPES.TSTypeParameter ||
			parent.type === AST_NODE_TYPES.TSEnumMember ||
			parent.type === AST_NODE_TYPES.TSTypeAliasDeclaration
		) {
			return false;
		}
		// Skip label and property key/name contexts
		if (
			parent.type === AST_NODE_TYPES.LabeledStatement ||
			(parent.type === AST_NODE_TYPES.Property &&
				parent.key === node &&
				parent.computed === false) ||
			parent.type === AST_NODE_TYPES.PropertyDefinition ||
			(parent.type === AST_NODE_TYPES.MethodDefinition && parent.key === node)
		) {
			return false;
		}
		// Skip JSX identifier/name contexts
		if (
			parent.type === AST_NODE_TYPES.JSXIdentifier ||
			parent.type === AST_NODE_TYPES.JSXAttribute ||
			parent.type === AST_NODE_TYPES.JSXMemberExpression
		) {
			return false;
		}

		return hasSignalSuffix(node.name, suffixRegex);
	}

	return false;
}

// Helper: find or create a store declaration within the component body.
// Reuses an existing `const <name> = useSignals(...)` if found; otherwise inserts
// a unique declaration after directives and returns the chosen name.
function findOrCreateStoreDeclaration(
	componentNode:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
	fixer: TSESLint.RuleFixer,
	fixes: Array<TSESLint.RuleFix>,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): string {
	let storeName = "store";

	let hasExistingStoreDecl = false;

	if ("body" in componentNode.body && Array.isArray(componentNode.body.body)) {
		for (const stmt of componentNode.body.body) {
			if (stmt.type !== AST_NODE_TYPES.VariableDeclaration) {
				continue;
			}

			for (const decl of stmt.declarations) {
				if (
					decl.id.type === AST_NODE_TYPES.Identifier &&
					decl.init &&
					((decl.init.type === AST_NODE_TYPES.CallExpression &&
						decl.init.callee.type === AST_NODE_TYPES.Identifier &&
						decl.init.callee.name === "useSignals") ||
						(decl.init.type === AST_NODE_TYPES.ChainExpression &&
							decl.init.expression.type === AST_NODE_TYPES.CallExpression &&
							decl.init.expression.callee.type === AST_NODE_TYPES.Identifier &&
							decl.init.expression.callee.name === "useSignals"))
				) {
					storeName = decl.id.name;

					hasExistingStoreDecl = true;

					break;
				}
			}

			if (hasExistingStoreDecl) {
				break;
			}
		}
	}

	if (!hasExistingStoreDecl) {
		let __idx = 1;

		while (
			// eslint-disable-next-line security/detect-non-literal-regexp
			new RegExp(`\\b(?:const|let|var)\\s+${storeName}\\b`).test(
				context.sourceCode.getText(componentNode.body),
			)
		) {
			storeName = `store${__idx++}`;
		}
	}

	// Insert const store = useSignals(X) after directives if it doesn't exist
	if (!hasExistingStoreDecl) {
		let lastDirectiveEnd: number | null = null;

		if (
			"body" in componentNode.body &&
			Array.isArray(componentNode.body.body)
		) {
			for (const stmt of componentNode.body.body) {
				if (
					stmt.type === AST_NODE_TYPES.ExpressionStatement &&
					stmt.expression.type === AST_NODE_TYPES.Literal &&
					typeof stmt.expression.value === "string"
				) {
					lastDirectiveEnd = stmt.range[1];

					continue;
				}

				break;
			}
		}

		const insertDeclPos = lastDirectiveEnd ?? componentNode.body.range[0] + 1;

		fixes.push(
			fixer.insertTextAfterRange(
				[insertDeclPos, insertDeclPos],
				`\nconst ${storeName} = useSignals(${computeExpectedArg(componentNode)});\n`,
			),
		);
	}

	return storeName;
}

// Helper: ensure there is a try/finally calling store.f(). If a try/finally
// exists, append `${storeName}.f();` if not present; else wrap the body.
function wrapBodyInTryFinally(
	componentNode:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
	storeName: string,
	hasTryFinallyInCurrent: boolean,
	fixer: TSESLint.RuleFixer,
	fixes: Array<TSESLint.RuleFix>,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): void {
	if (
		hasTryFinallyInCurrent &&
		"body" in componentNode.body &&
		Array.isArray(componentNode.body.body)
	) {
		const tryWithFinally = componentNode.body.body.find(
			(s: TSESTree.Statement): s is TSESTree.TryStatement => {
				return s.type === AST_NODE_TYPES.TryStatement && s.finalizer != null;
			},
		);

		if (tryWithFinally?.finalizer) {
			const beforeClose = tryWithFinally.finalizer.range[1] - 1;
			if (
				!/\.f\s*\(\s*\)\s*;?/.test(
					context.sourceCode.getText(tryWithFinally.finalizer),
				)
			) {
				fixes.push(
					fixer.insertTextBeforeRange(
						[beforeClose, beforeClose],
						`\n${storeName}.f();\n`,
					),
				);
			}
		}
		return;
	}

	// No try/finally exists. Wrap the remaining body in try/finally
	let directiveCount = 0;

	if ("body" in componentNode.body && Array.isArray(componentNode.body.body)) {
		for (const stmt of componentNode.body.body) {
			if (
				stmt.type === AST_NODE_TYPES.ExpressionStatement &&
				stmt.expression.type === AST_NODE_TYPES.Literal &&
				typeof stmt.expression.value === "string"
			) {
				directiveCount++;
				continue;
			}

			break;
		}

		const firstNonDirective = componentNode.body.body[directiveCount as number];
		const insertDeclPos =
			typeof firstNonDirective === "undefined"
				? componentNode.body.range[0] + 1
				: firstNonDirective.range[0];

		fixes.push(
			fixer.insertTextBeforeRange([insertDeclPos, insertDeclPos], "try {\n"),
		);
	}

	const beforeBodyClose = componentNode.body.range[1] - 1;

	fixes.push(
		fixer.insertTextBeforeRange(
			[beforeBodyClose, beforeBodyClose],
			`\n} finally {\n${storeName}.f();\n}\n`,
		),
	);
}

function isHook(node: TSESTree.Node | null): boolean {
	if (
		node?.type === AST_NODE_TYPES.FunctionDeclaration &&
		typeof node.id?.name === "string"
	) {
		return /^use[A-Z]/.test(node.id.name);
	}
	if (
		(node?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
			node?.type === AST_NODE_TYPES.FunctionExpression) &&
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
		node.parent &&
		node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
		node.parent.id.type === AST_NODE_TYPES.Identifier
	) {
		return /^use[A-Z]/.test(node.parent.id.name);
	}
	return false;
}

function inferIsHook(n: TSESTree.Node): boolean {
	if (
		n.type === AST_NODE_TYPES.FunctionDeclaration &&
		typeof n.id?.name === "string"
	) {
		return /^use[A-Z]/.test(n.id.name);
	}
	if (
		(n.type === AST_NODE_TYPES.ArrowFunctionExpression ||
			n.type === AST_NODE_TYPES.FunctionExpression) &&
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
		n.parent &&
		n.parent.type === AST_NODE_TYPES.VariableDeclarator &&
		n.parent.id.type === AST_NODE_TYPES.Identifier
	) {
		return /^use[A-Z]/.test(n.parent.id.name);
	}

	return false;
}

// Helper: is the node inside the current component's function body?
function isInsideCurrentComponent(
	n: TSESTree.Node,
	componentNode: TSESTree.Node | null,
): boolean {
	if (componentNode === null) {
		return false;
	}

	const [nStart, nEnd] = n.range;

	const [cStart, cEnd] = componentNode.range;

	return nStart >= cStart && nEnd <= cEnd;
}

// Helper: map component to expected useSignals(...) argument
function computeExpectedArg(
	componentNode:
		| TSESTree.FunctionDeclaration
		| TSESTree.FunctionExpression
		| TSESTree.ArrowFunctionExpression,
): number {
	return inferIsHook(componentNode) ? 2 : 1;
}

function ensureUseSignalsImport(
	fixer: TSESLint.RuleFixer,
	fixes: Array<TSESLint.RuleFix>,
	context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
): void {
	const signalsImport = context.sourceCode.ast.body.find(
		(n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
			return (
				n.type === AST_NODE_TYPES.ImportDeclaration &&
				n.source.value === "@preact/signals-react/runtime"
			);
		},
	);

	if (typeof signalsImport === "undefined") {
		// Insert a fresh value import right after the last top-level import declaration
		const body = context.sourceCode.ast.body;
		const lastTopImport = (() => {
			let last: TSESTree.ProgramStatement | undefined;
			for (const stmt of body) {
				if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
					last = stmt;
				} else {
					break;
				}
			}
			return last;
		})();

		const quote = getPreferredQuote(context.sourceCode);
		const semi = getPreferredSemicolon(context.sourceCode);
		const text = buildNamedImport(
			"@preact/signals-react/runtime",
			["useSignals"],
			quote,
			semi,
		);

		if (typeof lastTopImport !== "undefined") {
			fixes.push(fixer.insertTextAfter(lastTopImport, text));
		} else if (typeof body[0] !== "undefined") {
			fixes.push(fixer.insertTextBefore(body[0], text));
		} else {
			// Empty file fallback
			fixes.push(fixer.insertTextAfterRange([0, 0], text));
		}
		return;
	}

	if (
		!signalsImport.specifiers.some(
			(s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
				return (
					s.type === AST_NODE_TYPES.ImportSpecifier &&
					s.imported.type === AST_NODE_TYPES.Identifier &&
					s.imported.name === "useSignals"
				);
			},
		)
	) {
		const lastNamed = [...signalsImport.specifiers]
			.reverse()
			.find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
				return s.type === AST_NODE_TYPES.ImportSpecifier;
			});

		if (
			typeof lastNamed !== "undefined" &&
			// append only when this import is a value import
			(typeof signalsImport.importKind === "undefined" ||
				signalsImport.importKind === "value")
		) {
			fixes.push(fixer.insertTextAfter(lastNamed, ", useSignals"));
		} else {
			const quote = getPreferredQuote(context.sourceCode);
			const semi = getPreferredSemicolon(context.sourceCode);
			fixes.push(
				fixer.insertTextAfter(
					signalsImport,
					`\n${buildNamedImport(
						"@preact/signals-react/runtime",
						["useSignals"],
						quote,
						semi,
					)}`,
				),
			);
		}
	}
}

let hasUseSignals = false;

let hasSignalUsage = false;

let componentName = "";
let componentNode: TSESTree.Node | null = null;
let isHookContext = false;
let hasTryFinallyInCurrent = false;

const ruleName = "require-use-signals";

export const requireUseSignalsRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "problem", // Changed from 'suggestion' to 'problem' as missing useSignals() can break reactivity
		docs: {
			description:
				"Ensures that components and custom hooks using signals properly import and call the `useSignals()` hook. This hook is essential for signal reactivity in React components and hooks. The rule helps prevent subtle bugs by ensuring that any component or hook using signals has the necessary hook in place.",
			url: getRuleDocUrl(ruleName),
		},
		hasSuggestions: true,
		messages: {
			missingUseSignalsInComponent:
				"Component '{{componentName}}' reads signals; call useSignals() to subscribe for updates",
			missingUseSignalsInCustomHook:
				"Custom hook '{{hookName}}' reads signals; call useSignals() to subscribe for updates",
			wrongUseSignalsArg:
				"'useSignals({{got}})' is not appropriate here; expected 'useSignals({{expected}})' when used with try/finally in a {{contextKind}}",
		},
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					ignoreComponents: {
						type: "array",
						items: { type: "string" },
						description: "List of component names to ignore",
					},
					severity: {
						type: "object",
						properties: {
							missingUseSignalsInComponent: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							missingUseSignalsInCustomHook: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							wrongUseSignalsArg: {
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
					suffix: {
						description:
							"Configurable suffix used to detect signal identifiers (default: 'Signal')",
						type: "string",
						default: "Signal",
					},
				},
			},
		],
		fixable: "code",
	},
	defaultOptions: [
		{
			ignoreComponents: [],
			suffix: "Signal",
			performance: DEFAULT_PERFORMANCE_BUDGET,
		} satisfies Option,
	],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		const suffixRegex = buildSuffixRegex(option?.suffix);

		// Only run this rule for TSX files (React components). Avoids leaking into non-React TS/JS files.
		if (!/\.tsx$/i.test(context.filename)) {
			return {};
		}

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

		startPhase(perfKey, "ruleExecution");

		const useSignalsLocalNames = new Set<string>(["useSignals"]);
		const signalCreatorLocals = new Set<string>(["signal"]);
		const computedCreatorLocals = new Set<string>(["computed"]);
		const creatorNamespaces = new Set<string>();
		const signalVariables = new Set<string>();

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

			[AST_NODE_TYPES.FunctionDeclaration](
				node: TSESTree.FunctionDeclaration,
			): void {
				if (typeof node.id?.name !== "string") return;

				if (/^[A-Z]/.test(node.id.name)) {
					// React component
					componentName = node.id.name;
					componentNode = node;
					isHookContext = false;
				} else if (/^use[A-Z]/.test(node.id.name)) {
					// Custom hook
					componentName = node.id.name;
					componentNode = node;
					isHookContext = true;
				} else {
					return;
				}

				hasUseSignals = false;
				hasSignalUsage = false;
				hasTryFinallyInCurrent =
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					node.body?.type === AST_NODE_TYPES.BlockStatement &&
					node.body.body.some(
						(s) =>
							s.type === AST_NODE_TYPES.TryStatement && s.finalizer != null,
					);
			},

			[AST_NODE_TYPES.ArrowFunctionExpression](
				node: TSESTree.ArrowFunctionExpression,
			): void {
				if (
					!(
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier &&
						(/^[A-Z]/.test(node.parent.id.name) ||
							/^use[A-Z]/.test(node.parent.id.name))
					)
				) {
					return;
				}

				componentName = node.parent.id.name;
				componentNode = node;
				isHookContext = /^use[A-Z]/.test(node.parent.id.name);
				hasUseSignals = false;
				hasSignalUsage = false;
				hasTryFinallyInCurrent =
					node.body.type === AST_NODE_TYPES.BlockStatement &&
					node.body.body.some(
						(s) =>
							s.type === AST_NODE_TYPES.TryStatement && s.finalizer != null,
					);
			},

			[AST_NODE_TYPES.FunctionExpression](
				node: TSESTree.FunctionExpression,
			): void {
				if (
					!(
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier &&
						(/^[A-Z]/.test(node.parent.id.name) ||
							/^use[A-Z]/.test(node.parent.id.name))
					)
				) {
					return;
				}

				componentName = node.parent.id.name;
				componentNode = node;
				isHookContext = /^use[A-Z]/.test(node.parent.id.name);
				hasUseSignals = false;
				hasSignalUsage = false;
				hasTryFinallyInCurrent =
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					node.body.type === AST_NODE_TYPES.BlockStatement &&
					node.body.body.some((s: TSESTree.Statement): boolean => {
						return (
							s.type === AST_NODE_TYPES.TryStatement && s.finalizer != null
						);
					});
			},

			[AST_NODE_TYPES.ExportDefaultDeclaration](
				node: TSESTree.ExportDefaultDeclaration,
			): void {
				if (node.declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
					if (node.declaration.id && /^[A-Z]/.test(node.declaration.id.name)) {
						componentName = node.declaration.id.name;
						componentNode = node.declaration;
						isHookContext = false;
						hasUseSignals = false;
						hasSignalUsage = false;
					} else if (!node.declaration.id) {
						componentName = "default";
						componentNode = node.declaration;
						isHookContext = false;
						hasUseSignals = false;
						hasSignalUsage = false;
					}
				} else if (
					node.declaration.type === AST_NODE_TYPES.ArrowFunctionExpression ||
					node.declaration.type === AST_NODE_TYPES.FunctionExpression
				) {
					componentName = "default";
					componentNode = node.declaration;
					isHookContext = false;
					hasUseSignals = false;
					hasSignalUsage = false;
				}
			},

			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				if (
					(node.callee.type === AST_NODE_TYPES.Identifier &&
						useSignalsLocalNames.has(node.callee.name)) ||
					(node.callee.type === AST_NODE_TYPES.MemberExpression &&
						node.callee.property.type === AST_NODE_TYPES.Identifier &&
						node.callee.property.name === "useSignals")
				) {
					if (isInsideCurrentComponent(node, componentNode)) {
						hasUseSignals = true;
					} else {
						return;
					}

					if (hasTryFinallyInCurrent) {
						const expected = isHookContext ? 2 : 1;

						if (node.arguments.length === 0) {
							if (getSeverity("wrongUseSignalsArg", option) !== "off") {
								context.report({
									node,
									messageId: "wrongUseSignalsArg",
									data: {
										got: "none",
										expected: String(expected),
										contextKind: isHookContext ? "custom hook" : "component",
									},
									fix(fixer) {
										// Insert expected argument before the closing parenthesis
										return fixer.insertTextBeforeRange(
											[node.range[1] - 1, node.range[1] - 1],
											String(expected),
										);
									},
								});
							}
						} else {
							const arg0 = node.arguments[0];
							if (
								arg0?.type === AST_NODE_TYPES.Literal &&
								typeof arg0.value === "number"
							) {
								const got = arg0.value;
								if (
									got !== expected &&
									getSeverity("wrongUseSignalsArg", option) !== "off"
								) {
									context.report({
										node: arg0,
										messageId: "wrongUseSignalsArg",
										data: {
											got: String(got),
											expected: String(expected),
											contextKind: isHookContext ? "custom hook" : "component",
										},
										fix(fixer) {
											return fixer.replaceText(arg0, String(expected));
										},
									});
								}
							}
						}
					}
				}
			},

			[AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
				if (!isInsideCurrentComponent(node, componentNode)) {
					return;
				}

				if (isSignalUsageLocal(node, suffixRegex)) {
					hasSignalUsage = true;

					return;
				}

				if (
					node.property.type === AST_NODE_TYPES.Identifier &&
					(node.property.name === "value" || node.property.name === "peek")
				) {
					let base: TSESTree.Expression | TSESTree.PrivateIdentifier =
						node.object;

					// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
					while (base && base.type === AST_NODE_TYPES.MemberExpression) {
						base = base.object;
					}

					if (
						// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
						base &&
						base.type === AST_NODE_TYPES.Identifier &&
						signalVariables.has(base.name)
					) {
						hasSignalUsage = true;
					}
				}
			},

			[AST_NODE_TYPES.VariableDeclarator](
				node: TSESTree.VariableDeclarator,
			): void {
				if (!isInsideCurrentComponent(node, componentNode)) {
					return;
				}

				if (node.id.type === AST_NODE_TYPES.ObjectPattern && node.init) {
					const hasValueOrPeek = node.id.properties.some((p) => {
						return (
							p.type === AST_NODE_TYPES.Property &&
							p.key.type === AST_NODE_TYPES.Identifier &&
							(p.key.name === "value" || p.key.name === "peek")
						);
					});

					if (!hasValueOrPeek) {
						return;
					}

					// Walk to base of init
					let base: TSESTree.Expression | TSESTree.PrivateIdentifier | null =
						node.init;

					// Unwrap optional chain wrapper
					// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
					if (base && base.type === AST_NODE_TYPES.ChainExpression) {
						base = base.expression;
					}

					// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
					while (base && base.type === AST_NODE_TYPES.MemberExpression) {
						base = base.object;
						// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
						if (base && base.type === AST_NODE_TYPES.ChainExpression) {
							base = base.expression;
						}
					}

					if (
						// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
						base &&
						base.type === AST_NODE_TYPES.Identifier &&
						(hasSignalSuffix(base.name, suffixRegex) ||
							signalVariables.has(base.name))
					) {
						hasSignalUsage = true;
					}
				}
			},

			[AST_NODE_TYPES.Identifier](node: TSESTree.Identifier): void {
				if (!isInsideCurrentComponent(node, componentNode)) {
					return;
				}

				if (isSignalUsageLocal(node, suffixRegex)) {
					hasSignalUsage = true;

					return;
				}

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
				if (!node.parent) {
					return;
				}

				if (
					node.parent.type === AST_NODE_TYPES.MemberExpression &&
					node.parent.object === node
				) {
					return;
				}

				if (
					node.parent.type === AST_NODE_TYPES.ImportSpecifier ||
					node.parent.type === AST_NODE_TYPES.ExportSpecifier ||
					node.parent.type === AST_NODE_TYPES.TSTypeReference ||
					node.parent.type === AST_NODE_TYPES.TSTypeAnnotation ||
					node.parent.type === AST_NODE_TYPES.TSQualifiedName ||
					node.parent.type === AST_NODE_TYPES.TSTypeParameter ||
					node.parent.type === AST_NODE_TYPES.TSEnumMember ||
					node.parent.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
					node.parent.type === AST_NODE_TYPES.LabeledStatement ||
					(node.parent.type === AST_NODE_TYPES.Property &&
						node.parent.key === node &&
						node.parent.computed === false) ||
					node.parent.type === AST_NODE_TYPES.PropertyDefinition ||
					(node.parent.type === AST_NODE_TYPES.MethodDefinition &&
						node.parent.key === node) ||
					node.parent.type === AST_NODE_TYPES.JSXIdentifier ||
					node.parent.type === AST_NODE_TYPES.JSXAttribute ||
					node.parent.type === AST_NODE_TYPES.JSXMemberExpression
				) {
					return;
				}
				if (signalVariables.has(node.name)) {
					hasSignalUsage = true;
				}
			},

			[AST_NODE_TYPES.Program](node: TSESTree.Program): void {
				for (const stmt of node.body) {
					if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) {
						continue;
					}

					if (stmt.source.value === "@preact/signals-react/runtime") {
						for (const spec of stmt.specifiers) {
							if (
								spec.type === AST_NODE_TYPES.ImportSpecifier &&
								spec.imported.type === AST_NODE_TYPES.Identifier &&
								spec.imported.name === "useSignals"
							) {
								useSignalsLocalNames.add(spec.local.name);
							}
						}
					}

					if (
						typeof stmt.source.value === "string" &&
						stmt.source.value === "@preact/signals-react"
					) {
						for (const spec of stmt.specifiers) {
							if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
								if (
									spec.imported.type === AST_NODE_TYPES.Identifier &&
									spec.imported.name === "signal"
								) {
									signalCreatorLocals.add(spec.local.name);
								} else if (
									spec.imported.type === AST_NODE_TYPES.Identifier &&
									spec.imported.name === "computed"
								) {
									computedCreatorLocals.add(spec.local.name);
								}
							} else if (
								spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier
							) {
								creatorNamespaces.add(spec.local.name);
							}
						}
					}
				}
			},

			[`${AST_NODE_TYPES.Program}:exit`](): void {
				startPhase(perfKey, "programExit");

				if (
					hasSignalUsage &&
					!hasUseSignals &&
					componentName &&
					!new Set(context.options[0]?.ignoreComponents ?? []).has(
						componentName,
					) &&
					componentNode
				) {
					const missingId: MessageIds = isHook(componentNode)
						? "missingUseSignalsInCustomHook"
						: "missingUseSignalsInComponent";

					if (getSeverity(missingId, option) === "off") {
						return;
					}

					context.report({
						node: componentNode,
						messageId: missingId,
						data: { componentName },
						fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
							const fixes: Array<TSESLint.RuleFix> = [];

							if (!componentNode) {
								return null;
							}

							// Only handle block bodies
							if (
								(componentNode.type === AST_NODE_TYPES.FunctionDeclaration ||
									componentNode.type === AST_NODE_TYPES.FunctionExpression ||
									componentNode.type ===
										AST_NODE_TYPES.ArrowFunctionExpression) &&
								componentNode.body.type === AST_NODE_TYPES.BlockStatement
							) {
								// Create or reuse store declaration and wrap body in try/finally
								const storeName = findOrCreateStoreDeclaration(
									componentNode,
									fixer,
									fixes,
									context,
								);

								wrapBodyInTryFinally(
									componentNode,
									storeName,
									hasTryFinallyInCurrent,
									fixer,
									fixes,
									context,
								);
							}

							ensureUseSignalsImport(fixer, fixes, context);

							return fixes.length > 0 ? fixes : null;
						},
					});
				}

				perf["Program:exit"]();

				endPhase(perfKey, "programExit");
			},
		};
	},
});
