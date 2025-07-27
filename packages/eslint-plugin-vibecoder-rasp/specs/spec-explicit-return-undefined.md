# Explicit Return Undefined Rule Specification

Enforces explicit `undefined` in function return types when a function can return `undefined`, improving code clarity and type safety.

## Core Functionality

This rule requires that when a function can return `undefined`, its return type must explicitly include `undefined` in the type annotation. This makes the function's contract clearer and helps prevent potential runtime errors from unexpected `undefined` returns.

## Handled Cases

### 1. Implicit Undefined Returns

- Detects functions that can implicitly return `undefined`
- Identifies early returns without explicit `return undefined`
- Handles arrow functions with implicit returns

### 2. Explicit Return Types

- Flags missing `| undefined` in return type annotations
- Identifies functions with `void` return type that return `undefined`
- Handles union types and type aliases

### 3. Control Flow Analysis

- Analyzes all code paths to determine possible return values
- Identifies unreachable code paths
- Handles conditional returns and throw statements

## Error Messages

- `missingUndefinedReturn": "Function can return`undefined`. Add`| undefined` to the return type."
- `unnecessaryUndefinedReturn": "Unnecessary`| undefined` in return type. The function always returns a value."
- `inconsistentReturn": "Inconsistent return types. All code paths must return the same type."

## Auto-fix Suggestions

- Adds `| undefined` to return types when needed
- Removes unnecessary `| undefined` from return types
- Converts `void` to `undefined` when appropriate
- Preserves existing type annotations and formatting

## Benefits

1. **Improved Type Safety**: Makes potential `undefined` returns explicit
2. **Better Code Clarity**: Clearly documents when a function might not return a value
3. **Easier Debugging**: Reduces unexpected `undefined` values
4. **Consistent Code Style**: Enforces a consistent approach to return types

## When to Disable

- In test files where conciseness is prioritized
- When working with third-party type definitions
- During migration of existing codebases

## Configuration

```json
{
  "explicit-return-undefined": ["error", {
    "allowVoidReturns": false,
    "allowImplicitVoid": true,
    "typescript": {
      "strictNullChecks": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowVoidReturns`: Allow `void` return type for functions that return `undefined` (default: false)
- `allowImplicitVoid`: Allow implicit `void` returns (default: true)
- `typescript.strictNullChecks`: Enable TypeScript's strict null checks (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always include `| undefined` when a function can return `undefined`
2. **Use `void` Carefully**: Prefer `undefined` over `void` for return types
3. **Check All Code Paths**: Ensure all code paths return the expected type
4. **Document Edge Cases**: Add comments for non-obvious return value possibilities
5. **Test Edge Cases**: Write tests for functions that can return `undefined`

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve development experience by catching potential issues early

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's control flow analysis
- Supports type-only imports and exports
