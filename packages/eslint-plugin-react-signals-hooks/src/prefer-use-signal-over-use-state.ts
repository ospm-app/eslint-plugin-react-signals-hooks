import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import type { PerformanceBudget } from './utils/types.js';
import { DEFAULT_PERFORMANCE_BUDGET } from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type MessageIds = 'preferUseSignal';

type Options = [
  {
    ignoreComplexInitializers?: boolean | undefined;
    performance?: PerformanceBudget | undefined;
  },
];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

export const preferUseSignalOverUseStateRule = createRule<Options, MessageIds>({
  name: 'prefer-use-signal-over-use-state',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Prefer useSignal over useState for primitive values and simple initializers',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-use-signal-over-use-state',
    },
    messages: {
      preferUseSignal: 'Prefer useSignal over useState for {{type}} values',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreComplexInitializers: {
            type: 'boolean',
            default: true,
            description: 'Skip non-primitive initializers',
          },
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
  create(context: Readonly<RuleContext<MessageIds, Options>>) {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'useState' &&
          node.id.type === 'ArrayPattern' &&
          node.id.elements.length === 2
        ) {
          if (
            context.options[0]?.ignoreComplexInitializers !== false &&
            !(node
              ? [
                  'Literal',
                  'Identifier',
                  'MemberExpression',
                  'UnaryExpression',
                  'BinaryExpression',
                  'ConditionalExpression',
                  'TemplateLiteral',
                ].includes(node.type)
              : true)
          ) {
            return;
          }

          const [stateVar, setterVar] = node.id.elements;

          const initialValue: TSESTree.CallExpressionArgument | undefined = node.init.arguments[0];

          if (
            stateVar?.type === 'Identifier' &&
            setterVar?.type === 'Identifier' &&
            setterVar.name.startsWith('set')
          ) {
            context.report({
              node: node.init,
              messageId: 'preferUseSignal',
              data: {
                type: initialValue
                  ? initialValue.type === 'Literal'
                    ? typeof initialValue.value
                    : 'state'
                  : 'state', // getValueType(initialValue),
              },
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes = [];
                //  addUseSignalImport(context.sourceCode, fixer);

                const importDeclarations = context.sourceCode.ast.body.filter(
                  (node): node is TSESTree.ImportDeclaration => node.type === 'ImportDeclaration'
                );

                const hasSignalImport = importDeclarations.some((node) => {
                  return (
                    node.source.value === '@preact/signals-react' &&
                    node.specifiers.some((s) => {
                      return (
                        'imported' in s && 'name' in s.imported && s.imported.name === 'useSignal'
                      );
                    })
                  );
                });

                if (hasSignalImport) {
                  return null;
                }

                const lastImport = importDeclarations[importDeclarations.length - 1];
                const importText = "import { useSignal } from '@preact/signals-react'\n";

                const importFix = lastImport
                  ? fixer.insertTextAfter(lastImport, importText)
                  : fixer.insertTextBefore(context.sourceCode.ast.body[0], importText);

                if (importFix) {
                  fixes.push(importFix);
                }

                fixes.push(
                  fixer.replaceText(
                    node,
                    `const ${stateVar.name}Signal = useSignal(${
                      initialValue ? context.sourceCode.getText(initialValue) : 'undefined'
                    })`
                  )
                );

                return fixes;
              },
            });
          }
        }
      },
    };
  },
});
