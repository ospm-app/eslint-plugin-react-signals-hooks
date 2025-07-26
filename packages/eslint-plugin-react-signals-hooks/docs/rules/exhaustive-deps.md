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
  
  // Enable experimental auto-fix that might cause infinite loops
  enableDangerousAutofixThisMayCauseInfiniteLoops?: boolean | undefined;
  
  // Array of hook names that should have automatic dependency injection
  experimental_autoDependenciesHooks?: string[] | undefined;
  
  // Require explicit dependencies for effects even if they're empty
  requireExplicitEffectDeps?: boolean | undefined;
  
  // Enable auto-fix for useMemo and useCallback
  enableAutoFixForMemoAndCallback?: boolean | undefined;
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
        "enableDangerousAutofixThisMayCauseInfiniteLoops": false,
        "experimental_autoDependenciesHooks": ["useAutoDepsHook"],
        "requireExplicitEffectDeps": true,
        "enableAutoFixForMemoAndCallback": true
      }
    ]
  }
}`
```

## Error Messages

This rule can report the following types of issues:

### Missing Dependencies

- **Message**: "React Hook {hookName} is missing {dependenciesCount} dependencies: {dependencies}."
- **Fix Suggestions**:
  - Add all missing dependencies
  - Add individual missing dependencies
  - For effects: remove the dependency array completely

### Unnecessary Dependencies

- **Message**: "The '{dependency}' dependency is unnecessary because it's not used inside the {hookName} hook."
- **Fix Suggestion**: Remove the unnecessary dependency

### Duplicate Dependencies

- **Message**: "Duplicate dependency: '{dependency}'"
- **Fix Suggestion**: Remove duplicate dependencies

### Async Effects

- **Message**: "Effect callbacks are synchronous to prevent race conditions. Put the async function inside the effect."
- **Fix Suggestion**: Move async logic inside the effect

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
