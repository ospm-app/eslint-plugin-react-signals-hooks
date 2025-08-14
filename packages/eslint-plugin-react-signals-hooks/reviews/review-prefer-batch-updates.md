# Rule Review: `prefer-batch-updates`

## Potential Issues / Edge Cases

- __Contiguity heuristic__: Legitimate batching candidates separated by trivial statements may be skipped; conversely, joining updates across control-flow could be unsafe. Current guard is text-based, not CFG-aware.
- __Formatting__: Constructed block may lose original formatting/newlines or semicolons; multi-line updates are concatenated with `;` then wrapped.
- __Import placement__: Inserted import is always at top/before first import; doesn’t merge existing specifiers or respect lint ordering tools.
- __Cross-scope updates__: Updates in nested scopes/branches are not grouped together; only contiguous regions in same block considered.
- __Custom signal libs__: `isSignalType()` focuses on `@preact/signals-react`. Other sources may be missed unless structurally similar.
- __False positives for reads in batch__: The `nonUpdateSignalInBatch` may warn on patterns where read-in-batch is intentional (e.g., read-modify-write split across helpers).

## Recommendations

1. __Fix precision__
   - Respect original statement boundaries and line breaks when generating batched block; consider using tokens and indentation utilities.
   - Merge existing import specifiers for `@preact/signals-react` if present.
2. __CFG-aware safety__
   - Incorporate simple control-flow checks (e.g., avoid crossing `if/return` boundaries) before proposing batch wrapping.
3. __Configurable detection__
   - Add option to ignore `.update` or allow single read inside batch, or tune `updatesSeparatedByCode` threshold.
   - Support additional signal libraries via option (modules or symbol names).
4. __Diagnostics__
   - Surface exact count and the signal names involved (already present) and provide a codeframe range hint.
5. __Performance__
   - Memoize `containsSignalUpdate`/`containsSignalRead` traversals per node to avoid repeated walks within `processBlock`.
