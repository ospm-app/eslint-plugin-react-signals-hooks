# `forbid-signal-update-in-computed`

Forbids updating signals inside `computed(...)` callbacks. Computed functions must remain pure and read-only.

## ❌ Incorrect

```ts
import { signal, computed, batch } from "@preact/signals-react";

const countSignal = signal(0);

// 1) Direct write to .value
const doubled = computed(() => {
  countSignal.value = countSignal.value + 1;
  return countSignal.value * 2;
});

// 2) Using .set/.update
const total = computed(() => {
  countSignal.set(1);
  countSignal.update((v) => v + 1);
  return countSignal.value;
});

// 3) Batched writes inside computed
const mixed = computed(() => {
  batch(() => {
    countSignal.value = 1;
    countSignal.set(2);
  });
  return countSignal.value;
});

// 4) Writes to a signal obtained via a call
function getCounter() { return countSignal; }
const viaCall = computed(() => {
  getCounter().set(123);
  return getCounter().value;
});
```

## ✅ Correct

```ts
import { signal, computed } from "@preact/signals-react";

const countSignal = signal(0);

// Pure read-only computed
const doubled = computed(() => countSignal.value * 2);

// Writes outside computed are fine
countSignal.value = 1;
const doubled2 = computed(() => countSignal.value * 2);

// Creating a new local signal inside computed (no writes to existing signals)
const readOnly = computed(() => {
  const local = signal(0); // creation is allowed; not mutating an existing signal
  return local.value + countSignal.value; // reads only
});
```

## Configuration

Flat config example enabling the rule:

```js
import reactSignalsHooks from "@ospm/eslint-plugin-react-signals-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{ts,tsx}"]:
    plugins: { "react-signals-hooks": reactSignalsHooks },
    rules: {
      "react-signals-hooks/forbid-signal-update-in-computed": [
        "error",
        {
          // Optional: signal variable suffix used across your codebase
          suffix: "Signal",

          // Optional: per-message severity overrides
          severity: {
            noSignalWriteInComputed: "error",
            noBatchedWritesInComputed: "error",
          },

          // Optional: performance controls (telemetry + safety cutoffs)
          performance: {
            enableMetrics: false,
            maxNodes: 5000,
            maxTime: 1000,
            maxOperations: {},
          },
        },
      ],
    },
  },
];
```

### Options

- `suffix` (string, default: project default if any) — common suffix for signal variables, e.g. `countSignal`.
- `severity` (object) — per-message severity overrides:
  - `noSignalWriteInComputed`: severity for any signal write inside computed.
  - `noBatchedWritesInComputed`: severity for any `batch(...)` used inside computed.
- `performance` (object) — performance instrumentation and limits:
  - `enableMetrics` (boolean)
  - `maxNodes` (number)
  - `maxTime` (ms number)
  - `maxOperations` (object) — per-operation caps (advanced).

## When not to use

- If you intentionally allow side effects inside `computed` (not recommended). In that case, disable the rule for specific lines or files.
