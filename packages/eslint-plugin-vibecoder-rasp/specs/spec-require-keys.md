# Require Keys Rule Specification

Ensures that React elements in arrays or iterators have a unique `key` prop, which is essential for efficient updates and correct behavior in React's reconciliation process.

## Core Functionality

This rule enforces the presence of `key` props on elements returned by array methods like `map()`, `filter()`, and other iterators. It helps prevent common React performance issues and bugs related to list rendering.

## Handled Cases

### 1. Array Methods
- Detects missing `key` props in `Array.map()` calls
- Identifies missing keys in `Array.filter().map()` chains
- Handles other array iteration methods that return React elements

### 2. Conditional Rendering
- Identifies missing keys in conditional rendering patterns
- Handles ternary operators and logical expressions
- Validates keys in fragments used for conditional rendering

### 3. Dynamic Lists
- Detects missing keys in dynamically generated lists
- Validates keys in components that return arrays
- Handles spread operators and array literals

## Error Messages

- `missingKey`: "Missing 'key' prop for element in array. Each child in a list should have a unique 'key' prop."
- `invalidKey`: "'key' prop value should be unique and stable. Avoid using array indices as keys."
- `missingIteratorKey": "Missing 'key' prop for element in iterator. Each child in a list should have a unique 'key' prop."

## Auto-fix Suggestions

- Adds a `key` prop using a unique identifier when possible
- Suggests using existing unique IDs from the data
- Preserves existing formatting and comments
- Handles both single-line and multi-line JSX elements

## Benefits

1. **Improved Performance**: Helps React efficiently update and re-render lists
2. **Prevent Bugs**: Avoids issues with component state during list updates
3. **Better UX**: Ensures smooth animations and transitions in dynamic lists
4. **Consistent Behavior**: Makes list rendering more predictable

## When to Disable

- When working with third-party components that handle their own key management
- In test files where key warnings are not relevant
- During prototyping when performance is not a concern

## Configuration

```json
{
  "require-keys": ["error", {
    "checkFragmentShorthand": true,
    "checkKeyMustBeforeSpread": true,
    "warnOnDuplicates": true,
    "allowIndexAsKey": false,
    "typescript": {
      "enforceTypeSafety": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options
- `checkFragmentShorthand`: Check for keys in fragments (default: true)
- `checkKeyMustBeforeSpread`: Ensure keys come before spread props (default: true)
- `warnOnDuplicates`: Warn about duplicate keys (default: true)
- `allowIndexAsKey`: Allow using array index as key (default: false)
- `typescript.enforceTypeSafety`: Enforce type safety for keys (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use Stable IDs**: Prefer unique, stable IDs from your data
2. **Avoid Array Indices**: Don't use array indices as keys for dynamic lists
3. **Be Consistent**: Use the same key for the same item across re-renders
4. **Unique Within Siblings**: Keys only need to be unique among siblings
5. **Don't Generate Keys**: Avoid generating keys during render

## Performance Impact

- Minimal runtime overhead during linting
- Significantly improves application performance for large lists
- Helps identify potential performance bottlenecks in list rendering

## TypeScript Integration

- Validates key types in TypeScript
- Works with generic components and type parameters
- Handles type-safe key extraction from data structures
- Integrates with React's built-in type utilities
