import type { Rule } from 'eslint';
import type { MemberExpression } from 'estree';

/**
 * ESLint rule: prefer-signal-in-jsx
 *
 * Prefers direct signal usage in JSX over .value access.
 * In JSX contexts, signals can be used directly without .value for better readability.
 */
export const preferSignalInJsxRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer direct signal usage in JSX over .value access',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    let inJSX = false;

    let jsxDepth = 0;

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

      MemberExpression(node: MemberExpression & Rule.NodeParentExtension): void {
        if (
          inJSX &&
          node.property.type === 'Identifier' &&
          node.property.name === 'value' &&
          node.object.type === 'Identifier' &&
          node.object.name.endsWith('Signal')
        ) {
          let parent = node.parent;
          let shouldSkip = false;
          let inJSXExpression = false;

          if (parent && parent.type === 'MemberExpression') {
            shouldSkip = true;
          }

          if (parent && parent.type === 'ChainExpression') {
            shouldSkip = true;
          }

          let currentNode: (MemberExpression & Rule.NodeParentExtension) | Rule.Node = node;

          while (currentNode.parent && !shouldSkip) {
            currentNode = currentNode.parent;

            if (
              // @ts-expect-error
              currentNode.type === 'JSXAttribute' &&
              // @ts-expect-error
              currentNode.name &&
              // @ts-expect-error
              currentNode.name.type === 'JSXIdentifier' &&
              // @ts-expect-error
              (currentNode.name.name === 'className' || currentNode.name.name === 'class')
            ) {
              shouldSkip = true;
              break;
            }
          }

          if (
            parent &&
            ['BinaryExpression', 'UnaryExpression', 'LogicalExpression'].includes(parent.type)
          ) {
            shouldSkip = true;
          }

          while (parent && !shouldSkip) {
            // @ts-expect-error
            if (parent.type === 'JSXExpressionContainer') {
              inJSXExpression = true;

              break;
            }

            // @ts-expect-error
            if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
              break;
            }

            parent = parent.parent;
          }

          if (inJSXExpression && !shouldSkip) {
            context.report({
              node,
              message: `Use '${node.object.name}' directly in JSX instead of '${node.object.name}.value'`,
              fix(fixer) {
                // @ts-expect-error
                return fixer.replaceText(node, node.object.name);
              },
            });
          }
        }
      },
    };
  },
} satisfies Rule.RuleModule;
