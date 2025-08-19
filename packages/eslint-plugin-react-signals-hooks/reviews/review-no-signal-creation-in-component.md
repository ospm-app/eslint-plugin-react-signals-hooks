# Rule Review: `no-signal-creation-in-component`

## Potential Issues / Edge Cases

- __Limited module coverage__: Only collects creators from `@preact/signals-react`. If users import from `@preact/signals-core` or re-exported modules, detection may rely on the broad member-expression fallback, which could over-match. — STATUS: TODO
- __Broad fallback heuristic__: Treating any member expression with property `signal|computed` as a creator may flag unrelated APIs named similarly. — STATUS: TODO
- __Effect scoping semantics__: `inEffect` toggling treats bodies of `useMemo` and `useCallback` as effect-like contexts; intended, but might be surprising if memoization callbacks are allowed to create local, ephemeral signals. — STATUS: TODO
- __Fix variable naming__: Default `varName` to `value`/`computedValue` may clash with existing identifiers; uniqueness isn’t guaranteed for the module-scope insertion. — STATUS: TODO
- __Import handling__: Inserted hook declarations assume `signal`/`computed` remain in scope; fixers don’t add missing imports or handle renamed/namespace-only usage when moved to top-level. — STATUS: TODO
- __Comment movement risks__: Leading comment detection uses contiguous leading comments. Inline/trailing comments or complex trivia might not be preserved perfectly. — STATUS: TODO
- __Class method heuristics__: Marks class method/property bodies as component context; might overreach in non-React classes. — STATUS: TODO

## Recommendations

1. __Configurable creators and modules__ — STATUS: TODO
   - Add `modules: string[]` and `creatorNames: string[]` options to recognize imports beyond `@preact/signals-react` and names beyond `signal|computed`. — STATUS: TODO
2. __Tighten fallback__ — STATUS: TODO
   - Limit the broad member-expression fallback behind an option or require that the object identifier was a known namespace import from a configured module. — STATUS: TODO
3. __Safer fix insertions__ — STATUS: TODO
   - Ensure unique top-level variable names when hoisting (e.g., `value`, `value1`, ... or use `generateUniqueName`). — STATUS: TODO
   - Insert imports for `signal`/`computed` when missing, or reference existing namespace import instead of bare identifier. — STATUS: TODO
4. __Scope nuances__ — STATUS: TODO
   - Consider allowing `useMemo` callbacks to create computed signals when justified, or make this behavior configurable. — STATUS: TODO
5. __Docs and examples__ — STATUS: TODO
   - Provide examples of when to choose module hoisting vs custom hook, and how to structure names for clarity. — STATUS: TODO
