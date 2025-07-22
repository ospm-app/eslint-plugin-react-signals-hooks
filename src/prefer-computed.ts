import type { Rule } from 'eslint';

/**
 * ESLint rule: prefer-computed
 *
 * Prefers computed() over useMemo for signal-derived values.
 * This provides better performance and automatic dependency tracking for signal computations.
 */
export const preferComputedRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer computed() over useMemo for signal-derived values',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useMemo' &&
          node.arguments.length >= 2 &&
          node.arguments[1]?.type === 'ArrayExpression'
        ) {
          const deps = node.arguments[1].elements;

          // Check if any dependencies are signals
          const hasSignalDeps = deps.some((dep) => {
            if (!dep) return false;

            // Check for signal.value
            if (
              dep.type === 'MemberExpression' &&
              dep.property.type === 'Identifier' &&
              dep.property.name === 'value' &&
              dep.object.type === 'Identifier' &&
              dep.object.name.endsWith('Signal')
            ) {
              return true;
            }

            // Check for direct signal usage
            if (dep.type === 'Identifier' && dep.name.endsWith('Signal')) {
              return true;
            }

            return false;
          });

          if (hasSignalDeps) {
            context.report({
              node,
              message: 'Consider using computed() instead of useMemo for signal-derived values',
              fix(fixer) {
                const sourceCode = context.getSourceCode();
                const callback = node.arguments[0];

                if (callback) {
                  const callbackText = sourceCode.getText(callback);
                  return fixer.replaceText(node, `computed(${callbackText})`);
                }
                return null;
              },
            });
          }
        }
      },
    };
  },
} satisfies Rule.RuleModule;
