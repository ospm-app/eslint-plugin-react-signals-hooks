# No Mutation in Render Rule

This rule prevents direct signal mutations during the render phase of React components. Signal mutations should only occur in effects, event handlers, or other side-effect contexts to ensure predictable component behavior and prevent rendering issues.

## Rule Details

This rule flags direct signal mutations that happen during the render phase of a React component. It helps prevent common pitfalls that can lead to unexpected behavior, infinite loops, or performance issues.

### What's considered a signal mutation?

1. Direct assignment to `signal.value`
2. Update operations on `signal.value` (++, --, +=, etc.)
3. Property assignments on signal values
4. Array index assignments on signal values
5. Nested property assignments on signal values

### When is the rule active?

The rule is active in:

- Function components (PascalCase functions)
- Arrow function components
- Class render methods

### When is the rule not active?

The rule is not active in:

- `useEffect` callbacks
- `useLayoutEffect` callbacks
- `useCallback` callbacks
- `useMemo` callbacks
- Event handlers
- Custom hooks
- Non-component functions

## Examples

### ❌ Incorrect

```tsx
function MyComponent() {
  const count = signal(0);
  
  // Direct mutation in render - will cause issues
  count.value++;
  
  return <div>{count}</div>;
}
```

### ✅ Correct

```tsx
function MyComponent() {
  const count = signal(0);
  
  // Using useEffect for side effects
  useEffect(() => {
    // This is okay - runs after render
    count.value++;
  }, []);
  
  // Or using an event handler
  const handleClick = () => {
    // This is okay - runs in response to user action
    count.value++;
  };
  
  return <button onClick={handleClick}>Increment: {count}</button>;
}
```

## Options

This rule doesn't have any configuration options.

## When Not To Use It

You might want to disable this rule if:

1. You have a specific use case that requires direct mutations during render (very rare)
2. You're working with a codebase that follows a different state management pattern
3. You're using a custom signal implementation with different semantics

## Related Rules

- `react/no-direct-mutation-state`: Similar concept but for React component state
- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
