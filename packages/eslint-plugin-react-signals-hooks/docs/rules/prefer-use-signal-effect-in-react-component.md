# `prefer-use-signal-effect-in-react-component`

Encourages using `useSignalEffect(...)` inside React components when effects depend on signals. Provides autofix that adds/removes the `useSignalEffect` import and replaces `effect(...)` calls inside components.

## ❌ Incorrect

```tsx
import { signal, effect } from '@preact/signals-react';

function Component() {
  const countSignal = signal(0);
  // Effect is not integrated with React lifecycle when called inside a component
  effect(() => {
    console.log(countSignal.value);
  });
}
```

## ✅ Correct

```tsx
import { signal, useSignalEffect } from '@preact/signals-react';

function Component() {
  const countSignal = signal(0);
  useSignalEffect(() => {
    console.log(countSignal.value);
  });
}
```

## Autofix behavior

- Adds `useSignalEffect` import from `@preact/signals-react` (merges with existing import when possible).
- Replaces `effect(...)` with `useSignalEffect(...)` inside React components.
- Removes now-unused `effect` import if applicable.

## Options

```json
{
  "react-signals-hooks/prefer-use-signal-effect-in-react-component": [
    "warn",
    {
      "maxOperations": 5000,
      "trackPerformance": true
    }
  ]
}
```

- `maxOperations` (number, optional): Performance budget to limit processing per file.
- `trackPerformance` (boolean, optional): Enables internal perf tracking logs for diagnostics.

## Notes

- Targets usages inside React component bodies only.
- If you want to replace `useEffect` that only depends on signals, see `prefer-signal-effect` (module-scope) and this rule for component-scope `useSignalEffect`.
- Keeps semantics identical; there is no dependency array for `useSignalEffect`.
