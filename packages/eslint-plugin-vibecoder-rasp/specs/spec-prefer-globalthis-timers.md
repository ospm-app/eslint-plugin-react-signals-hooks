# Prefer globalThis Timers Rule Specification

Enforces the use of `globalThis` for timer functions (`setTimeout`, `setInterval`, etc.) to ensure consistent behavior across different JavaScript environments.

## Core Functionality

This rule ensures that timer functions are accessed through the `globalThis` object, which provides a standard way to access the global object across different JavaScript environments (browser, Node.js, workers, etc.). This helps prevent potential issues with scoping and ensures consistent behavior.

## Handled Cases

### 1. Global Timer Functions

- Detects direct calls to `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`
- Identifies references to these functions without the `globalThis` prefix
- Handles both window and global timer functions

### 2. Variable References

- Flags variables that reference timer functions without `globalThis`
- Identifies destructured timer functions
- Handles renamed imports and aliases

### 3. Nested Scopes

- Detects timer functions in nested scopes
- Identifies shadowed timer functions
- Handles timer functions passed as callbacks

## Error Messages

- `useGlobalThisTimer": "Use`globalThis.{{name}}` instead of the global `{{name}}` function."
- `useGlobalThisClear": "Use`globalThis.{{name}}` instead of the global `{{name}}` function to clear timers."
- `shadowedTimer": "Timer function '{{name}}' is shadowed. Use`globalThis.{{name}}` instead."

## Auto-fix Suggestions

- Converts direct timer function calls to use `globalThis`
- Updates variable references to use `globalThis`
- Handles different code styles and formatting
- Preserves existing comments and type annotations

## Benefits

1. **Consistent Behavior**: Works consistently across different JavaScript environments
2. **Better Type Safety**: Makes timer function types explicit
3. **Improved Maintainability**: Makes it clear that these are global functions
4. **Easier Testing**: Simplifies mocking and testing of timer functions

## When to Disable

- In environments where `globalThis` is not available
- When working with code that must support very old browsers
- In test files where direct timer functions are used intentionally

## Configuration

```json
{
  "prefer-globalthis-timers": ["error", {
    "includeSetImmediate": true,
    "includeRequestAnimationFrame": true,
    "typescript": {
      "strict": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `includeSetImmediate`: Include `setImmediate`/`clearImmediate` (default: true)
- `includeRequestAnimationFrame`: Include `requestAnimationFrame`/`cancelAnimationFrame` (default: true)
- `typescript.strict`: Enable TypeScript strict mode (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Consistent**: Always use `globalThis` for timer functions
2. **Clear Timers**: Always clear timers in cleanup functions
3. **Use Typed Versions**: Consider using typed versions of timer functions
4. **Test Timer Logic**: Thoroughly test code that uses timers
5. **Consider Alternatives**: For React components, consider using `useEffect` and `useRef` for timers

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve code reliability in complex applications

## TypeScript Integration

- Works with TypeScript's type system
- Provides proper type checking for timer functions
- Integrates with TypeScript's module resolution
- Supports type-only imports and exports
