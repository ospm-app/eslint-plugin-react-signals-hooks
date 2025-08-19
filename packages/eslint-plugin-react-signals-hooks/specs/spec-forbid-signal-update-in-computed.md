# Forbid Signal Update in Computed Rule Specification

This rule forbids updating signals inside `computed(...)` callbacks. `computed` must be pure and derive values only from reads of other signals. Writing to signals within a computed function introduces feedback loops, breaks referential transparency, and can cause infinite re-computation or subtle timing issues.

## Plugin Scope

- Signal primitives and helpers come from `@preact/signals-react`.
- The rule recognizes `computed` imported from `@preact/signals-react` only.

## Core Functionality

The `forbid-signal-update-in-computed` rule detects any signal write side-effect that occurs within the body of a `computed(() => { ... })` callback.

A "signal write" includes (but is not limited to):

- Assigning to `.value`: `countSignal.value = 1`.
- Invoking mutating methods or helpers: `countSignal.set(1)`, `countSignal.update(fn)`.
- Mutating nested signals obtained via property access or calls inside the computed: `(getUserSignal().age).value++`.
- Batch updates within computed: `batch(() => s.value = 1)`.

## Handled Cases

- __Direct assignment to `.value` inside computed__
  - ❌ `computed(() => { countSignal.value = countSignal.value + 1; return countSignal.value; });`

- __Method-based updates inside computed__
  - ❌ `computed(() => { countSignal.set(1); return 1; });`
  - ❌ `computed(() => { countSignal.update(v => v + 1); return 1; });`

- __Indirect writes via references__
  - ❌ `computed(() => { const s = countSignal; s.value++; return s.value; });`

- __Writes inside nested scopes within computed__
  - ❌ `computed(() => { function bump() { countSignal.value++; } bump(); return countSignal.value; });`
  - ❌ `computed(() => { if (flag.value) countSignal.set(5); return flag.value; });`

- __Batched writes inside computed__
  - ❌ `computed(() => { batch(() => { a.value = 1; b.value = 2; }); return a.value + b.value; });`

- __Updating signals derived from function calls/properties in computed__
  - ❌ `computed(() => { getCounter().value++; return getCounter().value; });`

## Not Flagged (allowed)

- __Pure reads of signals__
  - ✅ `computed(() => countSignal.value * 2)`

- __Local non-signal mutation__
  - ✅ `computed(() => { let x = 0; x++; return x; })`

- __Writes that occur outside computed functions__
  - ✅ `countSignal.value++; const c = computed(() => countSignal.value * 2);`

- __Creating new signals inside computed without writing to existing signals__ (discouraged for performance, but not a write to an existing signal)
  - ✅ `computed(() => { const tmp = signal(0); return tmp.value; })`

## Error Messages

- `noSignalWriteInComputed`: "Do not update signal '{{name}}' inside computed(). Computed functions must be pure and read-only."
- `noBatchedWritesInComputed`: "Do not batch updates inside computed(). Computed functions must be pure and read-only."

## Auto-fix Suggestions

Autofix is generally unsafe because removing a write may change behavior. Provide suggestions, not automatic fixes:

- Suggest moving the write outside of `computed`:
  - Replace the in-computed write with reading the value only.
  - Move the update to where the computed value is consumed (e.g., an event handler or effect).

Example suggestion:

- From: `computed(() => { countSignal.value++; return countSignal.value; })`
- To: `computed(() => countSignal.value)` and perform `countSignal.value++` elsewhere (e.g., user interaction or `effect`).

## Options

```jsonc
{
  "rules": {
    "react-signals-hooks/forbid-signal-update-in-computed": [
      "error",
      {
        // Per-message severity overrides
        "severity": {
          "noSignalWriteInComputed": "error" | "warn" | "off",
          "noBatchedWritesInComputed": "error" | "warn" | "off"
        },
        // Suffix used by the identifier heuristic (if the project relies on naming conventions)
        "suffix": "Signal",
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

## Examples

### Incorrect

```ts
import { computed } from '@preact/signals-react';

const countSignal = signal(0);

const doubled = computed(() => {
  countSignal.value++; // ❌ write inside computed
  return countSignal.value * 2;
});

const total = computed(() => {
  batch(() => {
    a.value = 1; // ❌
    b.value = 2; // ❌
  });
  return a.value + b.value;
});

const incThenRead = computed(() => {
  countSignal.set(countSignal.value + 1); // ❌
  return countSignal.value;
});
```

### Correct

```ts
import { computed } from '@preact/signals-react';

const countSignal = signal(0);

const doubled = computed(() => countSignal.value * 2); // ✅ read-only

// Writes moved outside of computed
countSignal.value++;
const readOnly = computed(() => countSignal.value);
```

## Rationale

`computed` is intended to be a pure derivation of other reactive values. Performing writes within a computed function can:

- Cause infinite loops or repeated invalidations.
- Hide side-effects in what should be a pure derivation.
- Make dependency graphs harder to reason about and debug.

This rule enforces a clear separation: compute inside `computed`, update signals elsewhere (events, effects, or explicit actions).
