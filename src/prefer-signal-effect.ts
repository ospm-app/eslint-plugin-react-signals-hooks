import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'preferSignalEffect' | 'suggestEffect' | 'addEffectImport';

type Options = [
  // biome-ignore lint/complexity/noBannedTypes: todo
  {
    // Future configuration options can be added here
  },
];

/**
 * Checks if a given dependency is a signal or signal value access
 */
function isSignalDependency(dep: TSESTree.Expression | TSESTree.SpreadElement | null): boolean {
  if (!dep || dep.type === 'SpreadElement') {
    return false;
  }

  if (
    dep.type === 'MemberExpression' &&
    dep.property.type === 'Identifier' &&
    dep.property.name === 'value' &&
    dep.object.type === 'Identifier' &&
    dep.object.name.endsWith('Signal')
  ) {
    return true;
  }

  if (dep.type === 'Identifier' && dep.name.endsWith('Signal')) {
    return true;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`
);

/**
 * ESLint rule: prefer-signal-effect
 *
 * Prefers effect() over useEffect for signal-only dependencies.
 * This provides better performance and automatic dependency tracking for signals.
 */
export const preferSignalEffectRule = createRule<Options, MessageIds>({
  name: 'prefer-signal-effect',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer effect() over useEffect for signal-only dependencies',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-signal-effect',
    },
    messages: {
      preferSignalEffect:
        'Prefer using `effect()` instead of `useEffect` for signal-only dependencies',
      suggestEffect: 'Replace `useEffect` with `effect()`',
      addEffectImport: 'Add `effect` import from @preact/signals',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Future configuration properties can be added here
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    let hasEffectImport = false;
    const sourceCode = context.sourceCode;

    // Check if effect is already imported
    hasEffectImport = sourceCode.ast.body.some((node): node is TSESTree.ImportDeclaration => {
      return (
        node.type === 'ImportDeclaration' &&
        node.source.value === '@preact/signals' &&
        node.specifiers.some(
          (s) =>
            s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'effect'
        )
      );
    });

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        // Check if this is a useEffect call
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'useEffect' ||
          node.arguments.length < 2 ||
          node.arguments[1]?.type !== 'ArrayExpression'
        ) {
          return;
        }

        const deps = node.arguments[1].elements;

        // Check if all dependencies are signals
        const allSignalDeps = deps.length > 0 && deps.every(isSignalDependency);

        if (!allSignalDeps) {
          return;
        }

        // Report the issue
        context.report({
          node,
          messageId: 'preferSignalEffect',
          fix(fixer) {
            const fixes = [];

            // Replace useEffect with effect()
            const [callback] = node.arguments;

            fixes.push(
              fixer.replaceText(
                node,
                `effect(() => ${sourceCode.getText(callback as TSESTree.Node)})`
              )
            );

            // Add effect import if needed
            if (!hasEffectImport) {
              const effectImport = "import { effect } from '@preact/signals';\n";
              const firstImport = sourceCode.ast.body.find(
                (n): n is TSESTree.ImportDeclaration => n.type === 'ImportDeclaration'
              );

              if (firstImport) {
                fixes.push(fixer.insertTextBefore(firstImport, effectImport));
              } else {
                fixes.push(fixer.insertTextBefore(sourceCode.ast.body[0], effectImport));
              }
            }

            return fixes;
          },
          suggest: [
            {
              messageId: 'suggestEffect',
              fix(fixer) {
                const fixes = [];

                // Replace useEffect with effect()
                const [callback] = node.arguments;
                fixes.push(
                  fixer.replaceText(
                    node,
                    `effect(() => ${sourceCode.getText(callback as TSESTree.Node)})`
                  )
                );

                // Add effect import if needed
                if (!hasEffectImport) {
                  const effectImport = "import { effect } from '@preact/signals';\n";
                  const firstImport = sourceCode.ast.body.find(
                    (n): n is TSESTree.ImportDeclaration => n.type === 'ImportDeclaration'
                  );

                  if (firstImport) {
                    fixes.push(fixer.insertTextBefore(firstImport, effectImport));
                  } else {
                    fixes.push(fixer.insertTextBefore(sourceCode.ast.body[0], effectImport));
                  }
                }

                return fixes;
              },
            },
            ...(hasEffectImport
              ? ([] as const)
              : ([
                  {
                    messageId: 'addEffectImport',
                    fix(fixer) {
                      const signalsImport = sourceCode.ast.body.find(
                        (n): n is TSESTree.ImportDeclaration =>
                          n.type === 'ImportDeclaration' && n.source.value === '@preact/signals'
                      );

                      if (signalsImport) {
                        return [
                          fixer.insertTextAfter(
                            signalsImport.specifiers[signalsImport.specifiers.length - 1],
                            ', effect'
                          ),
                        ];
                      }
                      return [
                        fixer.insertTextBefore(
                          sourceCode.ast.body[0],
                          "import { effect } from '@preact/signals';\n"
                        ),
                      ];
                    },
                  } satisfies SuggestionReportDescriptor<MessageIds>,
                ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
          ],
        });
      },
    };
  },
});
