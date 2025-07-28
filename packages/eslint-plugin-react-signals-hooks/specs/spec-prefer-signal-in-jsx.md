# Prefer Signal in JSX Rule Specification

This rule enforces direct usage of signals in JSX without the `.value` accessor, making the code more concise and leveraging the automatic `.value` access in JSX contexts.

## Core Functionality

The `prefer-signal-in-jsx` rule detects unnecessary `.value` access on signals within JSX and suggests using the signal directly for cleaner and more idiomatic code.

## Handled Cases

### 1. Direct Signal Usage in JSX

- Detects and removes redundant `.value` access in JSX

### 2. Nested JSX Expressions

- Handles signals in nested JSX expressions

### 3. Complex JSX Structures

- Works with complex JSX structures and components

## Skipped Cases

The rule intelligently skips `.value` access in the following scenarios:

1. **Function Props**: When inside function props or event handlers

2. **Complex Expressions**: When part of complex expressions

3. **JSX Attributes**: When inside JSX attribute values

4. **Member Expressions**: When part of a member expression chain

## Error Messages

- `preferDirectSignalUsage`: "Use the signal directly in JSX instead of accessing .value"

## Auto-fix Suggestions

- Removes `.value` access from signals in JSX
- Preserves the rest of the expression structure
- Only modifies direct signal usage within JSX contexts

## Benefits

1. **Cleaner Code**: More concise JSX without unnecessary `.value` access
2. **Better Readability**: Signals look like regular values in the view layer
3. **Consistent Pattern**: Aligns with framework conventions for signal usage
4. **Easier Refactoring**: Simplifies moving between template and logic code

## When to Use `.value`

While this rule encourages direct signal usage in JSX, you still need `.value` in these cases:

1. **In JavaScript/TypeScript code** outside of JSX
2. **In function bodies** and event handlers
3. **When passing signals** to non-reactive functions
4. **In complex expressions** where automatic unwrapping doesn't apply

## Type Safety

The rule is type-aware and will only suggest fixes when the signal usage is safe, avoiding potential runtime errors from incorrect `.value` removal.
