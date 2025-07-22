import type { Rule } from 'eslint';
import type { ConditionalExpression, Node, BaseNode } from 'estree';

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

interface NodeWithProperties {
  [key: string]: unknown;
  type: string;
}

function isJSXNode(node: Node): boolean {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return 'type' in node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
}

function getComplexity(node: Node, visited = new Set<Node>()): number {
  if (visited.has(node)) {
    return 0;
  }

  visited.add(node);
  let complexity = 0;
  const nodeWithProperties = node as NodeWithProperties;

  // Check node type safely
  if (isJSXNode(node)) {
    complexity++;
  } else if ('type' in node && node.type === 'CallExpression') {
    complexity++;
  } else if ('type' in node && node.type === 'ConditionalExpression') {
    complexity += 2;
  }

  // Process child properties
  for (const key of childProperties) {
    const value = nodeWithProperties[key];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (item && typeof item === 'object' && 'type' in item) {
            complexity += getComplexity(item as Node, visited);
          }
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      } else if (value && 'type' in value) {
        complexity += getComplexity(value as Node, visited);
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
    // Skip if not a JSX/TSX file
    const filename = context.getFilename();
    if (!filename.endsWith('.tsx') && !filename.endsWith('.jsx')) {
      return {};
    }

    const options = context.options[0] ?? {};

    const minComplexity = options.minComplexity ?? 2;

    // Skip if file doesn't contain JSX
    const sourceCode = context.getSourceCode();

    function hasJSX(node: BaseNode): boolean {
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
        return true;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('children' in node && Array.isArray((node as any).children)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (node as any).children.some((child: BaseNode) => hasJSX(child));
      }

      for (const key of Object.keys(node)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (node as any)[key];

        if (Array.isArray(value)) {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (value.some((item) => item && typeof item === 'object' && hasJSX(item as BaseNode))) {
            return true;
          }

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        } else if (value && typeof value === 'object' && hasJSX(value as BaseNode)) {
          return true;
        }
      }

      return false;
    }

    // Only run the rule if JSX is found in the file
    if (!hasJSX(sourceCode.ast)) {
      return {};
    }

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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          node.expression &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          node.expression.type === 'ConditionalExpression'
        ) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          checkConditionalExpression(node.expression);
        }
      },
    };
  },
} satisfies Rule.RuleModule;
