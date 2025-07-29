# Method Order Rule Specification

Enforces a consistent order for component methods and properties, improving code readability and maintainability across the codebase.

## Core Functionality

This rule ensures that methods and properties within React components follow a standardized order, making it easier to locate and understand different parts of a component's implementation.

## Handled Cases

### 1. Class Components

- Validates lifecycle method order
- Ensures consistent property initialization
- Handles static properties and methods

### 2. Function Components

- Validates hook call order
- Ensures consistent organization of custom hooks
- Handles variable declarations and effects

### 3. TypeScript Support

- Validates type definitions and interfaces
- Ensures consistent organization of type declarations
- Handles generic components and type parameters

## Error Messages

- `invalidMethodOrder": "'{{method}}' should come before '{{previousMethod}}'."
- `invalidHookOrder": "React Hook '{{hook}}' is called after '{{previousHook}}'. Hooks must be called in the same order on every render."
- `invalidPropertyOrder": "Class property '{{property}}' should be placed {{position}}."
- `missingStaticType": "Static class properties should have explicit type annotations."

## Auto-fix Suggestions

- Reorders methods and properties according to the specified conventions
- Adds missing type annotations
- Groups related methods and properties together
- Preserves comments and JSDoc blocks

## Benefits

1. **Improved Readability**: Consistent method order makes code easier to scan
2. **Better Maintainability**: Standardized patterns reduce cognitive load
3. **Easier Code Reviews**: Consistent structure simplifies the review process
4. **Reduced Errors**: Enforces best practices for component organization

## When to Disable

- For third-party components that follow different conventions
- In legacy code that can't be easily reorganized
- When using experimental features that don't fit the standard pattern

## Configuration

```json
{
  "method-order": ["error", {
    "order": [
      "static-methods",
      "lifecycle",
      "everything-else",
      "render"
    ],
    "groups": {
      "lifecycle": [
        "displayName",
        "propTypes",
        "contextTypes",
        "childContextTypes",
        "mixins",
        "statics",
        "defaultProps",
        "constructor",
        "getDefaultProps",
        "getInitialState",
        "state",
        "getChildContext",
        "componentWillMount",
        "componentDidMount",
        "componentWillReceiveProps",
        "shouldComponentUpdate",
        "componentWillUpdate",
        "componentDidUpdate",
        "componentWillUnmount"
      ]
    },
    "typescript": {
      "prefer": "type-annotation"
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `order`: Array of method/group names in the desired order
- `groups`: Object defining custom method groups
- `typescript.prefer`: Preferred TypeScript syntax ("type-annotation" or "type-assertion")
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Follow the Pattern**: Adhere to the established method order
2. **Group Related Methods**: Keep related functionality together
3. **Be Consistent**: Maintain the same order across all components
4. **Document Exceptions**: Add comments when deviating from the standard
5. **Keep Methods Focused**: Each method should have a single responsibility

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps identify potential performance issues through better organization

## TypeScript Integration

- Validates TypeScript types and interfaces
- Ensures proper type usage in methods
- Handles generic components and type parameters
- Integrates with React's built-in type utilities
