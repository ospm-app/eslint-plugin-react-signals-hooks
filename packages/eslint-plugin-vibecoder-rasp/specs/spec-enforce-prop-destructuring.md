# Enforce Prop Destructuring Rule Specification

Requires that all component props are destructured in the function parameters, improving code readability and making prop usage more explicit.

## Core Functionality

This rule enforces the destructuring of props directly in the function parameters of React components. It helps maintain a consistent code style and makes it immediately clear what props a component expects.

## Handled Cases

### 1. Direct Prop Usage

- Detects direct usage of `props.something` in the component body
- Identifies nested prop access patterns
- Handles both functional and class components

### 2. Destructuring Patterns

- Validates proper destructuring in function parameters
- Handles default values for destructured props
- Supports rest props and nested destructuring

### 3. TypeScript Integration

- Works with TypeScript interfaces and type annotations
- Validates prop types in destructuring patterns
- Handles generics and complex type definitions

## Error Messages

- `shouldDestructureProps": "Props should be destructured in the function parameters."
- `invalidDestructuring": "Invalid prop destructuring pattern. Use object destructuring for props."
- `missingDefaultValue": "Missing default value for optional prop '{{prop}}' in destructuring."

## Auto-fix Suggestions

- Converts `props.something` usage to destructured parameters
- Adds proper destructuring patterns to function parameters
- Preserves existing default values and type annotations
- Maintains code formatting and style

## Benefits

1. **Improved Readability**: Makes component interfaces immediately clear
2. **Better Type Safety**: Easier to track prop types and usage
3. **Consistent Code Style**: Enforces a uniform approach to prop handling
4. **Easier Refactoring**: Simplifies component interface changes

## When to Disable

- When working with higher-order components that manipulate props
- In components that need to pass all props to child components
- During migration of legacy code

## Configuration

```json
{
  "enforce-prop-destructuring": ["error", {
    "requireDefaultProps": true,
    "ignoreClassComponents": false,
    "typescript": {
      "prefer": "type-annotation"
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `requireDefaultProps`: Require default values for optional props (default: true)
- `ignoreClassComponents`: Skip checking class components (default: false)
- `typescript.prefer`: Preferred type annotation style ("type-annotation" or "type-assertion")
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Destructure All Props**: Always destructure all props in the function signature
2. **Use Default Values**: Provide defaults for optional props
3. **Keep It Simple**: Avoid deeply nested destructuring
4. **Be Explicit**: List all expected props in the destructuring pattern
5. **Use TypeScript**: Combine with TypeScript for better type safety

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve performance by making prop access patterns more predictable

## TypeScript Integration

- Works with TypeScript's type system
- Validates prop types in destructuring patterns
- Handles generics and complex types
- Integrates with React's built-in type utilities
