# `forbid-signal-re-assignment`

Forbids aliasing or re-assigning variables that hold a signal. Prefer reading `.value` or passing the original signal reference.

> This prevents confusing indirections and keeps signal usage explicit and reactive.

## ❌ Incorrect

```ts
import { signal } from '@preact/signals-react';

const countSignal = signal(0);

// Aliasing a signal variable
const alias = countSignal; // ⛔️

// Re-assignment to another identifier later
let s;
s = countSignal; // ⛔️

// Default parameter alias
function useThing(sig = countSignal) { // ⛔️
  // ...
}

// Aliasing from containers holding signals
const container = { a: signal(1) };
const a = container.a; // ⛔️

const arr = [signal(0)];
const first = arr[0]; // ⛔️
```

## ✅ Correct

```ts
import { signal } from '@preact/signals-react';

const countSignal = signal(0);

// Read the value explicitly
const value = countSignal.value; // ✅

// Pass the original signal reference when a function expects a signal
useCounter(countSignal); // ✅ (assuming API expects a signal)

// Destructure from values, not signals
const obj = { value: countSignal.value };
const { value: v } = obj; // ✅
```

## Options

The rule accepts an options object with the following properties:

- `suffix` (string, default: `"Signal"`)
  - If a variable name ends with this suffix, it is treated as signal-like for detection heuristics.
- `modules` (string[], optional)
  - Additional module specifiers that export signal creators. These are merged with the defaults (`@preact/signals-react`, `@preact/signals-core`).
- `allowBareNames` (boolean, default: `false`)
  - When `true`, recognizes bare identifiers named `signal`/`computed`/`effect` as creators even if not imported from a known module. This can increase false positives; keep disabled unless needed.
- `severity` (object)
  - Map of message IDs to severity overrides. Supports `"error" | "warn" | "off"` for `reassignSignal`.
- `performance` (object)
  - Performance budget used by the plugin's internal metrics. Keys include `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, and `maxOperations`.

### Example configuration (Flat Config)

```js
import reactSignalsHooks from '@ospm/eslint-plugin-react-signals-hooks';

export default [
  {
    plugins: { 'react-signals-hooks': reactSignalsHooks },
    rules: {
      'react-signals-hooks/forbid-signal-re-assignment': ['error', {
        suffix: 'Signal',
        modules: ['@my/lib/signals'],
        allowBareNames: false,
      }],
    },
  },
];
```
