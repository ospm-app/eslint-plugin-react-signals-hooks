import { ESLintUtils } from '@typescript-eslint/utils';

import { getRuleDocUrl } from '../../src/utils/urls';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

// This is a test rule that follows all the best practices
const goodRule = createRule({
  name: 'good-rule',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A well-documented rule',
      url: 'https://example.com/rules/good-rule',
    },
    hasSuggestions: true,
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          requirePerformanceTracking: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      goodMessage: 'This is a good message',
      anotherGoodMessage: 'This is another good message',
    },
  },
  defaultOptions: [{ requirePerformanceTracking: true }],
  create() {
    // Implementation would go here
    return {};
  },
});

// This is another test rule that's also correct
const anotherGoodRule = createRule({
  name: 'another-good-rule',
  meta: {
    type: 'problem',
    docs: {
      description: 'Another well-documented rule',
      url: 'https://example.com/rules/another-good-rule',
    },
    hasSuggestions: false,
    fixable: 'code',
    messages: {
      someMessage: 'Some message',
    },
    schema: [],
  },
  defaultOptions: [],
  create() {
    // Implementation would go here
    return {};
  },
});

// This rule is explicitly excluded from checks
const excludedRule = createRule({
  name: 'excluded-rule',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'This rule is excluded',
    },
    messages: {
      message: 'This rule is excluded',
    },
    schema: [],
  },
  defaultOptions: [],
  create() {
    return {};
  },
});

// This rule has performance tracking disabled via options
const noPerfTrackingRule = createRule({
  name: 'no-perf-tracking',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Rule with performance tracking disabled',
      url: 'https://example.com/rules/no-perf-tracking',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      someMessage: 'Some message',
    },
    schema: [
      {
        type: 'object',
        properties: {
          requirePerformanceTracking: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ requirePerformanceTracking: true }],
  create() {
    return {};
  },
});

export const rules = {
  'good-rule': goodRule,
  'another-good-rule': anotherGoodRule,
  'excluded-rule': excludedRule,
  'no-perf-tracking-rule': noPerfTrackingRule,
};
