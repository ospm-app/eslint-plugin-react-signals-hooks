import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

function isSignalAssignment(node: TSESTree.Node): node is TSESTree.MemberExpression {
  return (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    (node.object.name.endsWith('Signal') || node.object.name.endsWith('signal'))
  );
}

function visitNode(
  node: TSESTree.Node | TSESTree.Node[] | undefined,
  effectStack: Array<{
    isEffect: boolean;
    isLayoutEffect: boolean;
    signalAssignments: TSESTree.MemberExpression[];
  }>
): void {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((node: TSESTree.Node): void => {
      visitNode(node, effectStack);
    });

    return;
  }

  if (
    node.type === 'AssignmentExpression' &&
    node.operator === '=' &&
    isSignalAssignment(node.left)
  ) {
    const currentEffect = effectStack[effectStack.length - 1];

    if (currentEffect?.isEffect || currentEffect?.isLayoutEffect) {
      currentEffect.signalAssignments.push(node.left);
    }
  }

  Object.values(node).forEach((value: TSESTree.Node): void => {
    if (Array.isArray(value) || (value && typeof value === 'object' && 'type' in value)) {
      visitNode(value as TSESTree.Node | TSESTree.Node[], effectStack);
    }
  });
}

type MessageIds =
  | 'avoidSignalAssignmentInEffect'
  | 'suggestUseSignalsEffect'
  | 'suggestUseSignalsLayoutEffect';

/**
 * ESLint rule: no-signal-assignment-in-effect
 *
 * Prevents direct signal assignments inside React's useEffect/useLayoutEffect hooks.
 * Instead, use useSignalsEffect/useSignalsLayoutEffect from @preact/signals-react/runtime.
 */
export const noSignalAssignmentInEffectRule = createRule<[], MessageIds>({
  name: 'no-signal-assignment-in-effect',
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prevent direct signal assignments inside React effects',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-signal-assignment-in-effect',
    },
    messages: {
      avoidSignalAssignmentInEffect:
        'Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode.',
      suggestUseSignalsEffect:
        'Use useSignalsEffect from @preact/signals-react/runtime for signal assignments in effects',
      suggestUseSignalsLayoutEffect:
        'Use useSignalsLayoutEffect from @preact/signals-react/runtime for signal assignments in layout effects',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const effectStack: Array<{
      isEffect: boolean;
      isLayoutEffect: boolean;
      signalAssignments: TSESTree.MemberExpression[];
    }> = [];

    return {
      'CallExpression[callee.name="useEffect"]'() {
        effectStack.push({
          isEffect: true,
          isLayoutEffect: false,
          signalAssignments: [],
        });
      },

      'CallExpression[callee.name="useEffect"]:exit'(node: TSESTree.CallExpression): void {
        const currentEffect = effectStack.pop();

        if (typeof currentEffect === 'undefined') {
          return;
        }

        currentEffect.signalAssignments.forEach((assignment: TSESTree.MemberExpression): void => {
          context.report({
            node: assignment,
            messageId: 'avoidSignalAssignmentInEffect',
            data: { hookName: 'useEffect' },
            suggest: [
              {
                messageId: 'suggestUseSignalsEffect',
                *fix(fixer) {
                  const effectCallback: TSESTree.CallExpressionArgument | undefined =
                    node.arguments[0];

                  if (!effectCallback) {
                    return;
                  }

                  if (
                    effectCallback.type !== 'ArrowFunctionExpression' &&
                    effectCallback.type !== 'FunctionExpression'
                  ) {
                    return;
                  }

                  yield fixer.replaceText(node.callee, 'useSignalsEffect');
                },
              },
            ],
          });
        });
      },

      'CallExpression[callee.name="useLayoutEffect"]'(): void {
        effectStack.push({
          isEffect: false,
          isLayoutEffect: true,
          signalAssignments: [],
        });
      },
      'CallExpression[callee.name="useLayoutEffect"]:exit'(node: TSESTree.CallExpression): void {
        const currentEffect = effectStack.pop();

        if (typeof currentEffect === 'undefined') {
          return;
        }

        currentEffect.signalAssignments.forEach((assignment: TSESTree.MemberExpression): void => {
          context.report({
            node: assignment,
            messageId: 'avoidSignalAssignmentInEffect',
            data: { hookName: 'useLayoutEffect' },
            suggest: [
              {
                messageId: 'suggestUseSignalsLayoutEffect',
                *fix(fixer) {
                  const effectCallback = node.arguments[0];
                  if (!effectCallback) return;

                  if (
                    effectCallback.type !== 'ArrowFunctionExpression' &&
                    effectCallback.type !== 'FunctionExpression'
                  ) {
                    return;
                  }

                  yield fixer.replaceText(node.callee, 'useSignalsLayoutEffect');
                },
              },
            ],
          });
        });
      },
      ':statement': (node: TSESTree.Node): void => {
        if (effectStack.length > 0) {
          visitNode(node, effectStack);
        }
      },
    };
  },
});
