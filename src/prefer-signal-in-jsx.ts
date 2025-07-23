import type { Rule } from 'eslint';
import type { Node, MemberExpression } from 'estree';

/**
 * ESLint rule: prefer-signal-in-jsx
 *
 * This rule enforces direct usage of signals in JSX without .value access.
 * In JSX, signals can be used directly for better readability.
 */
export const preferSignalInJsxRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion', // `problem` or `suggestion` or `layout`
    docs: {
      description: 'prefer direct signal usage in JSX over .value access',
      recommended: true,
    },
    fixable: 'code',
    schema: [], // No options
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    let jsxDepth = 0;

    function isInJSX(): boolean {
      return jsxDepth > 0;
    }

    function isInJSXAttribute(node: Node & Rule.NodeParentExtension): boolean {
      let current = node.parent;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      while (current) {
        // @ts-expect-error - JSX types are not fully typed in @types/estree
        if (current.type === 'JSXAttribute') {
          return true;
        }

        // @ts-expect-error - JSX types are not fully typed in @types/estree
        if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
          return false;
        }

        current = current.parent;
      }

      return false;
    }

    function isInFunctionProp(node: Node & Rule.NodeParentExtension): boolean {
      let current = node.parent;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      while (current) {
        if (['ArrowFunctionExpression', 'FunctionExpression'].includes(current.type)) {
          // Check if the function is a direct child of a JSX attribute
          if (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            current.parent?.type === 'JSXExpressionContainer' &&
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            current.parent.parent?.type === 'JSXAttribute'
          ) {
            return true;
          }

          // Check if the function is a prop value
          if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            current.parent?.type === 'Property' &&
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            current.parent.parent?.type === 'ObjectExpression' &&
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            current.parent.parent.parent?.type === 'JSXExpressionContainer' &&
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            current.parent.parent.parent.parent?.type === 'JSXAttribute'
          ) {
            return true;
          }

          return false;
        }

        if (['JSXElement', 'JSXFragment'].includes(current.type)) {
          return false;
        }

        current = current.parent;
      }

      return false;
    }

    return {
      JSXElement(_node: Node): void {
        jsxDepth++;
      },
      'JSXElement:exit'(_node: Node): void {
        jsxDepth--;
      },
      JSXFragment(_node: Node): void {
        jsxDepth++;
      },
      'JSXFragment:exit'(_node: Node): void {
        jsxDepth--;
      },
      isInJSXAttribute,
      isInFunctionProp,
      MemberExpression(node: Node & Rule.NodeParentExtension): void {
        const memberNode = node as MemberExpression & Rule.NodeParentExtension;

        const inJSX = isInJSX();

        if (!inJSX) {
          return;
        }

        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          !(memberNode.property?.type === 'Identifier' && memberNode.property.name === 'value') ||
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          !(memberNode.object?.type === 'Identifier' && memberNode.object.name.endsWith('Signal'))
        ) {
          return;
        }

        if (
          ['MemberExpression', 'ChainExpression', 'OptionalMemberExpression'].includes(
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            memberNode.parent?.type
          )
        ) {
          return;
        }

        // Skip if inside a binary, unary, or logical expression (like signal.value + 1)
        const skipExpressionTypes = ['BinaryExpression', 'UnaryExpression', 'LogicalExpression'];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (skipExpressionTypes.includes(memberNode.parent?.type)) {
          return;
        }

        if (isInJSXAttribute(memberNode)) {
          return;
        }

        if (isInFunctionProp(memberNode)) {
          return;
        }

        context.report({
          node: memberNode,
          message: 'Use the signal directly in JSX instead of accessing .value',
          fix(fixer) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            return fixer.replaceText(memberNode, memberNode.object.name);
          },
        });
      },
    };
  },
} satisfies Rule.RuleModule;
