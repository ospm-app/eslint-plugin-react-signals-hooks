import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import type { PerformanceBudget } from './utils/types.js';
import { DEFAULT_PERFORMANCE_BUDGET } from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type MessageIds = 'invalidSignalName' | 'invalidComputedName';

type Options = [
  {
    performance?: PerformanceBudget | undefined;
  },
];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

function isValidSignalName(name: string): boolean {
  if (!name.endsWith('Signal')) {
    return false;
  }

  if (!/^[a-z]/.test(name)) {
    return false;
  }

  // Only forbid 'use' prefix when followed by a capital letter
  // (e.g., 'useSignal' is invalid, but 'userSignal' is valid)
  if (name.startsWith('use') && name.length > 2 && /^[A-Z]/.test(name[2])) {
    return false;
  }

  return true;
}

function getFixedName(originalName: string): string {
  let fixedName = originalName;

  if (fixedName.startsWith('use')) {
    fixedName = fixedName.slice(3);
  }

  if (fixedName.length > 0) {
    fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
  }

  if (!fixedName.endsWith('Signal')) {
    fixedName += 'Signal';
  }

  return fixedName;
}

export const signalVariableNameRule = createRule<Options, MessageIds>({
  name: 'signal-variable-name',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce naming conventions for signal and computed variables',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/signal-variable-name',
    },
    messages: {
      invalidSignalName:
        "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
      invalidComputedName:
        "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
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
  create(context: Readonly<RuleContext<MessageIds, Options>>): {
    VariableDeclarator(node: TSESTree.VariableDeclarator): void;
  } {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        if (
          node.id.type === 'Identifier' &&
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          (node.init.callee.name === 'signal' || node.init.callee.name === 'computed')
        ) {
          const variableName = node.id.name;

          if (!isValidSignalName(variableName)) {
            context.report({
              node: node.id,
              messageId:
                'name' in node.init.callee && node.init.callee.name === 'signal'
                  ? 'invalidSignalName'
                  : 'invalidComputedName',
              data: {
                name: variableName,
              },
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.replaceText(node.id, getFixedName(variableName));
              },
            });
          }
        }
      },
    };
  },
});
