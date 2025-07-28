# Max Props Rule Specification

Enforces a maximum number of props that can be passed to a component, helping to keep components focused and maintainable.

## Core Functionality

This rule helps maintain component simplicity by warning when a component receives too many props, which can indicate that the component is doing too much and should be broken down into smaller, more focused components.

## Handled Cases

### 1. Prop Counting

- Counts all props passed to a component
- Handles both direct props and spread props
- Supports JSX spread operator

### 2. Component Types

- Works with both function and class components
- Handles components created with React.forwardRef
- Validates components wrapped in HOCs

### 3. Configuration Options

- Configurable maximum number of props
- Ability to ignore certain prop types
- Support for custom prop counting logic

## Error Messages

- `tooManyProps": "Component '{{component}}' has too many props ({{count}}). Maximum allowed is {{max}}."
- `considerSplitting": "Consider splitting '{{component}}' into smaller components. It currently has {{count}} props."
- `tooManySpreadProps": "Avoid using too many spread props in '{{component}}'. This can make the component's API less clear."

## Auto-fix Suggestions

- Suggests ways to split the component
- Can extract prop types into a separate object
- May suggest using context for prop drilling
- Can help identify which props are related and could be grouped

## Benefits

1. **Improved Maintainability**: Smaller, focused components are easier to understand and maintain
2. **Better Reusability**: Components with fewer props are more reusable
3. **Clearer APIs**: Encourages thoughtful component design
4. **Easier Testing**: Components with fewer dependencies are easier to test

## When to Disable

- For configuration or container components that naturally have many props
- When working with third-party components
- During migrations or refactoring

## Configuration

```json
{
  "max-props": ["error", {
    "maximum": 5,
    "ignore": ["className", "style"],
    "countSpread": true,
    "ignoreSpread": false,
    "customValidator": null,
    "typescript": {
      "includeTypeProps": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `maximum`: Maximum number of props allowed (default: 5)
- `ignore`: Array of prop names to ignore (default: [])
- `countSpread`: Whether to count spread props (default: true)
- `ignoreSpread`: Whether to ignore spread props (default: false)
- `customValidator`: Custom function to validate props (default: null)
- `typescript.includeTypeProps`: Include TypeScript type props in count (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Keep Props Minimal**: Aim for components with 5 or fewer props
2. **Group Related Props**: Use objects to group related props
3. **Use Context**: For deeply nested props, consider using React Context
4. **Composition**: Break down large components into smaller, composable ones
5. **Document Exceptions**: Add comments when exceeding the prop limit is necessary

## Performance Impact

- Minimal runtime overhead during linting
- Can help identify performance issues from prop drilling
- Encourages better component architecture

## TypeScript Integration

- Works with TypeScript's type system
- Can validate prop types and interfaces
- Handles generics and complex type definitions
- Integrates with React's built-in type utilities
