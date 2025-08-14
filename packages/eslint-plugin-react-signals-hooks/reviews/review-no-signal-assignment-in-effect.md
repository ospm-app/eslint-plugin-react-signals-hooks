# Rule Review: `no-signal-assignment-in-effect`

## Potential Issues / Edge Cases

- __Name-based inference may be brittle__: `isSignalAssignment()` determines signal-ness via `object.name.endsWith(<signalNames[i]>)`. With defaults like `['signal','useSignal','createSignal']`, typical names (`countSignal`) won’t match unless they literally end with `signal` (lowercase) or other entries. Consider a suffix like `Signal` instead, or a dedicated suffix option.
- __Import handling for suggestions__: The `effect(() => ...)` replacement doesn’t add an import for `effect`. If `effect` isn’t in scope, the suggestion will break until the user adds the import.
- __Callback/body extraction__: The fix uses `[start]` from the callback body to optional deps array end; complex cases (comments, inline returns, async) could yield formatting issues. No whitespace/comment preservation is applied beyond raw slice.
- __Dependencies messages__: Schema includes `missingDependencies`/`unnecessaryDependencies`/`duplicateDependencies`, but related logic wasn’t observed in the visited sections. If intentional, consider removing unused messages or implementing the checks.
- __Allowed patterns usage__: `allowedPatterns` exists in schema but its application wasn’t visible in the visited code sections. Confirm implementation or document as planned.

## Recommendations

1. __Improve signal detection__
   - Replace `endsWith(signalNames[i])` with a configurable suffix regex (e.g., `Signal`), or allow a predicate that can be tailored per codebase.
   - Alternatively, track signals via imports/creator calls when feasible and propagate known identifiers.
2. __Suggestion safety__
   - Provide suggestion-only (not autofix) by default. If offering an autofix, insert the `effect` import when missing or prefer a namespaced call if available.
   - Preserve original formatting/comments using tokens, and handle arrow vs function expressions carefully.
3. __Clarify or remove unused schema entries__
   - If dependency messages aren’t implemented, remove them from `messages` to avoid confusion, or implement the checks.
   - If `allowedPatterns` should gate reporting, add the condition early in visitors and document precedence.
4. __Diagnostics__
   - Include which identifiers assigned (already included via `signalNames` aggregation) and the effect kind. Consider linking to docs with migration examples.
