import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';

import { PerformanceOperations } from './utils/performance-constants.js';
import { DEFAULT_PERFORMANCE_BUDGET } from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';

type MessageIds = 'preferDirectSignalUsage';

type Options = [
  {
    performance: PerformanceBudget;
  },
];

function isInJSXAttribute(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === 'JSXAttribute') {
      return true;
    }

    if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function isInFunctionProp(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') {
      // Check if the function is a direct child of a JSX attribute
      if (
        current.parent?.type === 'JSXExpressionContainer' &&
        current.parent.parent?.type === 'JSXAttribute'
      ) {
        return true;
      }

      // Check if the function is a prop value
      if (
        current.parent?.type === 'Property' &&
        current.parent.parent?.type === 'ObjectExpression' &&
        current.parent.parent.parent?.type === 'JSXExpressionContainer' &&
        current.parent.parent.parent.parent?.type === 'JSXAttribute'
      ) {
        return true;
      }

      return false;
    }

    if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function isSignalValueAccess(node: TSESTree.MemberExpression): node is TSESTree.MemberExpression & {
  property: TSESTree.Identifier;
  object: TSESTree.Identifier;
} {
  return (
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    node.object.name.endsWith('Signal')
  );
}

function shouldSkipNode(node: TSESTree.Node): boolean {
  const skipExpressionTypes = [
    'MemberExpression',
    'ChainExpression',
    'OptionalMemberExpression',
    'BinaryExpression',
    'UnaryExpression',
    'LogicalExpression',
  ] as const;

  return skipExpressionTypes.some((type) => node.parent?.type === type);
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

/**
 * ESLint rule: prefer-signal-in-jsx
 *
 * This rule enforces direct usage of signals in JSX without .value access.
 * In JSX, signals can be used directly for better readability.
 */
export const preferSignalInJsxRule = createRule<Options, MessageIds>({
  name: 'prefer-signal-in-jsx',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer direct signal usage in JSX over .value access',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-signal-in-jsx',
    },
    fixable: 'code',
    messages: {
      preferDirectSignalUsage: 'Use the signal directly in JSX instead of accessing .value',
    },
    hasSuggestions: true,
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
  create(context) {
    let jsxDepth = 0;

    return {
      // Track JSX depth to determine if we're inside JSX
      JSXElement(): void {
        jsxDepth++;
      },
      'JSXElement:exit'(): void {
        jsxDepth--;
      },
      JSXFragment(): void {
        jsxDepth++;
      },
      'JSXFragment:exit'(): void {
        jsxDepth--;
      },

      MemberExpression(node: TSESTree.MemberExpression): void {
        if (jsxDepth === 0) {
          return;
        }

        if (!isSignalValueAccess(node)) {
          return;
        }

        if (!isSignalValueAccess(node)) {
          return;
        }

        if (shouldSkipNode(node)) {
          return;
        }

        if (isInJSXAttribute(node) || isInFunctionProp(node)) {
          return;
        }

        context.report({
          node,
          messageId: 'preferDirectSignalUsage',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.replaceText(node, node.object.name);
          },
        });
      },
    };
  },
});
