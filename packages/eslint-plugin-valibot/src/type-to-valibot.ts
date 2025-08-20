import { ESLintUtils, type TSESLint } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'convertToValibot';
type Options = [];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'type-to-valibot';

export const typeToValibotRule = createRule({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert TypeScript types to Valibot schemas',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    schema: [],
    messages: {
      convertToValibot: 'Convert TypeScript type to Valibot schema',
    },
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<MessageIds, Options>>): TSESLint.RuleListener {
    return {
      // We'll detect TypeScript type aliases and interfaces
      TSTypeAliasDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToValibot',
        });
      },
      TSInterfaceDeclaration(node) {
        context.report({
          node,
          messageId: 'convertToValibot',
        });
      },
    };
  },
});
