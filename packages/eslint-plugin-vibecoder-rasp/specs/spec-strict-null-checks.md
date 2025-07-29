# Strict Null Checks Rule Specification

Enforces strict null checking in TypeScript, requiring explicit handling of `null` and `undefined` values to prevent runtime errors and improve code reliability.

## Core Functionality

This rule ensures that all potential `null` and `undefined` values are properly handled in the codebase. It enforces TypeScript's `strictNullChecks` compiler option at the linting level, catching potential null reference errors before they reach runtime.

## Handled Cases

### 1. Implicit Any Types

- Detects variables with implicit `any` type that might be `null` or `undefined`
- Identifies function parameters without explicit null/undefined types
- Flags return types that don't account for potential null/undefined values

### 2. Optional Chaining and Nullish Coalescing

- Encourages the use of optional chaining (`?.`) for safe property access
- Promotes the use of nullish coalescing operator (`??`) for default values
- Identifies potential null/undefined in complex expressions

### 3. Type Assertions

- Flags unsafe type assertions that ignore null/undefined
- Identifies non-null assertions (`!`) that might hide potential issues
- Validates user-defined type guards for null checks

## Error Messages

- `strictNullCheckRequired`: "Type '{{type}}' is not assignable to type '{{expectedType}}'. Consider adding '| null' or '| undefined' to the type."
- `unsafeTypeAssertion`: "Type assertion '{{assertion}}' is unsafe because it doesn't account for null/undefined."
- `missingNullCheck": "'{{name}}' might be null or undefined. Add a null check or use optional chaining ({{suggestion}})."

## Auto-fix Suggestions

- Adds explicit `| null` or `| undefined` to type annotations
- Converts unsafe type assertions to proper type guards
- Adds null checks or optional chaining where appropriate
- Preserves existing code style and formatting

## Benefits

1. **Improved Type Safety**: Catches potential null reference errors at compile time
2. **Better Code Quality**: Encourages explicit handling of edge cases
3. **Enhanced Maintainability**: Makes the code's intent clearer
4. **Reduced Bugs**: Prevents common runtime errors related to null/undefined

## When to Disable

- When working with third-party libraries that don't have proper type definitions
- In test files where strict null checking might be too verbose
- During gradual migration to strict null checks

## Configuration

```json
{
  "strict-null-checks": ["error", {
    "allowUndefined": true,
    "allowNull": true,
    "allowAny": false,
    "typescript": {
      "strictNullChecks": true,
      "strictPropertyInitialization": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowUndefined`: Allow implicit `undefined` in types (default: true)
- `allowNull`: Allow implicit `null` in types (default: true)
- `allowAny`: Allow `any` type (default: false)
- `typescript.strictNullChecks`: Enable TypeScript's strict null checks (default: true)
- `typescript.strictPropertyInitialization`: Enable strict property initialization (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always declare when a value can be `null` or `undefined`
2. **Use Type Guards**: Implement proper type guards for null checks
3. **Leverage TypeScript**: Use built-in utility types like `NonNullable<T>`
4. **Avoid `any`**: Prefer more specific types over `any`
5. **Document Assumptions**: Add comments when you're certain a value can't be null/undefined

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- Can help identify potential performance issues with optional chaining

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's control flow analysis
- Supports type-only imports and exports
