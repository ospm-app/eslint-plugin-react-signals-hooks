import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';

export const valibotToZodRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Valibot schemas to Zod',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToZod: 'Convert Valibot schema to Zod',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'valibot') {
          context.report({
            node,
            messageId: 'convertToZod',
            fix(fixer) {
              return fixer.replaceText(node.source, "'zod'");
            },
          });
        }
      },
      // Add more specific rules for schema conversion
    };
  },
};
