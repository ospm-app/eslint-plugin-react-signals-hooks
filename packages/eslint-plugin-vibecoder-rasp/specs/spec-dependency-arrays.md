# Dependency Arrays Rule Specification

Ensures that React's `useEffect` and `useCallback` hooks have proper dependency arrays, preventing common bugs related to stale closures and unnecessary re-renders.

## Core Functionality

This rule enforces best practices for dependency arrays in React hooks, ensuring that all dependencies are properly declared and that the arrays follow consistent patterns. It helps prevent bugs caused by missing dependencies and unnecessary effect re-runs.

## Handled Cases

### 1. Missing Dependencies

- Detects variables used in the effect or callback that are missing from the dependency array
- Handles function calls, object properties, and array elements
- Identifies variables from outer scopes that should be dependencies

### 2. Unnecessary Dependencies

- Flags dependencies that are not used in the effect or callback
- Identifies constants and values that don't need to be in the dependency array

### 3. Dynamic Dependencies

- Validates dynamic dependency arrays
- Handles cases where dependencies are conditionally included
- Detects potential infinite update loops

## Error Messages

- `missingDependency`: "'{{name}}' is missing in the dependency array."
- `unnecessaryDependency`: "'{{name}}' is specified as a dependency but not used in the hook."
- `missingDependencyArray`: "React Hook is missing a dependency array. Add one even if it's empty."
- `invalidDependencyArray`: "Invalid dependency array. Expected an array of dependencies."

## Auto-fix Suggestions

- Adds missing dependencies to the dependency array
- Removes unused dependencies
- Adds empty dependency array if missing
- Sorts dependencies alphabetically for consistency

## Benefits

1. **Prevents Stale Closures**: Ensures effects and callbacks always have access to the latest values
2. **Improves Performance**: Reduces unnecessary effect re-runs
3. **Enhances Code Quality**: Makes component behavior more predictable
4. **Easier Maintenance**: Makes dependencies explicit and easier to reason about

## When to Disable

- When using a custom hook that manages its own dependencies
- In cases where you intentionally want to ignore certain dependencies
- During migrations when immediate fixes aren't feasible

## Configuration

```json
{
  "dependency-arrays": ["error", {
    "checkAll": true,
    "additionalHooks": ["useMemo", "useLayoutEffect", "useImperativeHandle"],
    "allowEmptyDeps": false,
    "ignorePatterns": ["^Test", "\\.test\\."],
    "deps": {
      "requireAll": true,
      "allowEmpty": false,
      "allowSpread": false
    }
  }]
}
```

### Options

- `checkAll`: Check all hooks, not just `useEffect` and `useCallback` (default: true)
- `additionalHooks`: Additional hooks to check (default: [])
- `allowEmptyDeps`: Allow empty dependency arrays (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore
- `deps.requireAll`: Require all used values to be in the dependency array (default: true)
- `deps.allowEmpty`: Allow empty dependency arrays (default: false)
- `deps.allowSpread`: Allow spreading arrays into the dependency array (default: false)

## Best Practices

1. **Be Explicit**: Always include all dependencies used in the effect or callback
2. **Keep Dependencies Minimal**: Only include values that actually affect the effect
3. **Use useCallback**: For functions used as dependencies, wrap them in `useCallback`
4. **Extract Logic**: Move complex logic outside the effect when possible

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing unnecessary effect re-runs
- Helps identify potential performance bottlenecks in component rendering

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Preserves type information when suggesting fixes
- Works with generic types and complex type inference
- Handles type narrowing and type guards in effects
