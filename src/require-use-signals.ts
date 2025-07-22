import type { Rule } from 'eslint';
import type {
  ArrowFunctionExpression,
  CallExpression,
  FunctionDeclaration,
  Identifier,
  MemberExpression,
} from 'estree';

/**
 * ESLint rule: require-use-signals
 *
 * Requires useSignals() hook when signals are used in component.
 * This ensures proper signal subscription and reactivity in React components.
 */
export const requireUseSignalsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require useSignals() hook when signals are used in component',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          ignoreComponents: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext): {
    FunctionDeclaration(node: FunctionDeclaration & Rule.NodeParentExtension): void;
    ArrowFunctionExpression(node: ArrowFunctionExpression & Rule.NodeParentExtension): void;
    CallExpression(node: CallExpression & Rule.NodeParentExtension): void;
    MemberExpression(node: MemberExpression & Rule.NodeParentExtension): void;
    Identifier(node: Identifier & Rule.NodeParentExtension): void;
    'Program:exit'(): void;
  } {
    const options = context.options[0] || {};

    const ignoreComponents = new Set(options.ignoreComponents || []);

    let hasUseSignals = false;

    let hasSignalUsage = false;

    let componentName = '';

    let componentNode:
      | ((FunctionDeclaration | ArrowFunctionExpression) & Rule.NodeParentExtension)
      | null = null;

    return {
      FunctionDeclaration(node: FunctionDeclaration & Rule.NodeParentExtension) {
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          componentName = node.id.name;
          componentNode = node;
          hasUseSignals = false;
          hasSignalUsage = false;
        }
      },
      ArrowFunctionExpression(node: ArrowFunctionExpression & Rule.NodeParentExtension) {
        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          componentName = node.parent.id.name;
          componentNode = node;
          hasUseSignals = false;
          hasSignalUsage = false;
        }
      },
      CallExpression(node: CallExpression & Rule.NodeParentExtension) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'useSignals') {
          hasUseSignals = true;
        }
      },
      MemberExpression(node: MemberExpression & Rule.NodeParentExtension) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'value' &&
          node.object.type === 'Identifier' &&
          node.object.name.endsWith('Signal')
        ) {
          hasSignalUsage = true;
        }
      },
      Identifier(node: Identifier & Rule.NodeParentExtension) {
        if (node.name.endsWith('Signal') && node.parent?.type !== 'MemberExpression') {
          hasSignalUsage = true;
        }
      },
      'Program:exit'() {
        if (
          hasSignalUsage &&
          !hasUseSignals &&
          componentName &&
          !ignoreComponents.has(componentName)
        ) {
          context.report({
            node: componentNode || context.getSourceCode().ast,
            message: `Component '${componentName}' uses signals but is missing useSignals() hook`,
            fix(fixer) {
              const sourceCode = context.getSourceCode();

              let insertionPoint = null;

              if (
                componentNode?.type === 'FunctionDeclaration' &&
                componentNode.body?.type === 'BlockStatement'
              ) {
                insertionPoint = componentNode.body.body[0];
              } else if (
                componentNode?.type === 'ArrowFunctionExpression' &&
                componentNode.body?.type === 'BlockStatement'
              ) {
                insertionPoint = componentNode.body.body[0];
              }

              if (insertionPoint) {
                return fixer.insertTextBefore(insertionPoint, '\tuseSignals();\n');
              }

              const program = sourceCode.ast;

              const firstStatement = program.body[0];

              if (firstStatement) {
                return fixer.insertTextBefore(
                  firstStatement,
                  "import { useSignals } from '@preact/signals-react';\n"
                );
              }

              return null;
            },
          });
        }
      },
    };
  },
} satisfies Rule.RuleModule;
