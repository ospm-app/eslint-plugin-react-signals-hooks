import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import type { PerformanceBudget } from './utils/types.js';
import {
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  startPhase,
  startTracking,
  trackOperation,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';

type Option = {
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds = 'useValueInNonJSX';

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

function isInJSXAttribute(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === 'JSXAttribute') {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'prefer-signal-reads';

export const preferSignalReadsRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Enforce using .value when reading signal values in non-JSX contexts',
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
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}`;

    startPhase(perfKey, 'rule-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`Initializing rule for file: ${context.filename}`);
    console.info('Rule configuration:', option);

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    let isInJSX = false;

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
          trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
        }
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
          node.parent?.type === 'MemberExpression' &&
          node.parent.object === node &&
          'property' in node.parent &&
          node.parent.property.type === 'Identifier' &&
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
    };
  },
});
