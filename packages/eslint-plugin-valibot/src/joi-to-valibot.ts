import { ESLintUtils, type TSESLint } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'convertToValibot';
type Options = [];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'joi-to-valibot';

export const joiToValibotRule = createRule({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Joi schemas to Valibot',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert Joi schema to Valibot',
    },
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<MessageIds, Options>>): TSESLint.RuleListener {
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
});
