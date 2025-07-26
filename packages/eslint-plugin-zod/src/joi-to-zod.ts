import type { Rule } from 'eslint';

export const jaiToZodRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Joi schemas to Zod',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToZod: 'Convert Joi schema to Zod',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'joi') {
          context.report({
            node,
            messageId: 'convertToZod',
            fix(fixer) {
              return fixer.replaceText(node.source, "'zod'");
            },
          });
        }
      },
      // Add more specific rules for Joi to Zod conversion
    };
  },
};
