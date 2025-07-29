# No Unsafe Any Rule Specification

Prohibits the use of `any` and `unknown` types without explicit justification, encouraging type safety throughout the codebase.

## Core Functionality

This rule enforces explicit type safety by requiring comments that justify the use of `any` or `unknown` types. It helps maintain type safety while allowing necessary escapes when properly documented.

## Handled Cases

### 1. Explicit Any/Unknown Types

- Detects variables, parameters, and return types using `any` or `unknown`
- Identifies type assertions to `any` or `unknown`
- Handles type parameters and generic constraints

### 2. Implicit Any

- Catches implicit `any` in function parameters
- Identifies untyped variables that default to `any`
- Flags untyped object literals and array literals

### 3. Justification Comments

- Validates the presence of justification comments
- Ensures comments are meaningful and not just placeholders
- Supports different comment styles (//, /**/, /** */)

## Error Messages

- `unsafeAny": "Unexpected any. Use a more specific type or add a justification comment."
- `missingJustification": "Missing justification comment for 'any' or 'unknown' type."
- `implicitAny": "Implicit any type. Add a type annotation or justification comment."

## Auto-fix Suggestions

- Adds a TODO comment for missing justifications
- Preserves existing comments and formatting
- Handles different comment styles
- Suggests more specific types when possible

## Benefits

1. **Improved Type Safety**: Reduces the use of unsafe types
2. **Better Documentation**: Ensures proper documentation of type escapes
3. **Easier Refactoring**: Makes it easier to find and fix type issues
4. **Team Alignment**: Encourages consistent type safety practices

## When to Disable

- In prototype or experimental code
- When working with third-party libraries with poor type definitions
- During migration of JavaScript codebases to TypeScript

## Configuration

```json
{
  "no-unsafe-any": ["error", {
    "allowWithDescription": true,
    "allowWithTag": ["TODO", "FIXME"],
    "typescript": {
      "noImplicitAny": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowWithDescription`: Allow `any`/`unknown` with a description (default: true)
- `allowWithTag`: Array of tags that allow `any`/`unknown` (default: ["TODO", "FIXME"])
- `typescript.noImplicitAny`: Enable TypeScript's noImplicitAny (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Specific**: Always prefer more specific types over `any` or `unknown`
2. **Document Exceptions**: Add clear justifications when using `any` or `unknown`
3. **Use Type Guards**: Implement proper type guards for `unknown` types
4. **Review Regularly**: Periodically review and address TODOs
5. **Leverage Utility Types**: Use TypeScript's utility types when possible

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve development experience by catching type issues early

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's type inference
- Supports type-only imports and exports
