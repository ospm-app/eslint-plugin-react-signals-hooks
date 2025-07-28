# Prefer Signal Effect Rule Specification

This rule encourages using `effect()` from `@preact/signals` instead of `useEffect` when working with signal dependencies, providing better performance and automatic dependency tracking.

## Core Functionality

The `prefer-signal-effect` rule detects `useEffect` hooks that only depend on signals and suggests replacing them with the `effect()` function for more efficient reactivity.

## Handled Cases

### 1. Signal-Only Dependencies

- Detects `useEffect` hooks where all dependencies are signals
- Handles both direct signal references and `.value` access

### 2. Multiple Signal Dependencies

- Handles effects with multiple signal dependencies

### 3. Auto-import of `effect`

- Automatically adds the `effect` import if missing
- Preserves existing imports from `@preact/signals`

## Error Messages

- `preferSignalEffect`: "Prefer using `effect()` instead of `useEffect` for signal-only dependencies"
- `suggestEffect`: "Replace `useEffect` with `effect()`"
- `addEffectImport`: "Add `effect` import from @preact/signals"

## Auto-fix Suggestions

- Replaces `useEffect` with `effect()`
- Removes the dependency array (not needed with `effect`)
- Preserves the effect callback logic
- Adds the `effect` import if missing

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
