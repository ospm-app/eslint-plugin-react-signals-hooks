# Rule Review: `prefer-use-signal-over-use-state`

## Potential Issues / Edge Cases

- __Complex initializers__: Even with the default skip, some borderline cases may still be complex (e.g., closures). Keeping `ignoreComplexInitializers` default true is prudent.
- __Custom hooks__: `useState` wrappers or aliased imports may evade detection.
- __Setter patterns__: Non-trivial setter usages (functional updates, depending on previous state) may need careful translation; ensure the fix preserves semantics.
- __JSX accessor nuances__: The computed accessor in JSX considers attributes, call args, math ops, etc.; document this behavior clearly to avoid surprises.
- __Naming collisions__: Adding the `suffix` could conflict with existing identifiers; consider collision checks.

## Recommendations

1. __Alias-aware detection__
   - Detect `useState` via import binding resolution (including aliasing and `React.useState`).
2. __Functional updates support__
   - Translate `setState(prev => ...)` into a mutation of `stateSignal.value` using the callback, ensuring correctness.
3. __Collision avoidance__
   - Check for existing `<state><suffix>` identifiers and adjust (e.g., numeric suffix) to prevent conflicts.
4. __Granular suggestions__
   - Offer separate suggestions for import-only addition and for tuple-to-signal conversion, in addition to the combined fix.
5. __Docs and examples__
   - Provide examples clarifying when `.value`, bare signal, or `.peek()` will be used post-conversion.
