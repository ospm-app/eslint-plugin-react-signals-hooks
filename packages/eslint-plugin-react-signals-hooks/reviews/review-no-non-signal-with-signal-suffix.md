# Rule Review: `no-non-signal-with-signal-suffix`

## Potential Issues and Edge Cases

- __Type-based acceptance too permissive__: For parameters, any `TSTypeReference` whose `typeName` has the suffix passes, regardless of whether the type truly represents a signal. — STATUS: TODO
- __Variable type annotations__: If a variable has any `typeAnnotation`, the rule bails and accepts. This may allow false negatives where a variable is explicitly typed to a non-signal. — STATUS: TODO
- __Missing import fix__: The `suggestConvertToSignal` fix doesn’t add `import { signal } from '@preact/signals-react'`, leading to unresolved identifiers. — STATUS: TODO
- __Declaration kind change__: The conversion suggestion replaces the declarator text as `const name = signal(...)`, which can be incorrect for `let`/`var` or multi-declarator statements. — STATUS: TODO
- __Reference breakage__: Rename fixes don’t update other references/usages, which can break code. — STATUS: TODO
- __Custom signal libs__: Detection is gated on `@preact/signals-react` for namespace checks; projects using different packages with the same API may be missed unless configured. — STATUS: TODO
- __Properties acceptance criteria__: For `{ fooSignal }` shorthand, acceptance requires the identifier to be signal-like by expression analysis at the property site; no cross-scope semantic confirmation is done. — STATUS: TODO
- __Exported variables skipped__: Skipping exported variables can let incorrect names leak into public API. This may be intentional but should be configurable. — STATUS: TODO

## Recommendations

1. __Safer autofix for conversion__ — STATUS: TODO
   - Insert import for `signal` if missing (or use existing namespace, e.g., `Signals.signal`). — STATUS: TODO
   - Preserve declaration kind and handle multi-declarators safely; restrict fix to single-declarator `const` only. — STATUS: TODO
   - Consider providing a suggestion (not a fix) when preconditions aren’t met (no import, multiple declarators, non-const). — STATUS: TODO
2. __Improve type-based validation__ — STATUS: TODO
   - For parameters and variables, prefer checking that the type resolves to a known Signal type (e.g., via type services) instead of only suffix on `typeName`. — STATUS: TODO
   - Alternatively, add an option `strictTypeCheckForParams` to require exact type names (configurable list) rather than suffix-based. — STATUS: TODO
3. __Configurable export behavior__ — STATUS: TODO
   - Add option `validateExported` (default `false`) to allow flagging exported variables, or perhaps warn level by default. — STATUS: TODO
4. __Reference-safe rename__ — STATUS: TODO
   - Replace rename fixes with suggestions only in non-trivial scopes, or detect single-use local variables to safely fix. Otherwise, prefer suggestions over autofix to avoid breaking builds. — STATUS: TODO
5. __Broaden library support__ — STATUS: TODO
   - Add `packages` option to configure signal packages for namespace import detection (not just `@preact/signals-react`). — STATUS: TODO
   - Include detection of default imports if relevant in future APIs. — STATUS: TODO
6. __Property validation improvements__ — STATUS: TODO
   - For shorthands, consult scope to see if the identifier is known to be created via one of the recognized creators earlier in the file. — STATUS: TODO
7. __Rule docs__ — STATUS: TODO
   - Document caveats around rename fixes and import insertion for conversion. — STATUS: TODO
   - Provide migration recipes: rename vs convert decision tree. — STATUS: TODO
8. __Performance safeguards__ — STATUS: TODO
   - Add optional early-return when `ignorePattern` is a cheap negative; compile regex once per rule run (already done via constructor, good). Consider micro-optimizations in hot paths (e.g., cache test results per name). — STATUS: TODO
