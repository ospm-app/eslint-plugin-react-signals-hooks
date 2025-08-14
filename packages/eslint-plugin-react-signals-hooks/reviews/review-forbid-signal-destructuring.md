# Rule Review: `forbid-signal-destructuring`

## Potential Issues / Edge Cases

- __False positives with suffix heuristic__: When `enableSuffixHeuristic` is `true`, plain values named with the suffix (e.g., `userSignal` that is not a signal) will be reported. — PARTIAL
  - Current: suffix heuristic is optional and off by default; when enabled, noise is possible.
- __Propagation limits__: Only simple `Identifier` → `Identifier` propagation is handled; complex flows (e.g., through functions/returns) are not tracked and may miss cases. — PARTIAL
- __No autofix__: While appropriate for safety, developers may want guided suggestions (e.g., example rewrites) for common destructuring patterns. — DONE
  - Mitigated by adding safe ESLint suggestions with guidance; no code-mod autofix by design.
- __Module coverage__: Custom creator names supported (named and namespaced via `creatorNames` option). — DONE
  - Implemented recognition for configured creators as both direct identifiers and namespaced members.
  - Tests added: `custom-creator-namespaced.test.tsx`.
- __MemberExpression base resolution__: `resolveBaseName()` extracts a simple identifier base; deeper expressions or re-exports via intermediate objects may evade detection. — PARTIAL
- __Destructuring of stable objects__: Only report when destructured pattern overlaps top-level signal-bearing keys/indices. — DONE
  - Implemented `getTopLevelSignalKeys()` and `patternOverlapsSignalKeys()`; avoids false positives when selecting only non-signal keys.
  - Tests added: `stable-objects-arrays.test.tsx`.

## Recommendations / Quick Wins

1. __Guided suggestions (non-autofix)__ — DONE
   - Implemented suggestions that insert a safe guidance comment before the destructuring site with `.value` advice.
   - Example: `{ x } = someSignal` → Suggest comment guiding to `const x = someSignal.value`.
2. __Configurable creator names__ — DONE
   - Supported via `creatorNames: string[]` option in rule schema and logic.
3. __Narrow suffix heuristic__ — PARTIAL
   - Now restricted to locally declared identifiers (tracked declarations) when heuristic is enabled; reduces false positives.
   - Still does not resolve to imports; further narrowing possible.
4. __Improve propagation__ — PARTIAL
   - Added propagation through object/array wrappers by detecting known identifiers inside wrappers.
   - Complex flows (returns/functions) remain out of scope.
5. __Add docs and examples__ — DONE
   - `docs/rules/forbid-signal-destructuring.md` updated/exists with incorrect/correct examples and options (including `creatorNames`).
   - Guidance emphasizes using `.value` instead of destructuring.
7. __Optional chaining handling__ — DONE
   - Unwrap `ChainExpression` and detect creator calls behind optional chaining.
   - Test added: `optional-chaining.test.tsx`.
6. __Performance polish__ — DONE
   - Results of `containsSignalCall(node)` cached via `containsMemo`; avoids repeated walks.
