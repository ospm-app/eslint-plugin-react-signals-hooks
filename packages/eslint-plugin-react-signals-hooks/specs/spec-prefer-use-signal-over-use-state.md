# Prefer useSignal Over useState Rule Specification

This rule encourages using `useSignal` from `@preact/signals-react` instead of `useState` for primitive values and simple state management, providing better performance and ergonomics.

## Plugin Scope

- Only signals imported from `@preact/signals-react` are considered.
- Autofix suggestions add or augment imports from `@preact/signals-react`.

## Core Functionality

The `prefer-use-signal-over-use-state` rule detects `useState` hooks that could be replaced with `useSignal` for simpler and more efficient state management with signals.

## Handled Cases

### 1. Primitive State

- Detects `useState` with primitive values (strings, numbers, booleans)

### 2. Simple Initializers

- Handles simple expressions in the initial state

### 3. Auto-import of `useSignal`

- Automatically adds the `useSignal` import if missing

## Configuration Options

### `ignoreComplexInitializers` (boolean)

- Default: `true`
- When `true`, skips non-primitive initializers (objects, arrays, function calls)
- When `false`, suggests `useSignal` for all `useState` usages

### `suffix` (string)

- Default: `"Signal"`
- Appended to the new variable name in the suggestion that rewrites the declaration

### `severity` (object)

- Controls per-message severity
- Keys: `{ "preferUseSignal": "error" | "warn" | "off" }`

### `performance` (object)

- Performance budgets and optional metrics logging
- Keys include: `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, and `maxOperations`

## Scope and Heuristics

- The rule only triggers inside components or custom hooks detected heuristically:
  - Functions with Capitalized names are treated as components
  - Variables with Capitalized names initialized to arrow/function expressions are treated as components
  - Functions whose names match `^use[A-Z]` are treated as hooks

## Error Messages

- `preferUseSignal`: "Prefer useSignal over useState for {{type}} values"

## Auto-fix Suggestions

- Provides non-destructive suggestions instead of an automatic fix:
  - Ensure `import { useSignal } from '@preact/signals-react'` exists (augment or insert)
  - Optionally replace the entire variable declaration with `const name{suffix} = useSignal(init)` when safe
- Note: This rule does not automatically remove setter usages elsewhere; follow-up refactors are required

## Benefits

1. **Simpler Code**: Removes the need for setter functions
2. **Better Performance**: More efficient updates with fine-grained reactivity
3. **Cleaner Syntax**: Direct value access without array destructuring
4. **Automatic Batching**: Multiple signal updates are automatically batched

## When to Use `useState` Instead

While `useSignal` is preferred for simple state, `useState` is still useful for:

1. Complex state objects that change together
2. State that's only used within a component
3. When using React DevTools for state inspection
4. When migrating existing code incrementally

## Migration Tips

1. Replace `useState` with `useSignal`
2. Remove setter functions and update values directly
3. Use `.value` to access signal values in JavaScript/TypeScript
4. Use signals directly in JSX (no `.value` needed)
5. For derived state, use `computed` instead of `useMemo` with signals

## Performance Considerations

Using `useSignal` can improve performance by:

1. Reducing unnecessary re-renders
2. Enabling fine-grained updates
3. Automatic batching of multiple updates
4. More efficient memory usage for simple state
