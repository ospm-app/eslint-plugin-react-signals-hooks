# State Initialization Rule Specification

Ensures that all component state is properly initialized with default values, preventing `undefined` state that can lead to runtime errors and unpredictable behavior.

## Core Functionality

This rule enforces proper initialization of React component state by requiring explicit default values for all state variables. It helps catch potential runtime errors by ensuring state is always in a valid, predictable state.

## Handled Cases

### 1. Undefined State Initialization

- Detects `useState` calls without an initial value
- Flags state variables that could be `undefined`
- Identifies incomplete state initialization in class components

### 2. Optional Properties in State

- Enforces explicit `| undefined` for optional state properties
- Requires default values for all required state properties
- Handles complex state shapes with nested objects and arrays

### 3. Type Safety

- Works with TypeScript to ensure type-safe state initialization
- Validates that default values match the expected type
- Handles generic types and complex type definitions

## Error Messages

- `missingInitialValue`: "State variable '{{name}}' is missing an initial value. Provide a default value to prevent undefined state."
- `undefinedInType`: "Type '{{type}} | undefined' detected. Either provide a default value or explicitly include 'undefined' in the type."
- `invalidDefaultValue`: "Default value for '{{name}}' does not match the expected type '{{expectedType}}'."

## Auto-fix Suggestions

- Adds explicit `| undefined` to type definitions when appropriate
- Suggests adding default values for uninitialized state
- Converts implicit undefined to explicit type annotations

## Benefits

1. **Prevents Runtime Errors**: Catches potential `undefined` state issues at compile time
2. **Improves Type Safety**: Ensures type definitions accurately reflect possible state values
3. **Better Developer Experience**: Makes component behavior more predictable and easier to reason about
4. **Easier Debugging**: Reduces the need for null checks and defensive programming

## When to Disable

- When working with legacy code where adding defaults would be too disruptive
- In cases where undefined is a valid and intentional state
- During migrations when immediate fixes aren't feasible

## Configuration

```json
{
  "state-initialization": ["error", {
    "enforceDefaultProps": true,
    "allowUndefinedUnion": false,
    "ignorePatterns": ["^Test", "\\.test\\."],
    "types": {
      "requireDefaultValue": true,
      "allowUndefinedUnion": false
    }
  }]
}
```

### Options

- `enforceDefaultProps`: Require default values for all props (default: true)
- `allowUndefinedUnion`: Allow `| undefined` in type definitions (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore
- `types.requireDefaultValue`: Require default values for type annotations (default: true)
- `types.allowUndefinedUnion`: Allow `| undefined` in type annotations (default: false)

## Best Practices

1. **Always Initialize State**: Provide explicit default values for all state variables
2. **Be Explicit with Types**: Use `| undefined` when a value might be undefined
3. **Use Type Guards**: Implement proper type guards when working with potentially undefined values
4. **Prevent Implicit Any**: Avoid using `any` type which can hide initialization issues

## Performance Impact

- Minimal runtime overhead during linting
- No impact on runtime performance of the application
- Helps identify potential performance issues caused by unnecessary re-renders from undefined state

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with strict null checks
- Provides accurate type checking for state initialization
- Handles complex generic types and type inference
