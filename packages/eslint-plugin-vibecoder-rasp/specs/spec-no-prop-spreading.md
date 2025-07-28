# No Prop Spreading Rule Specification

Prevents the use of prop spreading in JSX components (`<Component {...props} />`), encouraging explicit prop passing for better code maintainability and type safety.

## Core Functionality

This rule identifies and prevents the use of the spread operator (`...`) in JSX component props, which can make components harder to understand and maintain by hiding the actual props being passed to child components.

## Handled Cases

### 1. Direct Prop Spreading

- Detects spread operators in component props
- Identifies both object rest and spread patterns
- Handles nested spread operations

### 2. Common Patterns

- Detects HOC patterns that spread props
- Identifies components that forward props
- Handles common utility functions that return props

### 3. TypeScript Integration

- Validates prop spreading against TypeScript types
- Handles generic components and type parameters
- Supports type assertions and type guards

## Error Messages

- `noPropSpreading`: "Avoid using prop spreading in JSX components. Explicitly list all props for better maintainability."
- `useExplicitProps`: "Use explicit props instead of spreading '{{name}}'. This makes the component's API more transparent."
- `considerDestructuring": "Consider destructuring '{{name}}' and passing props explicitly for better type safety."

## Auto-fix Suggestions

- Replaces prop spreading with explicit prop passing
- Preserves existing props while expanding spread operators
- Handles renaming of destructured properties
- Maintains proper formatting and indentation

## Benefits

1. **Improved Maintainability**: Makes component APIs more explicit and self-documenting
2. **Better Type Safety**: Helps catch prop-related bugs at compile time
3. **Easier Refactoring**: Makes it easier to track prop usage and changes
4. **Performance Optimization**: Helps identify unnecessary re-renders caused by prop changes

## When to Disable

- When building higher-order components (HOCs) that need to pass through props
- For components that act as proxies or wrappers
- When working with third-party libraries that require prop spreading
- During migrations when immediate changes aren't feasible

## Configuration

```json
{
  "no-prop-spreading": ["error", {
    "html": "ignore" | "enforce",
    "custom": "ignore" | "enforce",
    "explicitSpread": "ignore" | "enforce",
    "exceptions": [],
    "typescript": {
      "allowAsProps": false,
      "allowAsOverload": false
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `html`: Rule level for HTML elements ("ignore" | "enforce", default: "ignore")
- `custom`: Rule level for custom components ("ignore" | "enforce", default: "enforce")
- `explicitSpread`: Allow spreading when props are explicitly typed ("ignore" | "enforce", default: "ignore")
- `exceptions`: Array of component names to exclude from this rule
- `typescript.allowAsProps`: Allow spreading when used with TypeScript type assertions (default: false)
- `typescript.allowAsOverload`: Allow spreading in function overloads (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: List all props explicitly instead of using spread
2. **Use TypeScript**: Define clear prop types for all components
3. **Destructure Props**: Use object destructuring to keep prop passing clean
4. **Document Props**: Add JSDoc comments for complex prop types
5. **Use Composition**: Break down components to avoid deep prop drilling

## Performance Impact

- Minimal runtime overhead during linting
- Can help identify potential performance issues with prop passing
- May reduce bundle size by eliminating unnecessary prop passing

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Validates prop types when spreading is used
- Handles generics and complex type definitions
- Works with React's built-in type utilities
- Supports type-only imports and exports
