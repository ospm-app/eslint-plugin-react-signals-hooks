# Explicit Function Return Type Rule Specification

Enforces explicit return types on functions and class methods, improving code clarity and catching potential type-related bugs early.

## Core Functionality

This rule requires explicit return type annotations for all functions, methods, and callbacks in TypeScript. It helps catch type-related bugs and makes the codebase more maintainable by making the expected return type explicit.

## Handled Cases

### 1. Function Declarations

- Detects missing return types in named functions
- Identifies implicit `any` return types
- Handles generator functions and async functions

### 2. Arrow Functions

- Flags arrow functions without explicit return types
- Handles both single-expression and block body arrow functions
- Identifies implicit returns in arrow functions

### 3. Methods and Properties

- Checks class methods and accessors
- Validates object literal method shorthand
- Handles method overrides and implementations

## Error Messages

- `missingReturnType`: "Missing return type on function '{{name}}'."
- `missingReturnTypeAnon": "Missing return type on anonymous function."
- `implicitAnyReturn": "Function lacks explicit return type annotation, implicitly has an 'any' return type."

## Auto-fix Suggestions

- Adds explicit return type annotations
- Preserves existing type annotations
- Handles complex type expressions
- Maintains code formatting and style

## Benefits

1. **Improved Type Safety**: Catches potential type-related bugs early
2. **Better Code Documentation**: Makes function contracts explicit
3. **Easier Refactoring**: Simplifies changing function implementations
4. **Enhanced IDE Support**: Improves code completion and documentation

## When to Disable

- For test files where conciseness is prioritized
- In prototype or experimental code
- When working with third-party type definitions

## Configuration

```json
{
  "explicit-function-return-type": ["error", {
    "allowExpressions": false,
    "allowTypedFunctionExpressions": true,
    "allowHigherOrderFunctions": true,
    "allowDirectConstAssertionInArrowFunctions": true,
    "typescript": {
      "noImplicitAny": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowExpressions`: Allow functions within expressions (default: false)
- `allowTypedFunctionExpressions`: Allow typed function expressions (default: true)
- `allowHigherOrderFunctions`: Allow functions that return functions (default: true)
- `allowDirectConstAssertionInArrowFunctions`: Allow arrow functions with direct const assertions (default: true)
- `typescript.noImplicitAny`: Enable TypeScript's noImplicitAny (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always declare return types for all functions
2. **Use Type Aliases**: For complex return types, consider using type aliases
3. **Document Complex Types**: Add JSDoc for complex return types
4. **Keep Functions Focused**: Smaller, focused functions make return types more manageable
5. **Leverage Type Inference**: For simple cases, let TypeScript infer the return type

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May slightly increase initial compilation time

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's control flow analysis
- Supports type-only imports and exports
