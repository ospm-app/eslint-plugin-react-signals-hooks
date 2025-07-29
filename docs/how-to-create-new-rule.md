# How to Create a New Rule

This guide will walk you through the process of creating a new rule for eslint plugin.

## 1. Rule Implementation

### 1.1 Create Rule File

1. Create a new TypeScript file in the `src` directory with a descriptive kebab-case name (e.g., `my-new-rule.ts`).

### 1.2 Basic Rule Structure

Each rule should follow this basic structure:

```typescript
import { createRule } from '@typescript-eslint/utils';

export default createRule({
  name: 'rule-name',
  meta: {
    type: 'suggestion', // or 'problem' or 'layout'
    docs: {
      description: 'Description of what the rule does',
      url: 'https://github.com/alexeylyakhov/eslint-plugin-react-signals-hooks/blob/main/docs/how-to-create-new-rule.md',
    },
    schema: [
      // Define your rule options schema here
      {
        type: 'object',
        properties: {
          // Your configuration properties
        },
        additionalProperties: false,
      },
    ],
    messages: {
      // Define your error messages here
      messageId: 'Error message',
    },
  },
  defaultOptions: [
    // Default options
    {},
  ],
  create(context, [options]) {
    // Performance tracking
    const perfKey = 'rule-name';
    const { trackOperation } = context.settings;

    function shouldContinue() {
      // Implement any early exit conditions
      return true;
    }

    // Rule implementation
    return {
      // Handle specific AST node types
      '*': (node) => {
        if (!shouldContinue()) return;
        trackOperation?.(perfKey, () => {
          // Process the node if needed
        });
      },

      // Example: Handle function calls
      'CallExpression': (node) => {
        if (!shouldContinue()) return;
        trackOperation?.(perfKey, () => {
          // Your rule logic here
        });
      },
    };
  },
});
```

### 1.3 Performance Considerations

- Use the `trackOperation` function to monitor performance
- Implement `shouldContinue()` to limit processing when needed
- Use the `perfKey` for consistent performance tracking

## 2. Documentation

### 2.1 Update README.md

Add your rule to the appropriate section in the main README.md file, following the existing format:

```markdown
## Rules

| Rule | Description | Recommended | Fixable |
|------|-------------|-------------|---------|
| [rule-name](docs/rules/rule-name.md) | Brief description | ✅ | 🔧 |
```

### 2.2 Create Rule Documentation

Create a new markdown file in `docs/rules/` with the following structure:

````markdown
# rule-name

Brief description of what the rule does.

## Rule Details

Detailed explanation of the rule's purpose and behavior.

### ❌ Incorrect

```tsx
// Example of incorrect code
```

### ✅ Correct

```tsx
// Example of corrected code
```

## Options

(If applicable) Describe any configuration options for the rule.

```json
{
  "rules": {
    "@react-signals-hooks/rule-name": ["error", {
      // options here
    }]
  }
}
```

## When Not To Use It

(If applicable) Explain when this rule might not be needed.
````

## 3. Testing

### 3.1 Create Test File

Create a test file in `tests/rules/` with the following structure:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rule-name';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('rule-name', rule, {
  valid: [
    {
      code: `
        // Valid code example
      `,
    },
  ],
  invalid: [
    {
      code: `
        // Invalid code example
      `,
      errors: [{ messageId: 'errorMessageId' }],
      output: `
        // Expected fixed output (if fixable)
      `,
    },
  ],
});
```

### 3.2 Run Tests

```bash
# Run all tests
npm test

# Run tests for a specific rule
npx jest tests/rules/rule-name.test.ts
```

## 4. Export the Rule

Add your rule to the exports in `src/index.ts`:

```typescript
import ruleName from './rule-name';

export const rules = {
  'rule-name': ruleName,
  // other rules...
};
```

## 5. Update CHANGELOG.md

Add an entry to the CHANGELOG.md under the appropriate version:

```markdown
## [Unreleased]

### Added
- New rule `rule-name`
```

## Best Practices

1. **Performance**: Keep your rule efficient by:
   - Using specific selectors instead of '*' when possible
   - Implementing early returns in node handlers
   - Using the performance tracking utilities

2. **Error Messages**:
   - Be clear and concise
   - Include code examples in the message when helpful
   - Use message IDs for internationalization

3. **Testing**:
   - Cover all code paths
   - Test edge cases
   - Include both valid and invalid examples
   - Test with different configurations if your rule has options

4. **Documentation**:
   - Keep documentation up-to-date
   - Include clear examples
   - Document all configuration options
   - Explain when not to use the rule
