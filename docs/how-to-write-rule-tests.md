# How to Write Rule Tests for eslint-plugin

This guide explains how to write effective tests for ESLint rules in the `eslint-plugin-react-signals-hooks` package. Well-tested rules are crucial for maintaining code quality and preventing regressions.

## Test File Structure

Do not use @typescript-eslint/rule-tester for tests!!!

1. **File Naming**:
   - Test files should be named `[rule-name].test.tsx`
   - Place them in the `tests/{rule-name}/` directory
   - There could be multiple test files for the same rule

2. **Basic Structure**:

   ```tsx
   import { signal } from '@preact/signals-react';
   import { useSignals } from '@preact/signals-react/runtime';
   import type { JSX } from 'react';
   
   // Test components go here
   
   // Optional: Configuration for testing rule options
   export const customOptionsConfig = {
     rules: {
       'react-signals-hooks/rule-name': [
         'error',
         { /* rule options */ }
       ]
     }
   };
   ```

## Writing Test Components

### Basic Test Pattern

For each test case, create a separate component that demonstrates either:

- **Incorrect** usage that should trigger the rule
- **Correct** usage that should pass the rule

```tsx
// Bad: This should trigger the rule
function TestIncorrectUsage(): JSX.Element {
  const counter = signal(0);
  return <div>{counter}</div>; // Missing useSignals()
}

// Good: This should pass the rule
function TestCorrectUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    const counter = signal(0);
    return <div>{counter}</div>;
  } finally {
    store.f();
  }
}
```

### Naming Conventions

- Use descriptive test component names that explain what's being tested
- Prefix with `Test` to clearly identify test components
- Include whether the test is for correct or incorrect usage
- For multiple similar tests, add a suffix to differentiate them

Examples:

- `TestMissingUseSignals`
- `TestCorrectUseSignals`
- `TestMultipleSignalsMissingUseSignals`
- `TestSignalInJSXMissingUseSignals`

### Testing Different Scenarios

Test various scenarios including:

1. **Component Types**:
   - Regular function components
   - Arrow function components
   - Components with different naming patterns

2. **Signal Usage Patterns**:
   - Direct signal usage in JSX
   - Signal value access in callbacks
   - Multiple signals in one component
   - Nested signal access

3. **Edge Cases**:
   - Conditional rendering with signals
   - Signals in loops
   - Signals in effects
   - Signals in callbacks

## Testing Rule Options

If your rule supports configuration options, test each option:

```tsx
// Test component for custom options
export function TestCustomOptions(): JSX.Element {
  const customSignal = signal('test');
  return <div>{customSignal}</div>;
}

// Configuration for testing custom options
export const customOptionsConfig = {
  rules: {
    'react-signals-hooks/rule-name': [
      'warn',
      { 
        option1: 'value1',
        option2: true
      }
    ]
  }
};
```

## Common Test Patterns

### Testing for Warnings

When testing for incorrect usage that should trigger a warning:

```tsx
// Should trigger warning for missing useSignals()
export function TestWarningCase(): JSX.Element {
  const data = signal({ count: 0 });
  return <div>{data.value.count}</div>;
}
```

### Testing for Correct Usage

When testing correct usage that should not trigger any warnings:

```tsx
// Should NOT trigger any warnings
export function TestCorrectUsage(): JSX.Element {
  const store = useSignals(1);

  try {
    const data = signal({ count: 0 });
    return <div>{data.value.count}</div>;
  } finally {
    store.f();
  }
}
```

### Testing with Multiple Signals

```tsx
// Test component with multiple signals
export function TestMultipleSignals(): JSX.Element {
  const store = useSignals(1);

  try {
    const count = signal(0);
    const name = signal('test');
    const active = signal(true);
    
    return (
    <div>
      <span>{name}</span>
      <span>{count}</span>
      {active && <div>Active</div>}
    </div>
  );
}
```

## Best Practices

1. **Keep Tests Focused**: Each test component should test one specific case
2. **Be Explicit**: Make it clear whether a test is for correct or incorrect usage
3. **Test Edge Cases**: Include tests for boundary conditions and unusual patterns
4. **Test with JSX**: Since this is a React plugin, test with actual JSX when possible
5. **Test Error Messages**: Ensure the error messages are clear and helpful
6. **Test Auto-fixes**: If your rule provides auto-fixes, include tests that verify the fixes work correctly

## Running Tests

Run the test suite with:

```bash
pnpm test
```

To run tests for a specific rule:

```bash
pnpm test:file tests/rule-name/rule-name.test.tsx
```

## Debugging Tests

To debug a specific test, you can use `console.log` in your test components or use the `debug` function from the test utilities.

## Example Test Files

For complete examples, see these test files:

- `tests/prefer-signal-effect/prefer-signal-effect.test.tsx`
- `tests/prefer-batch-updates/prefer-batch-updates.test.tsx`
- `tests/require-use-signals/require-use-signals.test.tsx`

These examples demonstrate various testing patterns and best practices used throughout the codebase.
