# Prefer Signal Reads Rule

This rule enforces explicit `.value` access when reading signal values in non-JSX contexts. It ensures that signal reads are clear and intentional, especially in JavaScript/TypeScript code where automatic `.value` access doesn't occur.

## Rule Details

This rule helps maintain consistency by requiring explicit `.value` access when reading signal values in non-JSX contexts. It complements the `prefer-signal-in-jsx` rule, which handles the opposite case in JSX.

### When to use `.value`

- **Use `.value` when:**
  - Reading a signal value in regular JavaScript/TypeScript code
  - Inside functions, callbacks, or any non-JSX context
  - When you need the current value at the time of reading

- **Don't use `.value` when:**
  - In JSX/TSX (handled by `prefer-signal-in-jsx` rule)
  - When passing the signal itself to a component or function that expects the signal object

## Examples

### ❌ Incorrect

```tsx
import { signal } from '@preact/signals-react';

const count = signal(0);

// Incorrect: Missing .value in non-JSX context
function increment() {
  const current = count; // Should be count.value
  return current + 1;
}

// Incorrect: Using signal directly in a calculation
const doubled = count * 2; // Should be count.value * 2
```

### ✅ Correct

```tsx
import { signal } from '@preact/signals-react';

const count = signal(0);

// Correct: Using .value to read the current value
function increment() {
  const current = count.value;
  return current + 1;
}

// Correct: Using .value in calculations
const doubled = count.value * 2;

// Correct: Passing the signal itself (no .value)
function Counter({ countSignal }) {
  return <div>{countSignal}</div>; // Automatic .value in JSX
}
```

## Auto-fix

This rule provides an auto-fix that automatically adds `.value` to signal reads in non-JSX contexts. The fix:

1. Identifies signal variables (ending with 'Signal' or 'signal')
2. Checks if they're used in a non-JSX context without `.value`
3. Adds the `.value` accessor

## When Not To Use It

You might want to disable this rule if:

1. You're using a custom signal implementation that doesn't use `.value`
2. You're working with code that should pass signals around without reading their values
3. You have a different convention for signal access in your codebase

## Related Rules

- `prefer-signal-in-jsx`: Handles the opposite case in JSX contexts
- `prefer-signal-methods`: Enforces consistent signal method usage
- `no-signal-assignment-in-effect`: Prevents direct signal assignments in effects

## Best Practices

1. **Be explicit with `.value` in non-JSX code**:

   ```tsx
   // Good
   const current = count.value;
   
   // Avoid
   const current = count; // In non-JSX context
   ```

2. **Let JSX handle `.value` automatically**:

   ```tsx
   // Good
   <div>{count}</div>
   
   // Unnecessary
   <div>{count.value}</div>
   ```

3. **Be consistent with signal naming**:

   ```tsx
   // Good - clear it's a signal
   const userSignal = signal({ name: 'John' });
   
   // Less clear
   const user = signal({ name: 'John' });
   ```

## Migration Guide

When migrating to use explicit `.value` access in non-JSX contexts:

1. Identify all signal variables (ending with 'Signal' or 'signal')
2. Add `.value` when reading their values in non-JSX code
3. Keep signals as-is when passing them to components or functions
4. Let JSX handle automatic `.value` access

Example migration:

```tsx
// Before
function processCount(countSignal) {
  const current = countSignal; // Missing .value
  return current * 2;
}

// After
function processCount(countSignal) {
  const current = countSignal.value; // Added .value
  return current * 2;
}

// JSX remains the same
function Counter({ countSignal }) {
  return <div>Count: {countSignal}</div>; // Automatic .value in JSX
}
```
