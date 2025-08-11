/** biome-ignore-all assist/source/organizeImports: off */
import path from "node:path";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
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
	| "signalInComponent"
	| "computedInComponent"
	| "exportedSignal";

type Severity = {
	[key in MessageIds]?: "error" | "warn" | "off";
};

type Option = {
	allowedDirs?: Array<string>;
	allowComputedInComponents?: boolean;
	customHookPattern?: string;
	performance?: PerformanceBudget;
	severity?: Severity;
};

type Options = [Option?];

type ComponentStackItem = {
	isComponent: boolean;
	isHook: boolean;
	node: TSESTree.Node;
};

function getSeverity(
	messageId: MessageIds,
	options: Option | undefined,
): "error" | "warn" | "off" {
	if (!options?.severity) {
		return "error";
	}

	switch (messageId) {
		case "signalInComponent": {
			return options.severity.signalInComponent ?? "error";
		}

		case "computedInComponent": {
			return options.severity.computedInComponent ?? "error";
		}

		case "exportedSignal": {
			return options.severity.exportedSignal ?? "error";
		}

		default: {
			return "error";
		}
	}
}

function isInAllowedDir(
	filename: string,
	allowedDirs: Array<string> | undefined,
): boolean {
	if (!Array.isArray(allowedDirs) || allowedDirs.length === 0) {
		return false;
	}

	const normalizedFile = path.normalize(filename);

	return allowedDirs.some((dir: string): boolean => {
		const abs = path.normalize(dir);

		const withSep = abs.endsWith(path.sep) ? abs : abs + path.sep;

		return normalizedFile.startsWith(withSep) || normalizedFile === abs;
	});
}

function isSignalCall(
	node: TSESTree.CallExpression,
	signalCreatorLocals: ReadonlySet<string>,
	signalNamespaces: ReadonlySet<string>,
): boolean {
	if (node.callee.type === AST_NODE_TYPES.Identifier) {
		return signalCreatorLocals.has(node.callee.name);
	}

	if (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.Identifier &&
		signalNamespaces.has(node.callee.object.name) &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		(node.callee.property.name === "signal" ||
			node.callee.property.name === "computed")
	) {
		return true;
	}

	return false;
}

function isSignalCreation(
	callee: TSESTree.Expression,
	signalCreatorLocals: ReadonlySet<string>,
	signalNamespaces: ReadonlySet<string>,
): boolean {
	// Direct identifier callee: aliased allowed
	if (callee.type === AST_NODE_TYPES.Identifier) {
		return signalCreatorLocals.has(callee.name);
	}

	// Namespace member: ns.signal / ns.computed
	if (
		callee.type === AST_NODE_TYPES.MemberExpression &&
		callee.object.type === AST_NODE_TYPES.Identifier &&
		signalNamespaces.has(callee.object.name) &&
		callee.property.type === AST_NODE_TYPES.Identifier &&
		(callee.property.name === "signal" || callee.property.name === "computed")
	) {
		return true;
	}

	return false;
}

function isComputed(
	callee: TSESTree.Expression,
	computedLocals: Set<string>,
	signalNamespaces: Set<string>,
): boolean {
	// Direct identifier (aliased allowed)
	if (callee.type === AST_NODE_TYPES.Identifier) {
		return computedLocals.has(callee.name);
	}

	// Namespace member: ns.computed
	if (
		callee.type === AST_NODE_TYPES.MemberExpression &&
		callee.object.type === AST_NODE_TYPES.Identifier &&
		signalNamespaces.has(callee.object.name) &&
		callee.property.type === AST_NODE_TYPES.Identifier &&
		callee.property.name === "computed"
	) {
		return true;
	}

	return false;
}

const ruleName = "restrict-signal-locations";

export const restrictSignalLocations = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Enforces best practices for signal creation by restricting where signals can be created. Signals should typically be created at the module level or within custom hooks, not inside component bodies. This helps prevent performance issues and unexpected behavior in React components.",
			url: getRuleDocUrl(ruleName),
		},
		messages: {
			signalInComponent:
				"Avoid creating signals in component bodies. Move to module level or a custom hook.",
			computedInComponent:
				"Avoid creating computed values in component bodies. Consider using useMemo instead.",
			exportedSignal:
				"Avoid exporting signals directly. Prefer creating them locally and passing values or utilities instead. If you suspect circular imports, run a circular dependency diagnostic (e.g., with @biomejs/biome).",
		},
		hasSuggestions: false,
		schema: [
			{
				type: "object",
				properties: {
					allowedDirs: {
						type: "array",
						items: { type: "string" },
						default: [],
					},
					allowComputedInComponents: {
						type: "boolean",
						default: false,
					},
					customHookPattern: {
						type: "string",
						default: "^use[A-Z]",
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
							signalInComponent: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							computedInComponent: {
								type: "string",
								enum: ["error", "warn", "off"],
							},
							exportedSignal: {
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
			allowedDirs: [],
			allowComputedInComponents: false,
			customHookPattern: "^use[A-Z]",
			performance: DEFAULT_PERFORMANCE_BUDGET,
		} satisfies Option,
	],

	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
		[option],
	): ESLintUtils.RuleListener {
		if (!/\.tsx$/i.test(context.filename)) {
			return {};
		}

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

		startPhase(perfKey, "ruleExecution");

		// Per-file state
		const componentStack: Array<ComponentStackItem> = [];
		const signalCreatorLocals = new Set<string>(["signal", "computed"]);
		const computedLocals = new Set<string>(["computed"]);
		const signalNamespaces = new Set<string>();
		const signalVariables = new Set<string>();

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
						typeof stmt.source.value === "string" &&
						stmt.source.value === "@preact/signals-react"
					) {
						for (const spec of stmt.specifiers) {
							if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
								if (
									"name" in spec.imported &&
									(spec.imported.name === "signal" ||
										spec.imported.name === "computed")
								) {
									signalCreatorLocals.add(spec.local.name);
									if (spec.imported.name === "computed") {
										computedLocals.add(spec.local.name);
									}
								}
							} else if (
								spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier
							) {
								signalNamespaces.add(spec.local.name);
							}
						}
					}
				}
			},

			[AST_NODE_TYPES.VariableDeclarator](
				node: TSESTree.VariableDeclarator,
			): void {
				if (
					node.id.type === AST_NODE_TYPES.Identifier &&
					node.init &&
					node.init.type === AST_NODE_TYPES.CallExpression &&
					isSignalCreation(
						node.init.callee,
						signalCreatorLocals,
						signalNamespaces,
					)
				) {
					signalVariables.add(node.id.name);
				}
			},

			[AST_NODE_TYPES.ExportDefaultDeclaration](
				node: TSESTree.ExportDefaultDeclaration,
			): void {
				if (isInAllowedDir(context.filename, option?.allowedDirs)) {
					return;
				}

				const decl = node.declaration;

				if (decl.type === AST_NODE_TYPES.VariableDeclaration) {
					for (const d of decl.declarations) {
						if (
							d.init?.type === AST_NODE_TYPES.CallExpression &&
							isSignalCreation(
								d.init.callee,
								signalCreatorLocals,
								signalNamespaces,
							) &&
							getSeverity("exportedSignal", option) !== "off"
						) {
							context.report({ node: d, messageId: "exportedSignal" });
						}
					}
				} else if (
					decl.type === AST_NODE_TYPES.Identifier &&
					signalVariables.has(decl.name) &&
					getSeverity("exportedSignal", option) !== "off"
				) {
					context.report({ node: decl, messageId: "exportedSignal" });
				} else if (
					decl.type === AST_NODE_TYPES.CallExpression &&
					isSignalCreation(
						decl.callee,
						signalCreatorLocals,
						signalNamespaces,
					) &&
					getSeverity("exportedSignal", option) !== "off"
				) {
					context.report({ node: decl, messageId: "exportedSignal" });
				}
			},

			[AST_NODE_TYPES.FunctionDeclaration](node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						"id" in node &&
						node.id !== null &&
						node.id.type === AST_NODE_TYPES.Identifier &&
						/^[A-Z]/.test(node.id.name),
					isHook:
						typeof option?.customHookPattern === "string" &&
						("id" in node && node.id && "name" in node.id
							? // eslint-disable-next-line security/detect-non-literal-regexp
								new RegExp(option.customHookPattern).test(
									node.id.name as string,
								)
							: false),
					node,
				});
			},
			[`${AST_NODE_TYPES.FunctionDeclaration}:exit`](): void {
				componentStack.pop();
			},

			[AST_NODE_TYPES.ArrowFunctionExpression](node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						// Arrow functions have no id; use parent variable name if any
						"parent" in node &&
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						node.parent !== null &&
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier &&
						/^[A-Z]/.test(node.parent.id.name),
					isHook:
						typeof option?.customHookPattern === "string" &&
						(node.parent &&
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier
							? // eslint-disable-next-line security/detect-non-literal-regexp
								new RegExp(option.customHookPattern).test(node.parent.id.name)
							: false),
					node,
				});
			},

			[`${AST_NODE_TYPES.ArrowFunctionExpression}:exit`](): void {
				componentStack.pop();
			},

			[AST_NODE_TYPES.FunctionExpression](node: TSESTree.Node): void {
				componentStack.push({
					isComponent:
						// Prefer variable declarator name when present
						typeof node.parent !== "undefined" &&
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier &&
						/^[A-Z]/.test(node.parent.id.name),
					isHook:
						typeof option?.customHookPattern === "string" &&
						(node.parent &&
						node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
						node.parent.id.type === AST_NODE_TYPES.Identifier
							? // eslint-disable-next-line security/detect-non-literal-regexp
								new RegExp(option.customHookPattern).test(node.parent.id.name)
							: false),
					node,
				});
			},

			[`${AST_NODE_TYPES.FunctionExpression}:exit`](): void {
				componentStack.pop();
			},

			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				if (!isSignalCall(node, signalCreatorLocals, signalNamespaces)) {
					return;
				}

				if (isInAllowedDir(context.filename, option?.allowedDirs)) {
					return;
				}

				const currentContext = componentStack[componentStack.length - 1];

				if (!currentContext) {
					return;
				}

				const { isComponent, isHook } = currentContext;

				if (isHook) {
					return;
				}

				if (!isComponent) {
					return;
				}

				if (
					isComputed(node.callee, computedLocals, signalNamespaces) &&
					option?.allowComputedInComponents === true
				) {
					return;
				}

				const messageId = isComputed(
					node.callee,
					computedLocals,
					signalNamespaces,
				)
					? "computedInComponent"
					: "signalInComponent";

				if (getSeverity(messageId, option) !== "off") {
					context.report({
						node,
						messageId,
					});
				}
			},

			[AST_NODE_TYPES.ExportNamedDeclaration](
				node: TSESTree.ExportNamedDeclaration,
			): void {
				if (isInAllowedDir(context.filename, option?.allowedDirs)) {
					return;
				}

				if (node.declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
					for (const decl of node.declaration.declarations) {
						if (
							decl.init?.type === AST_NODE_TYPES.CallExpression &&
							isSignalCreation(
								decl.init.callee,
								signalCreatorLocals,
								signalNamespaces,
							) &&
							getSeverity("exportedSignal", option) !== "off"
						) {
							context.report({
								node: decl,
								messageId: "exportedSignal",
							});
						}
					}
				} else if (!node.source && node.specifiers.length > 0) {
					// export { foo, bar } — report if any are known signal variables
					for (const spec of node.specifiers) {
						if (
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							spec.type === AST_NODE_TYPES.ExportSpecifier &&
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							spec.local.type === AST_NODE_TYPES.Identifier &&
							signalVariables.has(spec.local.name) &&
							getSeverity("exportedSignal", option) !== "off"
						) {
							context.report({ node: spec, messageId: "exportedSignal" });
						}
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
