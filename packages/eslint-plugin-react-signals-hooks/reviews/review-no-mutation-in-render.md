# Review: `no-mutation-in-render`

## Potential issues / edge cases (status)

- __Autofix imports__: Done. All "Wrap in useEffect" suggestions now prepend `import { useEffect } from 'react'` when missing via `ensureUseEffectImportFixes()`.
- __Suggestion semantics__: Partially. "Move to event handler" remains a code replacement but is gated behind the `unsafeAutofix` option. Consider changing to text-only guidance.
- __`looksLikeSignal()` name logic__: Done. Removed remaining `endsWith(n.replace(/^[A-Z]/, ""))` usage; now rely on exact matches and suffix regex only.
- __Creator tracking completeness__: Not done. No changes to alias/destructure propagation for `knownCreatorSignals` in this rule.
- __Render-context detection__: Partially. Added handling for functions wrapped by `memo`/`forwardRef` (identifier or member callee). Factories and nested returns beyond these remain unhandled.
- __Fixer text reuse__: Done. Added trailing semicolons to all `useEffect` replacement strings to avoid ASI pitfalls.
- __Duplicate reports__: Done. Introduced `reportOnce()` wrapper to dedupe by `(messageId, node.range)`; replaced direct `context.report` calls.

## Recommendations / quick wins (status)

- __Import management__: Done. Implemented import insertion in all `suggestUseEffect` fixers.
- __Suggestion style__: Partially. "Event handler" remains as code replacement behind `unsafeAutofix`; consider switching to text-only.
- __Tighten name heuristic__: Partially. Remove remaining `endsWith(n.replace(/^[A-Z]/, ""))` usages and use exact matches + suffix regex only.
- __Docs__: Not done. Update rule docs to reflect import insertion, tightened heuristics, and `unsafeAutofix` behavior.
- __Tests__: Not done. Add tests for import insertion, render-context edge cases, deep mutations, and creator-based detection via aliases.
