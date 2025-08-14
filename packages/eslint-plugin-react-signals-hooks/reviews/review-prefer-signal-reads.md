# Rule Review: `prefer-signal-reads`

## Potential Issues / Edge Cases

- __Heuristic detection__: Non-suffix signals or re-exported/aliased creators may be missed.
- __Dynamic/computed property contexts__: Some complex computed scenarios may still need manual review.
- __Type positions in JS__: In TS files, type-position checks apply; in JS, fewer guards exist by nature.

## Recommendations

1. __Type-aware refinement__
   - Optionally leverage TS type checker to confirm signal types and reduce dependency on suffix/creator heuristics.
2. __`peek` interplay documentation__
   - Cross-reference with `prefer-signal-methods` to clarify when `.peek()` is preferable (effects/non-reactive reads).
3. __Extended consumer matching__
   - Allow configuring consumer recognition by module + function mapping or regex, and detect member callees (`api.consume(signal)`).
