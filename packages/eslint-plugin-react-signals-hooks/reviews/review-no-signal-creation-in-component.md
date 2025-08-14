# Rule Review: `no-signal-creation-in-component`

## Potential Issues / Edge Cases

- __Limited module coverage__: Only collects creators from `@preact/signals-react`. If users import from `@preact/signals-core` or re-exported modules, detection may rely on the broad member-expression fallback, which could over-match.
- __Broad fallback heuristic__: Treating any member expression with property `signal|computed` as a creator may flag unrelated APIs named similarly.
- __Effect scoping semantics__: `inEffect` toggling treats bodies of `useMemo` and `useCallback` as effect-like contexts; intended, but might be surprising if memoization callbacks are allowed to create local, ephemeral signals.
- __Fix variable naming__: Default `varName` to `value`/`computedValue` may clash with existing identifiers; uniqueness isn’t guaranteed for the module-scope insertion.
- __Import handling__: Inserted hook declarations assume `signal`/`computed` remain in scope; fixers don’t add missing imports or handle renamed/namespace-only usage when moved to top-level.
- __Comment movement risks__: Leading comment detection uses contiguous leading comments. Inline/trailing comments or complex trivia might not be preserved perfectly.
- __Class method heuristics__: Marks class method/property bodies as component context; might overreach in non-React classes.

## Recommendations

1. __Configurable creators and modules__
   - Add `modules: string[]` and `creatorNames: string[]` options to recognize imports beyond `@preact/signals-react` and names beyond `signal|computed`.
2. __Tighten fallback__
   - Limit the broad member-expression fallback behind an option or require that the object identifier was a known namespace import from a configured module.
3. __Safer fix insertions__
   - Ensure unique top-level variable names when hoisting (e.g., `value`, `value1`, ... or use `generateUniqueName`).
   - Insert imports for `signal`/`computed` when missing, or reference existing namespace import instead of bare identifier.
4. __Scope nuances__
   - Consider allowing `useMemo` callbacks to create computed signals when justified, or make this behavior configurable.
5. __Docs and examples__
   - Provide examples of when to choose module hoisting vs custom hook, and how to structure names for clarity.
