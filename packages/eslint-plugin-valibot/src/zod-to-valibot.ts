/** biome-ignore-all assist/source/organizeImports: off */
import {
	ESLintUtils,
	type TSESLint,
	AST_NODE_TYPES,
} from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import type { TSESTree } from "@typescript-eslint/types";

import { getRuleDocUrl } from "./utils/urls.js";

type MessageIds = "convertToValibot";
type Options = [];

function isZodImport(node: TSESTree.ImportDeclaration): boolean {
	return node.source.value === "zod";
}

function getNamespaceImportLocalFromValibot(
	program: TSESTree.Program,
): string | null {
	for (const stmt of program.body) {
		if (
			stmt.type !== AST_NODE_TYPES.ImportDeclaration ||
			stmt.source.value !== "valibot"
		) {
			continue;
		}

		const ns = stmt.specifiers.find(
			(s: TSESTree.ImportClause): s is TSESTree.ImportNamespaceSpecifier => {
				return s.type === AST_NODE_TYPES.ImportNamespaceSpecifier;
			},
		);

		if (typeof ns !== "undefined" && ns.local) {
			return ns.local.name;
		}
	}

	return null;
}

function getRootNs(
	context: Readonly<RuleContext<MessageIds, Options>>,
): string {
	return getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? "v";
}

type ChainStep = {
	kind: "base" | "method";
	name: string;
	args: TSESTree.CallExpression["arguments"];
};

function getText(
	node: TSESTree.Node | undefined,
	context: Readonly<RuleContext<MessageIds, Options>>,
): string {
	return context.sourceCode.getText(node);
}

function splitArgsAndMessage(
	args: TSESTree.CallExpression["arguments"],
	context: Readonly<RuleContext<MessageIds, Options>>,
): { coreArgs: string[]; message?: string } {
	if (args.length === 0) {
		return { coreArgs: [] };
	}

	const last = args[args.length - 1];

	if (
		last.type === AST_NODE_TYPES.ObjectExpression &&
		last.properties.length === 1 &&
		last.properties[0].type === AST_NODE_TYPES.Property &&
		!last.properties[0].computed &&
		((last.properties[0].key.type === AST_NODE_TYPES.Identifier &&
			last.properties[0].key.name === "message") ||
			(last.properties[0].key.type === AST_NODE_TYPES.Literal &&
				last.properties[0].key.value === "message")) &&
		last.properties[0].value.type === AST_NODE_TYPES.Literal &&
		typeof last.properties[0].value.value === "string"
	) {
		return {
			coreArgs: args
				.slice(0, -1)
				.map((a: TSESTree.CallExpressionArgument): string => {
					return getText(a, context);
				}),
			message: getText(last.properties[0].value, context),
		};
	}

	return {
		coreArgs: args.map((a: TSESTree.CallExpressionArgument): string => {
			return getText(a, context);
		}),
	};
}

function collectChain(node: TSESTree.CallExpression): ChainStep[] | null {
	// Walk left through MemberExpression/CallExpression to gather z.<base>() and .method() calls
	let cur: TSESTree.Expression = node;

	const steps: ChainStep[] = [];

	// Rightmost is a CallExpression; move left while structure matches
	while (
		cur.type === AST_NODE_TYPES.CallExpression &&
		cur.callee.type === AST_NODE_TYPES.MemberExpression
	) {
		if (cur.callee.object.type === AST_NODE_TYPES.MemberExpression) {
			// Method call in chain
			if (cur.callee.property.type !== AST_NODE_TYPES.Identifier) {
				return null;
			}

			steps.push({
				kind: "method",
				name: cur.callee.property.name,
				args: cur.arguments,
			});

			cur = cur.callee.object;
		} else if (
			cur.callee.object.type === AST_NODE_TYPES.CallExpression &&
			cur.callee.object.callee.type === AST_NODE_TYPES.MemberExpression
		) {
			// Method call whose target is itself a call (e.g., z.string().min())
			if (cur.callee.property.type !== AST_NODE_TYPES.Identifier) {
				return null;
			}

			steps.push({
				kind: "method",
				name: cur.callee.property.name,
				args: cur.arguments,
			});

			// Move left to the inner call (e.g., z.string()) and continue
			cur = cur.callee.object;
		} else if (
			cur.callee.object.type === AST_NODE_TYPES.Identifier &&
			cur.callee.property.type === AST_NODE_TYPES.Identifier &&
			(cur.callee.object.name === "z" || cur.callee.object.name === "v")
		) {
			// Base call z.<base>()
			steps.push({
				kind: "base",
				name: cur.callee.property.name,
				args: cur.arguments,
			});

			break;
		} else {
			return null;
		}
	}

	// Ensure we ended on base
	if (
		!steps.some((s: ChainStep): boolean => {
			return s.kind === "base";
		})
	) {
		return null;
	}

	return steps.reverse();
}

function mapChainToValibot(
	steps: ChainStep[],
	context: Readonly<RuleContext<MessageIds, Options>>,
): string | null {
	// Base mapping
	const base = steps[0];

	if (base.kind !== "base") {
		return null;
	}

	const ns = getRootNs(context);

	const baseMap: Record<string, string> = {
		string: `${ns}.string`,
		number: `${ns}.number`,
		bigint: `${ns}.bigint`,
		boolean: `${ns}.boolean`,
		date: `${ns}.date`,
		symbol: `${ns}.symbol`,
		undefined: `${ns}.undefined`,
		null: `${ns}.null`,
		void: `${ns}.void_`, // valibot uses void_ helper
		any: `${ns}.any`,
		unknown: `${ns}.unknown`,
		never: `${ns}.never`,
		literal: `${ns}.literal`,
		array: `${ns}.array`,
		object: `${ns}.object`,
		tuple: `${ns}.tuple`,
		enum: `${ns}.picklist`,
		nativeEnum: `${ns}.enum`,
		union: `${ns}.union`,
		intersection: `${ns}.intersect`,
		discriminatedUnion: `${ns}.variant`,
		record: `${ns}.record`,
		map: `${ns}.map`,
		set: `${ns}.set`,
		promise: `${ns}.promise`,
		function: `${ns}.function`,
	};

	// Root string helpers exposed by Zod that correspond to Valibot actions
	const rootStringHelpers = new Set(["uuid", "cuid", "cuid2", "email", "url"]);

	// Only early-return if we truly don't support the base and it's not a root helper or a known special-case (e.g., preprocess)
	if (
		!(base.name in baseMap) &&
		!rootStringHelpers.has(base.name) &&
		base.name !== "preprocess"
	) {
		return null;
	}

	// Special-case: z.preprocess(fn, schema) -> v.pipe(v.any(), v.transform(fn), <schemaMapped>)
	if (base.name === "preprocess" && base.args.length >= 2) {
		const schemaArg = base.args[1];

		return `${ns}.pipe(${ns}.any(), ${ns}.transform(${getText(base.args[0], context)}), ${
			schemaArg.type === AST_NODE_TYPES.SpreadElement
				? getText(schemaArg, context)
				: (mapExpressionToValibot(schemaArg, context) ??
					getText(schemaArg, context))
		})`;
	}

	// Special-case: z.function(...).args(...).returns(...).implement(...) -> v.function()
	if (base.name === "function") {
		// We intentionally ignore input/returns/implement details and emit a bare function schema
		return `${ns}.function()`;
	}

	function splitBaseArgs(
		args: TSESTree.CallExpression["arguments"],
		context: Readonly<RuleContext<MessageIds, Options>>,
	): { coreArgs: string[]; message?: string | undefined } {
		if (args.length === 0) {
			return { coreArgs: [] };
		}

		// Zod v4: allow direct string message
		if (
			args.length === 1 &&
			args[0]?.type === AST_NODE_TYPES.Literal &&
			typeof args[0].value === "string"
		) {
			return { coreArgs: [], message: getText(args[0], context) };
		}

		const last = args[args.length - 1];

		if (last.type === AST_NODE_TYPES.ObjectExpression) {
			let msgNode: TSESTree.Expression | null = null;

			for (const key of ["message", "error"]) {
				for (const p of last.properties) {
					if (p.type !== AST_NODE_TYPES.Property || p.computed) {
						continue;
					}

					if (
						(p.key.type === AST_NODE_TYPES.Identifier
							? p.key.name
							: String(
									p.key.type === AST_NODE_TYPES.Literal ? p.key.value : "",
								)) === key &&
						p.value.type === AST_NODE_TYPES.Literal &&
						typeof p.value.value === "string"
					) {
						msgNode = p.value;

						break;
					}
				}

				if (msgNode) {
					break;
				}
			}

			if (msgNode) {
				return {
					coreArgs: args
						.slice(0, -1)
						.map((a: TSESTree.CallExpressionArgument): string => {
							return getText(a, context);
						}),
					message: getText(msgNode, context),
				};
			}
		}

		return {
			coreArgs: args.map((a: TSESTree.CallExpressionArgument): string => {
				return getText(a, context);
			}),
		};
	}

	function joinWithMessage(
		parts: string[],
		message?: string | undefined,
	): string {
		return message ? [...parts, message].join(", ") : parts.join(", ");
	}

	function mapExpressionToValibot(
		expr:
			| TSESTree.Expression
			| TSESTree.AssignmentPattern
			| TSESTree.TSEmptyBodyFunctionExpression,
		context: Readonly<RuleContext<MessageIds, Options>>,
	): string | null {
		if (
			expr.type === AST_NODE_TYPES.CallExpression &&
			expr.callee.type === AST_NODE_TYPES.MemberExpression
		) {
			const innerSteps = collectChain(expr);

			if (innerSteps !== null) {
				const mapped = mapChainToValibot(innerSteps, context);

				if (mapped !== null) {
					return mapped;
				}
			}
		}

		return null;
	}

	const baseSplit = splitBaseArgs(base.args, context);

	const coreArgs = [...baseSplit.coreArgs];

	// Recursively map inner arguments for specific bases
	if (base.args.length >= 1) {
		// array(item)
		if (base.name === "array") {
			const innerArg = base.args[0];

			if (innerArg.type !== AST_NODE_TYPES.SpreadElement) {
				const mappedInner = mapExpressionToValibot(innerArg, context);

				if (mappedInner !== null) {
					coreArgs[0] = mappedInner;
				}
			}
		}

		// object({ shape })
		if (
			base.name === "object" &&
			base.args[0]?.type === AST_NODE_TYPES.ObjectExpression
		) {
			const parts: string[] = [];

			for (const p of base.args[0].properties) {
				if (p.type !== AST_NODE_TYPES.Property) {
					parts.push(getText(p, context));

					continue;
				}

				parts.push(
					`${getText(p.key, context)}: ${
						(p.value && mapExpressionToValibot(p.value, context)) ??
						getText(p.value, context)
					}`,
				);
			}

			coreArgs[0] = `{ ${parts.join(", ")} }`;
		}

		// tuple([items])
		if (
			base.name === "tuple" &&
			base.args[0]?.type === AST_NODE_TYPES.ArrayExpression
		) {
			const items = base.args[0].elements.map((el) => {
				if (!el || el.type === AST_NODE_TYPES.SpreadElement) {
					return getText(el ?? undefined, context);
				}

				return mapExpressionToValibot(el, context) ?? getText(el, context);
			});

			coreArgs[0] = `[${items.join(", ")}]`;
		}

		// Handle tuple rest: z.tuple([...]).rest(schema) -> v.tupleWithRest([...], schema)
		if (base.name === "tuple") {
			const restStep = steps.slice(1).find((s: ChainStep): boolean => {
				return s.kind === "method" && s.name === "rest";
			});

			if (restStep && restStep.args.length >= 1) {
				const restArg = restStep.args[0];

				return `${ns}.tupleWithRest(${coreArgs[0] ?? "[]"}, ${
					restArg.type === AST_NODE_TYPES.SpreadElement
						? getText(restArg, context)
						: (mapExpressionToValibot(restArg, context) ??
							getText(restArg, context))
				})`;
			}
		}

		// union([members]) or intersection([members])
		if (
			(base.name === "union" || base.name === "intersection") &&
			base.args[0]?.type === AST_NODE_TYPES.ArrayExpression
		) {
			coreArgs[0] = `[${base.args[0].elements
				.map((el: TSESTree.Expression | TSESTree.SpreadElement | null) => {
					if (!el || el.type === AST_NODE_TYPES.SpreadElement) {
						return getText(el ?? undefined, context);
					}

					return mapExpressionToValibot(el, context) ?? getText(el, context);
				})
				.join(", ")}]`;
		}

		// intersection(a, b) (non-array form) -> v.intersect([a, b])
		if (base.name === "intersection" && base.args.length >= 2) {
			const left = base.args[0];
			const right = base.args[1];
			const parts: string[] = [];

			if (left) {
				parts.push(
					left.type === AST_NODE_TYPES.SpreadElement
						? getText(left, context)
						: (mapExpressionToValibot(left, context) ?? getText(left, context)),
				);
			}

			if (right) {
				parts.push(
					right.type === AST_NODE_TYPES.SpreadElement
						? getText(right, context)
						: (mapExpressionToValibot(right, context) ??
								getText(right, context)),
				);
			}

			coreArgs.length = 0;
			coreArgs.push(`[${parts.join(", ")}]`);
		}

		// discriminatedUnion(key, [members])
		if (
			base.name === "discriminatedUnion" &&
			base.args.length >= 2 &&
			base.args[1]?.type === AST_NODE_TYPES.ArrayExpression
		) {
			coreArgs[1] = `[${base.args[1].elements
				.map((el: TSESTree.Expression | TSESTree.SpreadElement | null) => {
					if (!el || el.type === AST_NODE_TYPES.SpreadElement) {
						return getText(el ?? undefined, context);
					}

					return mapExpressionToValibot(el, context) ?? getText(el, context);
				})
				.join(", ")}]`;
		}

		// record(key, value)
		if (base.name === "record" && base.args.length >= 2) {
			for (let i = 0; i < 2; i++) {
				const a = base.args[i];

				if (a.type !== AST_NODE_TYPES.SpreadElement) {
					const mapped = mapExpressionToValibot(a, context);

					if (mapped !== null) {
						coreArgs[i] = mapped;
					}
				}
			}
		}

		// map(key, value)
		if (base.name === "map" && base.args.length >= 2) {
			for (let i = 0; i < 2; i++) {
				const a = base.args[i];

				if (a.type !== AST_NODE_TYPES.SpreadElement) {
					const mapped = mapExpressionToValibot(a, context);

					if (mapped !== null) {
						coreArgs[i] = mapped;
					}
				}
			}
		}

		// set(item)
		if (base.name === "set" && base.args.length >= 1) {
			const a = base.args[0];

			if (a.type !== AST_NODE_TYPES.SpreadElement) {
				const mapped = mapExpressionToValibot(a, context);

				if (mapped !== null) {
					coreArgs[0] = mapped;
				}
			}
		}

		// promise(inner) -> In Valibot, promise() does not take inner schema, so ignore inner arg
		if (base.name === "promise" && base.args.length >= 1) {
			// Drop inner argument to avoid invalid typings like v.promise(v.string())
			coreArgs.length = 0;
		}
	}

	// Special handling: Zod exposes some string-specific helpers at the root, e.g. z.uuid(), z.cuid(), z.cuid2(), z.email(), z.url().
	// In Valibot these are actions that must be piped onto a string schema.
	const baseExpr =
		base.kind === "base" && rootStringHelpers.has(base.name)
			? `${ns}.pipe(${ns}.string(), ${`${ns}.${base.name === "cuid" ? "cuid2" : base.name}(${baseSplit.message ?? ""})`.replace(
					"()",
					`(${baseSplit.message ? baseSplit.message : ""})`,
				)})`
			: `${baseMap[base.name] ?? ""}(${joinWithMessage(coreArgs, baseSplit.message)})`;

	if (steps.length === 1) {
		return baseExpr;
	}

	// Modifiers map; length vs value vs size
	function isStringBase(): boolean {
		// Treat root string helpers as string base for modifiers like min/max/length/etc.
		return base.name === "string" || rootStringHelpers.has(base.name);
	}

	function isArrayBase(): boolean {
		return base.name === "array";
	}

	function isBigintBase(): boolean {
		return base.name === "bigint";
	}

	function normalizeArgsForBase(args: string[]): string[] {
		if (!isBigintBase()) {
			return args;
		}

		return args.map((a: string): string => {
			// If already ends with 'n' or is not a simple number literal, leave as-is
			const trimmed = a.trim();

			if (/^\d+n$/.test(trimmed)) {
				return a;
			}

			if (/^\d+(\.\d+)?$/.test(trimmed)) {
				return `${trimmed}n`;
			}

			return a;
		});
	}

	const modMap: Record<
		string,
		(args: string[], message?: string | undefined) => string | null
	> = {
		min: (args: string[], message?: string | undefined): string => {
			return `${
				isStringBase() || isArrayBase() ? `${ns}.minLength` : `${ns}.minValue`
			}(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		max: (args: string[], message?: string | undefined): string => {
			return `${
				isStringBase() || isArrayBase() ? `${ns}.maxLength` : `${ns}.maxValue`
			}(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		length: (args: string[], message?: string | undefined): string | null => {
			if (!(isStringBase() || isArrayBase())) {
				return null;
			}

			return `${ns}.length(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		email: (_args: string[], message?: string | undefined): string => {
			return `${ns}.email(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		url: (_args: string[], message?: string | undefined): string => {
			return `${ns}.url(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		uuid: (_args: string[], message?: string | undefined): string => {
			return `${ns}.uuid(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		cuid: (_args: string[], message?: string | undefined): string => {
			return `${ns}.cuid2(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		cuid2: (_args: string[], message?: string | undefined): string => {
			return `${ns}.cuid2(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		regex: (args: string[], message?: string | undefined): string => {
			return `${ns}.regex(${joinWithMessage(args, message)})`;
		},
		startsWith: (args: string[], message?: string | undefined): string => {
			return `${ns}.startsWith(${joinWithMessage(args, message)})`;
		},
		endsWith: (args: string[], message?: string | undefined): string => {
			return `${ns}.endsWith(${joinWithMessage(args, message)})`;
		},
		includes: (args: string[], message?: string | undefined): string => {
			return `${ns}.includes(${joinWithMessage(args, message)})`;
		},
		nonempty: (_args: string[], message?: string | undefined): string => {
			return `${ns}.nonEmpty(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		int: (_args: string[], message?: string | undefined): string => {
			return `${ns}.integer(${message ?? ""})`.replace(
				"()",
				`(${message ? message : ""})`,
			);
		},
		positive: (_args: string[], message?: string | undefined): string => {
			return `${ns}.gtValue(${joinWithMessage([isBigintBase() ? "0n" : "0"], message)})`;
		},
		negative: (_args: string[], message?: string | undefined): string => {
			return `${ns}.ltValue(${joinWithMessage([isBigintBase() ? "0n" : "0"], message)})`;
		},
		nonnegative: (_args: string[], message?: string | undefined): string => {
			return `${ns}.minValue(${joinWithMessage([isBigintBase() ? "0n" : "0"], message)})`;
		},
		nonpositive: (_args: string[], message?: string | undefined): string => {
			return `${ns}.maxValue(${joinWithMessage([isBigintBase() ? "0n" : "0"], message)})`;
		},
		gt: (args: string[], message?: string | undefined): string => {
			return `${ns}.gtValue(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		gte: (args: string[], message?: string | undefined): string => {
			return `${ns}.minValue(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		lt: (args: string[], message?: string | undefined): string => {
			return `${ns}.ltValue(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		lte: (args: string[], message?: string | undefined): string => {
			return `${ns}.maxValue(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
		multipleOf: (args: string[], message?: string | undefined): string => {
			return `${ns}.multipleOf(${joinWithMessage(normalizeArgsForBase(args), message)})`;
		},
	};

	const pipes: string[] = [baseExpr];

	// Track wrappers that cannot be represented as pipe actions
	let wrapOptional = false;
	let wrapFallback: string | null = null;

	for (let i = 1; i < steps.length; i++) {
		const s = steps[i];

		// unsupported
		if (s.kind !== "method") {
			return null;
		}

		const map = modMap[s.name];

		if (!map) {
			// Handle wrappers: optional(), default(value)
			if (s.name === "optional" && s.args.length === 0) {
				wrapOptional = true;
				continue;
			}

			if (s.name === "default" && s.args.length === 1) {
				wrapFallback = getText(s.args[0], context);
				continue;
			}

			// Zod .catch(value) -> Valibot fallback(schema, value)
			if (s.name === "catch" && s.args.length === 1) {
				wrapFallback = getText(s.args[0], context);
				continue;
			}

			return null;
		}

		const { coreArgs, message } = splitArgsAndMessage(s.args, context);
		const mapped = map(coreArgs, message);

		if (!mapped) {
			return null;
		}

		pipes.push(mapped);
	}

	const piped = `${ns}.pipe(${pipes.join(", ")})`;

	if (wrapFallback !== null) {
		return `${ns}.fallback(${piped}, ${wrapFallback})`;
	}
	if (wrapOptional) {
		return `${ns}.optional(${piped})`;
	}

	return piped;
}

function reportAndFixImport(
	node: TSESTree.ImportDeclaration,
	context: Readonly<RuleContext<MessageIds, Options>>,
): void {
	if (getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
		return;
	}

	// Otherwise, offer to add a Valibot namespace import at the top.
	context.report({
		node,
		messageId: "convertToValibot",
		fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
			const fixes: TSESLint.RuleFix[] = [];

			const firstToken = context.sourceCode.getFirstToken(
				context.sourceCode.ast,
			);

			if (firstToken) {
				fixes.push(
					fixer.insertTextBefore(firstToken, "import * as v from 'valibot';\n"),
				);
			}

			return fixes;
		},
	});
}

const ruleName = "zod-to-valibot";

export const zodToValibotRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description: "Convert Zod schemas to Valibot",
			url: getRuleDocUrl(ruleName),
		},
		fixable: "code",
		schema: [],
		messages: {
			convertToValibot: "Convert Zod schema to Valibot",
		},
	},
	defaultOptions: [],
	create(
		context: Readonly<RuleContext<MessageIds, Options>>,
	): TSESLint.RuleListener {
		return {
			[AST_NODE_TYPES.ImportDeclaration](
				node: TSESTree.ImportDeclaration,
			): void {
				if (!isZodImport(node)) {
					return;
				}

				reportAndFixImport(node, context);
			},

			// Additionally, if a remaining reference to z (from zod) is found, offer a local fix to rename to v.
			[AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
				if (
					node.object.type !== AST_NODE_TYPES.Identifier ||
					node.object.name !== "z"
				) {
					return;
				}

				const variable = context.sourceCode.getScope(node).set.get("z");

				if (!variable) {
					return;
				}

				if (
					typeof variable.defs.find((d): boolean => {
						return (
							d.type === "ImportBinding" &&
							d.parent?.type === AST_NODE_TYPES.ImportDeclaration &&
							d.parent.source.value === "zod"
						);
					}) === "undefined"
				) {
					return;
				}

				if (
					node.parent &&
					node.parent.type === AST_NODE_TYPES.CallExpression &&
					node.parent.callee === node
				) {
					const steps = collectChain(node.parent);

					if (steps) {
						const mapped = mapChainToValibot(steps, context);

						if (mapped !== null) {
							return; // Defer to CallExpression fixer to avoid conflicting fixes
						}
					}
				}

				const existingNs = getNamespaceImportLocalFromValibot(
					context.sourceCode.ast,
				);

				const targetNs = existingNs ?? "v";

				context.report({
					node: node.object,
					messageId: "convertToValibot",
					fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
						const fixes: TSESLint.RuleFix[] = [];

						if (!existingNs) {
							// Insert valibot namespace import at the very top (before other statements)
							const firstToken = context.sourceCode.getFirstToken(
								context.sourceCode.ast,
							);

							if (firstToken) {
								fixes.push(
									fixer.insertTextBefore(
										firstToken,
										`import * as ${targetNs} from 'valibot';\n`,
									),
								);
							}
						}

						fixes.push(fixer.replaceText(node.object, targetNs));

						return fixes;
					},
				});
			},

			// Stage 5: Object modes and catchall
			[AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
				// Stage 3: Chain -> pipeline for common bases/modifiers
				if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
					// Only handle the OUTERMOST call in a chain. If this call is followed by
					// another member call like `.min(...)(...)`, skip and let the outer call handle it.
					if (
						node.parent &&
						node.parent.type === AST_NODE_TYPES.MemberExpression &&
						node.parent.parent &&
						node.parent.parent.type === AST_NODE_TYPES.CallExpression
					) {
						return;
					}

					// Walk to the root of the chain and only transform if it's `z`
					let root: TSESTree.Expression | null = node.callee.object;
					while (root) {
						if (root.type === AST_NODE_TYPES.MemberExpression) {
							root = root.object;

							continue;
						}

						if (
							root.type === AST_NODE_TYPES.CallExpression &&
							root.callee.type === AST_NODE_TYPES.MemberExpression
						) {
							root = root.callee.object;

							continue;
						}

						break;
					}

					if (
						root &&
						root.type === AST_NODE_TYPES.Identifier &&
						root.name === "z"
					) {
						const steps = collectChain(node);

						if (steps) {
							const mapped = mapChainToValibot(steps, context);

							if (
								mapped !== null &&
								mapped !== context.sourceCode.getText(node)
							) {
								context.report({
									node,
									messageId: "convertToValibot",
									fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
										return fixer.replaceText(node, mapped);
									},
								});
							}

							return; // avoid double-reporting when Stage 4/5/6 also match
						}
					}
				} // Stage 4: .parse/.safeParse -> v.parse(schema, arg)

				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					(node.callee.property.name === "parse" ||
						node.callee.property.name === "safeParse") &&
					node.arguments.length === 1
				) {
					// Ensure the root is z or v to avoid false positives
					let root: TSESTree.Expression | null = node.callee.object;

					while (root && root.type === AST_NODE_TYPES.MemberExpression) {
						root = root.object;
					}

					if (
						!root ||
						root.type !== AST_NODE_TYPES.Identifier ||
						(root.name !== "z" && root.name !== "v")
					) {
						return;
					}

					const programNs =
						getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? "v";

					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${programNs} from 'valibot';\n`,
										),
									);
								}
							}

							if (
								"property" in node.callee &&
								"name" in node.callee.property &&
								"object" in node.callee
							) {
								fixes.push(
									fixer.replaceText(
										node,
										`${programNs}.${node.callee.property.name}(${context.sourceCode.getText(node.callee.object)}, ${context.sourceCode.getText(node.arguments[0])})`,
									),
								);
							}

							return fixes;
						},
					});
				}

				// Stage 7: z.coerce.*() -> v.pipe(v.unknown(), v.transform(Constructor))
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.object.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.object.object.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.object.object.name === "z" &&
					node.callee.object.object.property.type ===
						AST_NODE_TYPES.Identifier &&
					node.callee.object.object.property.name === "coerce" &&
					node.callee.object.property.type === AST_NODE_TYPES.Identifier
				) {
					const ctorMap: Record<string, string> = {
						number: "Number",
						string: "String",
						boolean: "Boolean",
						date: "Date",
					};

					const ctor = ctorMap[node.callee.object.property.name];

					if (!ctor) {
						return;
					}

					const programNs =
						getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? "v";

					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${programNs} from 'valibot';\n`,
										),
									);
								}
							}

							fixes.push(
								fixer.replaceText(
									node,
									`${programNs}.pipe(${programNs}.unknown(), ${programNs}.transform(${ctor}))`,
								),
							);

							return fixes;
						},
					});
				}

				// Pattern: z.object(shape).strict() -> v.strictObject(shape)
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.object.type === AST_NODE_TYPES.CallExpression &&
					node.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.callee.object.type === AST_NODE_TYPES.Identifier &&
					(node.callee.object.callee.object.name === "z" ||
						node.callee.object.callee.object.name === "v") &&
					node.callee.object.callee.property.type ===
						AST_NODE_TYPES.Identifier &&
					node.callee.object.callee.property.name === "object" &&
					node.callee.object.arguments.length === 1 &&
					(node.callee.property.name === "strict" ||
						node.callee.property.name === "passthrough" ||
						node.callee.property.name === "strip")
				) {
					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
							if (
								!("property" in node.callee) ||
								!("name" in node.callee.property) ||
								!("object" in node.callee) ||
								!("arguments" in node.callee.object)
							) {
								return null;
							}

							const ns =
								getNamespaceImportLocalFromValibot(context.sourceCode.ast) ??
								"v";

							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${ns} from 'valibot';\n`,
										),
									);
								}
							}

							fixes.push(
								fixer.replaceText(
									node,
									`${ns}.${
										node.callee.property.name === "strict"
											? "strictObject"
											: node.callee.property.name === "passthrough"
												? "looseObject"
												: "object"
									}(${context.sourceCode.getText(
										node.callee.object.arguments[0],
									)})`,
								),
							);

							return fixes;
						},
					});
				}

				// Pattern: z.object(shape).catchall(rest) -> v.objectWithRest(shape, rest)
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.property.name === "catchall" &&
					node.callee.object.type === AST_NODE_TYPES.CallExpression &&
					node.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.object.callee.object.type === AST_NODE_TYPES.Identifier &&
					(node.callee.object.callee.object.name === "z" ||
						node.callee.object.callee.object.name === "v") &&
					node.callee.object.callee.property.type ===
						AST_NODE_TYPES.Identifier &&
					node.callee.object.callee.property.name === "object" &&
					node.callee.object.arguments.length === 1 &&
					node.arguments.length === 1
				) {
					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
							if (
								!("object" in node.callee) ||
								!("arguments" in node.callee.object)
							) {
								return null;
							}

							const ns =
								getNamespaceImportLocalFromValibot(context.sourceCode.ast) ??
								"v";

							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${ns} from 'valibot';\n`,
										),
									);
								}
							}

							fixes.push(
								fixer.replaceText(
									node,
									`${ns}.objectWithRest(${context.sourceCode.getText(
										node.callee.object.arguments[0],
									)}, ${context.sourceCode.getText(node.arguments[0] ?? node)})`,
								),
							);

							return fixes;
						},
					});
				}

				// Pattern: <schema>.optional() -> v.optional(<schema>) when rooted at z or v
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.property.name === "optional" &&
					node.arguments.length === 0
				) {
					// Find chain root
					let root: TSESTree.Expression | null = node.callee.object;

					while (root && root.type === AST_NODE_TYPES.MemberExpression) {
						root = root.object;
					}

					if (
						!root ||
						root.type !== AST_NODE_TYPES.Identifier ||
						(root.name !== "z" && root.name !== "v")
					) {
						return;
					}

					const ns =
						getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? "v";

					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
							if (!("object" in node.callee)) {
								return null;
							}

							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${ns} from 'valibot';\n`,
										),
									);
								}
							}

							fixes.push(
								fixer.replaceText(
									node,
									`${ns}.optional(${context.sourceCode.getText(node.callee.object)})`,
								),
							);

							return fixes;
						},
					});
				}

				// Pattern: <schema>.default(value) -> v.fallback(<schema>, value) when rooted at z or v
				if (
					node.callee.type === AST_NODE_TYPES.MemberExpression &&
					node.callee.property.type === AST_NODE_TYPES.Identifier &&
					node.callee.property.name === "default" &&
					node.arguments.length === 1
				) {
					let root: TSESTree.Expression | null = node.callee.object;
					while (root && root.type === AST_NODE_TYPES.MemberExpression) {
						root = root.object;
					}

					if (
						!root ||
						root.type !== AST_NODE_TYPES.Identifier ||
						(root.name !== "z" && root.name !== "v")
					) {
						return;
					}

					const ns =
						getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? "v";

					context.report({
						node,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
							if (!("object" in node.callee)) {
								return null;
							}

							const fixes: TSESLint.RuleFix[] = [];

							if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
								const firstToken = context.sourceCode.getFirstToken(
									context.sourceCode.ast,
								);

								if (firstToken) {
									fixes.push(
										fixer.insertTextBefore(
											firstToken,
											`import * as ${ns} from 'valibot';\n`,
										),
									);
								}
							}

							fixes.push(
								fixer.replaceText(
									node,
									`${ns}.fallback(${context.sourceCode.getText(node.callee.object)}, ${context.sourceCode.getText(node.arguments[0])})`,
								),
							);

							return fixes;
						},
					});
				}

				// Stage 6: Direct name changes on member calls rooted at z or v
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.property.type === "Identifier"
				) {
					// Find root identifier of the chain (z or v)
					let root: TSESTree.Expression | null = node.callee.object;
					while (root && root.type === "MemberExpression") root = root.object;

					if (!root || root.type !== "Identifier") {
						return;
					}

					if (root.name !== "z" && root.name !== "v") {
						return;
					}

					const map: Record<string, string> = {
						intersection: "intersect",
						and: "intersect",
						catch: "fallback",
						discriminatedUnion: "variant",
						int: "integer",
						nativeEnum: "enum",
						or: "union",
						instanceof: "instance",
						safe: "safeInteger",
						element: "item",
					};

					const next = map[node.callee.property.name];

					if (!next) {
						return;
					}

					context.report({
						node: node.callee.property,
						messageId: "convertToValibot",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
							if (!("property" in node.callee)) {
								return null;
							}

							return fixer.replaceText(node.callee.property, next);
						},
					});
				}
			},
		};
	},
});
