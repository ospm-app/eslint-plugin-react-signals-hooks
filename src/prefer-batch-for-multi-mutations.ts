import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'useBatch' | 'suggestBatch' | 'addBatchImport';

type Options = [
  {
    minMutations?: number | undefined;
  },
];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

function isSignalMutation(
  node: TSESTree.Node
): node is TSESTree.AssignmentExpression | TSESTree.UpdateExpression {
  if (node.type === 'AssignmentExpression') {
    return (
      node.left.type === 'MemberExpression' &&
      node.left.property.type === 'Identifier' &&
      node.left.property.name === 'value' &&
      node.left.object.type === 'Identifier' &&
      (node.left.object.name.endsWith('Signal') || node.left.object.name.endsWith('signal'))
    );
  }

  if (node.type === 'UpdateExpression') {
    return (
      node.argument.type === 'MemberExpression' &&
      node.argument.property.type === 'Identifier' &&
      node.argument.property.name === 'value' &&
      node.argument.object.type === 'Identifier' &&
      (node.argument.object.name.endsWith('Signal') || node.argument.object.name.endsWith('signal'))
    );
  }

  return false;
}

export const preferBatchForMultiMutationsRule = createRule<Options, MessageIds>({
  name: 'prefer-batch-for-multi-mutations',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce using batch() for multiple signal mutations in the same scope',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-batch-for-multi-mutations',
    },
    messages: {
      useBatch:
        'Multiple signal mutations detected. Use `batch()` to optimize performance by reducing renders.',
      suggestBatch: 'Wrap with `batch()`',
      addBatchImport: "Add `batch` import from '@preact/signals-react'",
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          minMutations: {
            type: 'number',
            minimum: 2,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minMutations: 2,
    },
  ],
  create(context, [options]) {
    const signalMutations: TSESTree.Node[] = [];

    let currentFunction: TSESTree.FunctionLike | null = null;
    let hasBatchImport = false;

    const program = context.sourceCode.ast;

    // Check if batch is already imported
    hasBatchImport = program.body.some((node: TSESTree.ProgramStatement): boolean => {
      return (
        node.type === 'ImportDeclaration' &&
        node.source.value === '@preact/signals-react' &&
        node.specifiers.some(
          (s) => s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'batch'
        )
      );
    });

    function checkAndReportMutations() {
      if (signalMutations.length >= (options.minMutations ?? 2)) {
        const firstNode: TSESTree.Node | undefined = signalMutations[0];
        const lastNode: TSESTree.Node | undefined = signalMutations[signalMutations.length - 1];

        if (!firstNode || !lastNode) {
          return;
        }

        context.report({
          node: firstNode,
          messageId: 'useBatch',
          suggest: [
            {
              messageId: 'suggestBatch',
              fix(fixer) {
                const fixes = [];

                const firstToken = context.sourceCode.getFirstToken(firstNode);
                const lastToken = context.sourceCode.getLastToken(lastNode);

                if (!firstToken || !lastToken) {
                  return null;
                }

                // Add batch() wrapper
                fixes.push(
                  fixer.insertTextBefore(firstToken, 'batch(() => {\n'),
                  fixer.insertTextAfter(lastToken, '\n})')
                );

                // Add import if needed
                if (!hasBatchImport) {
                  const importNode: TSESTree.ImportDeclaration | undefined = program.body.find(
                    (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                      return (
                        node.type === 'ImportDeclaration' &&
                        node.source.value === '@preact/signals-react'
                      );
                    }
                  );

                  if (typeof importNode === 'undefined') {
                    fixes.push(
                      fixer.insertTextBefore(
                        program.body[0],
                        "import { batch } from '@preact/signals-react';\n"
                      )
                    );
                  } else {
                    fixes.push(
                      fixer.insertTextAfter(
                        importNode.specifiers[importNode.specifiers.length - 1],
                        ', batch'
                      )
                    );
                  }
                }

                return fixes;
              },
            },
          ],
        });
      }
    }

    return {
      // Track function entry
      ':function': (node: TSESTree.Node) => {
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          currentFunction = node;
          signalMutations.length = 0; // Reset mutations for new function
        }
      },

      // Check mutations when exiting function
      ':function:exit': (node: TSESTree.Node) => {
        if (
          (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') &&
          node === currentFunction
        ) {
          // Don't check if we're already inside a batch
          if (
            !node.body ||
            !('body' in node.body) ||
            !Array.isArray(node.body.body) ||
            !node.body.body.some((stmt: TSESTree.Statement): boolean => {
              return (
                stmt.type === 'ExpressionStatement' &&
                stmt.expression.type === 'CallExpression' &&
                stmt.expression.callee.type === 'Identifier' &&
                stmt.expression.callee.name === 'batch'
              );
            })
          ) {
            checkAndReportMutations();
          }
          currentFunction = null;
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (currentFunction && isSignalMutation(node)) {
          signalMutations.push(node);
        }
      },

      UpdateExpression(node: TSESTree.UpdateExpression) {
        if (currentFunction && isSignalMutation(node)) {
          signalMutations.push(node);
        }
      },
    };
  },
});
