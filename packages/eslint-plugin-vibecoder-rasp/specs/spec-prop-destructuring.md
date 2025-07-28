# Prop Destructuring Rule Specification

Enforces consistent prop destructuring in React function components, improving code readability and maintainability by making the component's API more explicit.

## Core Functionality

This rule ensures that all React function components destructure their props directly in the function parameters, making the component's API more transparent and easier to understand at a glance.

## Handled Cases

### 1. Direct Prop Usage

- Detects direct usage of `props` object without destructuring
- Identifies components that access props via `props.propName`
- Handles nested prop access patterns

### 2. Partial Destructuring

- Identifies components that mix destructured and non-destructured props
- Detects cases where some props are destructured while others are accessed via `props`

### 3. Rest Props

- Handles components that use the rest operator (`...rest`)
- Validates that rest props are properly typed in TypeScript
- Ensures rest props are used appropriately

## Error Messages

- `shouldDestructureProps`: "Props should be destructured in the function parameters."
- `inconsistentDestructuring": "All props should be consistently destructured. Found both destructured and non-destructured props."
- `missingTypeForRestProps": "Missing type annotation for rest props. Use`React.ComponentProps` or define an explicit type."

## Auto-fix Suggestions

- Converts `props` usage to destructured parameters
- Moves destructuring from function body to parameters
- Preserves existing type annotations and default values
- Handles renaming of destructured properties

## Benefits

1. **Improved Readability**: Makes component APIs more explicit
2. **Better Type Safety**: Easier to see all props at a glance
3. **Easier Refactoring**: Simplifies prop type changes
4. **Consistent Code Style**: Enforces a consistent pattern across the codebase

## When to Disable

- When using higher-order components that inject props
- In cases where prop destructuring would make the code less readable
- During migrations when immediate changes aren't feasible

## Configuration

```json
{
  "prop-destructuring": ["error", {
    "required": true,
    "ignoreClassFields": true,
    "ignoreForComponents": false,
    "typescript": {
      "enforceTypeAnnotations": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `required`: Enforce destructuring for all components (default: true)
- `ignoreClassFields`: Skip class components (default: true)
- `ignoreForComponents`: Skip components that are likely HOCs (default: false)
- `typescript.enforceTypeAnnotations`: Require type annotations for destructured props (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Destructure All Props**: Always destructure all props in the function parameters
2. **Use Type Annotations**: Add TypeScript types or PropTypes for all destructured props
3. **Group Related Props**: Keep related props together in the destructuring pattern
4. **Use Default Values**: Provide default values for optional props in the parameter list
5. **Handle Rest Props**: Use the rest operator for props that should pass through to child components

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- Can help identify potential performance issues with prop spreading

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Validates type annotations for destructured props
- Handles generics and complex type definitions
- Works with React's built-in type utilities
- Supports type-only imports and exports
