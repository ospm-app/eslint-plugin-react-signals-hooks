# Prefer Signal Methods Rule

This rule enforces consistent and appropriate usage of signal methods (`.value`, `.peek()`) in different contexts to ensure optimal performance and correct reactivity behavior in your React components.

## Rule Details

This rule helps you use the right signal access method in different contexts:

- Use `.peek()` in effects when you want to read the current value without subscribing to changes
- Use direct signal access in JSX (no `.value` needed)
- Prefer `.peek()` when reading signal values in non-reactive contexts
- Avoid unnecessary `.value` access in JSX

### When to use which method

| Context | Recommended | Avoid | Why |
|---------|-------------|-------|-----|
| JSX rendering | `{signal}` | `{signal.value}` | Automatic `.value` access in JSX |
| Effects (reading) | `signal.peek()` | `signal.value` | Avoid unnecessary subscriptions |
| Event handlers | `signal.value` | `signal.peek()` | Need reactivity for updates |
| Dependency arrays | `signal` | `signal.value` | Track the signal itself, not its value |

## Examples

### ❌ Incorrect

```tsx
import { signal } from '@preact/signals-react';
import { useEffect } from 'react';

const count = signal(0);

function Counter(): JSX.Element {
  // Incorrect: Using .value in JSX
  return <div>Count: {count.value}</div>;
}

function EffectExample() {
  // Incorrect: Using .value in effect without dependency
  useEffect(() => {
    console.log('Count:', count.value);
  }, []);
  
  return null;
}
```

### ✅ Correct

```tsx
import { signal } from '@preact/signals-react';
import { useEffect } from 'react';

const count = signal(0);

function Counter(): JSX.Element {
  // Correct: Direct signal access in JSX
  return <div>Count: {count}</div>;
}

function EffectExample(): JSX.Element {
  // Correct: Using .peek() in effect when not depending on changes
  useEffect(() => {
    console.log('Initial count:', count.peek());
  }, []);
  
  // Correct: Using .value when you need to react to changes
  useEffect(() => {
    console.log('Count changed:', count.value);
  }, [count]);
  
  return null;
}
```

## Auto-fix

This rule provides auto-fix suggestions to:

1. Remove unnecessary `.value` access in JSX
2. Convert `.value` to `.peek()` in effects when not in dependency array
3. Add `.peek()` when reading signal values in non-reactive contexts

## When Not To Use It

You might want to disable this rule if:

1. You're using a custom signal implementation with different method names
2. You have specific performance requirements that require manual optimization
3. You're working with code that needs to be compatible with non-React frameworks

## Related Rules

- `prefer-signal-in-jsx`: Similar but focused specifically on JSX usage
- `react-hooks/exhaustive-deps`: Enforces proper dependencies in React hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render

## Best Practices

1. **In JSX**: Use signals directly without `.value`

   ```tsx
   // Good
   <div>{count}</div>
   
   // Avoid
   <div>{count.value}</div>
   ```

2. **In Effects**: Use `.peek()` when you don't need to react to changes

   ```tsx
   // Good - won't cause re-runs when count changes
   useEffect(() => {
     const current = count.peek();
     // ...
   }, []);
   ```

3. **In Event Handlers**: Use `.value` to ensure reactivity

   ```tsx
   // Good - will trigger updates when count changes
   const increment = () => {
     count.value++;
   };
   ```

4. **In Dependency Arrays**: Reference the signal itself, not its value

   ```tsx
   // Good
   useEffect(() => {
     // ...
   }, [count]); // Not [count.value]
   ```

## Migration Guide

When migrating to use proper signal methods:

1. Remove `.value` from signal access in JSX
2. Add `.peek()` in effects where you read but don't depend on signal changes
3. Keep `.value` in event handlers and other reactive contexts
4. Update dependency arrays to reference signals directly

Example migration:

```tsx
// Before
function Component() {
  useEffect(() => {
    console.log('Count:', count.value);
  }, []);
  
  return <div>Count: {count.value}</div>;
}

// After
function Component() {
  useEffect(() => {
    console.log('Initial count:', count.peek());
  }, []);
  
  return <div>Count: {count}</div>;
}
```
