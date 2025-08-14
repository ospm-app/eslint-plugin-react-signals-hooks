# Rule Review: `forbid-signal-re-assignment`

## Potential Issues / Edge Cases

- __False positives via suffix heuristic__: If a non-signal variable ends with the suffix, it may be treated as signal-like.
- __Propagation limits__: Only simple `Identifier` aliasing is propagated; inter-procedural flows and complex expressions can be missed.
- __MemberExpression reporting__: Reports when base identifier is signal-like; may flag benign cases where property access doesn’t alias a signal (e.g., derived primitives) unless container truly includes a signal.
- __Bare-name creators__: `allowBareNames: true` may over-match in codebases that define unrelated `signal`/`effect` functions.
- __Module coverage__: Only `signal|computed|effect` are recognized. Custom creator names in third-party wrappers require import under those exact names.

## Recommendations

1. __Guidance suggestions (non-autofix)__
   - Provide suggestions with example rewrites: prefer `originalSignal` or `originalSignal.value` over aliasing.
2. __Improve propagation__
   - Track simple property aliasing: `const a = { s }; const b = a;` then destructuring `b` should be flagged via propagation from `a`.
3. __Configurable creator names__
   - Allow `creatorNames: string[]` to widen detection beyond the fixed trio.
4. __Safer bare-name mode__
   - Gate `allowBareNames` to files with matching imports present somewhere, or add `bareNamesScope: 'off'|'file'|'project'` to reduce overreach.
5. __Docs and examples__
   - Document typical anti-patterns and safe alternatives, including when aliasing is acceptable (e.g., renaming references, but not re-assigning).
6. __Performance polish__
   - Cache `containsSignalRef` results per node for reuse, avoiding repeated subtree scans in complex initializers.
