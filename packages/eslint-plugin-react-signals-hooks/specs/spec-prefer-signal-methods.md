# Prefer Signal Methods Rule Specification

This rule enforces consistent and optimal usage of signal methods (`.value`, `.peek()`) in non-JSX contexts to ensure proper reactivity patterns. JSX-related method usage is enforced by `prefer-signal-in-jsx` to avoid duplicate diagnostics.

## Core Functionality

The `prefer-signal-methods` rule ensures that signal access methods are used appropriately in different contexts to optimize reactivity and prevent common pitfalls.

## Plugin Scope

- Signal creator detection is based on imports from `@preact/signals-react` by default.
- The rule recognizes `signal()` and `computed()` created in-file via direct, aliased, or namespace imports.
- You can extend detection to additional modules via the `extraCreatorModules` option.

## Handled Cases

### 1. Signal Access in Effects

- Suggests using `.peek()` when reading signal values in effects without subscribing
- Effect contexts include React's `useEffect`/`useLayoutEffect` and any additional configured callees via `reactiveEffectCallees`.
- When `effectsSuggestionOnly` is true, the rule provides suggestions instead of applying autofixes in effect contexts.

### 2. Non-Reactive Contexts

- Recommends `.peek()` when reading signal values without needing reactivity

### 3. JSX Cases — Delegated

- JSX-specific enforcement (removing `.value`/`.peek()` in JSX) is handled by `prefer-signal-in-jsx`.

## Error Messages

- `usePeekInEffect`: "Use signal.peek() to read the current value without subscribing to changes in this effect"
- `preferPeekInNonReactiveContext`: "Prefer .peek() when reading signal value without using its reactive value"

## Autofix and Suggestions

- Autofix: Yes (fixable: `code`).
- Suggestions: Yes (`hasSuggestions: true`).
- By default, replaces `.value` with `.peek()` in effects and non-reactive contexts, and adds `.peek()` to identifiers in effects where a one-time read is intended.
- When `effectsSuggestionOnly: true`, effect-context fixes are emitted as suggestions (no auto-apply).
- JSX-related fixes are performed by `prefer-signal-in-jsx`.

## Options

```ts
type Options = [
  {
    performance?: PerformanceBudget;
    severity?: {
      usePeekInEffect?: 'error' | 'warn' | 'off';
      preferPeekInNonReactiveContext?: 'error' | 'warn' | 'off';
    };
    suffix?: string;
    extraCreatorModules?: string[]; // additional modules exporting signal/computed
    reactiveEffectCallees?: string[]; // additional callee names treated as effect context
    effectsSuggestionOnly?: boolean; // provide suggestions (no autofix) inside effect contexts
    typeAware?: boolean; // use TS type info (when available) to confirm signal identifiers
  }?
];
```

- `performance`: Enables performance tracking/budgeting.
- `severity`: Per-message severity controls. Defaults to `error`.
- `suffix`: Custom suffix for detecting signal variable names.
- `extraCreatorModules`: Extend creator detection beyond `@preact/signals-react` (e.g., custom wrappers). Recognizes both named and namespace imports.
- `reactiveEffectCallees`: Treat additional callee names (e.g., `customEffect`) as effect contexts for `.peek()` recommendations.
- `effectsSuggestionOnly`: Convert effect-context fixes into suggestions to avoid automatic code changes in effects.
- `typeAware`: When true and type information is available, confirm signals via TS types (checks presence of `value`/`peek` members or `Signal`-like types) to reduce reliance on suffix heuristics.

## Best Practices

1. **In JSX**: Use signals directly without `.value` or `.peek()` (enforced by `prefer-signal-in-jsx`)
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

## Configuration Examples

### Extend effect contexts with `reactiveEffectCallees`

```js
// eslint.config.js (excerpt)
import plugin from 'eslint-plugin-react-signals-hooks';

export default [
  {
    rules: {
      'react-signals-hooks/prefer-signal-methods': [
        'error',
        { reactiveEffectCallees: ['customEffect'] },
      ],
    },
  },
];
```

```ts
// Incorrect (will suggest .peek())
customEffect(() => {
  doSomething(countSignal.value);
});
```

### Suggestion-only in effects with `effectsSuggestionOnly`

```js
// eslint.config.js
export default [
  {
    rules: {
      'react-signals-hooks/prefer-signal-methods': [
        'error',
        { effectsSuggestionOnly: true },
      ],
    },
  },
];
```

```ts
// In useEffect, a suggestion (not an autofix) will be offered to use .peek()
useEffect(() => {
  void log(countSignal.value);
}, []);
```

### Type-aware confirmation with `typeAware`

```js
// eslint.config.js
export default [
  {
    rules: {
      'react-signals-hooks/prefer-signal-methods': [
        'error',
        { typeAware: true },
      ],
    },
  },
];
```

```ts
// With type-aware enabled, identifiers typed as Signal-like are recognized
declare const count: import('@preact/signals-react').Signal<number>;
useEffect(() => {
  void count.value; // flagged (suggest .peek())
}, []);
```

## Performance Impact

Using the appropriate signal access method can improve performance by:

1. Reducing unnecessary subscriptions
2. Minimizing re-renders
3. Optimizing effect dependencies
4. Preventing memory leaks from unused subscriptions
