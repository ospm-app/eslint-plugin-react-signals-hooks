# Explicit Prop Types Rule Specification

Ensures that all React components have explicit prop type definitions, improving code maintainability and developer experience through better documentation and type safety.

## Core Functionality

This rule enforces the declaration of prop types for all React components, ensuring that all expected props are properly documented and validated. It supports both PropTypes and TypeScript interfaces/types for defining prop types.

## Handled Cases

### 1. Missing Prop Types

- Detects components without any prop type definitions
- Identifies components with incomplete prop type definitions
- Handles both functional and class components

### 2. TypeScript Integration

- Validates TypeScript interfaces and types used as prop types
- Ensures proper usage of `interface Props` or type aliases
- Handles generics and complex type definitions

### 3. Default Props

- Validates that defaultProps match their corresponding prop types
- Ensures required props are properly marked
- Handles both static defaultProps and default parameters

## Error Messages

- `missingPropTypes`: "Component '{{component}}' is missing prop types definition."
- `missingTypeDefinition`: "Missing type definition for prop '{{prop}}' in component '{{component}}'."
- `invalidDefaultProp`: "Default prop '{{prop}}' does not match prop type."
- `missingRequiredProp`: "Required prop '{{prop}}' is missing a default value."

## Auto-fix Suggestions

- Adds basic PropTypes or TypeScript interfaces for components
- Generates prop type stubs based on component usage
- Adds JSDoc comments for prop types when appropriate
- Converts between PropTypes and TypeScript types when possible

## Benefits

1. **Improved Documentation**: Makes component APIs self-documenting
2. **Better Type Safety**: Catches potential type-related bugs early
3. **Enhanced Developer Experience**: Provides better IDE support and autocompletion
4. **Easier Refactoring**: Makes it safer to change component interfaces

## When to Disable

- For third-party components that don't expose their prop types
- In prototype or experimental code where prop types are not yet stable
- When using a type system that handles prop validation differently

## Configuration

```json
{
  "explicit-prop-types": ["error", {
    "forbidExtraProps": true,
    "ignore": [],
    "customValidators": [],
    "skipUndeclared": false,
    "typescript": {
      "prefer": "types",
      "allowNamespaces": false
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `forbidExtraProps`: Forbid extra props not specified in prop types (default: true)
- `ignore`: Array of component names to ignore (default: [])
- `customValidators`: Array of custom validators to use (default: [])
- `skipUndeclared`: Skip validation of undeclared props (default: false)
- `typescript.prefer`: Preferred type system ("types" or "prop-types", default: "types")
- `typescript.allowNamespaces`: Allow TypeScript namespaces (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always declare prop types for all components
2. **Use TypeScript**: Prefer TypeScript interfaces/types over PropTypes when possible
3. **Document Props**: Add JSDoc comments for complex props
4. **Validate Early**: Define prop types early in the component file
5. **Keep Props Minimal**: Avoid passing too many props to a single component

## Performance Impact

- Minimal runtime overhead during development
- No impact on production builds when using TypeScript
- Helps identify potential performance issues with large prop objects

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Supports both interfaces and type aliases
- Handles generics, unions, and complex types
- Works with React's built-in type utilities (e.g., `React.ComponentProps`)
- Validates default props against TypeScript types
