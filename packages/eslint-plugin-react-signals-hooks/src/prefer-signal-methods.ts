/** biome-ignore-all assist/source/organizeImports: off */
import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  stopTracking,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type Severity = {
  usePeekInEffect?: 'error' | 'warn' | 'off';
  useValueInJSX?: 'error' | 'warn' | 'off';
  preferDirectSignalUsage?: 'error' | 'warn' | 'off';
  preferPeekInNonReactiveContext?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

type MessageIds =
  | 'usePeekInEffect'
  | 'useValueInJSX'
  | 'preferDirectSignalUsage'
  | 'preferPeekInNonReactiveContext';

function isInDependencyArray(node: TSESTree.Node): boolean {
  let current = node;

  while (current.parent) {
    current = current.parent;
    if (
      current.type === AST_NODE_TYPES.ArrayExpression &&
      current.parent.type === AST_NODE_TYPES.CallExpression &&
      current.parent.callee.type === AST_NODE_TYPES.Identifier &&
      current.parent.callee.name === 'useEffect'
    ) {
      return true;
    }
  }

  return false;
}

function isInJSXContext(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === AST_NODE_TYPES.JSXElement || parent.type === AST_NODE_TYPES.JSXFragment) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

let isInEffect = false;
let isInJSX = false;

const ruleName = 'prefer-signal-methods';

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  // eslint-disable-next-line security/detect-object-injection
  const severity = options.severity[messageId];

  return severity ?? 'error';
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

    const perf = createPerformanceTracker<Options>(perfKey, option?.performance, context);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

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

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
      },

      'CallExpression[callee.name="useEffect"]'(): void {
        isInEffect = true;
      },
      'CallExpression[callee.name="useEffect"]:exit'(): void {
        isInEffect = false;
      },

      JSXElement(): void {
        isInJSX = true;
      },
      'JSXElement:exit'(): void {
        isInJSX = false;
      },
      JSXFragment(): void {
        isInJSX = true;
      },
      'JSXFragment:exit'(): void {
        isInJSX = false;
      },

      'Identifier:matches([name$="Signal"], [name$="signal"])'(node: TSESTree.Node): void {
        if (
          !(
            node.type === AST_NODE_TYPES.Identifier &&
            (node.name.endsWith('Signal') || node.name.endsWith('signal'))
          )
        ) {
          return;
        }

        // Handle direct signal usage (not a member expression)
        if (node.parent.type !== AST_NODE_TYPES.MemberExpression || node.parent.object !== node) {
          if (isInEffect && !isInDependencyArray(node)) {
            const severity = getSeverity('usePeekInEffect', option);
            if (severity === 'off') return;

            context.report({
              node,
              messageId: 'usePeekInEffect',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextAfter(node, '.peek()');
              },
            });
          } else if (isInJSX || isInJSXContext(node)) {
            const severity = getSeverity('useValueInJSX', option);
            if (severity === 'off') return;

            context.report({
              node,
              messageId: 'useValueInJSX',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextAfter(node, '.value');
              },
            });
          }

          return;
        }

        if (!('name' in node.parent.property)) {
          return;
        }

        // Handle .value usage in JSX
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'value') {
          const severity = getSeverity('useValueInJSX', option);

          if (severity === 'off') return;

          context.report({
            node: node.parent.property,
            messageId: 'useValueInJSX',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              if ('property' in node.parent) {
                return fixer.remove(node.parent.property);
              }

              return null;
            },
          });

          return;
        }

        // Handle .peek() usage in JSX
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'peek') {
          const severity = getSeverity('preferDirectSignalUsage', option);

          if (severity === 'off') return;

          context.report({
            node: node.parent.property,
            messageId: 'preferDirectSignalUsage',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              return fixer.remove(node.parent);
            },
          });

          return;
        }

        // Handle .value usage in effects outside of dependency arrays
        if (isInEffect && !isInDependencyArray(node) && node.parent.property.name === 'value') {
          const severity = getSeverity('preferPeekInNonReactiveContext', option);
          if (severity === 'off') {
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

      // Clean up
      'Program:exit'(): void {
        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (typeof finalMetrics !== 'undefined') {
            console.info(
              `\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget === true ? 'EXCEEDED' : 'OK'}):`
            );
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

            if (finalMetrics.exceededBudget === true) {
              console.warn('\n⚠️  Performance budget exceeded!');
            }
          }
        } catch (error: unknown) {
          console.error('Error recording metrics:', error);
        } finally {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);
        }

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
