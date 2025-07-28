# Memo Comparison Rule Specification

Ensures proper implementation of comparison functions in `React.memo` to prevent unnecessary re-renders and optimize component performance.

## Core Functionality

This rule enforces best practices for `React.memo` by validating that custom comparison functions are implemented correctly and efficiently. It helps prevent performance issues caused by improper memoization.

## Handled Cases

### 1. Missing Comparison Function

- Detects `React.memo` usages without a custom comparison function
- Identifies cases where a comparison function would be beneficial
- Suggests adding a comparison function for complex props

### 2. Inefficient Comparisons

- Identifies shallow comparison anti-patterns
- Detects deep equality checks that could cause performance issues
- Flags comparison functions that don't properly handle all props

### 3. Type Safety

- Validates TypeScript types in comparison functions
- Ensures comparison functions handle all required props
- Checks for proper return types (boolean)

## Error Messages

- `missingComparison`: "Consider adding a custom comparison function to `React.memo` for better performance with complex props."
- `inefficientComparison`: "Inefficient comparison function detected. Consider optimizing or removing it."
- `invalidReturnType": "Comparison function must return a boolean value."

## Auto-fix Suggestions

- Adds a basic comparison function stub
- Converts shallow comparisons to proper deep comparisons when needed
- Preserves existing code style and formatting
- Adds JSDoc comments for the comparison function

## Benefits

1. **Improved Performance**: Prevents unnecessary re-renders
2. **Better Code Quality**: Encourages proper memoization practices
3. **Type Safety**: Ensures comparison functions are type-safe
4. **Maintainability**: Makes component updates more predictable

## When to Disable

- For simple components where memoization isn't needed
- When using third-party components that handle their own memoization
- During prototyping or quick experiments

## Configuration

```json
{
  "memo-comparison": ["error", {
    "requireForSimpleProps": false,
    "allowShallowEqual": true,
    "typescript": {
      "strictNullChecks": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `requireForSimpleProps`: Require comparison for simple props (default: false)
- `allowShallowEqual`: Allow `shallowEqual` from 'react-redux' (default: true)
- `typescript.strictNullChecks`: Enforce strict null checks (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use Named Functions**: Name your comparison functions for better debugging
2. **Be Specific**: Only compare the props that actually affect rendering
3. **Avoid Deep Comparisons**: Be cautious with deep equality checks in performance-critical code
4. **Test Performance**: Always measure the impact of your comparison functions
5. **Document Assumptions**: Add comments explaining why certain props are compared or ignored

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing unnecessary re-renders
- Helps identify potential performance bottlenecks in component updates

## TypeScript Integration

- Validates prop types in comparison functions
- Works with generic components and type parameters
- Handles type-safe prop comparisons
- Integrates with React's built-in type utilities
