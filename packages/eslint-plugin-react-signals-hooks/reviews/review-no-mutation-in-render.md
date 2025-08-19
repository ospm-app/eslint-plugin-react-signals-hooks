# Review: `no-mutation-in-render`

## Potential issues / edge cases (status)

- __Autofix imports__: — STATUS: DONE All "Wrap in useEffect" suggestions now prepend `import { useEffect } from 'react'` when missing via `ensureUseEffectImportFixes()`.
- __Suggestion semantics__: — STATUS: PARTIALLY "Move to event handler" remains a code replacement but is gated behind the `unsafeAutofix` option. Consider changing to text-only guidance.
- __`looksLikeSignal()` name logic__: — STATUS: DONE Removed remaining `endsWith(n.replace(/^[A-Z]/, ""))` usage; now rely on exact matches and suffix regex only.
- __Creator tracking completeness__: — STATUS: TODO No changes to alias/destructure propagation for `knownCreatorSignals` in this rule.
- __Render-context detection__: — STATUS: PARTIALLY Added handling for functions wrapped by `memo`/`forwardRef` (identifier or member callee). Factories and nested returns beyond these remain unhandled.
- __Fixer text reuse__: — STATUS: DONE Added trailing semicolons to all `useEffect` replacement strings to avoid ASI pitfalls.
- __Duplicate reports__: — STATUS: DONE Introduced `reportOnce()` wrapper to dedupe by `(messageId, node.range)`; replaced direct `context.report` calls.

## Recommendations / quick wins (status)

- __Import management__: — STATUS: DONE Implemented import insertion in all `suggestUseEffect` fixers.
- __Suggestion style__: — STATUS: PARTIALLY "Event handler" remains as code replacement behind `unsafeAutofix`; consider switching to text-only.
- __Tighten name heuristic__: — STATUS: PARTIALLY Remove remaining `endsWith(n.replace(/^[A-Z]/, ""))` usages and use exact matches + suffix regex only.
- __Docs__: — STATUS: TODO Update rule docs to reflect import insertion, tightened heuristics, and `unsafeAutofix` behavior.
- __Tests__: — STATUS: TODO Add tests for import insertion, render-context edge cases, deep mutations, and creator-based detection via aliases.
