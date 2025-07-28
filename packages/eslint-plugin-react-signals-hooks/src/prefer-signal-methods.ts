import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

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
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type Option = {
  performance: PerformanceBudget;
};

type Options = [Option];

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
      current.type === 'ArrayExpression' &&
      current.parent?.type === 'CallExpression' &&
      current.parent.callee.type === 'Identifier' &&
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
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
});

const ruleName = 'prefer-signal-methods';

export const preferSignalMethodsRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
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
    fixable: 'code',
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'rule-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    if (option.performance.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    // Track rule initialization
    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option.performance.enableMetrics,
        logMetrics: option.performance.logMetrics,
      },
    });

    endPhase(perfKey, 'rule-init');

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2_000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    if (option.performance.enableMetrics) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    trackOperation(perfKey, PerformanceOperations.ruleInitialization);

    let isInEffect = false;
    let isInJSX = false;

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
            node.type === 'Identifier' &&
            (node.name.endsWith('Signal') || node.name.endsWith('signal'))
          )
        ) {
          return;
        }

        // Handle direct signal usage (not a member expression)
        if (node.parent?.type !== 'MemberExpression' || node.parent.object !== node) {
          if (isInEffect && !isInDependencyArray(node)) {
            context.report({
              node,
              messageId: 'usePeekInEffect',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextAfter(node, '.peek()');
              },
            });
          } else if (isInJSX || isInJSXContext(node)) {
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
              `\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget ? 'EXCEEDED' : 'OK'}):`
            );
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

            if (finalMetrics.exceededBudget) {
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
