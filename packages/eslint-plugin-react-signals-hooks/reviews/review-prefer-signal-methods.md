# Rule Review: `prefer-signal-methods`

## Potential Issues / Edge Cases

- __Heuristic detection__: Suffix-based signal identification may miss aliased/wrapped signals.
- __Nested member chains__: Complex chains or optional chaining may not be fully covered.
- __Non-standard wrappers__: Custom hooks or utilities may form reactive contexts not detected by `isInJSXContext`/effect flags.

## Recommendations

1. __Type-aware confirmation__
   - Optionally use TS type info to confirm signals and reduce reliance on suffix.
2. __Optional chaining support__
   - Extend matching to handle `?.` safely (`countSignal?.value`, `countSignal?.peek?.()`), bailing when uncertain.
3. __Configurability__
   - Allow enabling suggestion-only mode for effects, and configurable mappings for project-specific reactive contexts.
4. __Import-based creator config__
   - Let users extend the list of creator names/namespaces beyond `@preact/signals-react`.
