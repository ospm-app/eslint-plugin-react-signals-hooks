# Prefer For Over Map Rule Specification

This rule encourages using the `<For>` component from `@preact/signals-react/utils` instead of `.map()` for rendering signal arrays, providing better performance and reactivity.

## Plugin Scope

- Signal sources are detected only from `@preact/signals-react`.
- Autofixes add/augment `For` import from `@preact/signals-react/utils`.

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

## Auto-fix Behavior

- Replaces `.map()` calls with `<For>` component
- Automatically adds the `For` import from `@preact/signals-react/utils` if missing
- Passes the signal itself to `each` (not `.value`)
- Preserves TypeScript parameter types. If the callback uses object destructuring, converts it to a single typed `item` parameter and rewrites references in the body to `item.prop` form
- Replaces the enclosing `JSXExpressionContainer` when applicable to avoid extra `{}` around the generated `<For>`
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

The rule can automatically add the `For` import if it's not already present. The import source is `@preact/signals-react/utils`.

## Performance Considerations

Using `<For>` with signals can significantly improve performance by:

1. Reducing unnecessary re-renders
2. Minimizing DOM operations
3. Leveraging fine-grained reactivity
4. Optimizing list updates with keyed reconciliation

## Options

```jsonc
{
  "rules": {
    "react-signals-hooks/prefer-for-over-map": [
      "warn",
      {
        // Per-message severity overrides
        "severity": {
          "preferForOverMap": "error" | "warn" | "off",
          "suggestForComponent": "error" | "warn" | "off",
          "addForImport": "error" | "warn" | "off"
        },
        // Suffix used by identifier heuristic (if applicable)
        "suffix": "Signal",
        // Performance budgets/metrics
        "performance": {
          "maxTime": 1000,
          "maxMemory": 100,
          "maxNodes": 5000,
          "maxOperations": {},
          "enableMetrics": false,
          "logMetrics": false
        }
      }
    ]
  }
}
```
