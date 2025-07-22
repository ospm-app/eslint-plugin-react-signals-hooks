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
      JSXElement(): void {
        inJSX = true;
        jsxDepth++;
      },
      JSXFragment(): void {
        inJSX = true;
        jsxDepth++;
      },
      'JSXElement:exit'(): void {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },
      'JSXFragment:exit'(): void {
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
          let isInArrowFunction = false;

          // Skip if parent is a member expression or chain expression
          if (parent.type === 'MemberExpression' || parent.type === 'ChainExpression') {
            shouldSkip = true;
          }

          // Check if we're inside an arrow function in a JSX prop
          let currentNode: Rule.Node = node;

          while (!shouldSkip) {
            currentNode = currentNode.parent;

            // If we hit an arrow function, check if it's a direct child of a JSX attribute
            if (currentNode.type === 'ArrowFunctionExpression') {
              let parentNode = currentNode.parent;
              // Check if the arrow function is directly in a JSX attribute

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              if (parentNode.type === 'JSXAttribute') {
                isInArrowFunction = true;
                break;
              }
              // If we hit a non-JSX parent, break out
              if (
                !['JSXElement', 'JSXFragment', 'JSXExpressionContainer'].includes(parentNode.type)
              ) {
                break;
              }
              parentNode = parentNode.parent;

              break;
            }

            // Skip checking if we're in a JSX attribute that should allow .value access
            if (
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              currentNode.type === 'JSXAttribute' &&
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              currentNode.name &&
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              currentNode.name.type === 'JSXIdentifier'
            ) {
              // Allow .value in input element attributes
              const inputAttributes = [
                'value',
                'defaultValue',
                'placeholder',
                'min',
                'max',
                'step',
                'minLength',
                'maxLength',
                'pattern',
                'title',
                'alt',
                'src',
                'href',
                'aria-label',
                'aria-placeholder',
                'aria-valuemin',
                'aria-valuemax',
                'aria-valuenow',
                'aria-valuetext',
              ];

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              const attributeName = currentNode.name.name as string;

              if (
                // Skip for common input attributes
                inputAttributes.includes(attributeName) ||
                // Skip for data-* and aria-* attributes
                attributeName.startsWith('data-') ||
                attributeName.startsWith('aria-') ||
                // Skip for className/class as before
                attributeName === 'className' ||
                attributeName === 'class'
              ) {
                shouldSkip = true;

                break;
              }
            }
          }

          if (['BinaryExpression', 'UnaryExpression', 'LogicalExpression'].includes(parent.type)) {
            shouldSkip = true;
          }

          while (!shouldSkip) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (parent.type === 'JSXExpressionContainer') {
              inJSXExpression = true;

              break;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
              break;
            }

            parent = parent.parent;
          }

          if (inJSXExpression && !shouldSkip && !isInArrowFunction) {
            context.report({
              node,
              message: `Use '${node.object.name}' directly in JSX instead of '${node.object.name}.value'`,
              fix(fixer) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
