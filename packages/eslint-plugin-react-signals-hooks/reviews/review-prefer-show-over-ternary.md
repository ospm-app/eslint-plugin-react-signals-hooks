# Rule Review: `prefer-show-over-ternary`

## Potential Issues / Edge Cases

- __TS Server Component comment__: The inserted `/* @ts-expect-error Server Component */` may be unwanted in some environments; consider making it optional or configurable.
- __Formatting__: Multi-line replacement may disrupt formatting; consider preserving indentation or splitting fixes.
- __Import merging nuances__: Appending `, Show` assumes there is already at least one specifier and that it is a named import; doesn’t handle type-only or namespace imports.
- __Non-JSX contexts__: If a ternary is outside JSX but still renders JSX fragments, ensure detection applies consistently; current complexity heuristic may allow or miss certain edge placements.
- __Nested/complex tests__: `hasSuffixSignalInExpr()` is heuristic and may miss signals accessed via deeper indirection or through un-aliased re-exports.

## Recommendations

1. __Configurable TS comment__
   - Add an option to include/omit the `@ts-expect-error Server Component` comment, or infer based on file context.
2. __Import handling improvements__
   - Merge specifiers more robustly; detect existing `Show` in the same import to avoid duplicates; handle empty specifier arrays and import type variations.
3. __Formatting-aware fixes__
   - Use surrounding token/whitespace to produce better-indented output; consider suggestion-only split: one for element creation, one for wrapping/indentation.
4. __Enhanced signal detection__
   - Optionally integrate TypeScript type checks to confirm signals beyond naming, or allow configuring additional heuristics.
5. __Scope and context guards__
   - Restrict to JSX-containing branches explicitly to avoid changing non-rendering ternaries; or document the current behavior clearly.
