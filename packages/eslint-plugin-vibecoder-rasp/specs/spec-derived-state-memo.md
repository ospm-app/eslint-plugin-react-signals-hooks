# Derived State Memo Rule Specification

Ensures that derived state values are properly memoized using `useMemo` or signals' `computed` to prevent unnecessary recalculations and improve performance.

## Core Functionality

This rule identifies expensive calculations in component render methods or function components that should be memoized. It helps prevent performance issues by ensuring that derived state is only recalculated when its dependencies change.

## Handled Cases

### 1. Expensive Calculations

- Detects complex calculations in render methods
- Flags direct array operations like `.map()`, `.filter()`, `.reduce()`
- Identifies object spread operations that create new references

### 2. Inline Function Definitions

- Catches inline functions that create new references on each render
- Suggests moving them outside the component or memoizing with `useCallback`

### 3. Props and State Dependencies

- Verifies that all dependencies are included in dependency arrays
- Detects missing dependencies in `useMemo` and `useCallback` hooks

## Error Messages

- `memoizeDerivedValue`: "This derived value should be memoized with `useMemo` or `computed` to prevent unnecessary recalculations."
- `missingDependency`: "The '{{dependency}}' dependency is missing from the dependency array."
- `unnecessaryMemoization`: "This value doesn't need to be memoized as it's not an expensive calculation."

## Auto-fix Suggestions

- Wraps expensive calculations in `useMemo`
- Adds missing dependencies to dependency arrays
- Converts simple derived values to direct assignments when memoization isn't needed

## Benefits

1. **Improved Performance**: Prevents expensive recalculations on every render
2. **Consistent Behavior**: Ensures derived values are stable between renders
3. **Better Memory Usage**: Reduces garbage collection pressure
4. **Predictable Updates**: Makes component updates more predictable

## When to Disable

- For very simple calculations where memoization overhead exceeds benefits
- In performance-critical sections where manual optimization is preferred
- When using libraries that handle memoization internally

## Configuration

```json
{
  "derived-state-memo": ["error", {
    "checkSignals": true,
    "checkHooks": true,
    "minComplexity": 3,
    "ignorePatterns": ["^Test", "\.test\."]
  }]
}
```

### Options

- `checkSignals`: Whether to check for signals usage (default: true)
- `checkHooks`: Whether to check for hook dependencies (default: true)
- `minComplexity`: Minimum complexity score to require memoization (default: 3)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Memoize Expensive Calculations**: Use `useMemo` for any non-trivial computation
2. **Keep Dependencies Complete**: Always include all values used in the calculation in the dependency array
3. **Prevent New References**: Avoid creating new objects/arrays in render without memoization
4. **Use Stable Functions**: Memoize callbacks with `useCallback` when passing to optimized children

## Performance Impact

- Small runtime cost during linting
- Can significantly improve application performance by preventing unnecessary calculations
- Helps identify performance bottlenecks in component rendering

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Preserves type information when suggesting fixes
- Works with generic types and complex type inference
