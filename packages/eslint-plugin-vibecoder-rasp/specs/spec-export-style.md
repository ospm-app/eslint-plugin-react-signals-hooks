# Export Style Rule Specification

Enforces a consistent export style for React components, hooks, and utilities, improving codebase consistency and tree-shaking capabilities.

## Core Functionality

This rule ensures that all exports follow a standardized pattern, making it clear what is being exported and how it should be imported. It supports both default and named exports with configurable preferences.

## Handled Cases

### 1. Component Exports

- Validates default vs. named exports for components
- Ensures consistent export style within a file
- Handles both function and class components

### 2. Hook Exports

- Enforces 'use' prefix for custom hooks
- Validates named exports for hooks
- Handles hook factories and composition

### 3. Utility Exports

- Validates export style for utility functions
- Ensures consistent export patterns
- Handles type exports in TypeScript

## Error Messages

- `preferNamedExport": "Prefer named export for '{{name}}'."
- `preferDefaultExport": "Prefer default export for '{{name}}'."
- `invalidHookExport": "Custom hook '{{name}}' must be a named export."
- `inconsistentExports": "All exports in a file should use the same style (named or default)."
- `missingExportName": "Export statement should have a name."

## Auto-fix Suggestions

- Converts between default and named exports
- Updates import statements when export style changes
- Fixes hook exports to follow conventions
- Maintains JSDoc comments and type annotations

## Benefits

1. **Consistent Imports**: Makes import statements more predictable
2. **Better Tree-Shaking**: Named exports enable better dead code elimination
3. **Improved Discoverability**: Clearer API boundaries
4. **Easier Refactoring**: Standardized patterns simplify code changes

## When to Disable

- When working with third-party libraries that follow different conventions
- For legacy code that can't be easily modified
- When using build tools that require specific export patterns

## Configuration

```json
{
  "export-style": ["error", {
    "components": "named",
    "hooks": "named",
    "utils": "named",
    "allowBoth": false,
    "typescript": {
      "preferTypeExports": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `components`: Preferred export style for components ("named" or "default")
- `hooks`: Preferred export style for hooks ("named" or "default")
- `utils`: Preferred export style for utility functions ("named" or "default")
- `allowBoth`: Allow mixing default and named exports in the same file (default: false)
- `typescript.preferTypeExports`: Prefer `export type` for TypeScript types (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Consistent**: Follow the same export style throughout the codebase
2. **Use Named Exports**: For better tree-shaking and refactoring
3. **Group Related Exports**: Keep related exports together
4. **Document Public API**: Use JSDoc for exported members
5. **Avoid Default Exports**: For better code navigation and refactoring

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Better tree-shaking with named exports

## TypeScript Integration

- Validates TypeScript type exports
- Handles `export type` and `import type` syntax
- Works with generic types and type parameters
- Integrates with React's type system
