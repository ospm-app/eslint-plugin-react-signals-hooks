# Require JSDoc/TSDoc Rule Specification

Enforces documentation for React components, hooks, and utilities using JSDoc/TSDoc comments, improving code maintainability and developer experience.

## Core Functionality

This rule verifies that all React components, hooks, and utility functions have appropriate JSDoc/TSDoc comments, including descriptions, parameter documentation, and return types.

## Handled Cases

### 1. Component Documentation

- Requires JSDoc/TSDoc for all React components
- Validates `@param` documentation for props
- Checks for `@returns` documentation for render methods

### 2. Hook Documentation

- Enforces documentation for custom hooks
- Validates parameter and return value documentation
- Checks for side effects and dependencies

### 3. Utility Function Documentation

- Requires documentation for utility functions
- Validates parameter types and descriptions
- Ensures return types are documented

## Error Messages

- `missingJsdoc`: "Missing JSDoc/TSDoc comment for '{{name}}'."
- `missingDescription": "Missing description for '{{name}}'."
- `missingParam": "Missing @param documentation for '{{param}}' in '{{name}}'."
- `missingReturn": "Missing @returns documentation for '{{name}}'."
- `invalidType": "Invalid type '{{type}}' for '{{name}}'. Expected {{expected}}."

## Auto-fix Suggestions

- Adds basic JSDoc/TSDoc structure
- Generates `@param` tags from function parameters
- Adds `@returns` tags based on return type
- Preserves existing documentation

## Benefits

1. **Better Maintainability**: Clear documentation makes code easier to understand
2. **Improved IDE Support**: Enables better code completion and tooltips
3. **API Documentation**: Facilitates automatic documentation generation
4. **Onboarding**: Helps new developers understand the codebase faster

## When to Disable

- For simple, self-documenting utility functions
- In test files and examples
- When using third-party components with external documentation

## Configuration

```json
{
  "require-jsdoc": ["error", {
    "components": {
      "require": true,
      "description": true,
      "props": true,
      "context": true
    },
    "hooks": {
      "require": true,
      "description": true,
      "params": true,
      "returns": true
    },
    "utils": {
      "require": true,
      "description": true,
      "params": true,
      "returns": true,
      "complexityThreshold": 2
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `components.require`: Whether to require JSDoc for components (default: true)
- `components.description`: Whether to require a description (default: true)
- `components.props`: Whether to document props (default: true)
- `components.context`: Whether to document context usage (default: true)
- `hooks.require`: Whether to require JSDoc for hooks (default: true)
- `hooks.description`: Whether to require a description (default: true)
- `hooks.params`: Whether to document hook parameters (default: true)
- `hooks.returns`: Whether to document return values (default: true)
- `utils.require`: Whether to require JSDoc for utility functions (default: true)
- `utils.description`: Whether to require a description (default: true)
- `utils.params`: Whether to document function parameters (default: true)
- `utils.returns`: Whether to document return values (default: true)
- `utils.complexityThreshold`: Minimum cyclomatic complexity to require docs (default: 2)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Descriptive**: Write clear, concise descriptions
2. **Document All Parameters**: Include types and descriptions for all parameters
3. **Describe Return Values**: Explain what the function returns
4. **Use Markdown**: Format documentation with Markdown for better readability
5. **Keep It Updated**: Update documentation when code changes

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps prevent documentation-related bugs

## TypeScript Integration

- Validates TypeScript types in JSDoc/TSDoc comments
- Works with React's component and hook types
- Handles generic types and type parameters
- Integrates with TypeScript's type system
