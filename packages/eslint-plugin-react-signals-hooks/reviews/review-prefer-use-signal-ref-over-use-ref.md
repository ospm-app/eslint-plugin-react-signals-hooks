# Rule Review: `prefer-use-signal-ref-over-use-ref`

## Potential Issues / Edge Cases

- __Imperative refs__: Refs used only for imperative handles/effects may not benefit from conversion; `onlyWhenReadInRender` mitigates this by default. — STATUS: TODO
- __Callback refs__: Non-`useRef` patterns (callback refs) are outside this rule’s scope. — STATUS: TODO
- __Namespace/alias imports__: Conversion edits handle `React.useRef` and import aliasing; other wrapper factories may be missed. — STATUS: DONE (convert suggestion also ensures `useSignalRef` import via `ensureNamedImportFixes`)
- __Ref identity semantics__: `useSignalRef` may differ subtly from `useRef` in identity characteristics; document behavior for teams before autofixing broadly. — STATUS: TODO

## Recommendations

1. __Explicit docs on semantics__ — STATUS: TODO
   - Clarify behavioral differences between `useRef` and `useSignalRef` (identity, update triggers) to guide safe adoption. — STATUS: TODO
2. __Custom namespace support__ — STATUS: TODO
   - Detect additional React namespace aliases and wrappers via binding resolution to catch `alias.useRef`. — STATUS: TODO
3. __Selective rename option__ — STATUS: TODO
   - Expose an option to opt-out of variable renaming if teams prefer keeping `*Ref` names for compatibility. — STATUS: TODO
4. __JSX-only opt-in__ — STATUS: TODO
   - Keep `onlyWhenReadInRender` default true; consider exposing stricter JSX-only checks to prevent suggestions in ambiguous render-adjacent code. — STATUS: TODO
