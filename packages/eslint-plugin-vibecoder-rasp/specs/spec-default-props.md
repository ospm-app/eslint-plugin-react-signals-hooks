# Default Props Rule Specification

Ensures that all optional props in React components have default values defined, making component APIs more predictable and reducing the need for null/undefined checks.

## Core Functionality

This rule enforces that all optional props in React components have default values defined, either through `defaultProps` or default parameters in function components. It helps prevent `undefined` prop values and makes component behavior more predictable.

## Handled Cases

### 1. Missing Default Values

- Detects optional props without default values
- Handles both function components and class components
- Identifies props with `?` in TypeScript or `.isRequired` in PropTypes

### 2. Default Value Validation

- Ensures default values match the prop type
- Validates that required props don't have default values
- Handles complex types including objects, arrays, and functions

### 3. TypeScript Integration

- Validates default props against TypeScript interfaces
- Handles generic components and complex type definitions
- Supports both `defaultProps` and default parameters

## Error Messages

- `missingDefaultValue`: "The optional prop '{{prop}}' is missing a default value."
- `invalidDefaultValue`: "The default value for '{{prop}}' does not match its type."
- `defaultValueForRequired`: "Required prop '{{prop}}' should not have a default value."
- `inconsistentDefaultProp`: "Default prop '{{prop}}' is defined both in defaultProps and as a default parameter."

## Auto-fix Suggestions

- Adds default values for optional props
- Converts between `defaultProps` and default parameters
- Generates appropriate default values based on prop type
- Preserves existing comments and formatting

## Benefits

1. **Predictable Behavior**: Components always have defined values for all props
2. **Reduced Boilerplate**: Fewer null/undefined checks in component code
3. **Better Documentation**: Makes the component's API more self-documenting
4. **Easier Testing**: Reduces the need to specify all props in tests

## When to Disable

- When using a component library that handles default props internally
- For components where undefined has a specific meaning
- During migrations when adding default values isn't immediately feasible

## Configuration

```json
{
  "default-props": ["error", {
    "forbidDefaultForRequired": true,
    "classes": "ignore" | "always" | "never",
    "functions": "ignore" | "always" | "never",
    "ignoreFunctionalComponents": false,
    "ignoreClassComponents": false,
    "typescript": {
      "prefer": "default-parameters" | "default-props",
      "allowRequiredDefaults": false
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `forbidDefaultForRequired`: Prevent default values for required props (default: true)
- `classes`: Rule level for class components ("ignore" | "always" | "never", default: "always")
- `functions`: Rule level for function components ("ignore" | "always" | "never", default: "always")
- `ignoreFunctionalComponents`: Skip function components (default: false)
- `ignoreClassComponents`: Skip class components (default: false)
- `typescript.prefer`: Preferred default value syntax for TypeScript (default: "default-parameters")
- `typescript.allowRequiredDefaults`: Allow default values for required props (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Always Provide Defaults**: Define default values for all optional props
2. **Be Explicit**: Use `required: true` or `?` to clearly indicate required props
3. **Keep Defaults Simple**: Use primitive values or simple objects/arrays for defaults
4. **Document Defaults**: Add JSDoc comments explaining non-obvious default values
5. **Test Edge Cases**: Verify component behavior with and without default props

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- Can help identify potential performance issues with complex default value calculations

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Validates default values against TypeScript types
- Handles generics and complex type definitions
- Supports both `defaultProps` and default parameters
- Works with React's built-in type utilities
