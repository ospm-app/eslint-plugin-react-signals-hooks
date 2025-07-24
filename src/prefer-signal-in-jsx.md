# Prefer Signal in JSX Rule

This rule enforces direct usage of signals in JSX without explicit `.value` access. In JSX, signals can be used directly for better readability and cleaner code.

## Rule Details

This rule identifies instances where `.value` is used to access signal values within JSX and suggests removing the explicit `.value` access. This makes the code more concise and leverages the automatic `.value` access that happens in JSX expressions.

### When to use direct signal access in JSX

- **Use direct signal access when:**
  - Rendering a signal value directly in JSX
  - The signal is used as a prop value
  - The signal is used in a JSX expression

- **Keep `.value` access when:**
  - The signal is used in a function that's passed as a prop
  - The signal is used in a complex expression that requires explicit `.value` access
  - The signal is used in a template literal or string concatenation

## Examples

### ❌ Incorrect

```tsx
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  return (
    <div>
      <span>Count: {count.value}</span>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

### ✅ Correct

```tsx
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

## Auto-fix

This rule provides an auto-fix that removes the `.value` access in JSX contexts. The fix:

1. Removes the `.value` access
2. Preserves the signal name
3. Handles nested expressions appropriately

## When Not To Use It

You might want to disable this rule if:

1. You're using a version of React/Preact that doesn't support automatic `.value` access in JSX
2. You have custom JSX transforms that don't handle signal auto-unwrapping
3. You prefer explicit `.value` access for consistency

## Related Rules

- `react/jsx-curly-brace-presence`: Enforces consistent usage of curly braces in JSX
- `react/jsx-no-useless-fragment`: Prevents unnecessary fragments
- `prefer-batch-updates`: Suggests batching multiple signal updates

## Best Practices

1. **Use signals directly in JSX**: Let the framework handle the `.value` access
2. **Keep signal access simple**: Avoid complex expressions with signals in JSX
3. **Be explicit in callbacks**: Use `.value` in event handlers and effects
4. **Consider performance**: Direct signal access in JSX is optimized by the framework

## Migration Guide

When migrating from explicit `.value` access to direct signal usage:

1. Remove `.value` from signal access in JSX
2. Keep `.value` in callbacks and effects
3. Update any type definitions if needed

Example migration:

```tsx
// Before
function UserProfile({ userSignal }) {
  return (
    <div>
      <h1>{userSignal.value.name}</h1>
      <p>Email: {userSignal.value.email}</p>
      <button onClick={() => updateUser(userSignal.value.id)}>
        Update
      </button>
    </div>
  );
}

// After
function UserProfile({ userSignal }) {
  return (
    <div>
      <h1>{userSignal.name}</h1>
      <p>Email: {userSignal.email}</p>
      <button onClick={() => updateUser(userSignal.value.id)}>
        Update
      </button>
    </div>
  );
}
```
