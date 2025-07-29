# Type Imports Rule Specification

Enforces the use of type-only imports and exports in TypeScript, improving code clarity and potentially reducing bundle size.

## Core Functionality

This rule ensures that imports and exports used only for types are marked with the `type` modifier. It helps distinguish between runtime and type imports, making the code's intent clearer and potentially enabling better tree-shaking.

## Handled Cases

### 1. Type-Only Imports

- Detects imports used only in type positions
- Identifies type-only imports that should use `import type`
- Handles default, named, and namespace imports

### 2. Type-Only Exports

- Flags exports used only in type positions
- Identifies type-only exports that should use `export type`
- Handles both named and default exports

### 3. Mixed Imports/Exports

- Detects when type and value imports/exports are mixed
- Suggests separating type and value imports/exports
- Handles complex import/export patterns

## Error Messages

- `typeImportNotUsedAsValue": "Type import '{{name}}' is only used as a type. Use`import type`."
- `typeExportNotUsedAsValue": "Type export '{{name}}' is only used as a type. Use`export type`."
- `mixedImport": "Import '{{name}}' is used as both a type and a value. Split into separate imports."

## Auto-fix Suggestions

- Converts regular imports to type imports when appropriate
- Splits mixed imports into separate type and value imports
- Preserves existing import/export formatting
- Handles different import styles (default, named, namespace)

## Benefits

1. **Improved Code Clarity**: Clearly separates runtime and type imports
2. **Better Bundle Size**: May enable better tree-shaking in some bundlers
3. **Faster Compilation**: Can improve TypeScript compilation performance
4. **Easier Refactoring**: Makes it clearer which imports are used at runtime

## When to Disable

- In JavaScript files without TypeScript
- During migration of existing codebases
- When working with libraries that don't support type imports

## Configuration

```json
{
  "type-imports": ["error", {
    "prefer": "type-imports",
    "disallowTypeAnnotations": true,
    "typescript": {
      "isolatedModules": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `prefer`: Preferred style ("type-imports" or "no-type-imports")
- `disallowTypeAnnotations`: Disallow type annotations (default: true)
- `typescript.isolatedModules`: Enable isolated modules (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Consistent**: Choose a style and stick with it
2. **Use Type Imports for Types**: Always use `import type` for types
3. **Separate Concerns**: Keep type and value imports separate
4. **Leverage IDE Support**: Use IDE features to automatically add type imports
5. **Review Imports**: Periodically review and clean up imports

## Performance Impact

- Minimal runtime overhead during linting
- May reduce bundle size in some cases
- Can improve TypeScript compilation performance

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's module resolution
- Supports type-only imports and exports
