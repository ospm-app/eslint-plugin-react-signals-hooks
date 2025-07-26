# How to Create a New Rule

This guide will walk you through the process of creating a new rule for the `eslint-plugin-react-signals-hooks` package.

## Prerequisites

- Node.js 16+
- pnpm
- Basic understanding of ESLint rules and TypeScript

## Step 0: Create Specs

use `/docs/how-to-make-spec.md` as a template

## Step 1: Create Tests

use `/docs/how-to-write-rule-tests.md` as a template

1. Create a test file in `tests/{rule-name}/`
2. Create both test files:
   - `{rule-name}.test.tsx` - Test cases
   - `eslint.config.js` - ESLint configuration for testing

### Test File Example (`{rule-name}.test.tsx`)

```typescript
import { signal } from '@preact/signals-react';
import { useSignal } from '@preact/signals-react/runtime';
import { type JSX } from 'react';

// Test cases that should trigger the rule
export function ShouldTriggerRule(): JSX.Element {
  const count = signal(0);
  count.value = 1; // This should trigger the rule
  return <div>{count}</div>;
}

// Test cases that should NOT trigger the rule
export function ShouldNotTriggerRule(): JSX.Element {
  const count = signal(0);
  useEffect(() => {
    count.value = 1; // This is fine in an effect
  }, []);
  return <div>{count}</div>;
}
```

### ESLint Config (`eslint.config.js`)

```javascript
import tsParser from '@typescript-eslint/parser';
import reactSignalsHooksPlugin from '../../dist/cjs/index.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      // Core rules
      'react-signals-hooks/{rule-name}': 'error',
      
      // Other rules set to warn to avoid noise
      'react-signals-hooks/exhaustive-deps': 'warn',
      'react-signals-hooks/require-use-signals': 'warn',
      'react-signals-hooks/restrict-signal-locations': 'warn',
      'react-signals-hooks/signal-variable-name': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: '../../tsconfig.tests.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
```

## Step 2: Create the Rule File

1. Create a TypeScript file with the same name (e.g., `/src/{rule-name}.ts`)

## Step 3: Define the Rule Structure

Always read fully couple of other rules as example!!!

Follow this template for your rule:

```typescript
import { ESLintUtils } from '@typescript-eslint/utils';
import {
  createPerformanceTracker,
  type PerformanceBudget,
  trackOperation,
  incrementNodeCount,
  startPhase,
  endPhase,
} from '../utils/performance.js';
import { PerformanceOperations } from '../utils/performance-constants.js';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}.md`;
});

type MessageIds = 
  | 'errorMessageId1'
  | 'errorMessageId2';

type Options = [
  {
    /** Add your rule options here */
    option1?: string;
    option2?: number;
    /** Performance tuning options */
    performance?: PerformanceBudget | undefined;
  },
];

export const myNewRule = createRule<Options, MessageIds>({
  name: 'my-new-rule',
  meta: {
    type: 'suggestion', // or 'problem' or 'layout'
    docs: {
      description: 'Description of what the rule does',
      recommended: 'warn', // or 'error' or false
    },
    fixable: 'code', // or 'whitespace' or null
    hasSuggestions: true, // or false
    schema: [
      {
        type: 'object',
        properties: {
          option1: { type: 'string' },
          option2: { type: 'number' },
          performance: { type: 'object' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      errorMessageId1: 'Error message for the first issue',
      errorMessageId2: 'Error message for the second issue',
    },
  },
  defaultOptions: [{
    // Default values for your options
    option1: 'default',
    option2: 42,
  }],
  create(context, [options = {}]) {
    const perf = createPerformanceTracker(
      context,
      options.performance
    );

    return {
      // Define visitor callbacks here
      'CallExpression, MemberExpression'(node) {
        // Rule implementation
      },
    };
  },
});
```

## Step 4: Export the Rule

Add your rule to the `src/index.ts` file:

```typescript
import { myNewRule } from './my-new-rule/my-new-rule.js';

export const rules = {
  // ... other rules
  'my-new-rule': myNewRule,
};
```

## Step 5: Update Documentation

1. Add documentation in `docs/rules/my-new-rule.md`
2. Include:
   - Rule name and description
   - Why the rule is useful
   - Examples of incorrect and correct code
   - Available options
   - When not to use it

## Step 6: Update Package Scripts

Add test commands to `package.json`:

1. In `test:all-rules` script, add `npm run test:my-new-rule`
2. In `test:fix:all-rules` script, add `npm run test:fix:my-new-rule`
3. Add individual test scripts:

   ```json
   "test:my-new-rule": "cd tests/my-new-rule && npx eslint --config eslint.config.js *.tsx",
   "test:fix:my-new-rule": "cd tests/my-new-rule && npx eslint --config eslint.config.js --fix *.tsx"
   ```

## Step 7: Test Your Rule

1. Build the project:

   ```bash
   pnpm build
   ```

2. Run tests:

   ```bash
   pnpm test
   ```

3. Test with specific rule:

   ```bash
   pnpm test:my-new-rule
   ```

## Step 8: Update CHANGELOG.md

Add an entry for your new rule in the "Added" section of the changelog:

```markdown
## [Unreleased]

### Added

- New rule `my-new-rule`: Description of what the rule does
```

## Best Practices

1. **Performance**: Use the performance tracking utilities to ensure your rule is efficient
2. **Error Messages**: Make error messages clear and actionable
3. **Testing**: Cover edge cases and different scenarios in your tests
4. **Documentation**: Provide clear examples and explanations
5. **Type Safety**: Use TypeScript types effectively to catch errors early

## Common Pitfalls

1. **False Positives**: Ensure your rule doesn't flag code that's actually correct
2. **Performance**: Be mindful of performance, especially with complex AST traversals
3. **Edge Cases**: Consider all possible code patterns that might trigger your rule
4. **Documentation**: Don't forget to document all options and their effects

## Performance Considerations

1. Use the performance tracking utilities to monitor your rule's performance
2. Avoid unnecessary AST traversals
3. Cache results when possible
4. Use selectors to narrow down the nodes your rule needs to process

## Debugging

1. Use `console.log` for debugging (removed before committing)
2. The [AST Explorer](https://astexplorer.net/) is helpful for understanding the AST
3. Test with real-world code to catch edge cases

## Publishing

Once your rule is ready, create a pull request with all the changes. Include:

1. The rule implementation
2. Tests
3. Documentation
4. Changelog updates
5. Any necessary updates to the main export file

After the PR is reviewed and merged, the rule will be included in the next release of the package.
