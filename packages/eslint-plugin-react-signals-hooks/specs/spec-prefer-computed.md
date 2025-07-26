# Prefer Computed Rule Specification

This rule encourages using `computed()` from `@preact/signals-react` instead of `useMemo` when working with signals for better performance and automatic reactivity.

## Core Functionality

The `prefer-computed` rule detects `useMemo` hooks that depend on signals and suggests replacing them with `computed()` for better performance and automatic dependency tracking.

## Handled Cases

### 1. useMemo with Signal Dependencies

- Detects `useMemo` hooks that depend on signals
- Handles both direct signal access (`signal.value`) and signal references

### 2. Multiple Signal Dependencies

- Handles `useMemo` with multiple signal dependencies

### 3. Auto-import of `computed`

- Automatically adds the `computed` import if missing
- Preserves existing imports from `@preact/signals-react`

## Error Messages

- `preferComputedWithSignal`: "Prefer `computed()` over `useMemo` when using signal \"{{signalName}}\" for better performance and automatic reactivity."
- `preferComputedWithSignals`: "Prefer `computed()` over `useMemo` when using signals ({{signalNames}}) for better performance and automatic reactivity."
- `suggestComputed`: "Replace `useMemo` with `computed()`"
- `addComputedImport`: "Add `computed` import from @preact/signals-react"
- `suggestAddComputedImport`: "Add missing import for `computed`"

## Auto-fix Suggestions

- Replaces `useMemo` with `computed()`
- Adds the `computed` import if missing
- Preserves the computation function and its logic
- Removes the dependency array (not needed with `computed`)

## Benefits of `computed` over `useMemo`

1. **Automatic Dependency Tracking**: No need to manually specify dependencies
2. **Better Performance**: More efficient updates with fine-grained reactivity
3. **Simpler Code**: Removes the need for dependency arrays
4. **Consistent Behavior**: Works the same way in and out of components
5. **Better TypeScript Support**: Improved type inference and safety

## When to Use `useMemo` Instead

While `computed` is preferred for signal-based computations, `useMemo` is still useful for:

1. Non-signal computations that need memoization
2. Computations that depend on React state or props
3. Cases where you need to control when the computation runs
4. When integrating with third-party libraries that expect React's memoization

## Migration Tips

1. Look for `useMemo` with signal dependencies
2. Replace with `computed` and remove the dependency array
3. Remove any `useCallback` wrappers around the computation function
4. Update any dependencies that expect the memoized value
5. Test for any timing differences in updates
