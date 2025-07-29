# Exhaustive Dependencies Rule

This rule enforces that all values used inside React hooks with dependency arrays (`useEffect`, `useCallback`, `useMemo`, etc.) are properly specified as dependencies. It helps prevent bugs caused by missing dependencies in React hooks.

## Rule Details

This rule verifies that all values used inside the following React hooks are properly specified in their dependency arrays:

- `useEffect`
- `useLayoutEffect`
- `useCallback`
- `useMemo`
- `useImperativeHandle`
- Custom hooks that follow the same pattern (configurable via options)

### Why This Rule Exists

React's hooks API requires that all values from the component scope (such as props and state) that are used inside an effect or callback are declared as dependencies. This ensures that the effect or callback always has access to the latest values and behaves predictably.

## Options

This rule accepts an options object with the following properties:

```typescript
interface Options {
  // Pattern for additional hooks that should be checked
  additionalHooks?: string | undefined;
  
  // Enable potentially dangerous autofixes that might cause infinite loops
  unsafeAutofix?: boolean | undefined;
  
  // Array of hook names that should have automatic dependency injection
  experimental_autoDependenciesHooks?: string[] | undefined;
  
  // Require explicit dependency arrays for all effects
  requireExplicitEffectDeps?: boolean | undefined;
  
  // Enable autofix for useMemo and useCallback hooks
  enableAutoFixForMemoAndCallback?: boolean | undefined;
  
  // Performance tuning options for the rule
  performance?: {
    // Maximum time in milliseconds to spend analyzing a file
    maxTime?: number;
    // Maximum memory in MB to use during analysis
    maxMemory?: number;
    // Maximum number of nodes to process before bailing out
    maxNodes?: number;
    // Enable collection of performance metrics
    enableMetrics?: boolean;
  };

  // Custom severity levels for different violation types
  severity?: {
    // Severity for missing dependencies in general
    addDependencies?: 'error' | 'warn' | 'off';
    // Severity for adding all possible dependencies
    addAllDependencies?: 'error' | 'warn' | 'off';
    // Severity for adding a single missing dependency
    addSingleDependency?: 'error' | 'warn' | 'off';
    // Severity for removing dependency array
    removeDependencyArray?: 'error' | 'warn' | 'off';
    // Severity for removing a dependency
    removeDependency?: 'error' | 'warn' | 'off';
    // Severity for removing a single dependency
    removeSingleDependency?: 'error' | 'warn' | 'off';
    // Severity for async effect usage
    asyncEffect?: 'error' | 'warn' | 'off';
    // Severity for missing effect callback
    missingEffectCallback?: 'error' | 'warn' | 'off';
    // Severity for stale assignment dependency
    staleAssignmentDependency?: 'error' | 'warn' | 'off';
    // Severity for stale assignment literal
    staleAssignmentLiteral?: 'error' | 'warn' | 'off';
    // Severity for stale assignment expression
    staleAssignmentExpression?: 'error' | 'warn' | 'off';
    // Severity for stale assignment unstable
    staleAssignmentUnstable?: 'error' | 'warn' | 'off';
    // Severity for spread element in dependency array
    spreadElementInDependencyArray?: 'error' | 'warn' | 'off';
    // Severity for useEffectEvent in dependency array
    useEffectEventInDependencyArray?: 'error' | 'warn' | 'off';
    // Severity for dependency without signal
    dependencyWithoutSignal?: 'error' | 'warn' | 'off';
    // Severity for non-array literal in dependency array
    notArrayLiteral?: 'error' | 'warn' | 'off';
    // Severity for moving code inside effect
    moveInsideEffect?: 'error' | 'warn' | 'off';
    // Log performance metrics to console
    logMetrics?: boolean;
    // Operation-specific limits
    maxOperations?: Record<string, number>;
  };
}
```

### Example Configuration

```json
{
  "rules": {
    "react-signals-hooks/exhaustive-deps": [
      "error",
      {
        "additionalHooks": "useMyCustomHook|useAnotherHook",
        "unsafeAutofix": false,
        "experimental_autoDependenciesHooks": ["useAutoDepsHook"],
        "requireExplicitEffectDeps": true,
        "enableAutoFixForMemoAndCallback": true,
        "performance": {
          "maxTime": 1000,
          "maxNodes": 2000,
          "enableMetrics": false,
          "logMetrics": false
        }
      }
    ]
  }
}`
```

## Error Messages

This rule can report the following types of issues:

### Missing Dependencies

- **Message**: "React Hook {hookName} is missing {dependenciesCount} dependencies: {dependencies}."
- **Description**: Including all dependencies ensures your effect runs when expected.
- **Fix Suggestions**:
  - Add all missing dependencies
  - Add individual missing dependencies
  - For effects: remove the dependency array completely

### Missing Dependency

- **Message**: "React Hook {hookName} is missing the dependency: {dependency}."
- **Description**: This dependency is used inside the effect but not listed in the dependency array.
- **Impact**:
  - The effect might not re-run when this value changes
  - The effect could use stale values from previous renders
  - This can lead to UI inconsistencies

### Unnecessary Dependencies

- **Message**: "The '{dependency}' dependency is unnecessary because it's not used inside the {hookName} hook."
- **Description**: This value is either a constant or defined outside the component and will never change.
- **Why remove it?**
  - Makes the dependency array more accurate
  - Helps React optimize re-renders
  - Reduces unnecessary effect re-runs

### Duplicate Dependencies

- **Message**: "React Hook {hookName} has a duplicate dependency: {dependency} ({position} of {total})."
- **Why remove duplicates?**
  - Ensures the effect runs only when necessary
  - Improves performance
  - Makes the code more maintainable

### Unknown Dependencies

- **Message**: "React Hook {hookName} has dependencies that cannot be statically analyzed."
- **How to fix**:
  - Use static, direct references in dependency arrays
  - Extract dynamic values to variables before using them in the effect
  - Consider using useCallback or useMemo for dynamic values

### Async Effects

- **Message**: "React Hook {hookName} has an async effect callback."
- **Description**: Async effects can lead to race conditions and memory leaks.
- **Recommended pattern**:

  ```javascript
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const result = await someAsyncOperation();
      if (isMounted) {
        setData(result);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);
  ```

### Stale Assignment Dependency

- **Message**: "The variable \"{dependency}\" is used in the dependency array for {hookName} but may not be properly tracked."
- **Why this is problematic**:
  - The effect might use outdated values
  - Changes to this variable might not trigger effect re-runs
- **Solution**: Ensure the variable is properly tracked in the dependency array

### Invalid Dependency Array

- **Message**: "React Hook {hookName} expects an array literal as its dependency array."
- **Why this matters**:
  - Array literals allow React to properly track dependencies
  - Non-array values won't trigger effect re-runs correctly
  - This can lead to stale closures and unexpected behavior

## Best Practices

1. **Always include all dependencies** that are used inside the effect or callback
2. **Avoid object/array literals** in dependency arrays as they cause unnecessary re-renders
3. **Use the dependency array** even if it's empty for effects that should only run once
4. **Extract complex logic** into separate functions with their own dependencies
5. **Use useCallback/useMemo** to stabilize function/object references when needed

## Auto-fix Support

This rule includes auto-fix support for many common cases, but use with caution as automatic fixes might lead to performance issues or infinite loops in some cases. Always review the changes before committing them.

## Known Limitations

1. The rule might not detect all possible cases where a value is used (false negatives)
2. Some auto-fix suggestions might cause performance issues if not reviewed carefully
3. The rule might report false positives in complex codebases with dynamic property access

## Implementation Notes

The rule performs static analysis of the code to track variable usage and dependencies. It handles most common JavaScript patterns, including:

- Object property access
- Array destructuring
- Function calls and method invocations
- Ternary operators and logical expressions
- Template literals

For more complex cases, you might need to use `// eslint-disable-next-line` comments to suppress specific warnings.
