# Proper Dependency Arrays Rule Specification

Ensures that `useEffect` and `useCallback` hooks have proper dependency arrays, preventing common React hooks issues and improving code reliability.

## Core Functionality

This rule enforces best practices for dependency arrays in React hooks, ensuring that all dependencies are properly declared and that unnecessary dependencies are removed. It helps prevent bugs related to stale closures and unnecessary re-renders.

## Handled Cases

### 1. Missing Dependencies

- Detects variables used inside hooks but missing from dependency arrays
- Identifies functions and variables from component scope that should be dependencies
- Handles complex expressions and nested function calls

### 2. Unnecessary Dependencies

- Flags dependencies that are never used inside the hook
- Identifies static values that don't need to be in the dependency array
- Detects redundant dependencies that don't affect the hook's behavior

### 3. Dynamic Dependencies

- Validates dynamic dependencies in custom hooks
- Handles conditional hook calls and loops
- Detects potential issues with dependency arrays that change too frequently

## Error Messages

- `missingDependency": "'{{name}}' is missing in the dependency array."
- `unnecessaryDependency": "'{{name}}' is listed as a dependency but isn't used inside the hook."
- `dynamicDependency": "Avoid using dynamic values in dependency arrays. Consider using useRef or useCallback."

## Auto-fix Suggestions

- Adds missing dependencies to the dependency array
- Removes unnecessary dependencies
- Suggests optimizations for complex dependency arrays
- Preserves code formatting and comments

## Benefits

1. **Prevents Bugs**: Catches common React hooks mistakes
2. **Improves Performance**: Helps avoid unnecessary re-renders
3. **Better Code Quality**: Encourages explicit dependency management
4. **Easier Maintenance**: Makes the code's data flow more predictable

## When to Disable

- When using third-party hooks with non-standard behavior
- In performance-critical code where you need to optimize dependency arrays manually
- During migration of legacy code

## Configuration

```json
{
  "proper-dependency-arrays": ["error", {
    "checkAll": true,
    "additionalHooks": "^(useMemo|useCallback|useEffect|useLayoutEffect)$",
    "typescript": {
      "strict": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `checkAll`: Check all hooks (default: true)
- `additionalHooks`: Regex pattern for additional custom hooks to check (default: common React hooks)
- `typescript.strict`: Enable TypeScript strict mode (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always declare all dependencies used in the hook
2. **Keep Dependencies Minimal**: Only include values that affect the hook's behavior
3. **Use useCallback/useMemo**: For functions and objects used as dependencies
4. **Avoid Inline Objects/Functions**: In the dependency array to prevent unnecessary re-renders
5. **Review Dependencies**: Periodically review and optimize dependency arrays

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing unnecessary effects
- Helps identify potential performance bottlenecks in component rendering

## TypeScript Integration

- Works with TypeScript's type system
- Validates type information in dependency arrays
- Handles generic components and hooks
- Integrates with TypeScript's control flow analysis
