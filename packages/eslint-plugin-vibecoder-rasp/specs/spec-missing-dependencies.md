# Missing Dependencies Rule Specification

Ensures that all dependencies used in React hooks are properly declared in their dependency arrays, preventing stale closures and unexpected behavior.

## Core Functionality

This rule analyzes the code within React hooks to identify all external values used, ensuring they are properly included in the dependency array. It helps prevent bugs caused by missing dependencies that can lead to stale closures and inconsistent component behavior.

## Handled Cases

### 1. Direct Variable Usage

- Detects variables used directly in the hook body
- Identifies variables from component props, state, and context
- Handles destructured variables and object properties

### 2. Function Calls

- Identifies functions called within hooks that should be dependencies
- Handles both locally defined and imported functions
- Detects method calls on objects

### 3. Complex Expressions

- Analyzes complex expressions for potential dependencies
- Handles ternary operators, logical expressions, and binary operations
- Identifies dependencies within nested function calls

## Error Messages

- `missingDependency`: "'{{name}}' is used in the hook but not listed in the dependencies."
- `missingDependencyInCallback`: "The '{{name}}' dependency is used in the callback but not listed in the dependencies."
- `missingDependencyInEffect`: "The '{{name}}' dependency is used in the effect but not listed in the dependencies."
- `missingDependencyInMemo`: "The '{{name}}' dependency is used in the memo but not listed in the dependencies."

## Auto-fix Suggestions

- Adds missing dependencies to the dependency array
- Sorts dependencies alphabetically for consistency
- Preserves existing comments and formatting
- Handles empty dependency arrays by converting them to include the missing dependencies

## Benefits

1. **Prevents Stale Closures**: Ensures hooks always have access to the latest values
2. **Improves Predictability**: Makes component behavior more consistent and easier to reason about
3. **Enhances Maintainability**: Makes dependencies explicit and self-documenting
4. **Reduces Bugs**: Catches potential issues before they reach production

## When to Disable

- When using a stable reference that doesn't need to be in the dependency array
- In cases where you intentionally want to ignore certain dependencies
- During migrations when immediate fixes aren't feasible

## Configuration

```json
{
  "missing-dependencies": ["error", {
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

- `checkAll`: Check all hooks, not just the built-in ones (default: true)
- `additionalHooks`: Additional hooks to check (default: [])
- `allowEmptyDeps`: Allow empty dependency arrays (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore
- `deps.requireAll`: Require all used values to be in the dependency array (default: true)
- `deps.allowEmpty`: Allow empty dependency arrays (default: false)
- `deps.allowSpread`: Allow spreading arrays into the dependency array (default: false)

## Best Practices

1. **Be Explicit**: Always include all dependencies used in the hook
2. **Use useCallback**: For functions that are used as dependencies
3. **Keep Dependencies Minimal**: Only include values that actually affect the hook
4. **Extract Logic**: Move complex logic outside the hook when possible

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing unnecessary effect re-runs
- Helps identify potential performance bottlenecks in component rendering

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Preserves type information when suggesting fixes
- Works with generic types and complex type inference
- Handles type narrowing and type guards in hooks
