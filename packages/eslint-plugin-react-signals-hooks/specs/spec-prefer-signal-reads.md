# Prefer Signal Reads Rule Specification

This rule enforces explicit `.value` access when reading signal values in non-JSX contexts, making the code more explicit about signal access patterns.

## Core Functionality

The `prefer-signal-reads` rule ensures that signal values are explicitly accessed using `.value` in non-JSX contexts, while allowing direct usage in JSX where automatic `.value` access is handled.

## Handled Cases

### 1. Direct Signal Usage in Non-JSX Contexts

- Detects direct signal usage without `.value` in JavaScript/TypeScript code

### 2. Signal Usage in Functions

- Ensures `.value` is used when accessing signals in function bodies

### 3. Object and Array Destructuring

- Handles signal access in destructuring patterns

## Skipped Cases

The rule intelligently skips enforcing `.value` in these contexts:

1. **JSX Elements**: Direct signal usage is preferred

2. **Already Correct Usage**: When `.value` is already present

## Error Messages

- `useValueInNonJSX`: "Use .value to read the current value of the signal in non-JSX context"

## Auto-fix Suggestions

- Automatically adds `.value` to signal references in non-JSX contexts
- Preserves the rest of the expression
- Skips already correct usages

## Benefits

1. **Explicit Code**: Makes signal access patterns clear and consistent
2. **Better Readability**: Distinguishes between signal objects and their values
3. **Prevents Bugs**: Reduces confusion between signal objects and their current values
4. **Consistent Patterns**: Aligns with common signal usage patterns

## When to Disable

This rule can be disabled for:

1. Codebases using custom signal implementations with different access patterns
2. Specific files where direct signal usage is preferred
3. When using JSX-like templates in non-JSX contexts

## Type Safety

The rule is type-aware and will only suggest fixes when the signal usage is safe, preventing potential runtime errors from incorrect `.value` access.
