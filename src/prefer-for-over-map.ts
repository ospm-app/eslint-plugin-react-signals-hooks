import type { Rule } from 'eslint';

/**
 * ESLint rule: prefer-for-over-map
 *
 * Prefers For component over .map() for rendering signal arrays.
 * This provides better performance for reactive array rendering.
 */
export const preferForOverMapRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer For component over .map() for rendering signal arrays',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context: Rule.RuleContext) {
    let inJSX = false;
    let jsxDepth = 0;
    let inHook = false;
    let hookDepth = 0;

    return {
      JSXElement() {
        inJSX = true;
        jsxDepth++;
      },
      JSXFragment() {
        inJSX = true;
        jsxDepth++;
      },
      'JSXElement:exit'() {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },
      'JSXFragment:exit'() {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },

      CallExpression(node) {
        // Check for React hooks - these create non-JSX context
        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'useState',
            'useReducer',
            'useRef',
            'useContext',
          ].includes(node.callee.name)
        ) {
          hookDepth++;
          if (hookDepth === 1) {
            inHook = true;
          }
        }

        // Only apply the rule if we're in JSX and NOT in a hook
        if (!inJSX || inHook) {
          return;
        }
        // Check for signalName.value.map(...)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'map' &&
          node.callee.object.type === 'MemberExpression' &&
          node.callee.object.property.type === 'Identifier' &&
          node.callee.object.property.name === 'value' &&
          node.callee.object.object.type === 'Identifier' &&
          node.callee.object.object.name.endsWith('Signal')
        ) {
          const signalName = node.callee.object.object.name;

          context.report({
            node,
            message: `Consider using For component instead of ${signalName}.value.map() for better performance`,
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              const mapCallback = node.arguments[0];

              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
              if (mapCallback) {
                const callbackText = sourceCode.getText(mapCallback);

                // Extract parameter names from callback
                let itemParam = 'item';
                let indexParam = 'index';
                let hasMultipleParams = false;

                if (
                  (mapCallback.type === 'ArrowFunctionExpression' ||
                    mapCallback.type === 'FunctionExpression') &&
                  'params' in mapCallback
                ) {
                  if (
                    mapCallback.params.length > 0 &&
                    mapCallback.params[0].type === 'Identifier'
                  ) {
                    itemParam = mapCallback.params[0].name;
                  }
                  if (
                    mapCallback.params.length > 1 &&
                    mapCallback.params[1].type === 'Identifier'
                  ) {
                    indexParam = mapCallback.params[1].name;
                    hasMultipleParams = true;
                  }
                }

                // Create For component replacement
                if (
                  hasMultipleParams &&
                  (mapCallback.type === 'ArrowFunctionExpression' ||
                    mapCallback.type === 'FunctionExpression') &&
                  'body' in mapCallback
                ) {
                  // Include index parameter
                  return fixer.replaceText(
                    node,
                    `<For each={${signalName}}>{(${itemParam}, ${indexParam}) => ${sourceCode.getText(mapCallback.body)}}</For>`
                  );
                } else {
                  // Only item parameter
                  return fixer.replaceText(
                    node,
                    `<For each={${signalName}}>{${callbackText}}</For>`
                  );
                }
              }
              return null;
            },
          });
        }

        // Also check for direct signal.map() (without .value)
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'map' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name.endsWith('Signal')
        ) {
          const signalName = node.callee.object.name;

          context.report({
            node,
            message: `Consider using For component instead of ${signalName}.map() for better performance`,
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              const mapCallback = node.arguments[0];

              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
              if (mapCallback) {
                const callbackText = sourceCode.getText(mapCallback);
                return fixer.replaceText(node, `<For each={${signalName}}>{${callbackText}}</For>`);
              }
              return null;
            },
          });
        }
      },

      'CallExpression:exit'(node) {
        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'useState',
            'useReducer',
            'useRef',
            'useContext',
          ].includes(node.callee.name)
        ) {
          hookDepth--;
          if (hookDepth === 0) {
            inHook = false;
          }
        }
      },
    };
  },
} satisfies Rule.RuleModule;
