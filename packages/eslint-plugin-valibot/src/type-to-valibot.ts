import type { Rule } from 'eslint';

export const typeToValibotRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert TypeScript types to Valibot schemas',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert TypeScript type to Valibot schema',
    },
  },
  create(context) {
    return {
      // We'll detect TypeScript type aliases and interfaces
      TSTypeAliasDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToValibot',
          // We'll implement the fixer in the next step
        });
      },
      TSInterfaceDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToValibot',
          // We'll implement the fixer in the next step
        });
      },
    };
  },
};
