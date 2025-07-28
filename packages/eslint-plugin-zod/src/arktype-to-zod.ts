import type { Rule } from 'eslint';

export const arktypeToZodRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Arktype schemas to Zod',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToZod: 'Convert Arktype schema to Zod',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'arktype') {
          context.report({
            node,
            messageId: 'convertToZod',
            fix(fixer) {
              return fixer.replaceText(node.source, "'zod'");
            },
          });
        }
      },
      // Add more specific rules for Arktype to Zod conversion
    };
  },
};
