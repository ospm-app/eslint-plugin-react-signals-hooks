# Prefer Show Over Ternary Rule Specification

This rule encourages using the `<Show>` component from `@preact/signals-react` instead of ternary operators for conditional rendering with signals, providing better performance and readability.

## Plugin Scope

- Signal sources are detected only from `@preact/signals-react`.
- Autofixes add/augment imports from `@preact/signals-react`.

## Core Functionality

The `prefer-show-over-ternary` rule detects ternary operators used for conditional rendering with signals and suggests replacing them with the `<Show>` component for more efficient rendering and better code organization.

## Handled Cases

### 1. Basic Ternary Conditional Rendering

- Detects ternary operators in JSX
- Handles both simple and complex conditions

### 2. Conditional Rendering Without Else

- Handles ternary operators without an else clause

### 3. Complex Conditions

- Detects nested ternaries and complex conditions
- Respects the `minComplexity` option to avoid unnecessary conversions

## Configuration Options

### `minComplexity` (number)

Minimum complexity score required to trigger the rule

- Default: `2`
- Example: Set to `3` to only suggest for more complex conditions

## Error Messages

- `preferShowOverTernary`: "Prefer using the `<Show>` component instead of ternary for better performance with signal conditions."
- `suggestShowComponent`: "Replace ternary with `<Show>` component"
- `addShowImport`: "Add `Show` import from @preact/signals-react"

## Auto-fix Suggestions

- Replaces ternary operators with `<Show>` components
- Handles both simple and complex conditions
- Preserves the original component structure
- Automatically adds the `Show` import if missing

Import source: `@preact/signals-react`.

## Benefits of `<Show>` Over Ternary

1. **Better Performance**: More efficient updates with fine-grained reactivity
2. **Improved Readability**: More declarative and easier to understand
3. **Consistent Pattern**: Aligns with other signal-based patterns
4. **Better TypeScript Support**: Improved type inference and safety
5. **Easier Maintenance**: Simpler to modify and extend

## When to Use Ternary Instead

While `<Show>` is preferred for signal-based conditions, ternary operators are still useful for:

1. Simple, inline conditions
2. Non-reactive conditions
3. When the condition is not signal-based
4. In performance-critical code where the ternary is more performant

## Auto-import

The rule can automatically add the `Show` import if it's not already present. The import source is `@preact/signals-react`.

## Performance Considerations

Using `<Show>` with signals can improve performance by:

1. Reducing unnecessary re-renders
2. Leveraging fine-grained reactivity
3. Optimizing component updates
4. Minimizing DOM operations

## Options

```jsonc
{
  "rules": {
    "react-signals-hooks/prefer-show-over-ternary": [
      "warn",
      {
        // Rule-specific setting
        "minComplexity": 2,
        // Per-message severity overrides
        "severity": {
          "preferShowOverTernary": "error" | "warn" | "off",
          "suggestShowComponent": "error" | "warn" | "off",
          "addShowImport": "error" | "warn" | "off"
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
