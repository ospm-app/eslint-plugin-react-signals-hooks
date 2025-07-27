# Stable Dependencies Rule Specification

Ensures that all dependencies in React hooks maintain stable references when they don't change, preventing unnecessary effect re-runs and improving performance.

## Core Functionality

This rule identifies dependencies in React hooks that may cause unnecessary re-renders or effect re-runs due to unstable references. It enforces the use of stable references for objects, arrays, and functions used as dependencies.

## Handled Cases

### 1. Inline Objects and Arrays

- Detects object and array literals in dependency arrays
- Identifies inline function definitions in JSX props
- Flags array methods that create new arrays (map, filter, etc.)

### 2. Function References

- Identifies functions created in the component body without useCallback
- Detects function references that change on every render
- Handles both named and anonymous functions

### 3. Computed Values

- Flags computed values that aren't memoized
- Identifies object/array spread operations that create new references
- Detects potential reference instability in complex expressions

## Error Messages

- `unstableDependency`: "The '{{name}}' dependency is not stable. Move it outside the component or wrap it in useMemo/useCallback."
- `inlineObjectLiteral`: "Avoid using inline object literals in dependencies. Extract to a variable or memoize."
- `inlineFunctionExpression`: "Avoid using inline function expressions in dependencies. Extract to a variable or use useCallback."
- `newReferenceInEffect`: "This effect will re-run because '{{name}}' is a new reference on every render."

## Auto-fix Suggestions

- Extracts inline objects/arrays to variables
- Wraps functions in useCallback
- Suggests useMemo for computed values
- Converts function declarations to useCallback

## Benefits

1. **Improved Performance**: Reduces unnecessary effect re-runs and re-renders
2. **Predictable Behavior**: Makes component updates more predictable
3. **Better Memory Usage**: Reduces garbage collection pressure
4. **Easier Debugging**: Makes it clearer when effects should run

## When to Disable

- When using a library that requires inline functions
- For performance-critical code where the overhead of useMemo/useCallback is not justified
- During migrations when immediate fixes aren't feasible

## Configuration

```json
{
  "stable-dependencies": ["error", {
    "checkAllHooks": true,
    "additionalHooks": ["useMemo", "useLayoutEffect"],
    "allowInlineFunctions": false,
    "allowArrowFunctions": false,
    "allowFunctions": false,
    "allowObjectLiterals": false,
    "allowArrayLiterals": false,
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `checkAllHooks`: Check all hooks, not just useEffect and useCallback (default: true)
- `additionalHooks`: Additional hooks to check (default: [])
- `allowInlineFunctions`: Allow inline function expressions (default: false)
- `allowArrowFunctions`: Allow arrow functions (default: false)
- `allowFunctions`: Allow function declarations/expressions (default: false)
- `allowObjectLiterals`: Allow object literals (default: false)
- `allowArrayLiterals`: Allow array literals (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Memoize Values**: Use useMemo for objects/arrays that don't need to be recreated
2. **Stable Callbacks**: Use useCallback for functions passed as props or dependencies
3. **Extract Constants**: Move static values outside the component
4. **Use Refs**: For values that should persist but not trigger updates

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing unnecessary effect re-runs
- Helps identify potential performance bottlenecks in component rendering

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Preserves type information when suggesting fixes
- Works with generic types and complex type inference
- Handles type narrowing and type guards in hooks
