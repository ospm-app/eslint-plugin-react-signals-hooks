/** biome-ignore-all assist/source/organizeImports: off */
import { ESLintUtils, type TSESLint, AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { TSESTree } from '@typescript-eslint/types';

import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'convertToValibot';
type Options = [];

function isZodImport(node: TSESTree.ImportDeclaration): boolean {
  return node.source.value === 'zod';
}

function getNamespaceImportLocalFromValibot(program: TSESTree.Program): string | null {
  for (const stmt of program.body) {
    if (stmt.type !== AST_NODE_TYPES.ImportDeclaration || stmt.source.value !== 'valibot') {
      continue;
    }

    const ns = stmt.specifiers.find(
      (s: TSESTree.ImportClause): s is TSESTree.ImportNamespaceSpecifier => {
        return s.type === AST_NODE_TYPES.ImportNamespaceSpecifier;
      }
    );

    if (typeof ns !== 'undefined' && ns.local) {
      return ns.local.name;
    }
  }

  return null;
}

function getRootNs(context: Readonly<RuleContext<MessageIds, Options>>): string {
  return getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';
}

type ChainStep = {
  kind: 'base' | 'method';
  name: string;
  args: TSESTree.CallExpression['arguments'];
};

function getText(
  node: TSESTree.Node | undefined,
  context: Readonly<RuleContext<MessageIds, Options>>
): string {
  return context.sourceCode.getText(node);
}

function splitArgsAndMessage(
  args: TSESTree.CallExpression['arguments'],
  context: Readonly<RuleContext<MessageIds, Options>>
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
      last.properties[0].key.name === 'message') ||
      (last.properties[0].key.type === AST_NODE_TYPES.Literal &&
        last.properties[0].key.value === 'message')) &&
    last.properties[0].value.type === AST_NODE_TYPES.Literal &&
    typeof last.properties[0].value.value === 'string'
  ) {
    return {
      coreArgs: args.slice(0, -1).map((a: TSESTree.CallExpressionArgument): string => {
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
        kind: 'method',
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
        kind: 'method',
        name: cur.callee.property.name,
        args: cur.arguments,
      });

      // Move left to the inner call (e.g., z.string()) and continue
      cur = cur.callee.object;
    } else if (
      cur.callee.object.type === AST_NODE_TYPES.Identifier &&
      cur.callee.property.type === AST_NODE_TYPES.Identifier &&
      (cur.callee.object.name === 'z' || cur.callee.object.name === 'v')
    ) {
      // Base call z.<base>()
      steps.push({
        kind: 'base',
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
      return s.kind === 'base';
    })
  ) {
    return null;
  }

  return steps.reverse();
}

function mapChainToValibot(
  steps: ChainStep[],
  context: Readonly<RuleContext<MessageIds, Options>>
): string | null {
  // Base mapping
  const base = steps[0];

  if (base.kind !== 'base') {
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
  const rootStringHelpers = new Set(['uuid', 'cuid', 'cuid2', 'email', 'url']);

  // Only early-return if we truly don't support the base and it's not a root helper or a known special-case (e.g., preprocess)
  if (!(base.name in baseMap) && !rootStringHelpers.has(base.name) && base.name !== 'preprocess') {
    return null;
  }

  // Special-case: z.preprocess(fn, schema) -> v.pipe(v.any(), v.transform(fn), <schemaMapped>)
  if (base.name === 'preprocess' && base.args.length >= 2) {
    const schemaArg = base.args[1];

    return `${ns}.pipe(${ns}.any(), ${ns}.transform(${getText(base.args[0], context)}), ${
      schemaArg.type === AST_NODE_TYPES.SpreadElement
        ? getText(schemaArg, context)
        : (mapExpressionToValibot(schemaArg, context) ?? getText(schemaArg, context))
    })`;
  }

  // Special-case: z.function(...).args(...).returns(...).implement(...) -> v.function()
  if (base.name === 'function') {
    // We intentionally ignore input/returns/implement details and emit a bare function schema
    return `${ns}.function()`;
  }

  function splitBaseArgs(
    args: TSESTree.CallExpression['arguments'],
    context: Readonly<RuleContext<MessageIds, Options>>
  ): { coreArgs: string[]; message?: string | undefined } {
    if (args.length === 0) {
      return { coreArgs: [] };
    }

    // Zod v4: allow direct string message
    if (
      args.length === 1 &&
      args[0]?.type === AST_NODE_TYPES.Literal &&
      typeof args[0].value === 'string'
    ) {
      return { coreArgs: [], message: getText(args[0], context) };
    }

    const last = args[args.length - 1];

    if (last.type === AST_NODE_TYPES.ObjectExpression) {
      let msgNode: TSESTree.Expression | null = null;

      for (const key of ['message', 'error']) {
        for (const p of last.properties) {
          if (p.type !== AST_NODE_TYPES.Property || p.computed) {
            continue;
          }

          if (
            (p.key.type === AST_NODE_TYPES.Identifier
              ? p.key.name
              : String(p.key.type === AST_NODE_TYPES.Literal ? p.key.value : '')) === key &&
            p.value.type === AST_NODE_TYPES.Literal &&
            typeof p.value.value === 'string'
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
          coreArgs: args.slice(0, -1).map((a: TSESTree.CallExpressionArgument): string => {
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

  function joinWithMessage(parts: string[], message?: string | undefined): string {
    return message ? [...parts, message].join(', ') : parts.join(', ');
  }

  function mapExpressionToValibot(
    expr: TSESTree.Expression | TSESTree.AssignmentPattern | TSESTree.TSEmptyBodyFunctionExpression,
    context: Readonly<RuleContext<MessageIds, Options>>
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
    if (base.name === 'array') {
      const innerArg = base.args[0];

      if (innerArg.type !== AST_NODE_TYPES.SpreadElement) {
        const mappedInner = mapExpressionToValibot(innerArg, context);

        if (mappedInner !== null) {
          coreArgs[0] = mappedInner;
        }
      }
    }

    // object({ shape })
    if (base.name === 'object' && base.args[0]?.type === AST_NODE_TYPES.ObjectExpression) {
      const parts: string[] = [];

      for (const p of base.args[0].properties) {
        if (p.type !== AST_NODE_TYPES.Property) {
          parts.push(getText(p, context));

          continue;
        }

        parts.push(
          `${getText(p.key, context)}: ${
            (p.value && mapExpressionToValibot(p.value, context)) ?? getText(p.value, context)
          }`
        );
      }

      coreArgs[0] = `{ ${parts.join(', ')} }`;
    }

    // tuple([items])
    if (base.name === 'tuple' && base.args[0]?.type === AST_NODE_TYPES.ArrayExpression) {
      const items = base.args[0].elements.map((el) => {
        if (!el || el.type === AST_NODE_TYPES.SpreadElement) {
          return getText(el ?? undefined, context);
        }

        return mapExpressionToValibot(el, context) ?? getText(el, context);
      });

      coreArgs[0] = `[${items.join(', ')}]`;
    }

    // Handle tuple rest: z.tuple([...]).rest(schema) -> v.tupleWithRest([...], schema)
    if (base.name === 'tuple') {
      const restStep = steps.slice(1).find((s: ChainStep): boolean => {
        return s.kind === 'method' && s.name === 'rest';
      });

      if (restStep && restStep.args.length >= 1) {
        const restArg = restStep.args[0];

        return `${ns}.tupleWithRest(${coreArgs[0] ?? '[]'}, ${
          restArg.type === AST_NODE_TYPES.SpreadElement
            ? getText(restArg, context)
            : (mapExpressionToValibot(restArg, context) ?? getText(restArg, context))
        })`;
      }
    }

    // union([members]) or intersection([members])
    if (
      (base.name === 'union' || base.name === 'intersection') &&
      base.args[0]?.type === AST_NODE_TYPES.ArrayExpression
    ) {
      coreArgs[0] = `[${base.args[0].elements
        .map((el: TSESTree.Expression | TSESTree.SpreadElement | null) => {
          if (!el || el.type === AST_NODE_TYPES.SpreadElement) {
            return getText(el ?? undefined, context);
          }

          return mapExpressionToValibot(el, context) ?? getText(el, context);
        })
        .join(', ')}]`;
    }

    // intersection(a, b) (non-array form) -> v.intersect([a, b])
    if (base.name === 'intersection' && base.args.length >= 2) {
      const left = base.args[0];
      const right = base.args[1];
      const parts: string[] = [];

      if (left) {
        parts.push(
          left.type === AST_NODE_TYPES.SpreadElement
            ? getText(left, context)
            : (mapExpressionToValibot(left, context) ?? getText(left, context))
        );
      }

      if (right) {
        parts.push(
          right.type === AST_NODE_TYPES.SpreadElement
            ? getText(right, context)
            : (mapExpressionToValibot(right, context) ?? getText(right, context))
        );
      }

      coreArgs.length = 0;
      coreArgs.push(`[${parts.join(', ')}]`);
    }

    // discriminatedUnion(key, [members])
    if (
      base.name === 'discriminatedUnion' &&
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
        .join(', ')}]`;
    }

    // record(key, value)
    if (base.name === 'record' && base.args.length >= 2) {
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
    if (base.name === 'map' && base.args.length >= 2) {
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
    if (base.name === 'set' && base.args.length >= 1) {
      const a = base.args[0];

      if (a.type !== AST_NODE_TYPES.SpreadElement) {
        const mapped = mapExpressionToValibot(a, context);

        if (mapped !== null) {
          coreArgs[0] = mapped;
        }
      }
    }

    // promise(inner) -> In Valibot, promise() does not take inner schema, so ignore inner arg
    if (base.name === 'promise' && base.args.length >= 1) {
      // Drop inner argument to avoid invalid typings like v.promise(v.string())
      coreArgs.length = 0;
    }
  }

  // Special handling: Zod exposes some string-specific helpers at the root, e.g. z.uuid(), z.cuid(), z.cuid2(), z.email(), z.url().
  // In Valibot these are actions that must be piped onto a string schema.
  const baseExpr =
    base.kind === 'base' && rootStringHelpers.has(base.name)
      ? `${ns}.pipe(${ns}.string(), ${`${ns}.${base.name === 'cuid' ? 'cuid2' : base.name}(${baseSplit.message ?? ''})`.replace(
          '()',
          `(${baseSplit.message ? baseSplit.message : ''})`
        )})`
      : `${baseMap[base.name] ?? ''}(${joinWithMessage(coreArgs, baseSplit.message)})`;

  if (steps.length === 1) {
    return baseExpr;
  }

  // Modifiers map; length vs value vs size
  function isStringBase(): boolean {
    // Treat root string helpers as string base for modifiers like min/max/length/etc.
    return base.name === 'string' || rootStringHelpers.has(base.name);
  }

  function isArrayBase(): boolean {
    return base.name === 'array';
  }

  function isBigintBase(): boolean {
    return base.name === 'bigint';
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

  const modMap: Record<string, (args: string[], message?: string | undefined) => string | null> = {
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
      return `${ns}.email(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    url: (_args: string[], message?: string | undefined): string => {
      return `${ns}.url(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    uuid: (_args: string[], message?: string | undefined): string => {
      return `${ns}.uuid(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    cuid: (_args: string[], message?: string | undefined): string => {
      return `${ns}.cuid2(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    cuid2: (_args: string[], message?: string | undefined): string => {
      return `${ns}.cuid2(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
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
      return `${ns}.nonEmpty(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    int: (_args: string[], message?: string | undefined): string => {
      return `${ns}.integer(${message ?? ''})`.replace('()', `(${message ? message : ''})`);
    },
    positive: (_args: string[], message?: string | undefined): string => {
      return `${ns}.gtValue(${joinWithMessage([isBigintBase() ? '0n' : '0'], message)})`;
    },
    negative: (_args: string[], message?: string | undefined): string => {
      return `${ns}.ltValue(${joinWithMessage([isBigintBase() ? '0n' : '0'], message)})`;
    },
    nonnegative: (_args: string[], message?: string | undefined): string => {
      return `${ns}.minValue(${joinWithMessage([isBigintBase() ? '0n' : '0'], message)})`;
    },
    nonpositive: (_args: string[], message?: string | undefined): string => {
      return `${ns}.maxValue(${joinWithMessage([isBigintBase() ? '0n' : '0'], message)})`;
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
    // mark output type as readonly
    readonly: (_args: string[], _message?: string | undefined): string => {
      return `${ns}.readonly()`;
    },
    // brand action to annotate output type
    brand: (args: string[], _message?: string | undefined): string => {
      // Pass through the first argument if provided, e.g. brand("Email")
      return `${ns}.brand(${args[0] ?? ''})`.replace('()', '()');
    },
    // describe action to add description metadata
    describe: (args: string[], _message?: string | undefined): string => {
      return `${ns}.description(${args[0] ?? ''})`;
    },
    // meta action to add metadata
    meta: (args: string[], _message?: string | undefined): string => {
      return `${ns}.metadata(${args[0] ?? ''})`;
    },
  };

  const pipes: string[] = [baseExpr];
  // If any async action is added (e.g., checkAsync), we must switch to pipeAsync
  let hasAsyncAction = false;

  // Track wrappers that cannot be represented as pipe actions
  let wrapOptional = false;
  let wrapFallback: string | null = null;
  // Track schema wrappers like nullish/nullable in the order encountered
  const schemaWrappers: string[] = [];

  for (let i = 1; i < steps.length; i++) {
    const s = steps[i];

    // unsupported
    if (s.kind !== 'method') {
      return null;
    }

    // Helper to get current piped expression
    function getCurrentExpr(): string {
      return `${ns}.${hasAsyncAction ? 'pipeAsync' : 'pipe'}(${pipes.join(', ')})`;
    }

    // Special wrappers that change the schema shape (not actions): pick, omit, partial, required
    if (
      ['pick', 'omit', 'partial', 'required'].includes(s.name) &&
      (s.args.length === 0 || s.args.length === 1)
    ) {
      let keysArgText = '';

      if (s.args.length === 1) {
        const only = s.args[0];

        if (only.type === AST_NODE_TYPES.ArrayExpression) {
          // Pass through arrays as-is
          keysArgText = getText(only, context);
        } else if (only.type === AST_NODE_TYPES.ObjectExpression) {
          // Convert Zod's object-of-bools to an array of string keys
          const keyNames: string[] = [];

          for (const p of only.properties) {
            if (p.type !== AST_NODE_TYPES.Property || p.computed) {
              continue;
            }

            if (p.key.type === AST_NODE_TYPES.Identifier) {
              keyNames.push(p.key.name);
            } else if (p.key.type === AST_NODE_TYPES.Literal && typeof p.key.value === 'string') {
              keyNames.push(p.key.value);
            }
          }

          keysArgText = `[${keyNames
            .map((k: string): string => {
              return JSON.stringify(k);
            })
            .join(', ')}]`;
        } else {
          // Fallback: use original text
          keysArgText = getText(only, context);
        }
      }

      const wrapper = `${ns}.${s.name}(${getCurrentExpr()}${
        keysArgText ? `, ${keysArgText}` : ''
      })`;

      // Reset pipes to continue piping further actions on the new schema
      pipes.length = 0;

      pipes.push(wrapper);

      continue;
    }

    // Limited support: z.enum([...]).extract([...]) / .exclude([...]) -> v.picklist(filtered)
    if (
      (s.name === 'extract' || s.name === 'exclude') &&
      base.name === 'enum' &&
      base.args.length >= 1 &&
      base.args[0]?.type === AST_NODE_TYPES.ArrayExpression &&
      s.args.length === 1 &&
      s.args[0]?.type === AST_NODE_TYPES.ArrayExpression
    ) {
      const sourceEls = base.args[0].elements;
      const filterEls = s.args[0].elements;

      const src: string[] = [];
      const flt: string[] = [];

      for (const el of sourceEls) {
        if (el !== null && el.type === AST_NODE_TYPES.Literal && typeof el.value === 'string') {
          src.push(el.value);
        }
      }

      for (const el of filterEls) {
        if (el !== null && el.type === AST_NODE_TYPES.Literal && typeof el.value === 'string') {
          flt.push(el.value);
        }
      }

      const set = new Set(src);
      const res: string[] = [];

      if (s.name === 'extract') {
        for (const vStr of flt) {
          if (set.has(vStr)) {
            res.push(vStr);
          }
        }
      } else {
        for (const vStr of src) {
          if (!flt.includes(vStr)) {
            res.push(vStr);
          }
        }
      }

      pipes.length = 0;

      pipes.push(`${ns}.picklist([${res.map((v) => JSON.stringify(v)).join(', ')}])`);

      continue;
    }

    const map = modMap[s.name];

    if (!map) {
      // Wrappers: nullish(), nullable() -> defer and apply after building core schema
      if ((s.name === 'nullish' || s.name === 'nullable') && s.args.length === 0) {
        schemaWrappers.push(s.name);

        continue;
      }

      // Pipe action: transform(fn)
      if (s.name === 'transform' && s.args.length === 1) {
        pipes.push(`${ns}.transform(${getText(s.args[0], context)})`);

        continue;
      }

      // Pipe action: refine(handler, message?) -> check/checkAsync(handler, message?)
      if (s.name === 'refine' && s.args.length >= 1) {
        const { coreArgs, message } = splitArgsAndMessage(s.args, context);

        // Detect async handler to select checkAsync
        const handler = s.args[0];

        const isAsyncHandler =
          (handler.type === AST_NODE_TYPES.ArrowFunctionExpression && handler.async === true) ||
          (handler.type === AST_NODE_TYPES.FunctionExpression && handler.async === true);

        if (isAsyncHandler) {
          hasAsyncAction = true;
        }

        // If handler has more than 1 declared parameter, wrap to unary to satisfy typing
        const handlerText = coreArgs[0] ?? getText(s.args[0], context);

        pipes.push(
          `${ns}.${isAsyncHandler ? 'checkAsync' : 'check'}(${
            (
              handler.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                handler.type === AST_NODE_TYPES.FunctionExpression
            ) && (handler.params?.length ?? 0) > 1
              ? `(value) => { ${handlerText}(value); }`
              : handlerText
          }${message ? `, ${message}` : ''})`
        );

        continue;
      }

      // Pipe action: superRefine(handler) -> single/multiple check/checkAsync depending on how many issues created in zod
      if (s.name === 'superRefine' && s.args.length >= 1) {
        const handler = s.args[0];

        const isAsyncHandler =
          (handler.type === AST_NODE_TYPES.ArrowFunctionExpression && handler.async === true) ||
          (handler.type === AST_NODE_TYPES.FunctionExpression && handler.async === true);

        // If async, we currently do NOT convert superRefine to avoid incorrect behavior without ctx.
        if (isAsyncHandler) {
          return null;
        }

        const hasCtxParam =
          (handler.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            handler.type === AST_NODE_TYPES.FunctionExpression) &&
          (handler.params?.length ?? 0) > 1;

        // If there's no ctx, this superRefine behaves like refine; map to a simple check.
        if (!hasCtxParam) {
          pipes.push(`${ns}.check(${getText(s.args[0], context)})`);

          continue;
        }

        // Try to extract simple pattern: a block of one or more if statements that each call ctx.addIssue({... message: "..." })
        if (
          (handler.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            handler.type === AST_NODE_TYPES.FunctionExpression) &&
          handler.body &&
          handler.body.type === AST_NODE_TYPES.BlockStatement
        ) {
          const stmts: TSESTree.Statement[] = handler.body.body ?? [];

          if (
            stmts.length > 0 &&
            stmts.every((st: TSESTree.Statement): boolean => {
              return st.type === AST_NODE_TYPES.IfStatement && !st.alternate;
            })
          ) {
            const paramRegex = new RegExp(
              `\\b${
                handler.params?.[0] && handler.params[0].type === AST_NODE_TYPES.Identifier
                  ? handler.params[0].name
                  : 'value'
              }\\b`,
              'g'
            );

            let allConvertible = true;

            const checks: { predicate: string; message?: string | undefined }[] = [];

            for (const ifs of stmts) {
              // Must have consequent that calls ctx.addIssue({...})
              let callExpr: TSESTree.CallExpression | null = null;

              if (!('consequent' in ifs)) {
                continue;
              }

              if (
                ifs.consequent !== null &&
                ifs.consequent.type === AST_NODE_TYPES.BlockStatement &&
                ifs.consequent.body.length === 1 &&
                ifs.consequent.body[0].type === AST_NODE_TYPES.ExpressionStatement
              ) {
                const expr = ifs.consequent.body[0].expression;
                if (
                  expr.type === AST_NODE_TYPES.CallExpression &&
                  expr.callee.type === AST_NODE_TYPES.MemberExpression &&
                  expr.callee.property.type === AST_NODE_TYPES.Identifier &&
                  expr.callee.property.name === 'addIssue'
                ) {
                  callExpr = expr;
                }
              } else if (
                ifs.consequent.type === AST_NODE_TYPES.ExpressionStatement &&
                ifs.consequent.expression.type === AST_NODE_TYPES.CallExpression &&
                ifs.consequent.expression.callee.type === AST_NODE_TYPES.MemberExpression &&
                ifs.consequent.expression.callee.property.type === AST_NODE_TYPES.Identifier &&
                ifs.consequent.expression.callee.property.name === 'addIssue'
              ) {
                callExpr = ifs.consequent.expression;
              }

              if (
                !callExpr ||
                callExpr.arguments.length < 1 ||
                callExpr.arguments[0].type !== AST_NODE_TYPES.ObjectExpression
              ) {
                allConvertible = false;

                break;
              }

              const msgProp = callExpr.arguments[0].properties.find(
                (p: TSESTree.ObjectLiteralElement): boolean => {
                  return (
                    p.type === AST_NODE_TYPES.Property &&
                    p.key.type === AST_NODE_TYPES.Identifier &&
                    p.key.name === 'message'
                  );
                }
              );

              if (typeof msgProp !== 'undefined' && 'value' in msgProp) {
                checks.push({
                  predicate: getText(ifs.test, context).replace(paramRegex, 'value'),
                  message:
                    msgProp.value.type === AST_NODE_TYPES.Literal &&
                    typeof msgProp.value.value === 'string'
                      ? JSON.stringify(msgProp.value.value)
                      : undefined,
                });
              }
            }

            if (allConvertible) {
              for (const c of checks) {
                pipes.push(
                  `${ns}.check((value) => { return ${c.predicate} }${c.message ? `, ${c.message}` : ''})`
                );
              }

              continue;
            }
          }
        }

        // Complex patterns are not safely convertible without ctx; skip transformation
        return null;
      }

      // Pipe action: pipe(schema) -> continue piping with the new schema
      if (s.name === 'pipe' && s.args.length >= 1) {
        const pipeArg = s.args[0];

        pipes.push(
          pipeArg.type === AST_NODE_TYPES.SpreadElement
            ? getText(pipeArg, context)
            : (mapExpressionToValibot(pipeArg, context) ?? getText(pipeArg, context))
        );

        continue;
      }

      // Handle wrappers: optional(), default(value)
      if (s.name === 'optional' && s.args.length === 0) {
        wrapOptional = true;

        continue;
      }

      if (s.name === 'default' && s.args.length === 1) {
        wrapFallback = getText(s.args[0], context);

        continue;
      }

      // Zod .catch(value) -> Valibot fallback(schema, value)
      if (s.name === 'catch' && s.args.length === 1) {
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

  const piped = `${ns}.${hasAsyncAction ? 'pipeAsync' : 'pipe'}(${pipes.join(', ')})`;

  // Build core schema: if we only have base and schema wrappers, avoid redundant pipe
  let core = piped;

  if (schemaWrappers.length > 0 && pipes.length === 1) {
    core = pipes[0];
  }

  // Apply schema wrappers in order
  for (const w of schemaWrappers) {
    core = `${ns}.${w}(${core})`;
  }

  // Apply fallback/optional wrappers last
  if (wrapFallback !== null) {
    return `${ns}.fallback(${core}, ${wrapFallback})`;
  }

  if (wrapOptional) {
    return `${ns}.optional(${core})`;
  }

  return core;
}

function reportAndFixImport(
  node: TSESTree.ImportDeclaration,
  context: Readonly<RuleContext<MessageIds, Options>>
): void {
  if (getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
    return;
  }

  // Otherwise, offer to add a Valibot namespace import at the top.
  context.report({
    node,
    messageId: 'convertToValibot',
    fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
      const fixes: TSESLint.RuleFix[] = [];

      const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

      if (firstToken) {
        fixes.push(fixer.insertTextBefore(firstToken, "import * as v from 'valibot';\n"));
      }

      return fixes;
    },
  });
}

const ruleName = 'zod-to-valibot';

export const zodToValibotRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Zod schemas to Valibot',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert Zod schema to Valibot',
    },
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<MessageIds, Options>>): TSESLint.RuleListener {
    return {
      [AST_NODE_TYPES.ImportDeclaration](node: TSESTree.ImportDeclaration): void {
        if (!isZodImport(node)) {
          return;
        }

        reportAndFixImport(node, context);
      },

      // Convert z.infer<typeof X> to v.InferInput<typeof X>
      [AST_NODE_TYPES.TSTypeReference](node: TSESTree.TSTypeReference): void {
        if (node.typeName.type !== AST_NODE_TYPES.TSQualifiedName) {
          return;
        }

        const left = node.typeName.left;
        const right = node.typeName.right;

        if (
          left.type !== AST_NODE_TYPES.Identifier ||
          left.name !== 'z' ||
          right.type !== AST_NODE_TYPES.Identifier ||
          right.name !== 'infer'
        ) {
          return;
        }

        const existingNs = getNamespaceImportLocalFromValibot(context.sourceCode.ast);

        const ns = existingNs ?? 'v';

        context.report({
          node: node.typeName,
          messageId: 'convertToValibot',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
            const fixes: TSESLint.RuleFix[] = [];

            if (!existingNs) {
              const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

              if (firstToken) {
                fixes.push(
                  fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                );
              }
            }

            fixes.push(fixer.replaceText(node.typeName, `${ns}.InferInput`));

            return fixes;
          },
        });

        return;
      },

      // Additionally, if a remaining reference to z (from zod) is found, offer a local fix to rename to v.
      [AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
        if (node.object.type !== AST_NODE_TYPES.Identifier || node.object.name !== 'z') {
          return;
        }

        // Skip z.coerce.*() so Stage 7 CallExpression fixer can handle full replacement
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'coerce' &&
          node.parent &&
          node.parent.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.parent &&
          node.parent.parent.type === AST_NODE_TYPES.CallExpression
        ) {
          return;
        }

        const variable = context.sourceCode.getScope(node).set.get('z');

        if (!variable) {
          return;
        }

        if (
          typeof variable.defs.find((d): boolean => {
            return (
              d.type === 'ImportBinding' &&
              d.parent?.type === AST_NODE_TYPES.ImportDeclaration &&
              d.parent.source.value === 'zod'
            );
          }) === 'undefined'
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

        const existingNs = getNamespaceImportLocalFromValibot(context.sourceCode.ast);

        const targetNs = existingNs ?? 'v';

        context.report({
          node: node.object,
          messageId: 'convertToValibot',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
            const fixes: TSESLint.RuleFix[] = [];

            if (!existingNs) {
              // Insert valibot namespace import at the very top (before other statements)
              const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

              if (firstToken) {
                fixes.push(
                  fixer.insertTextBefore(firstToken, `import * as ${targetNs} from 'valibot';\n`)
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

          if (root && root.type === AST_NODE_TYPES.Identifier && root.name === 'z') {
            const steps = collectChain(node);

            if (steps) {
              const mapped = mapChainToValibot(steps, context);

              if (mapped !== null && mapped !== context.sourceCode.getText(node)) {
                context.report({
                  node,
                  messageId: 'convertToValibot',
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
                    return fixer.replaceText(node, mapped);
                  },
                });
              }

              return; // avoid double-reporting when Stage 4/5/6 also match
            }
          }
        }

        // Stage 4: .parse/.safeParse -> v.parse(schema, arg)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'parse' || node.callee.property.name === 'safeParse') &&
          node.arguments.length === 1
        ) {
          // Ensure the root is z or v to avoid false positives
          let root: TSESTree.Expression | null = node.callee.object;

          while (root && root.type === AST_NODE_TYPES.MemberExpression) {
            root = root.object;
          }

          function resolveBaseIdentifierFromInit(
            expr: TSESTree.Expression | null
          ): TSESTree.Identifier | null {
            let cur: TSESTree.Node | null = expr;

            while (cur) {
              if (cur.type === AST_NODE_TYPES.Identifier) {
                return cur;
              }

              if (cur.type === AST_NODE_TYPES.MemberExpression) {
                cur = cur.object;

                continue;
              }

              if (
                cur.type === AST_NODE_TYPES.CallExpression &&
                cur.callee.type === AST_NODE_TYPES.MemberExpression
              ) {
                cur = cur.callee.object;

                continue;
              }

              return null;
            }

            return null;
          }

          let baseId: TSESTree.Identifier | null = null;

          if (root && root.type === AST_NODE_TYPES.Identifier) {
            if (root.name === 'z' || root.name === 'v') {
              baseId = root;
            } else {
              const varDef = context.sourceCode
                .getScope(node)
                .set.get(root.name)
                ?.defs.find((d) => {
                  return d.type === 'Variable';
                });

              baseId = resolveBaseIdentifierFromInit(
                varDef && 'node' in varDef ? varDef.node.init : null
              );
            }
          }

          // If we can resolve the root and it's clearly not z or v, skip.
          // Otherwise, proceed (helps when the variable init is complex or not in scope here).
          if (baseId && baseId.name !== 'z' && baseId.name !== 'v') {
            return;
          }

          const programNs = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${programNs} from 'valibot';\n`)
                  );
                }
              }

              if (
                'property' in node.callee &&
                'name' in node.callee.property &&
                'object' in node.callee
              ) {
                fixes.push(
                  fixer.replaceText(
                    node,
                    `${programNs}.${node.callee.property.name}(${context.sourceCode.getText(node.callee.object)}, ${context.sourceCode.getText(node.arguments[0])})`
                  )
                );
              }

              return fixes;
            },
          });
        }

        // Stage 7: z.coerce.*() -> v.pipe(v.unknown(), v.transform(Constructor))
        // Matches CallExpression with callee: MemberExpression (.. .<type>)
        // where callee.object is MemberExpression (z.coerce)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.object.name === 'z' &&
          node.callee.object.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.property.name === 'coerce' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          const ctorMap: Record<string, string> = {
            number: 'Number',
            string: 'String',
            boolean: 'Boolean',
            date: 'Date',
          };

          const ctor = ctorMap[node.callee.property.name];

          if (!ctor) {
            return;
          }

          const programNs = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${programNs} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${programNs}.pipe(${programNs}.unknown(), ${programNs}.transform(${ctor}))`
                )
              );

              return fixes;
            },
          });
        }

        // Stage 7b: <id>.extract([...]) / <id>.exclude([...]) where <id> = z.enum([...])
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'extract' || node.callee.property.name === 'exclude') &&
          node.arguments.length === 1 &&
          node.arguments[0]?.type === AST_NODE_TYPES.ArrayExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier
        ) {
          const variable = context.sourceCode.getScope(node).set.get(node.callee.object.name);

          if (typeof variable === 'undefined') {
            return;
          }

          const varDef = variable.defs.find((d) => {
            return d.type === 'Variable';
          });

          if (!varDef || !('node' in varDef)) {
            return;
          }

          const init = varDef.node && 'init' in varDef.node ? varDef.node.init : null;

          if (init === null || init.type !== AST_NODE_TYPES.CallExpression) {
            return;
          }

          // Helper to compute the set of string values represented by an initializer
          function resolveValueSetFromInit(expr: TSESTree.CallExpression): string[] | null {
            if (expr.callee.type !== AST_NODE_TYPES.MemberExpression) {
              return null;
            }

            if (expr.callee.property.type !== AST_NODE_TYPES.Identifier) {
              return null;
            }

            // Base: z.enum([..]) or v.picklist([..])
            if (
              (expr.callee.property.name === 'enum' || expr.callee.property.name === 'picklist') &&
              expr.arguments.length >= 1 &&
              expr.arguments[0]?.type === AST_NODE_TYPES.ArrayExpression
            ) {
              const arr: string[] = [];

              for (const el of expr.arguments[0].elements) {
                if (
                  el !== null &&
                  el.type === AST_NODE_TYPES.Literal &&
                  typeof el.value === 'string'
                ) {
                  arr.push(el.value);
                }
              }

              return arr;
            }

            // Derived: <id>.extract([..]) / <id>.exclude([..])
            if (
              (expr.callee.property.name === 'extract' ||
                expr.callee.property.name === 'exclude') &&
              expr.arguments.length === 1 &&
              expr.arguments[0]?.type === AST_NODE_TYPES.ArrayExpression &&
              expr.callee.object.type === AST_NODE_TYPES.Identifier
            ) {
              const baseVar = context.sourceCode.getScope(expr).set.get(expr.callee.object.name);

              if (!baseVar) {
                return null;
              }

              const baseDef = baseVar.defs.find((d) => d.type === 'Variable');

              if (!baseDef || !('node' in baseDef)) {
                return null;
              }

              const baseInit = baseDef.node && 'init' in baseDef.node ? baseDef.node.init : null;

              if (!baseInit || baseInit.type !== AST_NODE_TYPES.CallExpression) {
                return null;
              }

              const parentSet = resolveValueSetFromInit(baseInit);

              if (!parentSet) {
                return null;
              }

              const filterValues: string[] = [];

              for (const el of expr.arguments[0].elements) {
                if (
                  el !== null &&
                  el.type === AST_NODE_TYPES.Literal &&
                  typeof el.value === 'string'
                ) {
                  filterValues.push(el.value);
                }
              }

              if (expr.callee.property.name === 'extract') {
                return parentSet.filter((v) => filterValues.includes(v));
              }

              return parentSet.filter((v) => !filterValues.includes(v));
            }

            return null;
          }

          const src = resolveValueSetFromInit(init);

          if (!src) {
            return;
          }

          const flt: string[] = [];

          for (const el of node.arguments[0].elements) {
            if (el !== null && el.type === AST_NODE_TYPES.Literal && typeof el.value === 'string') {
              flt.push(el.value);
            }
          }

          const res: string[] = [];

          if (node.callee.property.name === 'extract') {
            for (const vStr of flt) {
              if (src.includes(vStr)) {
                res.push(vStr);
              }
            }
          } else {
            for (const vStr of src) {
              if (!flt.includes(vStr)) {
                res.push(vStr);
              }
            }
          }

          const programNs = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken !== null) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${programNs} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${programNs}.picklist(${`[${res.map((v) => JSON.stringify(v)).join(', ')}]`})`
                )
              );

              return fixes;
            },
          });
        }

        // Stage 7c: z.custom<...>(...) -> v.custom<...>(...)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'z' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'custom'
        ) {
          const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                // Insert at the start of the Program to avoid token type issues
                fixes.push(
                  fixer.insertTextBefore(
                    context.sourceCode.ast,
                    `import * as ${ns} from 'valibot';\n`
                  )
                );
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${ns}.custom${node.typeArguments ? context.sourceCode.getText(node.typeArguments) : ''}(${node.arguments
                    .map((a: TSESTree.CallExpressionArgument): string => {
                      return context.sourceCode.getText(a);
                    })
                    .join(', ')})`
                )
              );

              return fixes;
            },
          });

          return;
        }

        // Stage 7d: z.looseObject(schema) -> v.looseObject(schema.entries)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 'z' &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'looseObject' &&
          node.arguments.length === 1
        ) {
          const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              const schemaArg = context.sourceCode.getText(node.arguments[0]);
              fixes.push(
                fixer.replaceText(node, `${ns}.looseObject(${schemaArg}.entries)`)
              );

              return fixes;
            },
          });

          return;
        }

        // Pattern: z.object(shape).strict() -> v.strictObject(shape)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.type === AST_NODE_TYPES.CallExpression &&
          node.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.callee.object.type === AST_NODE_TYPES.Identifier &&
          (node.callee.object.callee.object.name === 'z' ||
            node.callee.object.callee.object.name === 'v') &&
          node.callee.object.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.callee.property.name === 'object' &&
          node.callee.object.arguments.length === 1 &&
          (node.callee.property.name === 'strict' ||
            node.callee.property.name === 'passthrough' ||
            node.callee.property.name === 'strip')
        ) {
          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
              if (
                !('property' in node.callee) ||
                !('name' in node.callee.property) ||
                !('object' in node.callee) ||
                !('arguments' in node.callee.object)
              ) {
                return null;
              }

              const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${ns}.${
                    node.callee.property.name === 'strict'
                      ? 'strictObject'
                      : node.callee.property.name === 'passthrough'
                        ? 'looseObject'
                        : 'object'
                  }(${context.sourceCode.getText(node.callee.object.arguments[0])})`
                )
              );

              return fixes;
            },
          });
        }

        // Pattern: <schema>.pick({ a: true, b: true }) / .omit({ a: true }) -> v.pick(schema, ["a", "b"]) / v.omit(schema, ["a"]) when rooted at z or v
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'pick' || node.callee.property.name === 'omit') &&
          node.arguments.length === 1 &&
          node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression
        ) {
          // Ensure the chain is ultimately rooted at z or v to avoid false positives
          let root: TSESTree.Expression | null = node.callee.object;

          while (root && root.type === AST_NODE_TYPES.MemberExpression) {
            root = root.object;
          }

          function resolveBaseIdentifierFromInit(
            expr: TSESTree.Expression | null
          ): TSESTree.Identifier | null {
            let cur: TSESTree.Node | null = expr;
            while (cur) {
              if (cur.type === AST_NODE_TYPES.Identifier) {
                return cur;
              }

              if (cur.type === AST_NODE_TYPES.MemberExpression) {
                cur = cur.object;

                continue;
              }

              if (
                cur.type === AST_NODE_TYPES.CallExpression &&
                cur.callee.type === AST_NODE_TYPES.MemberExpression
              ) {
                cur = cur.callee.object;

                continue;
              }

              return null;
            }

            return null;
          }

          let baseId: TSESTree.Identifier | null = null;

          if (root && root.type === AST_NODE_TYPES.Identifier) {
            if (root.name === 'z' || root.name === 'v') {
              baseId = root;
            } else {
              const varDef = context.sourceCode
                .getScope(node)
                .set.get(root.name)
                ?.defs.find((d) => {
                  return d.type === 'Variable';
                });

              baseId = resolveBaseIdentifierFromInit(
                varDef && 'node' in varDef ? varDef.node.init : null
              );
            }
          }

          if (!baseId || (baseId.name !== 'z' && baseId.name !== 'v')) {
            return;
          }

          const keys: string[] = [];

          for (const prop of node.arguments[0].properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              ((prop.value.type === AST_NODE_TYPES.Literal && prop.value.value === true) ||
                (prop.value.type === AST_NODE_TYPES.Identifier && prop.value.name === 'true'))
            ) {
              const keyName =
                prop.key.type === AST_NODE_TYPES.Identifier
                  ? prop.key.name
                  : 'value' in prop.key && typeof prop.key.value === 'string'
                    ? String(prop.key.value)
                    : null;

              if (keyName) {
                keys.push(keyName);
              }
            }
          }

          if (keys.length > 0) {
            const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

            context.report({
              node,
              messageId: 'convertToValibot',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
                const fixes: TSESLint.RuleFix[] = [];

                if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                  const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                  if (firstToken) {
                    fixes.push(
                      fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                    );
                  }
                }

                if (
                  'property' in node.callee &&
                  'object' in node.callee &&
                  'name' in node.callee.property
                ) {
                  fixes.push(
                    fixer.replaceText(
                      node,
                      `${ns}.${node.callee.property.name}(${context.sourceCode.getText(
                        node.callee.object
                      )}, [${keys
                        .map((k: string): string => {
                          return JSON.stringify(k);
                        })
                        .join(', ')}])`
                    )
                  );
                }

                return fixes;
              },
            });

            return;
          }
        }

        // Pattern: <schema>.partial() / .required() -> v.partial(schema) / v.required(schema) when rooted at z or v
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'partial' || node.callee.property.name === 'required') &&
          node.arguments.length === 0
        ) {
          let root: TSESTree.Expression | null = node.callee.object;

          while (root && root.type === AST_NODE_TYPES.MemberExpression) {
            root = root.object;
          }

          function resolveBaseIdentifierFromInit(
            expr: TSESTree.Expression | null
          ): TSESTree.Identifier | null {
            let cur: TSESTree.Node | null = expr;
            while (cur) {
              if (cur.type === AST_NODE_TYPES.Identifier) return cur;
              if (cur.type === AST_NODE_TYPES.MemberExpression) {
                cur = cur.object;
                continue;
              }
              if (
                cur.type === AST_NODE_TYPES.CallExpression &&
                cur.callee.type === AST_NODE_TYPES.MemberExpression
              ) {
                cur = cur.callee.object;
                continue;
              }

              return null;
            }
            return null;
          }

          let baseId: TSESTree.Identifier | null = null;

          if (root && root.type === AST_NODE_TYPES.Identifier) {
            if (root.name === 'z' || root.name === 'v') {
              baseId = root;
            } else {
              const variable = context.sourceCode.getScope(node).set.get(root.name);
              const varDef = variable?.defs.find((d) => d.type === 'Variable');
              const init = varDef && 'node' in varDef ? varDef.node.init : null;
              baseId = resolveBaseIdentifierFromInit(init);
            }
          }

          if (!baseId || (baseId.name !== 'z' && baseId.name !== 'v')) {
            return;
          }

          const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] {
              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              if (
                'property' in node.callee &&
                'object' in node.callee &&
                'name' in node.callee.property
              ) {
                fixes.push(
                  fixer.replaceText(
                    node,
                    `${ns}.${node.callee.property.name}(${context.sourceCode.getText(node.callee.object)})`
                  )
                );
              }

              return fixes;
            },
          });

          return;
        }

        // Pattern: z.object(shape).catchall(rest) -> v.objectWithRest(shape, rest)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'catchall' &&
          node.callee.object.type === AST_NODE_TYPES.CallExpression &&
          node.callee.object.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.object.callee.object.type === AST_NODE_TYPES.Identifier &&
          (node.callee.object.callee.object.name === 'z' ||
            node.callee.object.callee.object.name === 'v') &&
          node.callee.object.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.callee.property.name === 'object' &&
          node.callee.object.arguments.length === 1 &&
          node.arguments.length === 1
        ) {
          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
              if (!('object' in node.callee) || !('arguments' in node.callee.object)) {
                return null;
              }

              const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${ns}.objectWithRest(${context.sourceCode.getText(
                    node.callee.object.arguments[0]
                  )}, ${context.sourceCode.getText(node.arguments[0] ?? node)})`
                )
              );

              return fixes;
            },
          });
        }

        // Pattern: <schema>.optional() -> v.optional(<schema>) when rooted at z or v
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'optional' &&
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
            (root.name !== 'z' && root.name !== 'v')
          ) {
            return;
          }

          const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
              if (!('object' in node.callee)) {
                return null;
              }

              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${ns}.optional(${context.sourceCode.getText(node.callee.object)})`
                )
              );

              return fixes;
            },
          });
        }

        // Pattern: <schema>.default(value) -> v.fallback(<schema>, value) when rooted at z or v
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'default' &&
          node.arguments.length === 1
        ) {
          let root: TSESTree.Expression | null = node.callee.object;

          while (root && root.type === AST_NODE_TYPES.MemberExpression) {
            root = root.object;
          }

          if (
            !root ||
            root.type !== AST_NODE_TYPES.Identifier ||
            (root.name !== 'z' && root.name !== 'v')
          ) {
            return;
          }

          const ns = getNamespaceImportLocalFromValibot(context.sourceCode.ast) ?? 'v';

          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
              if (!('object' in node.callee)) {
                return null;
              }

              const fixes: TSESLint.RuleFix[] = [];

              if (!getNamespaceImportLocalFromValibot(context.sourceCode.ast)) {
                const firstToken = context.sourceCode.getFirstToken(context.sourceCode.ast);

                if (firstToken) {
                  fixes.push(
                    fixer.insertTextBefore(firstToken, `import * as ${ns} from 'valibot';\n`)
                  );
                }
              }

              fixes.push(
                fixer.replaceText(
                  node,
                  `${ns}.fallback(${context.sourceCode.getText(node.callee.object)}, ${context.sourceCode.getText(node.arguments[0])})`
                )
              );

              return fixes;
            },
          });
        }

        // Stage 6: Direct name changes on member calls rooted at z or v
        if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
          // Find root identifier of the chain (z or v)
          let root: TSESTree.Expression | null = node.callee.object;

          while (root && root.type === 'MemberExpression') root = root.object;

          if (!root || root.type !== 'Identifier') {
            return;
          }

          if (root.name !== 'z' && root.name !== 'v') {
            return;
          }

          const map: Record<string, string> = {
            intersection: 'intersect',
            and: 'intersect',
            catch: 'fallback',
            discriminatedUnion: 'variant',
            int: 'integer',
            nativeEnum: 'enum',
            or: 'union',
            instanceof: 'instance',
            safe: 'safeInteger',
            element: 'item',
          };

          const next = map[node.callee.property.name];

          if (next) {
            context.report({
              node: node.callee.property,
              messageId: 'convertToValibot',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                if (!('property' in node.callee)) {
                  return null;
                }

                return fixer.replaceText(node.callee.property, next);
              },
            });

            return;
          }
        }

        // Pattern: <schema>.refine(async ...) -> highlight for manual conversion (Valibot check is sync-only)
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'refine' &&
          node.arguments.length >= 1
        ) {
          const firstArg = node.arguments[0];

          const isAsyncPredicate =
            (firstArg?.type === AST_NODE_TYPES.ArrowFunctionExpression && firstArg.async) ||
            (firstArg?.type === AST_NODE_TYPES.FunctionExpression && firstArg.async);

          if (isAsyncPredicate) {
            // Be lenient about root resolution: highlight unless we can prove it's not z/v
            let rootExpr: TSESTree.Expression | null = node.callee.object;

            while (rootExpr && rootExpr.type === AST_NODE_TYPES.MemberExpression) {
              rootExpr = rootExpr.object;
            }

            let skip = false;

            if (rootExpr && rootExpr.type === AST_NODE_TYPES.Identifier) {
              if (rootExpr.name !== 'z' && rootExpr.name !== 'v') {
                const variable = context.sourceCode.getScope(node).set.get(rootExpr.name);
                const varDef = variable?.defs.find((d) => d.type === 'Variable');
                const init = varDef && 'node' in varDef ? varDef.node.init : null;

                let cur: TSESTree.Node | null = init;
                let base: TSESTree.Identifier | null = null;

                while (cur) {
                  if (cur.type === AST_NODE_TYPES.Identifier) {
                    base = cur;
                    break;
                  }
                  if (cur.type === AST_NODE_TYPES.MemberExpression) {
                    cur = cur.object;
                    continue;
                  }
                  if (
                    cur.type === AST_NODE_TYPES.CallExpression &&
                    cur.callee.type === AST_NODE_TYPES.MemberExpression
                  ) {
                    cur = cur.callee.object;
                    continue;
                  }
                  break;
                }

                if (base && base.name !== 'z' && base.name !== 'v') {
                  skip = true;
                }
              }
            }

            if (!skip) {
              context.report({
                node,
                messageId: 'convertToValibot',
              });

              return;
            }
          }
        }
      },
    };
  },
});
