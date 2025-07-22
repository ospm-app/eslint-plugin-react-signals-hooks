import type { Rule } from 'eslint';
import type { ConditionalExpression, Node } from 'estree';

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

function getComplexity(node: Node, visited = new Set()): number {
  if (visited.has(node)) {
    return 0;
  }

  visited.add(node);

  let complexity = 0;

  // @ts-expect-error
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    complexity++;
  }

  if (node.type === 'CallExpression') {
    complexity++;
  }

  if (node.type === 'ConditionalExpression') {
    complexity += 2;
  }

  for (const key of childProperties) {
    const value = (node as any)[key];

    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          // @ts-expect-error
          if (item && typeof item === 'object' && item.type) {
            // @ts-expect-error
            complexity += getComplexity(item, visited);
          }
        }
      } else if (value.type) {
        complexity += getComplexity(value, visited);
      }
    }
  }

  visited.delete(node);

  return complexity;
}

/**
 * ESLint rule: prefer-show-over-ternary
 *
 * Prefers Show component over ternary for conditional rendering with signals.
 * This provides better performance and readability for signal-based conditions.
 */
export const preferShowOverTernaryRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer Show component over ternary for conditional rendering with signals',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          minComplexity: {
            type: 'number',
            default: 2,
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const options = context.options[0] || {};

    const minComplexity = options.minComplexity || 2;

    function hasSignalInTest(node: Node): boolean {
      if (
        node.type === 'MemberExpression' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'value' &&
        node.object.type === 'Identifier' &&
        node.object.name.endsWith('Signal')
      ) {
        return true;
      }

      if (node.type === 'Identifier' && node.name.endsWith('Signal')) {
        return true;
      }

      if (node.type === 'BinaryExpression') {
        return hasSignalInTest(node.left) || hasSignalInTest(node.right);
      }

      if (node.type === 'LogicalExpression') {
        return hasSignalInTest(node.left) || hasSignalInTest(node.right);
      }

      if (node.type === 'UnaryExpression') {
        return hasSignalInTest(node.argument);
      }

      if (node.type === 'ChainExpression') {
        return hasSignalInTest(node.expression);
      }

      return false;
    }

    function checkConditionalExpression(
      node: ConditionalExpression & Rule.NodeParentExtension
    ): void {
      const hasSignalTest = hasSignalInTest(node.test);

      if (hasSignalTest) {
        const consequentComplexity = getComplexity(node.consequent);

        const alternateComplexity = getComplexity(node.alternate);

        if (consequentComplexity >= minComplexity || alternateComplexity >= minComplexity) {
          context.report({
            node,
            message: 'Consider using Show component for complex conditional rendering with signals',
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              const testText = sourceCode.getText(node.test);
              const consequentText = sourceCode.getText(node.consequent);

              return node.alternate.type === 'Literal' && node.alternate.value == null
                ? fixer.replaceText(node, `<Show when={${testText}}>{${consequentText}}</Show>`)
                : fixer.replaceText(
                    node,
                    `<Show when={${testText}} fallback={${sourceCode.getText(node.alternate)}}>{${consequentText}}</Show>`
                  );
            },
          });
        }
      }
    }

    return {
      ConditionalExpression: checkConditionalExpression,
      JSXExpressionContainer(node: ConditionalExpression & Rule.NodeParentExtension) {
        if (
          // @ts-expect-error
          node.expression &&
          // @ts-expect-error
          node.expression.type === 'ConditionalExpression'
        ) {
          // @ts-expect-error
          checkConditionalExpression(node.expression);
        }
      },
    };
  },
} satisfies Rule.RuleModule;
