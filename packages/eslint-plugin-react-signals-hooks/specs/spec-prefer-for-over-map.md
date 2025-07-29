# Prefer For Over Map Rule Specification

This rule encourages using the `<For>` component from `@preact/signals-react` instead of `.map()` for rendering signal arrays, providing better performance and reactivity.

## Core Functionality

The `prefer-for-over-map` rule detects `.map()` calls on signal arrays and suggests replacing them with the `<For>` component for more efficient rendering of reactive arrays.

## Handled Cases

### 1. Signal Array Mapping

- Detects `.map()` calls on signal arrays
- Handles both direct signal access and `.value` access

### 2. Different Callback Types

- Handles various callback styles:
  - Arrow functions
  - Function expressions
  - Inline JSX
  - Identifier references

### 3. Complex Mappings

- Preserves complex mapping logic
- Handles both block and concise arrow functions

## Auto-fix Suggestions

- Replaces `.map()` calls with `<For>` component
- Automatically adds the `For` import if missing
- Preserves the callback logic and parameters
- Handles both single-parameter and index-based callbacks

## Error Messages

- `preferForOverMap`: "Prefer using the `<For>` component instead of `.map()` for better performance with signal arrays."
- `suggestForComponent`: "Replace `.map()` with `<For>` component"
- `addForImport`: "Add `For` import from @preact/signals-react"

## Benefits of `<For>` Over `.map()`

1. **Better Performance**: More efficient updates with fine-grained reactivity
2. **Automatic Keying**: No need to manually specify keys
3. **Stable References**: Maintains component instances between renders
4. **Simpler Code**: More declarative and readable JSX

## When to Use `.map()` Instead

While `<For>` is preferred for signal arrays, `.map()` is still useful for:

1. Non-reactive arrays
2. Cases where you need the full array API
3. When integrating with third-party components that expect array inputs
4. Complex transformations that don't directly map to JSX

## Auto-import

The rule can automatically add the `For` import if it's not already present

## Performance Considerations

Using `<For>` with signals can significantly improve performance by:

1. Reducing unnecessary re-renders
2. Minimizing DOM operations
3. Leveraging fine-grained reactivity
4. Optimizing list updates with keyed reconciliation
