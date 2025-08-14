# Rule Review: `prefer-use-signal-ref-over-use-ref`

## Potential Issues / Edge Cases

- __Imperative refs__: Refs used only for imperative handles/effects may not benefit from conversion; `onlyWhenReadInRender` mitigates this by default.
- __Callback refs__: Non-`useRef` patterns (callback refs) are outside this rule’s scope.
- __Namespace/alias imports__: Conversion edits handle `React.useRef` but other wrapper factories may be missed.
- __Ref identity semantics__: `useSignalRef` may differ subtly from `useRef` in identity characteristics; document behavior for teams before autofixing broadly.

## Recommendations

1. __Explicit docs on semantics__
   - Clarify behavioral differences between `useRef` and `useSignalRef` (identity, update triggers) to guide safe adoption.
2. __Custom namespace support__
   - Detect additional React namespace aliases and wrappers via binding resolution to catch `alias.useRef`.
3. __Selective rename option__
   - Expose an option to opt-out of variable renaming if teams prefer keeping `*Ref` names for compatibility.
4. __JSX-only opt-in__
   - Keep `onlyWhenReadInRender` default true; consider exposing stricter JSX-only checks to prevent suggestions in ambiguous render-adjacent code.
