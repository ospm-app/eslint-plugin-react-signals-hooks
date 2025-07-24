import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

type MessageIds =
  | 'preferComputedWithSignal'
  | 'preferComputedWithSignals'
  | 'suggestComputed'
  | 'addComputedImport'
  | 'suggestAddComputedImport';

type Options = [];

type SignalDependencyInfo = {
  signalName: string;
  isDirectAccess: boolean;
  node: TSESTree.Node;
};

function getOrCreateComputedImport(
  sourceCode: SourceCode,
  program: TSESTree.Program | null
): TSESTree.ImportDeclaration | undefined {
  if (!program) {
    program = sourceCode.ast;
  }

  return program.body.find((n): n is TSESTree.ImportDeclaration => {
    return n.type === 'ImportDeclaration' && n.source.value === '@preact/signals-react';
  });
}

function getSignalDependencyInfo(dep: TSESTree.Node | null): SignalDependencyInfo | null {
  if (!dep) {
    return null;
  }

  // Check for signal.value
  if (
    dep.type === 'MemberExpression' &&
    dep.property.type === 'Identifier' &&
    dep.property.name === 'value' &&
    dep.object.type === 'Identifier' &&
    (dep.object.name.endsWith('Signal') || dep.object.name.endsWith('signal'))
  ) {
    return {
      signalName: dep.object.name,
      isDirectAccess: false,
      node: dep,
    };
  }

  // Check for direct signal usage
  if (dep.type === 'Identifier' && (dep.name.endsWith('Signal') || dep.name.endsWith('signal'))) {
    return {
      signalName: dep.name,
      isDirectAccess: true,
      node: dep,
    };
  }

  return null;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

/**
 * ESLint rule: prefer-computed
 *
 * Prefers computed() over useMemo for signal-derived values.
 * This provides better performance and automatic dependency tracking for signal computations.
 */
export const preferComputedRule = createRule<Options, MessageIds>({
  name: 'prefer-computed',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer computed() over useMemo for signal-derived values',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-computed',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferComputedWithSignal:
        'Prefer `computed()` over `useMemo` when using signal "{{ signalName }}" for better performance and automatic reactivity.',
      preferComputedWithSignals:
        'Prefer `computed()` over `useMemo` when using signals ({{ signalNames }}) for better performance and automatic reactivity.',
      suggestComputed: 'Replace `useMemo` with `computed()`',
      addComputedImport: 'Add `computed` import from @preact/signals-react',
      suggestAddComputedImport: 'Add missing import for `computed`',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let hasComputedImport = false;
    let program: TSESTree.Program | null = null;

    return {
      Program(node: TSESTree.Program): void {
        program = node;

        hasComputedImport = program.body.some(
          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
            return (
              n.type === 'ImportDeclaration' &&
              n.source.value === '@preact/signals-react' &&
              n.specifiers.some(
                (s) =>
                  s.type === 'ImportSpecifier' &&
                  'name' in s.imported &&
                  s.imported.name === 'computed'
              )
            );
          }
        );
      },

      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'useMemo' ||
          node.arguments.length < 2 ||
          node.arguments[1]?.type !== 'ArrayExpression'
        ) {
          return;
        }

        const signalDeps = node.arguments[1].elements.map(getSignalDependencyInfo).filter(Boolean);

        if (signalDeps.length > 0) {
          // Get unique signal names for the message
          const uniqueSignals = [
            ...new Set(
              signalDeps.map((d: SignalDependencyInfo): string => {
                return d.signalName;
              })
            ),
          ];

          context.report({
            node,
            messageId:
              uniqueSignals.length === 1 ? 'preferComputedWithSignal' : 'preferComputedWithSignals',
            data: {
              signalName: uniqueSignals[0],
              signalNames: uniqueSignals.join(', '),
              count: uniqueSignals.length,
            },
            suggest: [
              {
                messageId: 'suggestComputed',
                *fix(fixer) {
                  const callback = node.arguments[0];

                  if (!callback) {
                    return;
                  }

                  // Replace useMemo with computed
                  yield fixer.replaceText(
                    node,
                    `computed(${context.sourceCode.getText(callback)})`
                  );

                  // Don't add import if it already exists
                  if (hasComputedImport) {
                    return;
                  }

                  // Add suggestion to add import if not already present
                  context.report({
                    node,
                    messageId: 'suggestAddComputedImport',
                    fix: (fixer) => {
                      if (!program) {
                        return [];
                      }

                      const signalsImport = getOrCreateComputedImport(context.sourceCode, program);

                      if (signalsImport) {
                        // Check if 'computed' is already imported
                        const hasComputed = signalsImport.specifiers.some(
                          (s: TSESTree.ImportClause): boolean => {
                            return (
                              s.type === 'ImportSpecifier' &&
                              'name' in s.imported &&
                              s.imported.name === 'computed'
                            );
                          }
                        );

                        if (hasComputed) {
                          return [];
                        }

                        // Add 'computed' to existing import
                        const lastSpecifier =
                          signalsImport.specifiers[signalsImport.specifiers.length - 1];

                        return [fixer.insertTextAfter(lastSpecifier, ', computed')];
                      } else {
                        // No existing import, add a new one at the top
                        return [
                          fixer.insertTextBefore(
                            program.body[0],
                            "import { computed } from '@preact/signals-react';\n"
                          ),
                        ];
                      }
                    },
                  });
                },
              },
            ],
          });
        }
      },
    };
  },
});
