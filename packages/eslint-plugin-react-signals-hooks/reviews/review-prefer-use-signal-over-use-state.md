# Rule Review: `prefer-use-signal-over-use-state`

## Potential Issues / Edge Cases

- __Complex initializers__: Even with the default skip, some borderline cases may still be complex (e.g., closures). Keeping `ignoreComplexInitializers` default true is prudent. — STATUS: TODO
- __Custom hooks__: `useState` wrappers or aliased imports may evade detection. — STATUS: TODO (wrappers remain out-of-scope; import aliasing and React namespace are handled)
- __Setter patterns__: Non-trivial setter usages (functional updates, depending on previous state) may need careful translation; ensure the fix preserves semantics. — STATUS: DONE (direct and functional updates converted to `.value` assignments)
- __JSX accessor nuances__: The computed accessor in JSX considers attributes, call args, math ops, etc.; document this behavior clearly to avoid surprises. — STATUS: TODO
- __Naming collisions__: Adding the `suffix` could conflict with existing identifiers; consider collision checks. — STATUS: DONE (collision-safe naming with numeric suffix fallback)

## Recommendations

1. __Alias-aware detection__ — STATUS: DONE
   - Detect `useState` via import binding resolution (including aliasing and `React.useState`). — STATUS: DONE
2. __Functional updates support__ — STATUS: DONE
   - Translate `setState(prev => ...)` into a mutation of `stateSignal.value` using the callback, ensuring correctness. — STATUS: DONE
3. __Collision avoidance__ — STATUS: DONE
   - Check for existing `<state><suffix>` identifiers and adjust (e.g., numeric suffix) to prevent conflicts. — STATUS: DONE
4. __Granular suggestions__ — STATUS: DONE
   - Offer separate suggestions for import-only addition and for tuple-to-signal conversion, in addition to the combined fix. — STATUS: DONE
5. __Docs and examples__ — STATUS: TODO
   - Provide examples clarifying when `.value`, bare signal, or `.peek()` will be used post-conversion. — STATUS: TODO
