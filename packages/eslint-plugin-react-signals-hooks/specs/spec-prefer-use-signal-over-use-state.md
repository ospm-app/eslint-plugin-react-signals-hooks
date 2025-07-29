# Prefer useSignal Over useState Rule Specification

This rule encourages using `useSignal` from `@preact/signals-react` instead of `useState` for primitive values and simple state management, providing better performance and ergonomics.

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

## Error Messages

- `preferUseSignal`: "Prefer useSignal over useState for {{type}} values"

## Auto-fix Suggestions

- Replaces `useState` with `useSignal`
- Updates the variable name to include `Signal` suffix
- Removes the setter function
- Adds the `useSignal` import if missing
- Preserves the initial value

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
