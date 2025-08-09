/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  stopTracking,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type Severity = {
  useValueInNonJSX?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

type MessageIds = 'useValueInNonJSX';

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

function isInJSXAttribute(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === AST_NODE_TYPES.JSXAttribute) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

let isInJSX = false;

const ruleName = 'prefer-signal-reads';

export const preferSignalReadsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Enforces using `.value` when reading signal values in non-JSX contexts. In JSX, signals are automatically unwrapped, but in regular JavaScript/TypeScript code, you must explicitly access the `.value` property to read the current value of a signal. This rule helps catch cases where you might have forgotten to use `.value` when needed.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      useValueInNonJSX: 'Use .value to read the current value of the signal in non-JSX context',
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
    } satisfies Option,
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option?.performance, context);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    // console.info(`${ruleName}: Rule configuration:`, option);

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

        // Skip if in JSX context
        if (isInJSX || isInJSXContext(node) || isInJSXAttribute(node)) {
          return;
        }

        // Skip if already using .value
        if (
          node.parent.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.object === node &&
          'property' in node.parent &&
          node.parent.property.type === AST_NODE_TYPES.Identifier &&
          node.parent.property.name === 'value'
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'useValueInNonJSX',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.insertTextAfter(node, '.value');
          },
        });
      },

      // Clean up
      'Program:exit'(): void {
        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
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
