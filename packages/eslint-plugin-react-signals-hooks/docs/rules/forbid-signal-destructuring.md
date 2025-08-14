# `forbid-signal-destructuring`

Forbids destructuring that creates new bindings from a signal reference. Prefer explicit `.value` access or pass the original signal.

> This avoids confusing aliases and preserves clear, reactive usage of signals.

## ❌ Incorrect

```ts
import { signal } from '@preact/signals-react';

const countSignal = signal(0);

// Destructuring a signal object
const { value } = countSignal; // ⛔️

// Destructuring directly from a signal() call
const { value: v } = signal(1); // ⛔️

// Destructuring from containers that include signals
const container = { a: signal(1) };
const { a } = container; // ⛔️

const arr = [signal(0)];
const [first] = arr; // ⛔️

// Destructuring assignment
({ value } = countSignal); // ⛔️
```

## ✅ Correct

```ts
import { signal } from '@preact/signals-react';

const countSignal = signal(0);

// Read from the signal explicitly
const v = countSignal.value; // ✅

// Pass the signal reference directly to consumers that expect a signal
useCounter(countSignal); // ✅

// Destructure from plain values, not signals
const obj = { n: countSignal.value };
const { n } = obj; // ✅

// Access specific members without creating new signal aliases
const name = userSignal.value.name; // ✅
```

## Options

The rule accepts an options object with the following properties:

- `suffix` (string, default: `"Signal"`)
  - If a variable name ends with this suffix, it is treated as signal-like for detection heuristics.
- `creatorNames` (string[], default: `[]`)
  - Additional callee names that should be treated as signal creators (e.g., project-specific wrappers). Example: `['createSig', 'makeSignal']`.
- `enableSuffixHeuristic` (boolean, default: `false`)
  - When enabled, identifiers that end with the configured `suffix` may be treated as signal-like in certain cases. The heuristic is narrowed to only activate if a known signal creator import or namespace is present in the file.
- `severity` (object)
  - Map of message IDs to severity overrides. Supports `"error" | "warn" | "off"` for `destructureSignal`.
- `performance` (object)
  - Performance budget for the plugin's internal metrics. Keys include `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, and `maxOperations`.

Notes:

- Suggestions are enabled for this rule (no autofix). Future versions may add guided suggestions on how to rewrite destructuring to `.value` reads.
- When `enableSuffixHeuristic` is enabled, the heuristic only activates if a known signal creator import or namespace is present in the file to reduce false positives.

### Example configuration (Flat Config)

```js
import reactSignalsHooks from '@ospm/eslint-plugin-react-signals-hooks';

export default [
  {
    plugins: { 'react-signals-hooks': reactSignalsHooks },
    rules: {
      'react-signals-hooks/forbid-signal-destructuring': ['error', {
        suffix: 'Signal',
      }],
    },
  },
];
```

### Advanced configuration (custom creators)

```js
import reactSignalsHooks from '@ospm/eslint-plugin-react-signals-hooks';

export default [
  {
    plugins: { 'react-signals-hooks': reactSignalsHooks },
    rules: {
      'react-signals-hooks/forbid-signal-destructuring': ['error', {
        suffix: 'Signal',
        // put your own signal creator function names
        creatorNames: ['createSig', 'makeSignal'],
        // enableSuffixHeuristic: true, // optional, more conservative when creators are present
      }],
    },
  },
];
```
