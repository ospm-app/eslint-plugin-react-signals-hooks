# Require useSignals Rule Specification

This rule enforces the use of the `useSignals()` hook in components that utilize signals, ensuring proper signal reactivity in Preact/React components.

## Core Functionality

The `require-use-signals` rule detects components that use signals but are missing the required `useSignals()` hook, which is necessary for proper signal reactivity in React/Preact components.

## Handled Cases

### 1. Missing useSignals Hook

- Detects components that use signals without `useSignals()`

### 2. Signal Detection

- Identifies signal usage in various forms:
  - Direct signal access: `signal`
  - Value access: `signal.value`
  - Signal variables ending with 'Signal' suffix

### 3. Auto-fix Support

- Automatically adds `useSignals()` at the beginning of the component
- Adds the necessary import if missing

## Configuration Options

### `ignoreComponents` (string[])

- Array of component names to exclude from this rule

## Error Messages

- `missingUseSignals`: "Component '{{componentName}}' uses signals but is missing useSignals() hook"

## Benefits

1. **Prevents Reactivity Issues**: Ensures signals work correctly in components
2. **Better Performance**: Proper signal subscription management
3. **Explicit Dependencies**: Makes signal usage clear in component code
4. **Easier Debugging**: Reduces "signal not updating" issues

## When to Disable

This rule can be disabled for:

1. Components that don't use signals
2. Utility functions and hooks
3. Test files where signal reactivity isn't needed
4. When using a custom signal implementation with different requirements

## Best Practices

1. Always place `useSignals()` at the top of your component
2. Use the auto-fix feature to automatically add missing hooks
3. Add component names to `ignoreComponents` if they intentionally don't need signal reactivity
4. Consider using a custom ESLint rule to enforce consistent placement of `useSignals()`

## Performance Impact

Using `useSignals()` correctly can improve performance by:

1. Properly cleaning up signal subscriptions
2. Preventing memory leaks
3. Ensuring optimal re-rendering with signals
