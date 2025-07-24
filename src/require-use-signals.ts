import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, RuleFix } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'missingUseSignals';

type Options = [
  {
    ignoreComponents?: string[] | undefined;
  },
];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

export const requireUseSignalsRule = createRule<Options, MessageIds>({
  name: 'require-use-signals',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require useSignals() hook when signals are used in a component',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/require-use-signals',
    },
    messages: {
      missingUseSignals:
        "Component '{{componentName}}' uses signals but is missing useSignals() hook",
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          ignoreComponents: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of component names to ignore',
          },
        },
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [{}],
  create(context: Readonly<RuleContext<MessageIds, Options>>) {
    let hasUseSignals = false;

    let hasSignalUsage = false;

    let componentName = '';
    let componentNode: TSESTree.Node | null = null;

    const isComponentName = (name: string): boolean => /^[A-Z]/.test(name);

    const isSignalUsage = (node: TSESTree.Node): boolean => {
      if (node.type === 'MemberExpression') {
        return (
          node.property.type === 'Identifier' &&
          node.property.name === 'value' &&
          node.object.type === 'Identifier' &&
          node.object.name.endsWith('Signal')
        );
      }

      if (node.type === 'Identifier') {
        return node.name.endsWith('Signal') && node.parent?.type !== 'MemberExpression';
      }

      return false;
    };

    const getInsertionPoint = (node: TSESTree.Node): TSESTree.Node | null => {
      if (
        (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') &&
        node.body?.type === 'BlockStatement' &&
        node.body.body.length > 0
      ) {
        return node.body.body[0];
      }
      return null;
    };

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration): void {
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          componentName = node.id.name;

          componentNode = node;

          hasUseSignals = false;

          hasSignalUsage = false;
        }
      },
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          isComponentName(node.parent.id.name)
        ) {
          componentName = node.parent.id.name;

          componentNode = node;

          hasUseSignals = false;

          hasSignalUsage = false;
        }
      },
      CallExpression(node: TSESTree.CallExpression): void {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useSignals') {
          hasUseSignals = true;
        }
      },
      MemberExpression(node: TSESTree.MemberExpression): void {
        if (isSignalUsage(node)) {
          hasSignalUsage = true;
        }
      },
      Identifier(node: TSESTree.Identifier): void {
        if (isSignalUsage(node)) {
          hasSignalUsage = true;
        }
      },
      'Program:exit'(): void {
        if (
          hasSignalUsage &&
          !hasUseSignals &&
          componentName &&
          !new Set(context.options[0]?.ignoreComponents ?? []).has(componentName) &&
          componentNode
        ) {
          context.report({
            node: componentNode,
            messageId: 'missingUseSignals',
            data: { componentName },
            fix(fixer) {
              const fixes: Array<RuleFix> = [];

              if (!componentNode) {
                return null;
              }

              const insertionPoint = getInsertionPoint(componentNode);

              if (insertionPoint !== null) {
                fixes.push(fixer.insertTextBefore(insertionPoint, '\tuseSignals();\n'));
              }

              if (
                !context.sourceCode.ast.body
                  .filter((node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                    return node.type === 'ImportDeclaration';
                  })
                  .some((node: TSESTree.ImportDeclaration): boolean => {
                    return (
                      node.source.value === '@preact/signals-react' &&
                      node.specifiers.some((s: TSESTree.ImportClause): boolean => {
                        return (
                          s.type === 'ImportSpecifier' &&
                          s.imported.type === 'Identifier' &&
                          s.imported.name === 'useSignals'
                        );
                      })
                    );
                  }) &&
                context.sourceCode.ast.body.length > 0
              ) {
                fixes.push(
                  fixer.insertTextBefore(
                    context.sourceCode.ast.body[0],
                    "import { useSignals } from '@preact/signals-react';\n"
                  )
                );
              }

              return fixes.length > 0 ? fixes : null;
            },
          });
        }
      },
    };
  },
});
