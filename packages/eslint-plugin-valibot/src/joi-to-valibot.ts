import type { Rule } from 'eslint';

export const joiToValibotRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Joi schemas to Valibot',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert Joi schema to Valibot',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'joi') {
          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer) {
              return fixer.replaceText(node.source, "'valibot'");
            },
          });
        }
      },
      // Add more specific rules for Joi to Valibot conversion
    };
  },
};
