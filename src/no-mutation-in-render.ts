import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

type MessageIds =
  | 'signalValueAssignment'
  | 'signalValueUpdate'
  | 'signalPropertyAssignment'
  | 'suggestUseEffect'
  | 'suggestEventHandler'
  | 'signalArrayIndexAssignment'
  | 'signalNestedPropertyAssignment';

type Options = [];

/**
 * ESLint rule: no-mutation-in-render
 *
 * Disallows direct signal mutation during render.
 * Signal mutations should occur in effects, event handlers, or other side-effect contexts.
 */
export const noMutationInRenderRule = createRule<Options, MessageIds>({
  name: 'no-mutation-in-render',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct signal mutation during render',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-mutation-in-render',
    },
    fixable: 'code',
    schema: [],
    messages: {
      signalValueAssignment:
        'Avoid mutating signal.value directly in render. Move this to an effect or event handler.',
      signalValueUpdate:
        'Avoid updating signal.value with operators (++, --, +=, etc.) in render. Move this to an effect or event handler.',
      signalPropertyAssignment:
        'Avoid mutating signal properties directly in render. Move this to an effect or event handler.',
      signalArrayIndexAssignment:
        'Avoid mutating array indexes of signal values in render. Move this to an effect or event handler.',
      signalNestedPropertyAssignment:
        'Avoid mutating nested properties of signal values in render. Move this to an effect or event handler.',
      suggestUseEffect: 'Wrap in useEffect',
      suggestEventHandler: 'Move to event handler',
    },
  },
  defaultOptions: [],
  create(context) {
    let inRenderContext = false;
    let renderDepth = 0;
    let hookDepth = 0;
    let functionDepth = 0; // Track nested functions

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          inRenderContext = true;

          renderDepth++;
        }
      },
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
        if (
          node.parent.type === 'VariableDeclarator' &&
          node.parent.id.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          inRenderContext = true;

          renderDepth++;
        } else {
          functionDepth++;

          if (functionDepth === 1 && renderDepth >= 1) {
            inRenderContext = false;
          }
        }
      },
      FunctionExpression(): void {
        functionDepth++;
        if (functionDepth === 1 && renderDepth >= 1) {
          inRenderContext = false;
        }
      },
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect', // @preact/signals-core effect
            'computed', // @preact/signals-core computed
          ].includes(node.callee.name)
        ) {
          hookDepth++;
          if (hookDepth === 1) {
            inRenderContext = false;
          }
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        if (inRenderContext && renderDepth >= 1 && hookDepth === 0 && functionDepth === 0) {
          if (
            node.left.type === 'MemberExpression' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'value' &&
            node.left.object.type === 'Identifier' &&
            node.left.object.name.endsWith('Signal')
          ) {
            context.report({
              node,
              messageId: 'signalValueAssignment',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(fixer) {
                    return fixer.replaceText(
                      node,
                      `useEffect(() => { ${context.sourceCode.getText(node)} }, [])`
                    );
                  },
                },
              ],
            });
          }

          if (
            node.left.type === 'MemberExpression' &&
            node.left.computed &&
            node.left.object.type === 'MemberExpression' &&
            node.left.object.property.type === 'Identifier' &&
            node.left.object.property.name === 'value' &&
            node.left.object.object.type === 'Identifier' &&
            node.left.object.object.name.endsWith('Signal')
          ) {
            context.report({
              node,
              messageId: node.left.computed
                ? 'signalArrayIndexAssignment'
                : 'signalNestedPropertyAssignment',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(fixer) {
                    return fixer.replaceText(
                      node,
                      `useEffect(() => { ${context.sourceCode.getText(node)} }, [])`
                    );
                  },
                },
              ],
            });
          }
        }
      },
      UpdateExpression(node: TSESTree.UpdateExpression): void {
        if (inRenderContext && renderDepth >= 1 && hookDepth === 0 && functionDepth === 0) {
          // Check for signal.value++ or ++signal.value
          if (
            node.argument.type === 'MemberExpression' &&
            node.argument.property.type === 'Identifier' &&
            node.argument.property.name === 'value' &&
            node.argument.object.type === 'Identifier' &&
            node.argument.object.name.endsWith('Signal')
          ) {
            context.report({
              node,
              messageId: 'signalValueUpdate',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(fixer) {
                    return fixer.replaceText(
                      node,
                      `useEffect(() => { ${context.sourceCode.getText(node)} }, [])`
                    );
                  },
                },
              ],
            });
          }
        }
      },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          renderDepth--;

          if (renderDepth === 0) inRenderContext = false;
        }
      },
      'ArrowFunctionExpression:exit'(node: TSESTree.ArrowFunctionExpression): void {
        // Check if this is the main component arrow function
        if (
          node.parent.type === 'VariableDeclarator' &&
          node.parent.id.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          // This is a main component - exit render context
          renderDepth--;

          if (renderDepth === 0) {
            inRenderContext = false;
          }
        } else {
          // This is a nested arrow function - back to render context if appropriate
          functionDepth--;

          if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
            inRenderContext = true;
          }
        }
      },
      'FunctionExpression:exit'(): void {
        functionDepth--;

        if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
          inRenderContext = true; // Back in render context
        }
      },
      'CallExpression:exit'(node: TSESTree.CallExpression): void {
        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect', // @preact/signals-core effect
            'computed', // @preact/signals-core computed
          ].includes(node.callee.name)
        ) {
          hookDepth--;
          if (hookDepth === 0 && renderDepth >= 1 && functionDepth === 0) {
            inRenderContext = true;
          }
        }
      },
    };
  },
});
