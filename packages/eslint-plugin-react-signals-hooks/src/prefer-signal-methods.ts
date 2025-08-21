/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type ts from 'typescript';

import { isInJSXContext } from './utils/jsx.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { isInDependencyArray } from './utils/react.js';
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'usePeekInEffect' | 'preferPeekInNonReactiveContext';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
  extraCreatorModules?: Array<string>; // additional modules to scan for signal/computed imports
  reactiveEffectCallees?: Array<string>; // additional callee names to treat as effect context
  effectsSuggestionOnly?: boolean; // if true, do not autofix in effects; provide suggestions instead
  typeAware?: boolean; // if true, use TS type information to confirm signals when available
};

type Options = [Option?];

let isInEffect = false;
let isInJSX = false;
let effectDepth = 0;

const ruleName = 'prefer-signal-methods';

function hasAncestorOfType(node: TSESTree.Node, type: TSESTree.Node['type']): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === type) {
      return true;
    }

    if (
      current.type === AST_NODE_TYPES.Program ||
      current.type === AST_NODE_TYPES.JSXElement ||
      current.type === AST_NODE_TYPES.JSXFragment
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'usePeekInEffect': {
      return options.severity.usePeekInEffect ?? 'error';
    }
    case 'preferPeekInNonReactiveContext': {
      return options.severity.preferPeekInNonReactiveContext ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

export const preferSignalMethodsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        'Enforces proper usage of signal methods (`.value`, `.peek()`) in non-JSX contexts. This rule helps ensure you use the right access pattern for effects and regular code, promoting best practices to optimize reactivity and performance.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      usePeekInEffect:
        'Use signal.peek() to read the current value without subscribing to changes in this effect',
      preferPeekInNonReactiveContext:
        'Prefer .peek() when reading signal value without using its reactive value',
    },
    schema: [
      {
        type: 'object',
        properties: {
          performance: {
            type: 'object',
            properties: {
              maxTime: { type: 'number', minimum: 1 },
              maxMemory: { type: 'number', minimum: 1 },
              maxNodes: { type: 'number', minimum: 1 },
              enableMetrics: { type: 'boolean' },
              logMetrics: { type: 'boolean' },
              maxOperations: {
                type: 'object',
                properties: Object.fromEntries(
                  Object.entries(PerformanceOperations).map(([key]) => [
                    key,
                    { type: 'number', minimum: 1 },
                  ])
                ),
              },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
          extraCreatorModules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          reactiveEffectCallees: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          effectsSuggestionOnly: { type: 'boolean' },
          typeAware: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
      extraCreatorModules: [],
      reactiveEffectCallees: [],
      effectsSuggestionOnly: false,
      typeAware: false,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker(perfKey, option?.performance);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    if (option?.performance?.enableMetrics === true && option.performance.logMetrics === true) {
      console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
      // console.info(`${ruleName}: Rule configuration:`, option);
    }

    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option?.performance?.enableMetrics,
        logMetrics: option?.performance?.logMetrics,
      },
    });

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (
        typeof option?.performance?.maxNodes === 'number' &&
        nodeCount > option.performance.maxNodes
      ) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    startPhase(perfKey, 'ruleExecution');

    // Track local names and namespaces for signal/computed creators
    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();

    // Track variables initialized from signal/computed creators
    const signalVariables = new Set<string>();

    const checker: ts.TypeChecker | undefined =
      context.sourceCode.parserServices?.program?.getTypeChecker();

    function isSignalType(node: TSESTree.Identifier): boolean | undefined {
      if (
        !checker ||
        !context.sourceCode.parserServices ||
        !('esTreeNodeToTSNodeMap' in context.sourceCode.parserServices)
      ) {
        return undefined;
      }

      const anyServices = context.sourceCode.parserServices;

      const tsNode: ts.Node | undefined = anyServices.esTreeNodeToTSNodeMap?.get(node);

      if (!tsNode) {
        return undefined;
      }

      const type: ts.Type | undefined = checker.getTypeAtLocation(tsNode);

      // Heuristic: has properties 'value' and 'peek'
      const hasValue = type.getProperty('value');
      const hasPeek = type.getProperty('peek');

      if (hasValue && hasPeek) {
        return true;
      }

      // Also check apparent type
      const apparent = checker.getApparentType(type);

      const aHasValue = apparent.getProperty('value');

      const aHasPeek = apparent.getProperty('peek');

      if (aHasValue && aHasPeek) {
        return true;
      }
      // Try to detect named type 'Signal'

      const sym = type.aliasSymbol ?? type.symbol;

      if (
        typeof sym !== 'undefined' &&
        (sym.escapedName === 'Signal' || sym.escapedName === 'ReadableSignal')
      ) {
        return true;
      }

      return false;
    }

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        const dynamicOp =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, dynamicOp);
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        // Detect configured effect-like callees
        const names = new Set<string>([
          'useEffect',
          'useLayoutEffect',
          ...(option?.reactiveEffectCallees ?? []),
        ]);

        const callee = node.callee;

        let name: string | undefined;

        if (callee.type === AST_NODE_TYPES.Identifier) {
          name = callee.name;
        } else if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          name = callee.property.name;
        }

        if (typeof name !== 'undefined' && names.has(name)) {
          effectDepth++;
          isInEffect = effectDepth > 0;
        }
      },
      [`${AST_NODE_TYPES.CallExpression}:exit`](node: TSESTree.CallExpression): void {
        const names = new Set<string>([
          'useEffect',
          'useLayoutEffect',
          ...(option?.reactiveEffectCallees ?? []),
        ]);

        let name: string | undefined;

        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          name = node.callee.name;
        } else if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          name = node.callee.property.name;
        }

        if (typeof name !== 'undefined' && names.has(name)) {
          effectDepth = Math.max(0, effectDepth - 1);
          isInEffect = effectDepth > 0;
        }
        isInJSX = false;
      },
      [`${AST_NODE_TYPES.JSXFragment}`](): void {
        isInJSX = true;
      },
      [`${AST_NODE_TYPES.JSXFragment}:exit`](): void {
        isInJSX = false;
      },

      [AST_NODE_TYPES.Identifier](node: TSESTree.Node): void {
        if (node.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        let isSignalIdent =
          hasSignalSuffix(
            node.name,
            buildSuffixRegex(
              typeof option?.suffix === 'string' && option.suffix.length > 0
                ? option.suffix
                : 'Signal'
            )
          ) || signalVariables.has(node.name);

        if (option?.typeAware === true) {
          const byType = isSignalType(node);
          if (byType === true) {
            isSignalIdent = true;
          } else if (byType === false) {
            // If we have a definitive non-signal type, rely on variable tracking only to avoid suffix false-positives
            isSignalIdent = signalVariables.has(node.name);
          }
        }

        if (!isSignalIdent) {
          return;
        }

        if (node.parent.type !== AST_NODE_TYPES.MemberExpression || node.parent.object !== node) {
          if (isInEffect && !isInDependencyArray(node)) {
            if (getSeverity('usePeekInEffect', option) === 'off') {
              return;
            }

            if (option?.effectsSuggestionOnly === true) {
              context.report({
                node,
                messageId: 'usePeekInEffect',
                suggest: [
                  {
                    messageId: 'usePeekInEffect',
                    fix(fixer): TSESLint.RuleFix {
                      return fixer.insertTextAfter(node, '.peek()');
                    },
                  },
                ],
              });
            } else {
              context.report({
                node,
                messageId: 'usePeekInEffect',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.insertTextAfter(node, '.peek()');
                },
              });
            }
          } else if (isInJSX || isInJSXContext(node)) {
            return;
          }

          return;
        }

        // Optional chaining handling:
        // - Generally bail on ChainExpression to stay conservative
        // - But allow direct optional on the member when property is 'value' in effect context,
        //   so we can safely convert `signal?.value` -> `signal?.peek()`.
        if (hasAncestorOfType(node, AST_NODE_TYPES.ChainExpression)) {
          const allowDirectOptionalOnValueInEffect =
            node.parent.optional === true &&
            'name' in node.parent.property &&
            node.parent.property.name === 'value' &&
            isInEffect &&
            !isInDependencyArray(node);

          if (!allowDirectOptionalOnValueInEffect) {
            return;
          }
        }

        if (!('name' in node.parent.property)) {
          return;
        }

        // Delegate JSX `.value` handling to prefer-signal-in-jsx to avoid duplicates
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'value') {
          return;
        }

        // Delegate JSX `.peek()` handling to prefer-signal-in-jsx to avoid duplicates
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'peek') {
          return;
        }

        // Do not flag writes: if this MemberExpression (or its chained parent MemberExpressions)
        // is used as the left-hand side of an assignment or as the argument of an update, skip.
        {
          const memberExpr = node.parent;

          // Bubble up through chained MemberExpressions: signal.value[...].foo...
          let topMember: TSESTree.MemberExpression = memberExpr;

          let p = topMember.parent;

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          while (p && p.type === AST_NODE_TYPES.MemberExpression && p.object === topMember) {
            topMember = p;
            p = topMember.parent;
          }

          if (
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            p &&
            ((p.type === AST_NODE_TYPES.AssignmentExpression && p.left === topMember) ||
              (p.type === AST_NODE_TYPES.UpdateExpression && p.argument === topMember))
          ) {
            return;
          }
        }

        if (!(isInEffect && !isInDependencyArray(node) && node.parent.property.name === 'value')) {
          return;
        }

        if (getSeverity('preferPeekInNonReactiveContext', option) === 'off') {
          return;
        }

        const applyFix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
          // If this member uses direct optional chaining like `signal?.value`,
          // replace the entire member with `object?.peek()` to preserve short-circuiting.
          if (
            'optional' in node.parent &&
            'object' in node.parent &&
            node.parent.optional === true
          ) {
            return fixer.replaceText(
              node.parent,
              `${context.sourceCode.getText(node.parent.object)}?.peek()`
            );
          }

          // Fallback: replace only the property name `value` -> `peek()`
          if ('property' in node.parent) {
            return fixer.replaceText(node.parent.property, 'peek()');
          }

          return null;
        };

        if (option?.effectsSuggestionOnly === true) {
          context.report({
            node: node.parent.property,
            messageId: 'preferPeekInNonReactiveContext',
            suggest: [
              {
                messageId: 'preferPeekInNonReactiveContext',
                fix: applyFix,
              },
            ],
          });
        } else {
          context.report({
            node: node.parent.property,
            messageId: 'preferPeekInNonReactiveContext',
            fix: applyFix,
          });
        }
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        if (!node.init || node.init.type !== AST_NODE_TYPES.CallExpression) {
          return;
        }

        let isCreator = false;

        if (node.init.callee.type === AST_NODE_TYPES.Identifier) {
          if (
            signalCreatorLocals.has(node.init.callee.name) ||
            computedCreatorLocals.has(node.init.callee.name)
          ) {
            isCreator = true;
          }
        } else if (
          node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
          creatorNamespaces.has(node.init.callee.object.name) &&
          node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.init.callee.property.name === 'signal' ||
            node.init.callee.property.name === 'computed')
        ) {
          isCreator = true;
        }

        if (isCreator) {
          signalVariables.add(node.id.name);
        }
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) {
            continue;
          }
          if (typeof stmt.source.value !== 'string') {
            continue;
          }

          const allowedModules = new Set<string>([
            '@preact/signals-react',
            ...(option?.extraCreatorModules ?? []).filter((s: string): boolean => {
              return typeof s === 'string';
            }),
          ]);

          if (allowedModules.has(stmt.source.value)) {
            for (const spec of stmt.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
                if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'signal'
                ) {
                  signalCreatorLocals.add(spec.local.name);
                } else if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'computed'
                ) {
                  computedCreatorLocals.add(spec.local.name);
                }
              } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                creatorNamespaces.add(spec.local.name);
              }
            }
          }
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
