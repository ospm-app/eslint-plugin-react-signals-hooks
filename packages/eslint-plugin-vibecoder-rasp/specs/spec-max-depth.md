# Max Depth Rule Specification

Enforces a maximum depth for nested JSX elements, helping to keep components focused and maintainable by preventing overly complex component hierarchies.

## Core Functionality

This rule helps maintain component simplicity by warning when a component's JSX structure becomes too deeply nested, which can make the component harder to understand and maintain.

## Handled Cases

### 1. Depth Calculation

- Counts nested JSX elements
- Handles self-closing and non-self-closing elements
- Supports JSX fragments

### 2. Component Structure

- Validates depth in both function and class components
- Handles conditional rendering
- Accounts for array mapping and fragments

### 3. Configuration Options

- Configurable maximum depth
- Ability to ignore certain elements
- Support for custom depth calculation

## Error Messages

- `maxDepthExceeded": "JSX maximum depth of {{max}} exceeded (found {{depth}}). Consider breaking this component into smaller, more focused components."
- `tooDeeplyNested": "Component '{{component}}' has a JSX depth of {{depth}}, which exceeds the maximum allowed depth of {{max}}."
- `considerExtracting": "Consider extracting the nested JSX starting from '{{element}}' into a separate component."

## Auto-fix Suggestions

- Suggests extracting deeply nested JSX into separate components
- Can help identify logical groupings of elements
- May suggest using composition to flatten the structure

## Benefits

1. **Improved Readability**: Flatter component hierarchies are easier to understand
2. **Better Maintainability**: Smaller, focused components are easier to maintain
3. **Enhanced Reusability**: Extracted components can be reused
4. **Easier Testing**: Simpler components are easier to test

## When to Disable

- For layout components that naturally have deep nesting
- When working with third-party components
- During migrations or refactoring

## Configuration

```json
{
  "max-depth": ["error", {
    "max": 4,
    "ignoreJSX": ["Fragment", '...'],
    "skipChildren": false,
    "typescript": {
      "includeTypeAssertions": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `max`: Maximum allowed JSX depth (default: 4)
- `ignoreJSX`: Array of JSX elements to ignore when calculating depth (default: [])
- `skipChildren`: Skip children of specific elements (default: false)
- `typescript.includeTypeAssertions`: Include type assertions in depth calculation (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Keep It Shallow**: Aim for a maximum depth of 4-5 levels
2. **Extract Components**: Break down deep structures into smaller components
3. **Use Composition**: Compose components to flatten the hierarchy
4. **Document Exceptions**: Add comments when deep nesting is necessary
5. **Consider Context**: For deeply nested data, consider using React Context

## Performance Impact

- Minimal runtime overhead during linting
- Can help identify potential performance issues from deep component trees
- Encourages better component architecture

## TypeScript Integration

- Works with TypeScript's type system
- Handles JSX type checking
- Supports type assertions and type guards
- Integrates with React's built-in type utilities
