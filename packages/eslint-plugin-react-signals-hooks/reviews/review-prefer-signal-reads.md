# Rule Review: `prefer-signal-reads`

## Potential Issues / Edge Cases

- __Heuristic detection__: Suffix and creator-based tracking implemented. Direct, aliased, and namespace imports from `@preact/signals-react` are supported; custom wrappers still missed. — STATUS: PARTIAL
- __Dynamic/computed property contexts__: Optional chaining ancestors are conservatively skipped; other complex computed cases may still need manual review. — STATUS: PARTIAL
- __Type positions__: TS-only type positions are explicitly skipped (e.g., `TSTypeReference`, `TSQualifiedName`, etc.). — STATUS: DONE

## Recommendations

1. __Type-aware refinement__ — STATUS: PARTIAL
   - Implemented `typeAware` option to leverage the TS checker (when available) to confirm Signal-like identifiers (`value`/`peek` members or `Signal`/`ReadableSignal` names). Falls back to creator/suffix heuristics when types are unavailable; avoids suffix-only positives when types say "not a signal".
2. __`peek` interplay documentation__ — STATUS: TODO
   - Cross-reference with `prefer-signal-methods` to clarify when `.peek()` is preferable (effects/non-reactive reads). — STATUS: TODO
3. __Extended consumer matching__ — STATUS: PARTIAL
   - Current: simple name allowlist via `options.consumers` plus default `subscribe`; detects member callees by property name (e.g., `signal.subscribe(...)`).
   - Future: allow module + function mapping and regex patterns.
