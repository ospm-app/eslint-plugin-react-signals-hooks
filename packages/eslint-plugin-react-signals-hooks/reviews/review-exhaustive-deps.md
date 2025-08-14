# Review: `exhaustive-deps`

## Potential issues / edge cases

- __Autofix completeness__: Replacing arrays now preserves comments/formatting; multi-line arrays and trailing commas handled. — DONE
- __False positives/negatives with signals__: Complex signal usage (e.g., deep property chains, aliasing, destructuring) can be tricky; ensure `isSignal*` helpers consistently capture read paths. — DONE
- __Unknown custom hooks__: Reliance on `additionalHooks`/`experimental_autoDependenciesHooks` means missed detection without configuration. — DONE
- __Async effect warning__: `asyncEffect` messaging should guide wrapping async work rather than making the effect callback `async`. — DONE
- __Optional chaining projection__: Ensure `observedFormatted` vs. `formatDependency` doesn’t oscillate suggestions between variants. — DONE
- __Event functions in deps__: `useEffectEventInDependencyArray` suggests removing event-like functions; document rationale clearly. — DONE

## Recommendations / quick wins

- __Improve formatting-safe fixes__: Use source tokens to preserve whitespace/comments when replacing arrays. — DONE
- __Document signal behavior__: Clarify how signals influence dependency inference with examples (value reads, memoized selectors). — DONE
  - Examples: prefer `[sig.value]` over `[sig]`; combined reads like `[data.user?.name, sig.value]`.
  - Memoized selectors: `useMemo(() => select(sig.value), [sig.value])`.
- __Enhance custom hook detection__: Provide a cookbook for `additionalHooks` patterns and auto-deps usage. — DONE
  - Cookbook: `additionalHooks: "^(useMyEffect|useTracked)$"`; `experimental_autoDependenciesHooks: ["useMyEffect"]`.
- __Targeted staleness guidance__: Link from stale messages to examples of stable refs/memos/patterns. — DONE
  - Guidance: prefer stable refs via `useRef`, memoize callbacks with correct deps, lift constants.
- __Test matrix__: Cover deep optional chains, mixed signal + non-signal deps, duplicated paths with/without optionals, and large files to validate budgets. — DONE
  - Progress: Added cases for multi-line arrays with comments/trailing commas and for optional-chain duplicates.
    - `tests/exhaustive-deps/formatting-array-cases.test.tsx`
    - `tests/exhaustive-deps/optional-chains-duplicates.test.tsx`
  - Progress: Added mixed signal + non-signal deps.
    - `tests/exhaustive-deps/mixed-signal-nonsignal.test.tsx`
  - Progress: Added large-file performance budget case.
    - `tests/exhaustive-deps/large-file-budget.test.tsx`
