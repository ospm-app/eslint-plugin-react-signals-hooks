# Rule Review: `prefer-signal-in-jsx`

## Potential Issues / Edge Cases

- __Heuristic detection__: Non-suffix signals or aliased re-exports might be missed.
- __Nested expressions__: Complex parent expressions not covered by the guarded list could still slip through; conservative checks help but may under-report.
- __Namespace/type imports__: Creator detection focuses on `@preact/signals-react` and may miss custom wrappers.
- __Formatting__: Replacements may affect formatting minimally; generally safe.

## Recommendations

1. __Extend creator detection__
   - Allow configuring additional creator names/namespaces for signals.
2. __TS-aware signal typing__
   - Optionally use type info to confirm signal types beyond suffix.
3. __Explicit JSX gating__
   - Maintain explicit JSX depth tracking (if not already exhaustive) to ensure only JSX contexts trigger.
4. __Suggestion mode__
   - Offer an optional suggestion instead of a direct fix for particularly complex parent expressions.

## Example

- ❌ Incorrect

```tsx
<div>{countSignal.value}</div>
```

- ✅ Correct

```tsx
<div>{countSignal}</div>
```
