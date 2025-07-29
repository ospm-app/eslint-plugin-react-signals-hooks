// import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';

export const arktypeToValibotRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Arktype schemas to Valibot',
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert Arktype schema to Valibot',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'arktype') {
          context.report({
            node,
            messageId: 'convertToValibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
              return fixer.replaceText(node.source, "'valibot'");
            },
          });
        }
      },
      // Add more specific rules for Arktype to Valibot conversion
    };
  },
};
