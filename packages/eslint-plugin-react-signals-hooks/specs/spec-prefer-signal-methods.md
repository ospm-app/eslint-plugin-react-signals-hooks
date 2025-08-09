# Prefer Signal Methods Rule Specification

This rule enforces consistent and optimal usage of signal methods (`.value`, `.peek()`) in different contexts to ensure proper reactivity patterns.

## Core Functionality

The `prefer-signal-methods` rule ensures that signal access methods are used appropriately in different contexts to optimize reactivity and prevent common pitfalls.

## Plugin Scope

- Signal creator detection is scoped to `@preact/signals-react` only.
- The rule recognizes `signal()` and `computed()` created in-file via direct, aliased, or namespace imports from `@preact/signals-react`.

## Handled Cases

### 1. Direct Signal Usage in JSX

- Enforces direct signal usage in JSX without `.value`

### 2. Signal Access in Effects

- Suggests using `.peek()` when reading signal values in effects without subscribing

### 3. Non-Reactive Contexts

- Recommends `.peek()` when reading signal values without needing reactivity

### 4. Unnecessary `.peek()` in JSX

- Removes unnecessary `.peek()` calls in JSX

## Error Messages

- `usePeekInEffect`: "Use signal.peek() to read the current value without subscribing to changes in this effect"
- `useValueInJSX`: "Use the signal directly in JSX instead of accessing .value"
- `preferDirectSignalUsage`: "Use the signal directly in JSX instead of .peek()"
- `preferPeekInNonReactiveContext`: "Prefer .peek() when reading signal value without using its reactive value"

## Autofix and Suggestions

- Autofix: Yes (fixable: `code`).
- Suggestions: No (`hasSuggestions: false`).
- Removes unnecessary `.value` in JSX contexts.
- Replaces `.value` with `.peek()` in non-reactive contexts.
- Removes unnecessary `.peek()` in JSX.
- Adds appropriate method calls where needed.

## Options

```ts
type Options = [
  {
    performance?: PerformanceBudget;
    severity?: {
      usePeekInEffect?: 'error' | 'warn' | 'off';
      useValueInJSX?: 'error' | 'warn' | 'off';
      preferDirectSignalUsage?: 'error' | 'warn' | 'off';
      preferPeekInNonReactiveContext?: 'error' | 'warn' | 'off';
    };
    suffix?: string;
  }?
];
```

- `performance`: Enables performance tracking/budgeting.
- `severity`: Per-message severity controls. Defaults to `error`.
- `suffix`: Custom suffix for detecting signal variable names.

## Best Practices

1. **In JSX**: Use signals directly without `.value` or `.peek()`
2. **In Effects**: Use `.peek()` when you only need the current value
3. **In Callbacks**: Use `.peek()` for one-time reads in event handlers
4. **In Computations**: Use direct access (`.value`) when reactivity is needed

## When to Use Which Method

| Context | Method | Example |
|---------|--------|---------|
| JSX rendering | Direct | `<div>{signal}</div>` |
| Effects (no subscription needed) | `.peek()` | `signal.peek()` |
| Computations (needs reactivity) | `.value` | `const double = signal.value * 2` |
| Event handlers | `.peek()` for one-time read | `onClick={() => handle(signal.peek())}` |
| Dependency arrays | Direct | `[signal]` (not `[signal.value]`) |

## Performance Impact

Using the appropriate signal access method can improve performance by:

1. Reducing unnecessary subscriptions
2. Minimizing re-renders
3. Optimizing effect dependencies
4. Preventing memory leaks from unused subscriptions
