# Prefer useSignalRef Over useRef Rule Specification

This rule encourages using `useSignalRef` from `@preact/signals-react` instead of React's `useRef` when the ref's `.current` property is read in reactive contexts. `useSignalRef` provides a reactive alternative that automatically tracks dependencies when used in effects or computed values.

## Plugin Scope

- Only APIs from `@preact/signals-react` are considered for detection and autofix.
- Autofixes add or augment imports from `@preact/signals-react`.

## Core Functionality

This rule identifies `useRef` declarations where the `.current` property is read in reactive contexts (like effects, computed values, or during render) and suggests converting them to `useSignalRef`. This helps ensure proper reactivity when the ref's value is used in reactive computations.

## Handled Cases

### 1. Basic useRef with .current access in effects

- Detects when `ref.current` is read inside `useEffect`, `useSignalEffect`, or other reactive contexts
- Suggests converting to `useSignalRef` for automatic dependency tracking

### 2. useRef with initial value

- Handles `useRef(initialValue)` patterns
- Properly converts the initial value to `useSignalRef(initialValue)`

### 3. useRef with type parameters

- Preserves TypeScript type parameters during conversion
- Maintains type safety when suggesting fixes

### 4. Multiple refs in same component

- Handles components with multiple `useRef` declarations
- Only converts refs that are actually used reactively

## Error Messages

- `preferSignalRef`: "Prefer useSignalRef over useRef for reactive refs"
- `addSignalRefImport`: "Add useSignalRef import from @preact/signals-react"

## Auto-fix Suggestions

The auto-fix will:

1. Convert `useRef` to `useSignalRef`
2. Remove `.current` property access when reading the value
3. Keep `.current` when mutating the value (as required by signals)
4. Add the necessary import if not already present

## Benefits

1. **Automatic Dependency Tracking**: `useSignalRef` automatically tracks when its value is read in effects or computed values
2. **Simpler Updates**: No need to manually manage dependencies when the ref value is used reactively
3. **Consistent Reactivity**: Ensures consistent behavior between ref values and other reactive state
4. **Better Performance**: Reduces unnecessary effect re-runs by properly tracking dependencies

## When to Disable

Disable this rule when:

1. The ref is only used for imperative operations and never read in reactive contexts
2. You need the exact behavior of React's `useRef` without reactivity
3. The ref is passed to a component that expects a standard React ref

## Implementation Notes

The rule analyzes the usage pattern of each `useRef` declaration to determine if it would benefit from being converted to `useSignalRef`. It checks if the `.current` property is read in contexts where reactivity would be beneficial.

## Edge Cases

- **Forwarded Refs**: The rule should not convert refs that are forwarded to child components
- **Callback Refs**: The rule should not convert callback refs or ref objects used with `React.forwardRef`
- **Library Compatibility**: The rule should not convert refs that are passed to third-party components that expect standard React refs

## Performance Considerations

- The rule only converts refs that are actually used in reactive contexts
- The auto-fix is designed to be non-disruptive and only makes changes that improve reactivity
- The rule is opt-in and can be configured per-project based on performance needs

## Related Rules

- `prefer-use-signal-over-use-state`: For converting `useState` to `useSignal`
- `no-mutation-in-render`: For preventing direct signal mutations during render
- `require-use-signals`: For ensuring proper signal usage in components
