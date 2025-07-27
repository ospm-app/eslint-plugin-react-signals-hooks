# No Large Component Tree Rule Specification

Prevents the creation of excessively large component trees within render methods, which can degrade performance and maintainability.

## Core Functionality

This rule enforces a maximum depth for component trees within render methods, encouraging the extraction of complex UI into smaller, more manageable components. It helps maintain good performance and code organization.

## Handled Cases

### 1. Deeply Nested JSX

- Detects component trees that exceed the maximum allowed depth
- Identifies deeply nested conditional rendering
- Flags complex logical expressions in JSX

### 2. Inline Components

- Identifies large inline function components
- Detects complex expressions in render props
- Flags components that could be extracted for better readability

### 3. Performance Bottlenecks

- Highlights potential performance issues in the component tree
- Identifies components that might cause unnecessary re-renders
- Flags complex expressions that could be memoized

## Error Messages

- `treeTooDeep`: "Component tree is too deep ({{depth}}). Maximum allowed is {{maxDepth}}. Consider extracting components."
- `tooManyChildren`: "Component has too many direct children ({{count}}). Maximum allowed is {{maxChildren}}."
- `complexExpression": "Complex expression in render. Consider extracting to a variable or component."

## Auto-fix Suggestions

- Extracts complex JSX into separate components
- Suggests breaking down large components into smaller ones
- Proposes memoization for expensive calculations
- Preserves code style and formatting

## Benefits

1. **Improved Performance**: Smaller component trees render faster
2. **Better Maintainability**: Smaller components are easier to understand and test
3. **Easier Debugging**: Isolates issues to smaller pieces of code
4. **Better Reusability**: Encourages component composition

## When to Disable

- For simple components where extraction wouldn't add value
- When working with third-party components that require deep nesting
- During prototyping when the component structure is still evolving

## Configuration

```json
{
  "no-large-component-tree": ["error", {
    "maxDepth": 5,
    "maxChildren": 10,
    "skipComponents": [],
    "typescript": {
      "enforceTypeSafety": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `maxDepth`: Maximum allowed depth of component nesting (default: 5)
- `maxChildren`: Maximum number of direct children a component can have (default: 10)
- `skipComponents`: Array of component names to skip (default: [])
- `typescript.enforceTypeSafety`: Enforce type safety (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Keep Components Small**: Aim for components that do one thing well
2. **Extract Reusable Parts**: Look for patterns that can be turned into reusable components
3. **Use Composition**: Compose smaller components to build complex UIs
4. **Memoize Expensive Calculations**: Move complex logic out of render
5. **Profile Performance**: Use React DevTools to identify actual performance bottlenecks

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve rendering performance
- Helps identify potential performance bottlenecks early

## TypeScript Integration

- Validates component props and types
- Works with generic components
- Handles type inference for extracted components
- Integrates with React's built-in type utilities
