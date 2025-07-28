# No State Mutation Rule Specification

Prevents direct mutations of React state, enforcing immutable state updates to ensure predictable component behavior and prevent subtle bugs.

## Core Functionality

This rule detects and prevents direct mutations of React state, which can lead to unexpected behavior and hard-to-debug issues. It enforces the use of immutable update patterns when modifying state.

## Handled Cases

### 1. Direct State Mutation

- Detects direct modifications to state objects and arrays
- Catches common mutation patterns like `state.property = value`
- Identifies array mutations like `push()`, `pop()`, `splice()`, etc.

### 2. Nested State Updates

- Detects mutations in nested state objects
- Identifies direct property assignments in nested structures
- Catches array element modifications

### 3. Class Component State

- Detects direct `this.state` mutations in class components
- Catches `setState` with function arguments that mutate state

## Error Messages

- `noDirectStateMutation`: "Avoid direct state mutation. Use the setState function or the state setter from useState hook."
- `immutableUpdateRequired`: "State updates must be immutable. Create a new object/array instead of mutating the existing one."
- `classComponentStateMutation`: "Avoid direct state mutation in class components. Use setState instead."

## Auto-fix Suggestions

- Converts direct mutations to immutable updates
- Replaces array mutations with spread syntax or `Array` methods that return new arrays
- Converts object mutations to use spread syntax or `Object.assign`

## Benefits

1. **Predictable State Updates**: Ensures state updates are predictable and follow React's unidirectional data flow
2. **Easier Debugging**: Makes state changes more traceable and debuggable
3. **Performance Optimizations**: Enables React's shallow comparison optimizations
4. **Better Developer Experience**: Catches common mistakes early in development

## When to Disable

- When working with third-party libraries that require mutation
- In performance-critical code where immutable updates are proven to be a bottleneck
- During migrations from legacy code

## Configuration

```json
{
  "no-state-mutation": ["error", {
    "allowInFunction": false,
    "ignoreClassFields": false,
    "ignoreImmediateMutation": true,
    "ignorePatterns": ["^Test", "\.test\."]
  }]
}
```

### Options

- `allowInFunction`: Allow mutations in functions that are immediately passed to state setters (default: false)
- `ignoreClassFields`: Don't check class field initializers (default: false)
- `ignoreImmediateMutation`: Don't report mutations that are immediately used in a state setter (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Always Create New References**: Use spread syntax, `map`, `filter`, or other immutable methods
2. **Use Functional Updates**: For updates based on previous state
3. **Normalize State Shape**: Keep state as flat as possible
4. **Consider Immutable.js**: For complex state structures

## Performance Impact

- Minimal runtime overhead during linting
- May help identify performance issues caused by unnecessary re-renders
- Encourages patterns that work well with React's reconciliation

## TypeScript Integration

- Works with TypeScript's type system
- Can detect type-unsafe mutations
- Preserves type information when suggesting fixes
