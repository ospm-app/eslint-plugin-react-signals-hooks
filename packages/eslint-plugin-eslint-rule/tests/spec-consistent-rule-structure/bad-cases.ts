// oxlint-disable no-unused-vars
// Bad rule: Missing 'Rule' suffix in export name
/** biome-ignore-all lint/correctness/noUnusedVariables: false positive */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { getRuleDocUrl } from '../../src/utils/urls';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

export const badRule = createRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule with issues',
      // Missing URL
    },
    // Missing hasSuggestions
    // @ts-expect-error
    fixable: true, // Should be 'code' instead of boolean
    messages: {
      'bad-message': 'Message ID should be camelCase',
      AnotherMessage: 'Message ID should be camelCase',
    },
  },
  create() {
    return {};
  },
});

// Bad rule: Incorrect meta properties
const anotherBadRule = createRule({
  meta: {
    type: 'suggestion',
    // Missing docs completely
    fixable: 'code',
    // @ts-expect-error
    hasSuggestions: 'yes', // Should be boolean
    messages: {
      someMessage: 'Some message',
    },
  },
  create() {
    return {};
  },
});

// Bad rule: Missing required properties
// @ts-expect-error
const missingPropsRule = createRule({
  // Missing meta object completely
  create() {
    return {};
  },
});

// Bad rule: Incorrect message IDs
const badMessageIdsRule = createRule({
  name: 'bad-message-ids',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Rule with bad message IDs',
      url: 'https://example.com/rules/bad-message-ids',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      'bad message id': 'Spaces in message ID',
      BadMessage: 'PascalCase message ID',
      'bad-message': 'Kebab-case message ID',
    },
    schema: [],
  },
  defaultOptions: [],
  create() {
    return {};
  },
});

// Bad rule: Uses context.getFilename()
const usesGetFilenameRule = createRule({
  name: 'uses-get-filename',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule that uses context.getFilename()',
      url: 'https://example.com/rules/uses-get-filename',
    },
    messages: {
      testMessage: 'Test message',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<'testMessage', []>>) {
    return {
      Program() {
        const filename = context.getFilename(); // Should be context.filename
      },
    };
  },
});

// Bad rule: Contains 'recommended' in docs object
const recommendedInDocsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce consistent structure and properties across all ESLint rules',
      recommended: 'recommended', // warn! there is no recommended in docs object, autofix should remove it.
      url: 'https://example.com/recommended-in-docs-rule',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      someMessage: 'Some message',
    },
  },
  create() {
    return {};
  },
};

export const rules = {
  'bad-rule': badRule,
  'another-bad-rule': anotherBadRule,
  'uses-get-filename': usesGetFilenameRule,
  'recommended-in-docs-rule': recommendedInDocsRule,
  'missing-props-rule': missingPropsRule,
  'bad-message-ids-rule': badMessageIdsRule,
};
