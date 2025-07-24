import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'preferShowOverTernary' | 'suggestShowComponent' | 'addShowImport';

type Options = [
  {
    /** Minimum complexity score to trigger the rule */
    minComplexity?: number | undefined;
  },
];

const childProperties = [
  'body',
  'consequent',
  'alternate',
  'test',
  'left',
  'right',
  'argument',
  'callee',
  'arguments',
  'elements',
  'properties',
] as const;

// Helper function to check if a node is a JSX element or fragment
function isJSXNode(node: TSESTree.Node): boolean {
  return (
    node.type === 'JSXElement' ||
    node.type === 'JSXFragment' ||
    (node.type === 'ExpressionStatement' &&
      'expression' in node &&
      node.expression &&
      'type' in node.expression &&
      (node.expression.type === 'JSXElement' || node.expression.type === 'JSXFragment'))
  );
}

function getComplexity(
  node: TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier,
  visited = new Set<TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier>()
): number {
  if (visited.has(node)) {
    return 0;
  }

  visited.add(node);

  let complexity = 0;

  // Check node type safely
  if (isJSXNode(node)) {
    complexity++;
  } else if ('type' in node && node.type === 'CallExpression') {
    complexity++;
  } else if ('type' in node && node.type === 'ConditionalExpression') {
    complexity += 2;
  }

  // Process child properties
  for (const key of childProperties) {
    const value = node[key as keyof typeof node];

    if (typeof value !== 'undefined') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            complexity += getComplexity(item, visited);
          }
        }
      } else if (typeof value === 'object' && value !== null && 'type' in value) {
        complexity += getComplexity(value, visited);
      }
    }
  }

  visited.delete(node);

  return complexity;
}

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`
);

/**
 * ESLint rule: prefer-show-over-ternary
 *
 * Prefers Show component over ternary for conditional rendering with signals.
 * This provides better performance and readability for signal-based conditions.
 */
export const preferShowOverTernaryRule = createRule<Options, MessageIds>({
  name: 'prefer-show-over-ternary',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer Show component over ternary for conditional rendering with signals',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-show-over-ternary',
    },
    messages: {
      preferShowOverTernary:
        'Prefer using the `<Show>` component instead of ternary for better performance with signal conditions.',
      suggestShowComponent: 'Replace ternary with `<Show>` component',
      addShowImport: 'Add `Show` import from @preact/signals-react',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minComplexity: {
            type: 'number',
            minimum: 1,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minComplexity: 2,
    },
  ],
  create(context, [options]) {
    let hasShowImport = false;

    hasShowImport = context.sourceCode.ast.body.some(
      (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
        if (node.type !== 'ImportDeclaration' || !node.source) {
          return false;
        }

        if (
          typeof node.source.value !== 'string' ||
          node.source.value !== '@preact/signals-react'
        ) {
          return false;
        }

        return node.specifiers.some((s: TSESTree.ImportClause): boolean => {
          return s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'Show';
        });
      }
    );

    return {
      Program(node: TSESTree.Program): void {
        const hasJSX = node.body.some((n: TSESTree.ProgramStatement): boolean => {
          return isJSXNode(n);
        });

        if (!hasJSX) {
          return;
        }
      },

      ConditionalExpression(node: TSESTree.ConditionalExpression): void {
        if (!node.parent || !('type' in node.parent) || !isJSXNode(node.parent as TSESTree.Node)) {
          return;
        }

        if (getComplexity(node) >= (options?.minComplexity ?? 2)) {
          context.report({
            node,
            messageId: 'preferShowOverTernary',
            suggest: [
              {
                messageId: 'suggestShowComponent',
                *fix(fixer) {
                  const consequentText = context.sourceCode.getText(node.consequent);
                  const alternateText = node.alternate
                    ? context.sourceCode.getText(node.alternate)
                    : null;

                  const fixText = alternateText
                    ? `{/* @ts-expect-error Server Component */}
                    <Show when={${context.sourceCode.getText(node.test)}} fallback={${alternateText}}>
                    {${consequentText}}
                    </Show>`
                    : `{/* @ts-expect-error Server Component */}
                    <Show when={${context.sourceCode.getText(node.test)}}>
                    {${consequentText}}
                    </Show>
                  `;

                  yield fixer.replaceText(node, fixText);

                  if (hasShowImport) {
                    return;
                  }
                },
              },
              ...(hasShowImport
                ? ([] satisfies Array<SuggestionReportDescriptor<MessageIds>>)
                : ([
                    {
                      messageId: 'addShowImport',
                      fix(fixer) {
                        if (!context.sourceCode.ast) {
                          return [];
                        }

                        const signalsImport = context.sourceCode.ast.body.find(
                          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                            return (
                              n.type === 'ImportDeclaration' &&
                              n.source.value === '@preact/signals-react'
                            );
                          }
                        );

                        return signalsImport
                          ? [
                              fixer.insertTextAfter(
                                signalsImport.specifiers[signalsImport.specifiers.length - 1],
                                ', Show'
                              ),
                            ]
                          : [
                              fixer.insertTextBefore(
                                context.sourceCode.ast.body[0],
                                "import { Show } from '@preact/signals-react';\n"
                              ),
                            ];
                      },
                    } satisfies SuggestionReportDescriptor<MessageIds>,
                  ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
            ],
          });
        }
      },
    };
  },
});

export default preferShowOverTernaryRule;
