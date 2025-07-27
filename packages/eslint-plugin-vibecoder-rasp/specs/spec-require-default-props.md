# Require Default Props Rule Specification

Ensures that all optional props in React components have default values defined, making component behavior more predictable and preventing `undefined`-related bugs.

## Core Functionality

This rule enforces that all optional props in React components have default values specified, either through `defaultProps` for class components or default parameters for function components. It works with both PropTypes and TypeScript type definitions.

## Handled Cases

### 1. Missing Default Values

- Detects optional props without default values
- Identifies props marked as optional (with `?` in TypeScript or `.isRequired` in PropTypes)
- Handles both function and class components

### 2. Type Validation

- Validates that default values match the prop type
- Ensures default values are of the correct type
- Handles complex types like objects, arrays, and functions

### 3. Default Props Usage

- Checks for proper usage of `defaultProps` in class components
- Validates default parameters in function components
- Handles destructured props with default values

## Error Messages

- `missingDefaultValue`: "Prop '{{prop}}' is optional but has no default value."
- `invalidDefaultValue`: "Default value for '{{prop}}' does not match its type."
- `redundantDefaultValue`: "Prop '{{prop}}' is required but has a default value."
- `missingDefaultProps`: "Missing defaultProps definition for optional props."

## Auto-fix Suggestions

- Adds default values for optional props
- Converts between defaultProps and default parameters
- Generates appropriate default values based on prop types
- Preserves existing code style and formatting

## Benefits

1. **Predictable Behavior**: Ensures props always have expected values
2. **Better Type Safety**: Catches type mismatches at compile time
3. **Improved Documentation**: Makes component interfaces clearer
4. **Easier Testing**: Reduces the need for test setup with default values

## When to Disable

- When using a component library that handles default values internally
- For components where `undefined` is a valid and expected prop value
- During migration of legacy code

## Configuration

```json
{
  "require-default-props": ["error", {
    "forbidDefaultForRequired": true,
    "classes": "always",
    "functions": "always",
    "typescript": {
      "prefer": "default-parameters"
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `forbidDefaultForRequired`: Prevent default values for required props (default: true)
- `classes`: When to check class components ("always", "never", or "ignore")
- `functions`: When to check function components ("always", "never", or "ignore")
- `typescript.prefer`: Preferred default value style ("default-parameters" or "default-props")
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always provide default values for optional props
2. **Keep Defaults Simple**: Use primitive values or simple objects/arrays
3. **Document Defaults**: Add comments explaining non-obvious default values
4. **Test Edge Cases**: Verify component behavior with and without props
5. **Use TypeScript**: Leverage TypeScript's type system for better safety

## Performance Impact

- Minimal runtime overhead during development
- No impact on production builds
- May improve performance by reducing null checks in component logic

## TypeScript Integration

- Works with TypeScript's type system
- Validates default values against prop types
- Handles generics and complex types
- Integrates with React's built-in type utilities
