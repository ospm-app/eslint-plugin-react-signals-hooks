# Prefer Signal Effect Rule Specification

This rule encourages using `effect()` from `@preact/signals-react` instead of `useEffect`/`useLayoutEffect` when working with signal dependencies, providing better performance and automatic dependency tracking.

## Plugin Scope

- Signal sources are detected only from `@preact/signals-react`.
- Autofixes add/augment imports from `@preact/signals-react`.

## Core Functionality

The `prefer-signal-effect` rule detects `useEffect` and `useLayoutEffect` hooks that only depend on signals and suggests replacing them with the `effect()` function for more efficient reactivity.

## Handled Cases

### 1. Signal-Only Dependencies

- Detects `useEffect`/`useLayoutEffect` hooks where all dependencies are signals
- Handles both direct signal references and `.value` access

### 2. Multiple Signal Dependencies

- Handles effects with multiple signal dependencies

### 3. Auto-import of `effect`

- Automatically adds the `effect` import if missing
- Preserves existing imports from `@preact/signals-react`

Import source: `@preact/signals-react`.

### 4. Effects Without Dependency Array (Suggestion-Only)

- When an effect has no dependency array but the callback reads signals (via `.value`), the rule offers a suggestion to replace it with `effect()`.
- This is conservative and does not auto-fix.

## Error Messages

- `preferSignalEffect`: "Prefer using `effect()` instead of `useEffect` for signal-only dependencies"
- `suggestEffect`: "Replace `useEffect` with `effect()`"
- `addEffectImport`: "Add `effect` import from @preact/signals-react"
- `mixedDeps`: "Effect has mixed dependencies (signals and non-signals); consider splitting logic or using effect() for signal reads"

## Auto-fix Suggestions

- Replaces `useEffect`/`useLayoutEffect` with `effect()`
- Removes the dependency array (not needed with `effect`)
- Preserves the effect callback logic
- Adds the `effect` import if missing

### Autofix Constraints (Conservative)

- Only fixes when the callback has zero parameters
- Skips when the callback has a cleanup return
- Skips unknown/complex callee forms

### Suggestion-Only Cases

- Effects without a dependency array that read signals are reported with suggestions to migrate to `effect()`. No automatic fix is applied.

### Mixed Dependencies Policy (Configurable)

- When enabled via `reportMixedDeps: true`, the rule reports effects whose dependency array contains at least one signal and at least one non-signal.
- Message: `mixedDeps`.
- No auto-fix is provided.

## Benefits of `effect()` Over `useEffect`

1. **Automatic Dependency Tracking**: No need to manually specify dependencies
2. **Better Performance**: More efficient updates with fine-grained reactivity
3. **Simpler Code**: No dependency array to maintain
4. **Consistent Behavior**: Works the same way in and out of components
5. **Better Type Safety**: Reduced chance of dependency-related bugs

## When to Use `useEffect` Instead

While `effect()` is preferred for signal-based side effects, `useEffect` is still useful for:

1. Effects that depend on React state or props
2. Effects that need cleanup on component unmount
3. Effects that need to run only on mount/unmount
4. When integrating with third-party libraries that expect React's effect lifecycle

## Performance Considerations

Using `effect()` with signals can improve performance by:

1. Reducing unnecessary effect re-runs
2. Leveraging fine-grained reactivity
3. Minimizing dependency tracking overhead
4. Optimizing updates with signal batching

## Options

```jsonc
{
  "rules": {
    "react-signals-hooks/prefer-signal-effect": [
      "warn",
      {
        // Per-message severity overrides
        "severity": {
          "preferSignalEffect": "error" | "warn" | "off",
          "suggestEffect": "error" | "warn" | "off",
          "addEffectImport": "error" | "warn" | "off",
          "mixedDeps": "error" | "warn" | "off"
        },
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
