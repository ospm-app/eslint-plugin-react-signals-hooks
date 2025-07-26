import type { Rule } from 'eslint';

export const typeToZodRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert TypeScript types to Zod schemas',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToZod: 'Convert TypeScript type to Zod schema',
    },
  },
  create(context) {
    return {
      // We'll detect TypeScript type aliases and interfaces
      TSTypeAliasDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToZod',
          // We'll implement the fixer in the next step
        });
      },
      TSInterfaceDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToZod',
          // We'll implement the fixer in the next step
        });
      },
    };
  },
};
