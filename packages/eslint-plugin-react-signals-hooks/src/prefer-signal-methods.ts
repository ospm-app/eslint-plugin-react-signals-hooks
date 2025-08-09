/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

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

type MessageIds =
  | 'usePeekInEffect'
  | 'useValueInJSX'
  | 'preferDirectSignalUsage'
  | 'preferPeekInNonReactiveContext';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

let isInEffect = false;
let isInJSX = false;

const ruleName = 'prefer-signal-methods';

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'usePeekInEffect': {
      return options.severity.usePeekInEffect ?? 'error';
    }

    case 'useValueInJSX': {
      return options.severity.useValueInJSX ?? 'error';
    }

    case 'preferDirectSignalUsage': {
      return options.severity.preferDirectSignalUsage ?? 'error';
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
    hasSuggestions: false,
    docs: {
      description:
        "Enforces proper usage of signal methods (`.value`, `.peek()`) in different contexts. This rule helps ensure you're using the right signal access pattern for the context, whether it's in JSX, effects, or regular code. It promotes best practices for signal usage to optimize reactivity and performance.",
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      usePeekInEffect:
        'Use signal.peek() to read the current value without subscribing to changes in this effect',
      useValueInJSX: 'Use the signal directly in JSX instead of accessing .value',
      preferDirectSignalUsage: 'Use the signal directly in JSX instead of .peek()',
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

      [`${AST_NODE_TYPES.CallExpression}[callee.name="useEffect"]`](): void {
        isInEffect = true;
      },
      [`${AST_NODE_TYPES.CallExpression}[callee.name="useEffect"]:exit`](): void {
        isInEffect = false;
      },

      [`${AST_NODE_TYPES.JSXElement}`](): void {
        isInJSX = true;
      },
      [`${AST_NODE_TYPES.JSXElement}:exit`](): void {
        isInJSX = false;
      },
      [`${AST_NODE_TYPES.JSXFragment}`](): void {
        isInJSX = true;
      },
      [`${AST_NODE_TYPES.JSXFragment}:exit`](): void {
        isInJSX = false;
      },

      [AST_NODE_TYPES.Identifier](node: TSESTree.Node): void {
        if (!(node.type === AST_NODE_TYPES.Identifier)) {
          return;
        }

        // Configurable suffix check
        const suffix =
          typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal';
        const suffixRegex = buildSuffixRegex(suffix);

        const isSignalIdent =
          hasSignalSuffix(node.name, suffixRegex) || signalVariables.has(node.name);

        if (!isSignalIdent) {
          return;
        }

        if (node.parent.type !== AST_NODE_TYPES.MemberExpression || node.parent.object !== node) {
          if (isInEffect && !isInDependencyArray(node)) {
            if (getSeverity('usePeekInEffect', option) === 'off') {
              return;
            }

            context.report({
              node,
              messageId: 'usePeekInEffect',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextAfter(node, '.peek()');
              },
            });
          } else if (isInJSX || isInJSXContext(node)) {
            return;
          }

          return;
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

        if (isInEffect && !isInDependencyArray(node) && node.parent.property.name === 'value') {
          if (getSeverity('preferPeekInNonReactiveContext', option) === 'off') {
            return;
          }

          context.report({
            node: node.parent.property,
            messageId: 'preferPeekInNonReactiveContext',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              if ('property' in node.parent) {
                return fixer.replaceText(node.parent.property, 'peek()');
              }

              return null;
            },
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

        const callee = node.init.callee;
        let isCreator = false;
        if (callee.type === AST_NODE_TYPES.Identifier) {
          if (signalCreatorLocals.has(callee.name) || computedCreatorLocals.has(callee.name)) {
            isCreator = true;
          }
        } else if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          creatorNamespaces.has(callee.object.name) &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'signal' || callee.property.name === 'computed')
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
          if (
            typeof stmt.source.value === 'string' &&
            stmt.source.value === '@preact/signals-react'
          ) {
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
