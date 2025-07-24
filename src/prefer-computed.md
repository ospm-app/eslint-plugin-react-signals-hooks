# Prefer Computed Rule

This rule encourages using `computed()` from `@preact/signals-react` over `useMemo` when working with signals to derive values. This provides better performance and automatic dependency tracking for signal-based computations.

## Rule Details

This rule identifies instances where `useMemo` is used with signal dependencies and suggests replacing them with `computed()` for better performance and maintainability. The `computed()` function provides automatic dependency tracking and better optimization for signal-based computations.

### When to use `computed()` vs `useMemo`

- **Use `computed()` when:**
  - Deriving values from one or more signals
  - The computation depends on reactive values (signals)
  - You want automatic dependency tracking
  - You need the value to be reactive in the template

- **Use `useMemo` when:**
  - The computation is expensive but doesn't depend on signals
  - You need to memoize non-reactive values
  - You need to control when the computation runs via explicit dependencies

## Examples

### ❌ Incorrect

```tsx
import { useMemo } from 'react';
import { signal } from '@preact/signals-react';

const count = signal(0);

function Component() {
  const doubled = useMemo(() => count.value * 2, [count.value]);
  return <div>{doubled}</div>;
}
```

### ✅ Correct

```tsx
import { signal, computed } from '@preact/signals-react';

const count = signal(0);
const doubled = computed(() => count.value * 2);

function Component() {
  return <div>{doubled.value}</div>;
}
```

## Auto-fix

This rule provides auto-fix suggestions to:

1. Replace `useMemo` with `computed()`
2. Add the `computed` import if it's not already imported

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals-react` in your project
2. You have specific performance requirements that require manual control over memoization
3. You're working with non-reactive values that don't benefit from signals

## Related Rules

- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render
- `prefer-batch-updates`: Suggests batching multiple signal updates

## Performance Considerations

Using `computed()` for signal-derived values provides several performance benefits:

1. **Automatic Dependency Tracking**: No need to manually specify dependencies
2. **Lazy Evaluation**: Computations only run when their result is actually needed
3. **Efficient Updates**: Only re-computes when dependencies change
4. **Glitch-free**: Ensures consistent state by batching updates

## Best Practices

1. **Prefer `computed` for signal-derived values**: This makes the reactive nature of the value explicit
2. **Keep computations pure**: Computed values should be pure functions of their dependencies
3. **Avoid side effects**: Don't modify state inside computed getters
4. **Use meaningful names**: Name computed values based on what they represent, not how they're computed
5. **Compose computations**: You can use computed values as dependencies for other computed values

## Migration Guide

When migrating from `useMemo` to `computed()`:

1. Move the computation outside the component if it doesn't depend on component props/state
2. Remove the dependency array (computed tracks dependencies automatically)
3. Access the value using `.value` in your component
4. Update any dependencies to use `.value` when accessing signal values

Example migration:

```tsx
// Before
function Component({ multiplier }) {
  const count = signal(0);
  const result = useMemo(
    () => count.value * multiplier,
    [count.value, multiplier]
  );
  
  return <div>{result}</div>;
}

// After
function Component({ multiplier }) {
  const count = signal(0);
  // Note: If multiplier is a prop, you might still need useMemo
  // or consider making it a signal if it changes reactively
  const result = computed(() => count.value * multiplier);
  
  return <div>{result.value}</div>;
}
```
