# Prefer Signal Reads Rule Specification

This rule enforces explicit `.value` access when reading signal values in non-JSX contexts, making the code more explicit about signal access patterns.

## Core Functionality

The `prefer-signal-reads` rule ensures that signal values are explicitly accessed using `.value` in non-JSX contexts, while allowing direct usage in JSX where automatic `.value` access is handled.

## Plugin Scope

- Signal detection is based on variables created via `signal()` and `computed()` imported from `@preact/signals-react` (direct, aliased, or namespace).
- Optionally, variables matching a configurable suffix (default: `Signal`) are also treated as signals for convenience.
- Additional creator modules can be configured via `extraCreatorModules` (both named and namespace imports recognized).

## Handled Cases

### 1. Direct Signal Usage in Non-JSX Contexts

- Detects direct signal usage without `.value` in JavaScript/TypeScript code

### 2. Signal Usage in Functions

- Ensures `.value` is used when accessing signals in function bodies

### 3. Object and Array Destructuring

- Handles signal access in destructuring patterns

## Skipped Cases

The rule intelligently skips enforcing `.value` in these contexts:

1. **JSX Elements**: Direct signal usage is preferred (enforced by `prefer-signal-in-jsx`)

2. **Already Correct Usage**: When `.value` (or `.peek`) is already present

3. **Optional Chaining**: Expressions under optional chaining are skipped to avoid unsafe fixes

## Error Messages

- `useValueInNonJSX`: "Use .value to read the current value of the signal in non-JSX context"

## Autofix and Suggestions

- Autofix: Yes (fixable: `code`).
- Suggestions: No (`hasSuggestions: false`).
- Automatically adds `.value` to signal references in non-JSX contexts.
- Preserves the rest of the expression.
- Skips already-correct usages.
- Skips when under optional chaining or in non-read contexts.

## Options

```ts
type Options = [
  {
    performance?: PerformanceBudget;
    severity?: { useValueInNonJSX?: 'error' | 'warn' | 'off' };
    suffix?: string;
    consumers?: string[]; // APIs that accept Signal instances directly (default: ['subscribe'])
    typeAware?: boolean; // use TS types (when available) to confirm signal identifiers
    extraCreatorModules?: string[]; // modules exporting `signal`/`computed` creators
  }?
];
```

- `performance`: Enables performance tracking/budgeting.
- `severity`: Per-message severity control. Defaults to `error`.
- `suffix`: Custom suffix for detecting signal variable names.
- `consumers`: Additional function names that accept a Signal instance directly and should not be forced to `.value` (e.g., `subscribe`).
- `typeAware`: When true and type information is available, confirm signals via TS types (checks presence of `value`/`peek` members or `Signal`-like names) to reduce reliance on suffix heuristics.
- `extraCreatorModules`: Extra module specifiers that export `signal`/`computed` creators to be recognized in import analysis (in addition to the default `@preact/signals-react`).

## Benefits

1. **Explicit Code**: Makes signal access patterns clear and consistent
2. **Better Readability**: Distinguishes between signal objects and their values
3. **Prevents Bugs**: Reduces confusion between signal objects and their current values
4. **Consistent Patterns**: Aligns with common signal usage patterns

## When to Disable

This rule can be disabled for:

1. Codebases using custom signal implementations with different access patterns
2. Specific files where direct signal usage is preferred
3. When using JSX-like templates in non-JSX contexts

## Safety

The rule uses conservative heuristics (creator/import tracking, suffix matching, optional chaining bailouts) to avoid unsafe fixes. Optionally, when `typeAware: true`, it leverages the TypeScript checker (if available) to confirm signals.

## Configuration Example

```js
// eslint.config.js
export default [
  {
    rules: {
      'react-signals-hooks/prefer-signal-reads': [
        'error',
        {
          consumers: ['subscribe', 'bind'],
          extraCreatorModules: [],
          typeAware: true,
        },
      ],
    },
  },
];
```

```ts
// With typeAware: true, identifiers typed as Signal-like are recognized
declare const count: import('@preact/signals-react').Signal<number>;
const n = count; // ❌ Incorrect: will be auto-fixed to count.value
```
