import type { Rule } from 'eslint';
import type { Expression, SpreadElement } from 'estree';

/**
 * ESLint rule: prefer-signal-effect
 *
 * Prefers effect() over useEffect for signal-only dependencies.
 * This provides better performance and automatic dependency tracking for signals.
 */
export const preferSignalEffectRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'prefer effect() over useEffect for signal-only dependencies',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useEffect' &&
          node.arguments.length >= 2 &&
          node.arguments[1]?.type === 'ArrayExpression'
        ) {
          const deps: Array<Expression | SpreadElement | null> = node.arguments[1].elements;

          const allSignalDeps =
            deps.length > 0 &&
            deps.every((dep: Expression | SpreadElement | null): boolean => {
              if (!dep) {
                return false;
              }

              if (
                dep.type === 'MemberExpression' &&
                dep.property.type === 'Identifier' &&
                dep.property.name === 'value' &&
                dep.object.type === 'Identifier' &&
                dep.object.name.endsWith('Signal')
              ) {
                return true;
              }

              if (dep.type === 'Identifier' && dep.name.endsWith('Signal')) {
                return true;
              }

              return false;
            });

          if (allSignalDeps) {
            context.report({
              node,
              message: 'Consider using effect() instead of useEffect for signal-only dependencies',
              fix(fixer) {
                const sourceCode = context.getSourceCode();

                const callback = node.arguments[0];

                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                if (callback) {
                  const callbackText = sourceCode.getText(callback);

                  return fixer.replaceText(node, `effect(${callbackText})`);
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
