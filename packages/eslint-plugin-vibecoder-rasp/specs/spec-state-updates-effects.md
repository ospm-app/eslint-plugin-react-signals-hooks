# State Updates and Effects Rule Specification

Warns about components with an excessive number of state updates or effects, helping to identify potential performance bottlenecks and complex component logic.

## Core Functionality

This rule analyzes React components to detect patterns that may lead to performance issues, such as too many state updates or effects within a single component. It encourages better state management and effect organization.

## Handled Cases

### 1. State Updates

- Counts `useState` and `useReducer` hooks
- Tracks state update frequency in event handlers and effects
- Identifies potential state update loops

### 2. Effects

- Counts `useEffect`, `useLayoutEffect`, and `useInsertionEffect` hooks
- Analyzes dependency arrays
- Identifies missing or excessive dependencies

### 3. Performance Patterns

- Detects synchronous state updates in loops
- Identifies effects with complex logic
- Flags components with multiple state updates in rapid succession

## Error Messages

- `tooManyStateUpdates": "Component '{{component}}' has {{count}} state updates. Consider using useReducer or breaking it into smaller components."
- `tooManyEffects": "Component '{{component}}' has {{count}} effects. Consider combining related logic or extracting into custom hooks."
- `stateUpdateInLoop": "Avoid state updates in loops or nested functions in '{{component}}'."
- `complexEffect": "Effect in '{{component}}' is too complex. Consider breaking it down into smaller, focused effects."

## Auto-fix Suggestions

- Suggests combining related state into useReducer
- Recommends extracting complex logic into custom hooks
- May suggest memoization with useMemo/useCallback
- Can help identify state that could be lifted up or down

## Benefits

1. **Improved Performance**: Reduces unnecessary re-renders
2. **Better Maintainability**: Encourages simpler, more focused components
3. **Easier Debugging**: Makes state updates more predictable
4. **Enhanced Code Quality**: Promotes better React patterns

## When to Disable

- For complex form components with many controlled inputs
- When working with third-party components
- During migrations or refactoring

## Configuration

```json
{
  "state-updates-effects": ["warn", {
    "maxStateUpdates": 5,
    "maxEffects": 3,
    "ignoreClassComponents": false,
    "customHooks": [],
    "typescript": {
      "strict": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `maxStateUpdates`: Maximum allowed state updates (default: 5)
- `maxEffects`: Maximum allowed effects (default: 3)
- `ignoreClassComponents`: Skip class components (default: false)
- `customHooks`: Array of custom hooks to treat as stateful (default: [])
- `typescript.strict`: Enable TypeScript strict mode (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Combine Related State**: Use useReducer for related state updates
2. **Minimize Effects**: Keep effects focused and minimal
3. **Use Custom Hooks**: Extract complex logic into reusable hooks
4. **Optimize Dependencies**: Keep effect dependency arrays minimal
5. **Batch Updates**: Use unstable_batchedUpdates for multiple state updates

## Performance Impact

- Identifies components that may cause performance issues
- Helps prevent common React performance pitfalls
- Encourages better state management patterns

## TypeScript Integration

- Works with TypeScript's type system
- Validates effect dependencies
- Handles generic components and hooks
- Integrates with React's built-in type utilities
