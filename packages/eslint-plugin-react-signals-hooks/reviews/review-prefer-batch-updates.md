# Rule Review: `prefer-batch-updates`

## Potential Issues / Edge Cases

- __Contiguity heuristic__: Legitimate batching candidates separated by trivial statements may be skipped; conversely, joining updates across control-flow could be unsafe. Added conservative CFG-aware boundary checks to avoid crossing control-flow. — STATUS: PARTIAL
  - New: `detection.allowNonTrivialBetween` allows up to N non-trivial statements between updates to still consider them contiguous (default 0). — STATUS: DONE
- __Formatting__: Batched block now preserves original inner text between first/last updates, but wrapper adds newline braces. Further work could better preserve surrounding whitespace/indentation. — STATUS: PARTIAL
- __Import placement__: Uses `ensureNamedImportFixes()` to merge named specifiers or add a separate line when namespace import exists; respects quote/semicolon style. — STATUS: DONE
- __Cross-scope updates__: Updates in nested scopes/branches are not grouped together; only contiguous regions in same block considered. — STATUS: TODO
- __Custom signal libs__: Added `extraSignalModules` option and per-file initialization of detection set. — STATUS: DONE
- __False positives for reads in batch__: The `nonUpdateSignalInBatch` may warn on patterns where read-in-batch is intentional (e.g., read-modify-write split across helpers). `detection.allowSingleReads` is now enforced to tolerate up to N reads without updates. — STATUS: PARTIAL

## Recommendations

1. __Fix precision__ — STATUS: PARTIAL
   - Respect original statement boundaries and line breaks when generating batched block; consider using tokens and indentation utilities. — STATUS: PARTIAL
   - Merge existing import specifiers for `@preact/signals-react` if present. — STATUS: DONE
2. __CFG-aware safety__ — STATUS: DONE
   - Incorporate simple control-flow checks (e.g., avoid crossing `if/return` boundaries) before proposing batch wrapping. — STATUS: DONE
3. __Configurable detection__ — STATUS: PARTIAL
   - Allow single read inside batch (`detection.allowSingleReads`). — STATUS: DONE
   - Allow limited non-trivial statements between updates (`detection.allowNonTrivialBetween`, default 0). — STATUS: DONE
   - Add option to ignore `.update` calls or tune `updatesSeparatedByCode` threshold. — STATUS: DONE
     - Implemented `detection.ignoreUpdateCalls` (boolean, default `false`): when `true`, `.update(...)` calls are treated as non-updates by heuristics.
   - Support additional signal libraries via option (modules or symbol names). — STATUS: DONE
4. __Diagnostics__ — STATUS: DONE
   - Surface exact count and the signal names involved (already present) and provide a codeframe range hint. — STATUS: DONE
5. __Performance__ — STATUS: PARTIAL
   - `containsSignalUpdate`/`containsSignalRead` use per-context WeakMap caches to avoid repeated subtree walks; further local memoization in `processBlock` and hot paths could still be added. — STATUS: PARTIAL
