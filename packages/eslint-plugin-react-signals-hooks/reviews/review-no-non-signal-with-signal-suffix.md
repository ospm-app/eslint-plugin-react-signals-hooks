# Rule Review: `no-non-signal-with-signal-suffix`

## Potential Issues and Edge Cases

- __Type-based acceptance too permissive__: For parameters, any `TSTypeReference` whose `typeName` has the suffix passes, regardless of whether the type truly represents a signal.
- __Variable type annotations__: If a variable has any `typeAnnotation`, the rule bails and accepts. This may allow false negatives where a variable is explicitly typed to a non-signal.
- __Missing import fix__: The `suggestConvertToSignal` fix doesn’t add `import { signal } from '@preact/signals-react'`, leading to unresolved identifiers.
- __Declaration kind change__: The conversion suggestion replaces the declarator text as `const name = signal(...)`, which can be incorrect for `let`/`var` or multi-declarator statements.
- __Reference breakage__: Rename fixes don’t update other references/usages, which can break code.
- __Custom signal libs__: Detection is gated on `@preact/signals-react` for namespace checks; projects using different packages with the same API may be missed unless configured.
- __Properties acceptance criteria__: For `{ fooSignal }` shorthand, acceptance requires the identifier to be signal-like by expression analysis at the property site; no cross-scope semantic confirmation is done.
- __Exported variables skipped__: Skipping exported variables can let incorrect names leak into public API. This may be intentional but should be configurable.

## Recommendations

1. __Safer autofix for conversion__
   - Insert import for `signal` if missing (or use existing namespace, e.g., `Signals.signal`).
   - Preserve declaration kind and handle multi-declarators safely; restrict fix to single-declarator `const` only.
   - Consider providing a suggestion (not a fix) when preconditions aren’t met (no import, multiple declarators, non-const).
2. __Improve type-based validation__
   - For parameters and variables, prefer checking that the type resolves to a known Signal type (e.g., via type services) instead of only suffix on `typeName`.
   - Alternatively, add an option `strictTypeCheckForParams` to require exact type names (configurable list) rather than suffix-based.
3. __Configurable export behavior__
   - Add option `validateExported` (default `false`) to allow flagging exported variables, or perhaps warn level by default.
4. __Reference-safe rename__
   - Replace rename fixes with suggestions only in non-trivial scopes, or detect single-use local variables to safely fix. Otherwise, prefer suggestions over autofix to avoid breaking builds.
5. __Broaden library support__
   - Add `packages` option to configure signal packages for namespace import detection (not just `@preact/signals-react`).
   - Include detection of default imports if relevant in future APIs.
6. __Property validation improvements__
   - For shorthands, consult scope to see if the identifier is known to be created via one of the recognized creators earlier in the file.
7. __Rule docs__
   - Document caveats around rename fixes and import insertion for conversion.
   - Provide migration recipes: rename vs convert decision tree.
8. __Performance safeguards__
   - Add optional early-return when `ignorePattern` is a cheap negative; compile regex once per rule run (already done via constructor, good). Consider micro-optimizations in hot paths (e.g., cache test results per name).
