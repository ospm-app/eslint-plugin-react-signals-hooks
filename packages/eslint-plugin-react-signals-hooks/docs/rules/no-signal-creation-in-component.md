# No Signal Creation in Component Rule

This rule prevents the creation of signals (`signal` or `computed`) inside React components or hooks. Signals should be created at the module level or in custom hooks to ensure proper lifecycle management and prevent unnecessary re-renders.

## Rule Details

This rule helps enforce best practices for signal management in React applications by ensuring that signals are not recreated on every render, which can lead to performance issues and unexpected behavior.

### Why is this important?

Creating signals inside components can cause:

- Unnecessary re-renders
- Memory leaks
- Inconsistent state between renders
- Performance degradation
- Difficult-to-debug issues

### What's considered a signal creation?

This rule flags calls to:

- `signal()`
- `computed()`

When they appear inside:

- React function components
- Custom hooks
- Render methods
- Any function that runs during render

## Examples

### ❌ Incorrect

```tsx
import { signal, computed } from '@preact/signals-react';

function Counter(): JSX.Element {
  // ❌ Signal created inside component
  const count = signal(0);
  
  // ❌ Computed value created inside component
  const double = computed(() => count.value * 2);
  
  return (
    <div>
      <button onClick={() => count.value++}>
        Count: {count}, Double: {double}
      </button>
    </div>
  );
}
```

### ✅ Correct

```tsx
import { signal, computed } from '@preact/signals-react';

// ✅ Signal created at module level
const count = signal(0);

// ✅ Computed at module level
const double = computed(() => count.value * 2);

function Counter(): JSX.Element {
  return (
    <div>
      <button onClick={() => count.value++}>
        Count: {count}, Double: {double}
      </button>
    </div>
  );
}
```

### Using with Custom Hooks

For cases where you need component-specific signals, use a custom hook:

```tsx
import { signal, computed } from '@preact/signals-react';

// ✅ Custom hook for component-specific signal logic
function useCounter(initialValue = 0) {
  // This is okay because it's in a custom hook
  const count = signal(initialValue);
  const double = computed(() => count.value * 2);
  
  const increment = () => count.value++;
  const reset = () => count.value = initialValue;
  
  return { count, double, increment, reset };
}

function Counter(): JSX.Element {
  const { count, double, increment } = useCounter();
  
  return (
    <div>
      <button onClick={increment}>
        Count: {count}, Double: {double}
      </button>
    </div>
  );
}
```

## Auto-fix

This rule provides auto-fix suggestions to:

1. Move signal creation to the module level
2. Extract signal logic to a custom hook

## When Not To Use It

You might want to disable this rule if:

1. You have a specific use case that requires dynamic signal creation
2. You're using a different state management pattern
3. You're working with a codebase that follows different conventions

## Related Rules

- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render
- `no-signal-assignment-in-effect`: Prevents signal assignments in effects

## Best Practices

1. **Module-level signals**: For global or singleton state
2. **Custom hooks**: For component-specific signals
3. **Context API**: For dependency injection of signals
4. **Props**: For parent-child component communication

## Performance Considerations

Creating signals inside components can lead to:

- Unnecessary re-renders
- Memory leaks from abandoned signals
- Garbage collection overhead
- Hard-to-debug state issues

Always prefer creating signals at the module level or in custom hooks to avoid these issues.
