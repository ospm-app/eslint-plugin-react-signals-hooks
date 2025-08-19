# Review: `exhaustive-deps`

## Potential issues / edge cases

- __Autofix completeness__: Replacing arrays now preserves comments/formatting; multi-line arrays and trailing commas handled. — STATUS: DONE
- __False positives/negatives with signals__: Complex signal usage (e.g., deep property chains, aliasing, destructuring) can be tricky; ensure `isSignal*` helpers consistently capture read paths. — STATUS: DONE
- __Unknown custom hooks__: Reliance on `additionalHooks`/`experimental_autoDependenciesHooks` means missed detection without configuration. — STATUS: DONE
- __Async effect warning__: `asyncEffect` messaging should guide wrapping async work rather than making the effect callback `async`. — STATUS: DONE
- __Optional chaining projection__: Ensure `observedFormatted` vs. `formatDependency` doesn’t oscillate suggestions between variants. — STATUS: DONE
- __Event functions in deps__: `useEffectEventInDependencyArray` suggests removing event-like functions; document rationale clearly. — STATUS: DONE

## Recommendations / quick wins

- __Improve formatting-safe fixes__: Use source tokens to preserve whitespace/comments when replacing arrays. — STATUS: DONE
- __Document signal behavior__: Clarify how signals influence dependency inference with examples (value reads, memoized selectors). — STATUS: DONE
  - Examples: prefer `[sig.value]` over `[sig]`; combined reads like `[data.user?.name, sig.value]`. — STATUS: DONE
  - Memoized selectors: `useMemo(() => select(sig.value), [sig.value])`. — STATUS: DONE
- __Enhance custom hook detection__: Provide a cookbook for `additionalHooks` patterns and auto-deps usage. — STATUS: DONE
  - Cookbook: `additionalHooks: "^(useMyEffect|useTracked)$"`; `experimental_autoDependenciesHooks: ["useMyEffect"]`. — STATUS: DONE
- __Targeted staleness guidance__: Link from stale messages to examples of stable refs/memos/patterns. — STATUS: DONE
  - Guidance: prefer stable refs via `useRef`, memoize callbacks with correct deps, lift constants. — STATUS: DONE
- __Test matrix__: Cover deep optional chains, mixed signal + non-signal deps, duplicated paths with/without optionals, and large files to validate budgets. — STATUS: DONE
  - Progress: Added cases for multi-line arrays with comments/trailing commas and for optional-chain duplicates. — STATUS: DONE
    - `tests/exhaustive-deps/formatting-array-cases.test.tsx` — STATUS: DONE
  - Progress: Added mixed signal + non-signal deps. — STATUS: DONE
    - `tests/exhaustive-deps/mixed-signal-nonsignal.test.tsx` — STATUS: DONE
  - Progress: Added large-file performance budget case. — STATUS: DONE
    - `tests/exhaustive-deps/large-file-budget.test.tsx` — STATUS: DONE
