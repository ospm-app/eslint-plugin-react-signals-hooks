# Explicit Undefined Rule Specification

Enforces explicit `| undefined` in TypeScript type annotations for optional properties and parameters, making the code's intent clearer and improving type safety.

## Core Functionality

This rule ensures that all optional properties and parameters explicitly include `| undefined` in their type annotations, except when a default value is provided. It helps prevent subtle bugs by making the optional nature of values more visible in the code.

## Handled Cases

### 1. Optional Properties

- Detects interface/type properties marked with `?` but missing `| undefined`
- Identifies class properties that might be undefined
- Handles both object types and index signatures

### 2. Function Parameters

- Flags optional parameters without explicit `| undefined`
- Identifies destructured parameters with default values
- Handles rest parameters and parameter properties

### 3. Type Definitions

- Validates type aliases and interfaces
- Checks generic type parameters
- Handles mapped and conditional types

## Error Messages

- `missingUndefined`: "Optional property '{{name}}' should include '| undefined' in its type."
- `unnecessaryUndefined`: "'| undefined' is unnecessary because a default value is provided."
- `inconsistentOptional": "Inconsistent optional marking. Use either '{{name}}?' or '{{name}}: Type | undefined'."

## Auto-fix Suggestions

- Adds `| undefined` to optional properties and parameters
- Removes redundant `?` when `| undefined` is present
- Preserves existing type annotations and formatting
- Handles complex type expressions

## Benefits

1. **Improved Type Safety**: Makes the optional nature of values explicit
2. **Better Code Clarity**: Clearly communicates which values might be undefined
3. **Easier Refactoring**: Makes it easier to change between optional and required properties
4. **Consistent Code Style**: Enforces a consistent approach to optional types

## When to Disable

- When working with third-party type definitions
- In test files where strict type checking might be too verbose
- During migration of existing code to stricter type checking

## Configuration

```json
{
  "explicit-undefined": ["error", {
    "checkParameters": true,
    "checkProperties": true,
    "checkIndexSignatures": false,
    "typescript": {
      "strictNullChecks": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `checkParameters`: Check function parameters (default: true)
- `checkProperties`: Check object/interface properties (default: true)
- `checkIndexSignatures`: Check index signatures (default: false)
- `typescript.strictNullChecks`: Enable TypeScript's strict null checks (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Explicit**: Always include `| undefined` for optional values
2. **Use Default Values**: Provide defaults when a meaningful one exists
3. **Avoid `any`**: Prefer more specific types over `any`
4. **Document Assumptions**: Add comments when you're certain a value can't be undefined
5. **Use Type Guards**: Implement proper type guards for runtime checks

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve development experience by catching potential issues early

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Works with all TypeScript features including generics and conditional types
- Integrates with TypeScript's control flow analysis
- Supports type-only imports and exports
