# Missing Effect Dependencies Rule Specification

Ensures that all dependencies used inside `useEffect`, `useCallback`, and `useMemo` are properly declared in their respective dependency arrays, preventing stale closures and other common React hooks issues.

## Core Functionality

This rule analyzes the code inside React hooks to identify all variables, functions, and values that are used within the hook but not included in the dependency array. It helps maintain the integrity of the component's reactive behavior by ensuring all reactive values are properly tracked.

## Handled Cases

### 1. Missing Dependencies

- Detects variables and functions used inside hooks but missing from dependency arrays
- Identifies nested function calls and their dependencies
- Handles destructured props and state values

### 2. Static Analysis

- Analyzes the entire hook body to track value usage
- Identifies potential false positives with escape hatches
- Handles complex expressions and control flow

### 3. Custom Hooks

- Validates dependencies in custom hooks
- Handles forwarded refs and callback refs
- Detects dependencies in hook return values

## Error Messages

- `missingDependency": "'{{name}}' is used in the hook but not listed in the dependency array."
- `missingHookDependency": "Custom hook '{{name}}' is used but not listed in the dependency array."
- `missingDestructuredProp": "Prop '{{name}}' is destructured but not listed in the dependency array."

## Auto-fix Suggestions

- Adds missing dependencies to the dependency array
- Preserves existing dependencies and their order
- Handles different formatting styles
- Adds comments for potentially problematic dependencies

## Benefits

1. **Prevents Stale Closures**: Ensures hooks always have access to the latest values
2. **Improves Predictability**: Makes component behavior more consistent
3. **Easier Debugging**: Reduces bugs related to missing dependencies
4. **Better Performance**: Helps prevent unnecessary effect re-runs

## When to Disable

- When using a third-party hook with non-standard behavior
- In performance-critical code where you need to optimize dependencies manually
- When the linter cannot correctly infer all dependencies

## Configuration

```json
{
  "missing-effect-dependencies": ["error", {
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
2. **Use useCallback/useMemo**: For functions and objects used as dependencies
3. **Keep Dependencies Minimal**: Only include values that affect the hook's behavior
4. **Review Warnings**: Don't ignore dependency warnings without understanding them
5. **Use ESLint Disable Sparingly**: Only disable specific rules when absolutely necessary

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by ensuring proper dependency tracking
- Helps identify potential performance bottlenecks in component rendering

## TypeScript Integration

- Works with TypeScript's type system
- Validates type information in dependency arrays
- Handles generic components and hooks
- Integrates with TypeScript's control flow analysis
