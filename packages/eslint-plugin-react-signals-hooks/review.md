# Review: `no-mutation-in-render`

This document reviews the implementation of `packages/eslint-plugin-react-signals-hooks/src/no-mutation-in-render.ts` and provides recommendations for improvements, tests, and documentation.

## Purpose

- Enforce that reactive state (signals) is not mutated during React render.
- Encourage moving mutations into effects or event handlers.
- Provide autofix suggestions to wrap code in `useEffect` or extract an event handler.

## Rule Structure

- Defined via `createRule` pattern using `ESLintUtils.RuleCreator`.
- `meta` contains `type: "problem"`, `hasSuggestions: true`, `fixable: "code"`, schema and messages.
- Performance instrumentation mirrors other rules via `createPerformanceTracker`, `trackOperation`, `startPhase/endPhase`, and budget defaults.
- Options include:
  - `signalNames?: string[]` (defaults: `["signal", "useSignal", "createSignal"]`).
  - `allowedPatterns?: string[]` (allowlist for paths where mutations are permitted).
  - `severity?: { [MessageId]?: "error" | "warn" | "off" }` per message.
  - `performance?: PerformanceBudget`.

## Messages

- `signalValueAssignment` – direct `signal.value = ...` during render.
- `signalValueUpdate` – updates like `signal.value++`, `--signal.value`, `+=`, etc. during render.
- `signalPropertyAssignment` – mutating properties on a signal value.
- `signalArrayIndexAssignment` – mutating array indices of a signal value.
- `signalNestedPropertyAssignment` – mutating nested paths of signal values.
- Suggestions: `suggestUseEffect`, `suggestEventHandler`.

## Detection Logic

- Tracks render context via:
  - `renderDepth`, `hookDepth`, `functionDepth`, `inRenderContext` flags.
  - Enters render context on component function declarations or arrow function components (identifier starts with capital letter `/^[A-Z]/`).
  - Temporarily exits when entering hooks (`useEffect`, `useLayoutEffect`, `useCallback`, `useMemo`, `useImperativeHandle`) and `@preact/signals-core` primitives (`effect`, `computed`). Re-enters appropriately on `:exit` handlers.
- Mutation detection:
  - `AssignmentExpression` categorized by `getAssignmentType()`.
  - `UpdateExpression` covers `signal.value++` / `++signal.value`.
  - Checks if member access targets `.value` of a candidate signal identifier.
  - Signal identification uses `option.signalNames` by suffix or exact match heuristics in the code paths observed.
- Suggestions build basic fixes to:
  - Wrap the mutating node in `useEffect(() => { ... }, [dep])`.
  - Replace with `const handleEvent = () => { ... }`.

## Strengths

- Robust context tracking to avoid flagging mutations inside hooks/effects.
- Granular message IDs with per-ID severity configuration.
- Thoughtful suggestions for common migration paths (effect/event handler).
- Performance-aware with budgets and metrics consistent across the plugin.

## Gaps and Risks

- Signal detection relies on `signalNames` and variable name heuristics (e.g., matching suffix/drop-cased variants). It may:
  - Miss signals created/imported via namespaced creators (e.g., `signals.signal()`), unless variable names follow expected patterns.
  - Misidentify non-signals that incidentally end with the same suffix/pattern.
- `.value`-only focus:
  - Mutations of nested structures derived from `signal.value` are detected in some cases, but breadth across computed/indexed/optional chains may be incomplete.
  - Mutations on signal-like objects not using `.value` (custom wrappers) won’t be detected without extending detection.
- Suggestions:
  - The `useEffect` fixer may inject an incorrect dependency or empty `[]`. Deciding the right dependency is non-trivial and could lead to behavioral changes.
  - Insertion of a `handleEvent` function as a bare const may not be used; it is a guidance pattern more than a safe fix. Consider suggestions without auto-fix or mark as suggestion-only.
- Allowed patterns:
  - Option exists, but enforcement not clearly wired in the detection branches (ensure path allowlist is checked early to bail out for allowed files).
- Context estimation:
  - Component detection via capitalized identifiers may miss `export default function Component()` without name inference or HOC wrappers.
  - Nested function/hook depth logic is subtle; edge cases may let violations slip or over-report.

## Recommendations

1. Signal detection improvements
   - Reuse the creator/import-based detection utilities from `prefer-signal-reads` across the plugin.
   - Support namespaced creators and imported bindings for signals (e.g., `signals.signal`, `ReactSignals.computed`).
   - Add a configurable suffix regex, initialized per rule instance, if name-based heuristics remain.

2. Mutation coverage
   - Ensure coverage for:
     - `UpdateExpression` on `.value` with prefix/postfix forms.
     - `AssignmentExpression` with compound operators on `.value` (`+=`, `-=`, etc.).
     - Indexed and nested paths: `signal.value[i] = ...`, `signal.value.foo.bar = ...`.
     - Optional chaining forms: `signal.value?.foo = ...` (likely invalid LHS but ensure safe guards to avoid crashes).
   - Detect mutating methods invoked on `signal.value` references (e.g., `signal.value.push(x)`, `splice`, `sort`). Treat as mutation.

3. Suggestions and fixes
   - Prefer suggestions (non-fix) for structural changes like wrapping in `useEffect` or creating `handleEvent`.
   - If fixes are kept, gate with `unsafeAutofix` option and default to off.
   - For `useEffect` suggestion, avoid auto-inserting dependencies or compute them via a shared dependency analyzer (if available) to reduce risk.

4. Allowed patterns
   - Apply `allowedPatterns` early in `create()` by testing `context.filename` against provided regex patterns and bailing out when matched.
   - Consider per-message allowlists (e.g., allow array index mutations only in tests) in future.

5. Component and context detection
   - Expand component detection to include default exports and named exports without inline capitalized identifiers, e.g., `export default function Component()`.
   - Consider using TypeScript React type info if available (optional) to improve accuracy.

6. Performance & metrics
   - Maintain current budgets. Add targeted `trackOperation` calls around costly branches (member resolution, chained property walks).
   - Capture counts of flagged vs. skipped nodes for telemetry and tuning.

## Test Plan (to add/expand)

- Base render detection
  - Function declaration components, arrow function components, default exports, HOCs.
- Positive detections
  - `signal.value = 1` in render.
  - `signal.value++`, `++signal.value`, `signal.value += 2`.
  - `signal.value[i] = x`, `signal.value.foo.bar = x`.
  - `signal.value.push(x)`, `signal.value.splice(0,1)`, `signal.value.sort()`.
- Negative detections
  - Same patterns inside `useEffect`, `useMemo`, `useCallback` bodies.
  - Event handlers declared/used in render.
  - Mutations in files matching `allowedPatterns`.
- Creator/import-based signals
  - Variables created via `signal()`, `signals.signal()`, `ReactSignals.computed()` then mutated in render.
- Optional/edge cases
  - Optional chaining segments are parsed safely (no crashes). Ensure rule skips invalid LHS constructs.

## Documentation

- Add rule docs entry with:
  - Purpose and examples (❌ incorrect / ✅ correct).
  - Options: `signalNames`, `allowedPatterns`, `severity`, `performance`.
  - Notes on suggestions and the risks of `useEffect` autofix. Encourage manual review when applying fixes.

## Summary

The rule is thoughtfully designed with strong performance instrumentation and a clear goal. Its primary opportunities lie in unifying signal detection with creator/import analysis, expanding mutation pattern coverage (including method calls and nested/indexed paths), refining suggestions to be safer, and tightening allowed-pattern handling. With targeted tests and documentation, the rule will be robust and consistent with the rest of the plugin.
