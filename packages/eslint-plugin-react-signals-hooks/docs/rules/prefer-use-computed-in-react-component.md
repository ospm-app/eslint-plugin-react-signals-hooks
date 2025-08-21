# `prefer-use-computed-in-react-component`

Encourages using `useComputed(...)` inside React components when deriving values from signals. Provides autofix that adds/removes the `useComputed` import when needed and converts compatible patterns.

## ❌ Incorrect

```tsx
import { signal, computed } from '@preact/signals-react';

function Component() {
  const countSignal = signal(0);
  // Creates a new computed signal on every render
  const doubled = computed(() => countSignal.value * 2);
  return <div>{doubled}</div>;
}
```

## ✅ Correct

```tsx
import { signal, useComputed } from '@preact/signals-react';

function Component() {
  const countSignal = signal(0);
  const doubled = useComputed(() => countSignal.value * 2);
  return <div>{doubled}</div>;
}
```

## Autofix behavior

- Adds `useComputed` import from `@preact/signals-react` (merges with existing import when possible).
- Replaces `computed(...)` with `useComputed(...)` inside React components.
- Removes now-unused `computed` import if applicable.

## Options

```json
{
  "react-signals-hooks/prefer-use-computed-in-react-component": [
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
- If you want to replace `useMemo` that only depends on signals, see `prefer-computed` (module-scope) and this rule for component-scope `useComputed`.
- In JSX, signals render their current value, so `{doubled}` is sufficient. Use `.value` outside JSX when needed.
