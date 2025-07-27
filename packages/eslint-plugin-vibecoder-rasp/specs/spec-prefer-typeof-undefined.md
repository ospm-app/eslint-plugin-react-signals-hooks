# Prefer Typeof Undefined Rule Specification

Enforces the use of `typeof` for `undefined` checks, making the code more reliable and preventing potential issues with undefined variables.

## Core Functionality

This rule ensures that checks for `undefined` values use the `typeof` operator, which is the safest way to check for `undefined` in JavaScript/TypeScript. It helps prevent ReferenceErrors that can occur when checking undeclared variables.

## Handled Cases

### 1. Direct Undefined Comparisons

- Detects direct equality checks with `undefined` (`x === undefined`)
- Identifies loose equality checks (`x == undefined`)
- Handles negated checks (`x !== undefined`)

### 2. Variable Declarations

- Flags variable declarations that might be shadowing `undefined`
- Identifies potential issues with `undefined` being redefined
- Handles block-scoped variables and function parameters

### 3. Type Guards

- Detects type guards that could be more safely written with `typeof`
- Identifies potential issues with `in` operator and `hasOwnProperty`
- Handles optional chaining and nullish coalescing

## Error Messages

- `useTypeofUndefined": "Use`typeof {{name}} === 'undefined'` instead of direct `undefined` comparison."
- `unsafeUndefinedCheck": "Unsafe undefined check. Use`typeof` to avoid ReferenceErrors."
- `preferStrictEquality": "Use strict equality (`===`) with`typeof` checks."

## Auto-fix Suggestions

- Converts direct `undefined` checks to use `typeof`
- Updates loose equality to strict equality
- Preserves existing comments and formatting
- Handles negated conditions correctly

## Benefits

1. **Improved Safety**: Prevents ReferenceErrors with undeclared variables
2. **Consistent Code Style**: Enforces a consistent approach to undefined checks
3. **Better Type Inference**: Works well with TypeScript's type narrowing
4. **More Reliable Code**: Reduces the chance of subtle bugs

## When to Disable

- When working with APIs that might return `null` instead of `undefined`
- In code that needs to run in environments where `undefined` is guaranteed to be the global `undefined`
- During migration of legacy code

## Configuration

```json
{
  "prefer-typeof-undefined": ["error", {
    "checkGlobalUndefined": true,
    "checkLocalVariables": true,
    "typescript": {
      "strictNullChecks": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `checkGlobalUndefined`: Check for global `undefined` usage (default: true)
- `checkLocalVariables`: Check for local variable shadowing of `undefined` (default: true)
- `typescript.strictNullChecks`: Enable TypeScript's strict null checks (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Always Use `typeof`**: For maximum safety, always use `typeof` when checking for `undefined`
2. **Prefer Strict Equality**: Use `===` instead of `==` for type safety
3. **Consider Optional Chaining**: For nested properties, consider using optional chaining (`?.`)
4. **Document Edge Cases**: Add comments for non-obvious undefined checks
5. **Test Edge Cases**: Write tests for functions that handle `undefined` values

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve code reliability in complex applications

## TypeScript Integration

- Works with TypeScript's type system
- Integrates with TypeScript's control flow analysis
- Supports type guards and type predicates
- Works with both JavaScript and TypeScript files
