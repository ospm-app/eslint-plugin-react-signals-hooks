# No Non-null Assertion Rule Specification

Prohibits the use of non-null assertions (`!`) in TypeScript, encouraging safer alternatives like proper null checks and type guards.

## Core Functionality

This rule identifies and removes non-null assertions (`!`), which can mask potential runtime errors. It promotes more robust code by requiring explicit null checks and proper type narrowing.

## Handled Cases

### 1. Non-null Assertion Operator

- Detects the use of the `!` operator for non-null assertions
- Identifies both property and element access patterns
- Handles complex expressions containing non-null assertions

### 2. Type Assertions

- Flags type assertions that hide potential null/undefined values
- Identifies unsafe `as` type assertions
- Validates the safety of type predicates

### 3. Control Flow Analysis

- Recognizes proper null checks in control flow
- Identifies redundant non-null assertions
- Validates type guards and type predicates

## Error Messages

- `noNonNullAssertion`: "Forbidden non-null assertion. Use proper null checks instead."
- `unsafeTypeAssertion`: "Unsafe type assertion. Add a proper type guard or null check."
- `unnecessaryAssertion": "Unnecessary non-null assertion. The type is already non-nullable."

## Auto-fix Suggestions

- Removes non-null assertions (`!`)
- Replaces with proper null checks using `if` statements
- Converts to optional chaining (`?.`) where appropriate
- Suggests type guards for complex cases

## Benefits

1. **Improved Type Safety**: Prevents runtime errors from incorrect assumptions
2. **Better Code Quality**: Encourages explicit handling of null/undefined cases
3. **Easier Refactoring**: Makes the code more maintainable and self-documenting
4. **Consistent Code Style**: Enforces a consistent approach to null handling

## When to Disable

- When working with third-party libraries that require non-null assertions
- In test files where strict null checking might be too verbose
- During migration of legacy code to stricter type checking

## Configuration

```json
{
  "no-non-null-assertion": ["error", {
    "allowInTypeAssertions": false,
    "allowAsThisParameter": false,
    "typescript": {
      "strictNullChecks": true,
      "strictPropertyInitialization": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowInTypeAssertions`: Allow non-null assertions in type assertions (default: false)
- `allowAsThisParameter`: Allow non-null assertions in `this` parameters (default: false)
- `typescript.strictNullChecks`: Enable TypeScript's strict null checks (default: true)
- `typescript.strictPropertyInitialization`: Enable strict property initialization (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use Type Guards**: Implement proper type guards instead of assertions
2. **Leverage Control Flow**: Let TypeScript narrow types through control flow analysis
3. **Prefer Optional Chaining**: Use `?.` for safe property access
4. **Be Explicit**: Use explicit null checks to handle potential null/undefined values
5. **Document Assumptions**: Add comments when you're certain a value can't be null/undefined

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve performance by catching potential null reference errors early

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's control flow analysis
- Supports type-only imports and exports
