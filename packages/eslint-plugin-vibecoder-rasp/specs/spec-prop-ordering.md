# Prop Ordering Rule Specification

Enforces a consistent order for props in React components, improving code readability and maintainability by establishing a predictable pattern for prop declarations.

## Core Functionality

This rule ensures that props are consistently ordered in component definitions, with required props appearing before optional ones. It supports both function and class components, working with PropTypes, TypeScript interfaces, and default parameters.

## Handled Cases

### 1. Required vs. Optional Props

- Ensures required props are listed before optional ones
- Handles both TypeScript's required/optional markers and PropTypes' isRequired
- Validates prop order in both component definitions and usage

### 2. Prop Types and Interfaces

- Validates prop order in TypeScript interfaces and type aliases
- Checks PropTypes definitions for consistent ordering
- Handles both inline and external type definitions

### 3. Default Values

- Validates that default values don't affect required/optional status
- Ensures default values are consistent with prop types
- Handles both defaultProps and default parameters

## Error Messages

- `requiredPropsFirst`: "Required props should be listed before optional props. Move '{{propName}}' before the optional props."
- `invalidPropOrder`: "Props should be ordered with required props first. Found optional prop '{{optionalProp}}' before required prop '{{requiredProp}}'."
- `inconsistentOrder": "Inconsistent prop order between definition and usage for component '{{componentName}}'."

## Auto-fix Suggestions

- Reorders props to match the required-first convention
- Preserves comments and formatting when reordering
- Handles both single-line and multi-line prop declarations
- Updates both component definitions and usages

## Benefits

1. **Improved Readability**: Makes it easier to scan and understand component APIs
2. **Better Developer Experience**: Establishes a consistent pattern across the codebase
3. **Easier Maintenance**: Reduces cognitive load when working with components
4. **Type Safety**: Helps catch potential issues with required/optional props

## When to Disable

- When working with third-party components that don't follow this convention
- In legacy codebases where reordering would be too disruptive
- For components with a very small number of props where order is less important

## Configuration

```json
{
  "prop-ordering": ["error", {
    "requiredFirst": true,
    "shorthandLast": false,
    "multiline": "last",
    "alphabetize": false,
    "groups": ["required", "optional"],
    "ignoreCase": true,
    "ignorePatterns": ["^Test", "\\.test\\."],
    "typescript": {
      "prefer": "type-annotation"
    }
  }]
}
```

### Options

- `requiredFirst`: Enforce required props first (default: true)
- `shorthandLast`: Place shorthand props at the end (default: false)
- `multiline`: Position of multiline props ("first" | "last" | "ignore", default: "last")
- `alphabetize`: Alphabetize props within groups (default: false)
- `groups`: Custom prop groups and their order (default: ["required", "optional"])
- `ignoreCase`: Case-sensitive sorting (default: true)
- `typescript.prefer`: Preferred TypeScript syntax ("type-annotation" | "interface", default: "type-annotation")
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Required Props First**: Always list required props before optional ones
2. **Group Related Props**: Keep related props together (e.g., event handlers, styling props)
3. **Be Consistent**: Follow the same ordering pattern throughout the codebase
4. **Use Descriptive Names**: Make prop purposes clear through naming
5. **Document Exceptions**: Add comments when deviating from the standard order

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- Can help identify potential issues with prop dependencies

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Validates prop order in interfaces and type aliases
- Handles generics and complex type definitions
- Works with React's built-in type utilities
- Supports type-only imports and exports
