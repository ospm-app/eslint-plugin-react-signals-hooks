# Rule Review: `prefer-signal-in-jsx`

## Potential Issues / Edge Cases

- __Heuristic detection__: Non-suffix signals or aliased re-exports might be missed. — STATUS: TODO
- __Nested expressions__: Complex parent expressions not covered by the guarded list could still slip through; conservative checks help but may under-report. — STATUS: TODO
- __Namespace/type imports__: Creator detection handles direct, aliased, and namespace imports from `@preact/signals-react`, but custom wrappers are still missed. — STATUS: PARTIAL
- __Formatting__: Replacements may affect formatting minimally; generally safe. — STATUS: DONE

## Recommendations

1. __Extend creator detection__ — STATUS: TODO
   - Allow configuring additional creator names/namespaces for signals. — STATUS: TODO
2. __TS-aware signal typing__ — STATUS: TODO
   - Optionally use type info to confirm signal types beyond suffix. — STATUS: TODO
3. __Explicit JSX gating__ — STATUS: DONE
   - JSX depth tracking is implemented via `jsxDepth` with handlers for `JSXElement`/`JSXFragment` enter/exit.
4. __Suggestion mode__ — STATUS: TODO
   - Offer an optional suggestion instead of a direct fix for particularly complex parent expressions. — STATUS: TODO

## Example

- ❌ Incorrect

```tsx
<div>{countSignal.value}</div>
```

- ✅ Correct

```tsx
<div>{countSignal}</div>
```
