# Rule Review: `require-use-signals`

## Potential Issues / Edge Cases

- __Argument policy clarity__: Teams may need documentation on what `computeExpectedArg()` expects in different contexts; otherwise `wrongUseSignalsArg` may surprise.
- __Nested/early returns__: Wrapping the body may affect formatting around early returns; the fix confines to block bodies to mitigate.
- __Multiple stores__: If multiple `useSignals` stores exist, `findOrCreateStoreDeclaration` prefers reuse but complex cases could need manual review.
- __Function forms__: Only block-bodied functions are fixed; concise arrow functions are skipped by design.

## Recommendations

1. __Document expected args__
   - Clarify in docs when each `useSignals(arg)` form is expected (component vs custom hook, cleanup semantics).
2. __Concise arrow support__
   - Optionally transform concise arrow functions to block bodies to enable wrapping, gated by a config flag.
3. __Advanced detection__
   - Consider type-aware signal detection to reduce suffix reliance and support custom creator factories.
4. __Safer wrapping strategy__
   - Preserve leading comments/annotations when wrapping, and ensure stable formatting via codemod-like utilities.

## Example

- ❌ Incorrect

```tsx
function Counter() {
  // reads a signal but no useSignals()
  const n = countSignal.value;
  return <div>{n}</div>;
}
```

- ✅ Correct

```tsx
import { useSignals } from '@preact/signals-react/runtime';

function Counter() {
  const store = useSignals(1);
  try {
    const n = countSignal.value;
    return <div>{n}</div>;
  } finally {
    store.f();
  }
}
```
