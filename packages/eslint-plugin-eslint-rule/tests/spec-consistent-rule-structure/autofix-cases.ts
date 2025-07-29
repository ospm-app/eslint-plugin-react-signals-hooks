// oxlint-disable no-unused-vars
/** biome-ignore-all lint/correctness/noUnusedVariables: not relevant */
import { ESLintUtils } from '@typescript-eslint/utils';

import { getRuleDocUrl } from '../../src/utils/urls.js';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

// Rule with issues that can be autofixed
export const needsFixRule = createRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule that needs fixes',
      // Missing URL - will be added by autofix
    },
    hasSuggestions: true,
    // @ts-expect-error
    fixable: true, // Will be changed to 'code' by autofix
    messages: {
      'bad-format': 'Message with bad format', // Will be fixed to 'badFormat'
      'Another-Message': 'Another message', // Will be fixed to 'anotherMessage'
    },
  },
  create() {
    return {};
  },
});

// Another rule with autofixable issues
export const anotherFixableRule = createRule({
  // @ts-expect-error
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Another rule that needs fixes',
      // Missing URL - will be added by autofix
    },
    // Missing hasSuggestions - will be added by autofix
    fixable: 'whitespace', // Will be changed to 'code' by autofix
    messages: {
      'some-message': 'Some message', // Will be fixed to 'someMessage'
    },
  },
  create() {
    return {};
  },
});

// Rule that uses context.getSourceCode() and will be autofixed
export const getSourceCodeRule = createRule({
  name: 'getSourceCodeRule',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule that uses context.getSourceCode()',
      url: 'https://example.com/rules/get-source-code',
    },
    messages: {
      testMessage: 'Test message',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression() {
        // This should be autofixed to context.sourceCode
        const sourceCode = context.getSourceCode();
      },
    };
  },
});

// Rule that uses context.getFilename() and will be autofixed
export const getFilenameRule = createRule({
  name: 'get-file-name',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule that uses context.getFilename()',
      url: 'https://example.com/rules/get-filename',
    },
    messages: {
      testMessage: 'Test message',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      Program() {
        // This should be autofixed to context.filename
        const filename = context.getFilename();
      },
    };
  },
});

// Rule with 'recommended' in docs that should be removed by autofix
export const recommendedInDocsRule = createRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule with recommended in docs',
      // @ts-expect-error
      recommended: 'recommended', // This should be removed by autofix
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
});

export const rules = {
  'needs-fix-rule': needsFixRule,
  'another-fixable-rule': anotherFixableRule,
  'get-filename-rule': getFilenameRule,
  'get-source-code-rule': getSourceCodeRule,
};

// Expected output after autofix
export const fixedRule = createRule({
  // @ts-expect-error
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A rule that needs fixes',
      url: 'https://example.com/rules/needs-fix-rule',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      badFormat: 'Message with bad format',
      anotherMessage: 'Another message',
    },
  },
  create() {
    return {};
  },
});

export const fixedAnotherRule = createRule({
  // @ts-expect-error
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Another rule that needs fixes',
      url: 'https://example.com/rules/another-fixable-rule',
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
});
