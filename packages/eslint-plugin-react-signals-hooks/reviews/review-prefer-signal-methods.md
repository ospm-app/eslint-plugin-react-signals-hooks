# Rule Review: `prefer-signal-methods`

## Potential Issues / Edge Cases

- __Heuristic detection__: Suffix + import-based creator tracking from `@preact/signals-react` (direct/alias/namespace) implemented; custom wrappers still missed. — STATUS: PARTIAL
- __Nested member chains__: Chained member writes are skipped; optional chaining bails via `ChainExpression` detection. Complex chains may remain. — STATUS: PARTIAL
- __Non-standard wrappers__: `useEffect`/`useLayoutEffect` plus configurable `reactiveEffectCallees` supported; arbitrary reactive contexts beyond named callees still not auto-detected. — STATUS: PARTIAL
- __JSX enforcement__: Delegated to `prefer-signal-in-jsx`; this rule skips JSX contexts. — STATUS: DONE

## Recommendations

1. __Type-aware confirmation__ — STATUS: PARTIAL
   - Added `typeAware` option using TS types (when available) to confirm signal identifiers (checks `value`/`peek` members and `Signal`-like names). Heuristic fallback remains. — STATUS: PARTIAL
2. __Optional chaining support__ — STATUS: PARTIAL
   - Current: bail on `ChainExpression`/optional members. Future: handle more cases safely if needed. — STATUS: PARTIAL
3. __Configurability__ — STATUS: DONE
   - `extraCreatorModules` (creator imports), `reactiveEffectCallees` (effect contexts), `effectsSuggestionOnly` (suggestion-only fixes in effects). — STATUS: DONE
4. __Import-based creator config__ — STATUS: DONE
   - Users can extend creator modules via `extraCreatorModules` (supports named and namespace imports). — STATUS: DONE
5. __Reactive effect contexts__ — STATUS: PARTIAL
   - Added `reactiveEffectCallees` to treat additional callee names as effect contexts. Deep/implicit reactive systems not automatically inferred. — STATUS: PARTIAL
6. __Suggestion-only mode (effects)__ — STATUS: DONE
   - `effectsSuggestionOnly` switches effect-context fixes to suggestions to avoid auto-modifying code in effects. — STATUS: DONE
