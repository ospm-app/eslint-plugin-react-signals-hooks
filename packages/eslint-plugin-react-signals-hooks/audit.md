# ESLint Plugin React Signals Hooks — Rule Audit

This document audits each rule under `packages/eslint-plugin-react-signals-hooks/src/` against its corresponding spec in `packages/eslint-plugin-react-signals-hooks/specs/`. For each rule:

- Purpose and intended behavior (from spec)
- Implementation summary (from code, read end-to-end)
- Options and messages
- Autofix behavior
- Inconsistencies (spec vs implementation)
- Suggestions and actionable fixes

Progress legend: [✓ audited] [⟲ in progress] [✗ missing spec]

---

## 1) require-use-signals [✓]

- __Files__: `src/require-use-signals.ts`, `specs/spec-require-use-signals.md`

### Purpose (spec)

- Enforce calling `useSignals()` in components that use signals.
- Detects signal usage via:
  - Direct signal access
  - `signal.value`
  - Variables with `Signal` suffix
- Autofix adds `useSignals()` at component start and necessary import.
- Options: `ignoreComponents: string[]`.
- Message: `missingUseSignals`: "Component '{{componentName}}' uses signals but is missing useSignals() hook".

### Implementation summary

- Tracks component candidates: `FunctionDeclaration`, `ArrowFunctionExpression`, `FunctionExpression`, and `ExportDefaultDeclaration` with capitalized name or default export.
- Tracks whether `useSignals()` is called (including local alias support via named import from `@preact/signals-react/runtime`).
- Signal usage detection:
  - Heuristic by suffix: identifiers with configurable suffix (default `'Signal'`), including `.value`/`.peek()` access on such identifiers.
  - Concrete tracking of variables initialized via `signal()` or `computed()`, including namespaced imports from `@preact/signals-react`.
  - Treats `.value`/`.peek()` on tracked variables as usage.
  - Filters out many non-value contexts (types, import/export, member object position, JSX identifiers, property keys, etc.) to reduce false positives.
- Reports if:
  - A component uses signals
  - No `useSignals()` is called
  - Component name not in ignored set
  - Per-message severity is not `off`.

### Options and messages (implementation)

- `ignoreComponents?: string[]` (matches spec)
- `suffix?: string` (default `'Signal'`) — used by suffix heuristic
- `severity?: { missingUseSignals?: 'error' | 'warn' | 'off' }` — per-message control
- `performance?: PerformanceBudget` — metrics, node/time/memory/op budgets
- Message text differs:
  - Implementation: "Component '{{componentName}}' reads signals; call useSignals() to subscribe for updates"
  - Spec: "uses signals but is missing useSignals() hook"

### Autofix (implementation)

- Inserts `useSignals();` at top of function body, respecting string directives (e.g. `'use client'`).
- For expression-bodied arrow components, converts to block: `{ useSignals(); return <expr>; }`.
- Imports handling:
  - If an import from `@preact/signals-react/runtime` exists, add named `useSignals` if missing (append to existing named imports or add a separate import statement if none).
  - Otherwise, insert `import { useSignals } from '@preact/signals-react/runtime';` before first top-level node.

### Inconsistencies

- __Message text__: Spec and implementation differ. Both are acceptable semantically, but tools/tests relying on exact text may fail.
- __Options coverage__: Spec only documents `ignoreComponents`. Implementation adds `suffix`, `severity`, and `performance`.
- __Signal detection detail__: Spec mentions "direct signal access"; implementation uses suffix heuristic and tracked creators plus `.peek()` (not mentioned in spec).

### Suggestions

- __Align message__: Either update spec message to implementation wording or change implementation message to spec’s exact string.
- __Document options__: Extend spec to document `suffix`, `severity`, and `performance`.
- __Mention .peek__ in spec: Add `.peek()` to handled cases for completeness.
- __Add tests/spec examples__:
  - Expression-bodied arrow component autofix to block with `return`.
  - Respecting string directives position when inserting `useSignals()`.
  - Local alias of `useSignals` import.
  - Namespaced signal/computed creators from `@preact/signals-react`.

---

## 2) no-mutation-in-render [⟲]

- __Files__: `src/no-mutation-in-render.ts`, `specs/spec-no-mutation-in-render.md`

### Purpose (spec)

- Disallow mutating signals during render.
- Detect:
  - Direct `signal.value = ...`
  - Operators `++`, `--`, `+=`, `-=` on `signal.value`
  - Property assignment `signal.value.prop = ...`
  - Array index `signal.value[i] = ...`
  - Nested property `signal.value.a.b = ...`
- Options:
  - `signalNames: string[]` (default `['signal','useSignal','createSignal']`)
  - `allowedPatterns: string[]`
  - `severity` per violation kind
  - `performance` budgets and metrics
- Messages match each violation; suggestions: wrap in `useEffect`, or move to event handler.

### Implementation summary (read end-to-end; key points)

- Maintains render context via counters: `inRenderContext`, `renderDepth`, `hookDepth`, `functionDepth`.
  - Enters render on top-level component function declarations/expressions with capitalized names and on variable-declared arrow components.
  - Exits render on function boundaries, nested functions, and on recognized hooks/effects (`useEffect`, `useLayoutEffect`, `useCallback`, `useMemo`, `useImperativeHandle`, plus `effect`/`computed` from signals core).
- Options:
  - `signalNames`, `allowedPatterns`, `severity` (per message), `performance` (matches spec and perf schema in codebase).
- Messages include: `signalValueAssignment`, `signalValueUpdate`, `signalPropertyAssignment`, `signalArrayIndexAssignment`, `signalNestedPropertyAssignment`, plus suggestions `suggestUseEffect`, `suggestEventHandler`.
- Defaults match spec for `signalNames` and all severities=`error`.
- Detects update expressions like `signal.value++` and reports `signalValueUpdate` with suggestions.
- Multiple `fix` suggestion builders provide the two suggestions using `useEffect` or a handler template.

### Inconsistencies / clarifications

- __allowedPatterns enforcement__: Spec lists the option; ensure code actually checks filename against patterns to skip reporting. Implementation file is large; pattern filtering wasn’t observed in the snippets surfaced. Verify presence of pattern-based early returns before reports.
- __Signal detection basis__: Spec frames rule in terms of `signal.value`. Implementation appears keyed on `.value` accesses with identifier-based name checks against `signalNames` suffix stripping. Confirm it also handles nested member/property and computed member cases for assignment targets.
- __Suggestion severity keys__: Spec doesn’t mention severities for suggestion IDs; implementation includes them. This is fine but should be documented.

### Suggestions

- __If missing__: Implement `allowedPatterns` filename filtering prior to reporting to honor opt-outs.
- __Expand detection__: Ensure coverage for:
  - `signal.value.prop = ...`, `signal.value[0] = ...`, and nested paths.
  - Compound assignments `+=`, `-=`, `*=`, `/=` on `signal.value` and on nested members.
  - Pre/post increment covered (observed); ensure both forms.
- __Document options__: Add `severity` per message and `performance` to the spec.
- __Tests/specs__: Add explicit examples for each mutation kind and for suggestions in both block and expression contexts.

---

## 3) exhaustive-deps [✓]

- __Files__: `src/exhaustive-deps.ts`, `specs/specs-exhaustive-deps.md`

### Purpose (spec)

- Verify proper dependency arrays for React hooks.
- Detect missing, unnecessary, and duplicate dependencies; validate array structure.
- Handle special hooks: `useEffect`, `useLayoutEffect`, `useMemo`, `useCallback`, custom hooks via pattern, and `useEffectEvent`.
- Consider performance budgets and signal integration.

### Implementation summary

- Rule: `exhaustiveDepsRule` with `fixable: "code"` and `hasSuggestions: true` in `meta`.
- Detects reactive hooks via `getReactiveHookCallbackIndex()` supporting `useEffect`, `useLayoutEffect`, `useCallback`, `useMemo`, `useImperativeHandle`, and `additionalHooks` regex.
- Analyzes callback function via `visitFunctionWithDependencies()` to collect:
  - `dependencies` map with usage metadata (reads, stability, optional chains, formatted variants).
  - `declaredDependencies` from dependency array (including null for auto-deps hooks).
  - Stable/external deps, constructions, and scope relationships across closures.
- Recommendation builder `collectRecommendations()` computes sets for missing, unnecessary, duplicate deps, and formats suggestions; special handling for signals:
  - Tracks `.value` and `.value[...]` paths.
  - Recognizes signal bases via `isSignalDependency()` with suffix regex (`suffixByPerfKey`).
  - Avoids recommending base signal if `.value` is present and used.
- Validation for structure: reports `notArrayLiteral` when deps is not an array literal; reports `missingDependencies` for `useMemo`/`useCallback` with no deps (or auto-deps null for configured hooks).
- Async effect callback detection: reports `asyncEffect` for `async` functions; `missingEffectCallback` when first arg isn’t a function.
- Additional utilities: alphabetization checks, dynamic property/computed member traversal, optional chaining projection, and construction scanning for items used outside the hook.

### Options and messages (implementation)

- Options (`defaultOptions` observed):
  - `unsafeAutofix?: boolean` (default false)
  - `additionalHooks?: RegExp`
  - `experimental_autoDependenciesHooks?: string[]`
  - `requireExplicitEffectDeps?: boolean`
  - `enableAutoFixForMemoAndCallback?: boolean`
  - `performance?: PerformanceBudget` (supports `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, `maxOperations` per `PerformanceOperations`)
- Messages (`MessageIds` includes):
  - Core: `missingDependencies`, `missingDependency`, `unnecessaryDependencies`, `unnecessaryDependency`, `duplicateDependencies`, `duplicateDependency`.
  - Structure/special: `unknownDependencies`, `notArrayLiteral`, `missingEffectCallback`, `asyncEffect`, `useEffectEventInDependencyArray`, `spreadElementInDependencyArray`.
  - Suggestions: `addAllDependencies`, `addSingleDependency`, `addDependencies`, `removeDependencyArray`, `removeDependency`, `removeSingleDependency`, `removeAllDuplicates`, `removeAllUnnecessaryDependencies`, `removeThisDuplicate`, `moveInsideEffect`.

### Autofix (implementation)

- Provides fixes and suggestions to:
  - Add or remove dependencies (single/all) and cleanup duplicates/unnecessary.
  - Replace/format the dependency array literal where safe.
  - Move specific calls inside the effect (`moveInsideEffect`).
- Fix safety is gated by options like `unsafeAutofix` and explicit enablement for memo/callback.

### Inconsistencies

- __Option naming__: Spec references `enableDangerousAutofixThisMayCauseInfiniteLoops`; implementation uses `unsafeAutofix`. Recommend aligning naming (prefer shorter `unsafeAutofix`) and documenting equivalence.
- __Spec coverage__: Spec mentions high-level error messaging but not per-message severity toggles; implementation schema supports per-message severity (enum: `error|warn|off`) across many message IDs.
- __Signal integration detail__: Spec states signal integration; implementation specifically handles `.value` and indexing on signals and avoids suggesting base signal when `.value` is used. Suggest expanding spec with these details.
- __Auto-deps hooks__: Implementation supports `experimental_autoDependenciesHooks` and treats `null` deps specially; ensure spec explicitly documents null-deps behavior for such hooks.

### Suggestions

- __Document options__: Add `unsafeAutofix`, `experimental_autoDependenciesHooks`, `requireExplicitEffectDeps`, `enableAutoFixForMemoAndCallback`, and detailed `performance` schema. Clarify per-message severity controls.
- __Clarify signals__: In spec, call out handling of `signal.value`, `signal.value[i]`, and avoiding base signal in recommendations when `.value` is present.
- __Tests__: Add cases for
  - Async effects (`asyncEffect`) and missing callback (`missingEffectCallback`).
  - Non-array deps (`notArrayLiteral`) with suggested correct form.
  - Signals: recommend `.value` rather than base; ensure not to add both.
  - Auto-deps hooks with `null` dependency arrays and correct reporting.
  - Optional chaining variants and computed members in dependencies.
  - Memo/Callback autofix behind `enableAutoFixForMemoAndCallback`.
- __Option naming alignment__: Rename spec’s dangerous autofix option to `unsafeAutofix` and include a cautionary note about potential infinite loops.

## 4) no-non-signal-with-signal-suffix [✓]

- __Files__: `src/no-non-signal-with-signal-suffix.ts`, `specs/spec-no-non-signal-with-signal-suffix.md`

### Purpose (spec)

- Enforce that identifiers with the `Signal` suffix actually refer to signal instances.
- Covers variables, function/method parameters, and object/class properties.
- Provides suggestions to rename without the suffix or convert to a signal.

### Implementation summary

- Rule: `noNonSignalWithSignalSuffixRule` with `fixable: 'code'` and `hasSuggestions: true` (`meta` in `src/no-non-signal-with-signal-suffix.ts`).
- Signal detection:
  - Tracks imports from `@preact/signals-react` including specifiers and namespace imports.
  - Recognizes creators via names set from options (defaults include `signal`, `useSignal`, `createSignal`) and built-ins like `useComputed`, `useSignalEffect`, `useSignalState`, `useSignalRef`.
  - Resolves identifiers to their variable defs and checks initializer via `isSignalExpression()` and `isSignalCreation()`.
- Checks:
  - `VariableDeclarator`: when identifier matches suffix regex and isn’t a signal; reports with rename and convert-to-signal suggestions.
  - `FunctionDeclaration/FunctionExpression/ArrowFunctionExpression` parameters: if parameter name ends with suffix and not a signal type/expression; suggests rename and conversion where applicable.
  - Object/Class properties: if key ends with suffix and value is not a signal; suggests rename or conversion.
- Performance:
  - Integrates performance tracker (`createPerformanceTracker`, `startTracking`, `trackOperation`) with budgets (`DEFAULT_PERFORMANCE_BUDGET`), node counting

### Options and messages (implementation)

- Options (`Option` / `defaultOptions`):
  - `ignorePattern?: string` (default: empty string)
  - `signalNames?: string[]` (default: `['signal', 'useSignal', 'createSignal']`)
  - `suffix?: string` (default: `Signal`)
  - `validateProperties?: boolean` (default: true)
  - `severity?: { [MessageId]: 'error'|'warn'|'off' }` (defaults set for variable/parameter/property to 'error')
  - `performance?: PerformanceBudget` (maxTime, maxMemory, maxNodes, enableMetrics, logMetrics, maxOperations)
- Messages (`MessageIds`):
  - `variableWithSignalSuffixNotSignal`
  - `parameterWithSignalSuffixNotSignal`
  - `propertyWithSignalSuffixNotSignal`
  - `suggestRenameWithoutSuffix`
  - `suggestConvertToSignal`

### Autofix and suggestions

- Rename suggestions for identifiers/properties removing the suffix.
- Convert-to-signal fix for variables: replaces initializer with `signal(<init||null>)` construction.
- Similar rename suggestions for parameters and properties.
- Performance message reported when budgets exceeded; does not autofix.

### Inconsistencies

- __Option naming__: Spec uses `ignorePatterns: string[]`; implementation uses `ignorePattern: string`. Align on one (recommend `ignorePattern` or add support for array in code/spec).
- __Option coverage__: Spec mentions `signalNames`, `severity`, and performance budgets; does not mention `suffix` or `validateProperties`. Implementation supports both; add to spec.
- __Message wording__: Spec messages are shorter/generic; implementation messages are more descriptive. Consider syncing wording examples in spec to match `meta.messages` text.
- __Parameter typing detail__: Spec frames parameters "typed as signals"; implementation determines signals via expression/creation and variable def resolution. If TS type narrowing is intended, clarify whether type information is considered or out of scope.
- __Namespace/alias imports__: Implementation handles namespace imports and aliases from `@preact/signals-react`; spec does not call this out. Document in spec.

### Suggestions

- __Spec updates__:
  - Document `suffix` and `validateProperties` options and defaults.
  - Clarify `ignorePattern` vs `ignorePatterns` and intended matching semantics (single regex string or list). Provide examples.
  - Include explicit note that namespace and aliased imports are recognized.
- __Tests__:
  - Variables/params/properties with suffix created via custom creator in `signalNames`.
  - Namespace import usage: `Signals.signal(...)`, alias imports, and local aliasing.
  - `ignorePattern` filtering examples (match and non-match) and exported/public API names not being renamed if intentionally skipped.
  - Property renaming and conversion fixes, including computed and string-literal keys.
  - Parameter rename suggestion with default values and destructuring.
  - Performance budget exceedance path to ensure message is reported and traversal halts.

## 5) no-signal-assignment-in-effect [✓]

- __Files__: `src/no-signal-assignment-in-effect.ts`, `specs/spec-no-signal-assignment-in-effect.md`

### Purpose (spec)

- Prevent direct assignments to signals inside React `useEffect`/`useLayoutEffect`.
- Recommend using `useSignalsEffect` or `useSignalsLayoutEffect` from `@preact/signals-react/runtime` instead.
- Options documented: `signalNames: string[]`, `allowedPatterns: string[]`, `severity` object, `performance` budget.
- Error messages documented (spec minimally lists `avoidSignalAssignmentInEffect`).

### Implementation summary

- Rule: `noSignalAssignmentInEffectRule` with `meta.fixable: 'code'` and `hasSuggestions: true`.
- Effect detection: `isEffectHook()` checks callee identifier equals `useEffect` or `useLayoutEffect`.
- Traversal: pushes an `Effect` frame on encountering an effect call; walks the effect callback body and collects `signalAssignments` via `visitNode()` and `isSignalAssignment()`.
- Signal detection:
  - Tracks variables initialized from calls whose callee name endsWith any configured `signalNames` (default: `signal`, `useSignal`, `createSignal`).
  - Heuristic: treats `Identifier.value` as a signal write when the identifier name endsWith any configured `signalNames`. Caches checks (`signalNameCache`) and records such identifiers in `signalVariables`.
- Reporting: for each effect frame, reports either `avoidSignalAssignmentInEffect` or `avoidSignalAssignmentInLayoutEffect` with suggestions.
- Performance: integrates `createPerformanceTracker`, `trackOperation`, node budget check `shouldContinue()`, and `DEFAULT_PERFORMANCE_BUDGET`.

### Options and messages (implementation)

- Options (`defaultOptions` in `src/no-signal-assignment-in-effect.ts`):
  - `signalNames?: string[]` — default `["signal", "useSignal", "createSignal"]`.
  - `allowedPatterns?: string[]` — default `[]` (see inconsistency below on enforcement).
  - `severity?: { [MessageId]: 'error'|'warn'|'off' }` — default maps all known IDs to `"error"`.
  - `performance?: PerformanceBudget` — `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, `maxOperations` keyed by `PerformanceOperations`.
- Message IDs (`MessageIds`):
  - `avoidSignalAssignmentInEffect`
  - `avoidSignalAssignmentInLayoutEffect`
  - `suggestUseSignalsEffect`
  - `suggestUseSignalsLayoutEffect`
  - Also includes dependency-related IDs: `missingDependencies`, `unnecessaryDependencies`, `duplicateDependencies` (appear unused by this rule logic; likely legacy/copy-over).
- Message texts (`meta.messages`):
  - Main warnings advise avoiding direct assignments and recommend the corresponding `useSignals*` hook.
  - Suggestion messages: "Use useSignalsEffect …" and "Use useSignalsLayoutEffect …".

### Autofix and suggestions (implementation)

- Provides suggestions that replace the entire effect call expression text:
  - For `useEffect`, a suggestion builds ``effect(() => …)``.
  - For `useLayoutEffect` a suggestion builds ``effect(() => …)``.
- These suggestion builders do NOT:
  - Insert or update imports from `@preact/signals-react`.
  - Preserve the full original call (dependencies array handling is simplistic: uses callback body range and the second argument range when present).

### Inconsistencies (spec vs implementation)

- __Autofix target__: Spec says to recommend `useSignalsEffect` / `useSignalsLayoutEffect`. Implementation suggests `effect` (non-existent in React runtime and different from spec). This is a significant deviation. `effect` is correct, need to fix specs.
- __Import handling__: Spec implies using runtime hooks; implementation does not add imports. Missing.
- __Error messages in spec__: Spec only lists `avoidSignalAssignmentInEffect`. Implementation adds `avoidSignalAssignmentInLayoutEffect`, suggestion IDs
- __Dependency-related messages__: Implementation defines `missingDependencies`, `unnecessaryDependencies`, `duplicateDependencies` which the rule does not emit. Likely accidental carry-over; remove from schema/messages or document if intentionally planned.
- __`allowedPatterns` enforcement__: Option exists in schema and defaults, but no enforcement was found in the rule body. There is no filename-pattern check that skips reporting. Spec documents it; implementation appears to omit it.
- __Signal detection heuristic__: Implementation treats any `identifier.value` as a signal write if the identifier name endsWith any `signalNames`. This heuristic may over-report. Spec doesn’t describe name-based detection; consider documenting the heuristic and/or strengthening detection (e.g., definition-based tracking only).
- __Effect aliasing__: Only recognizes identifiers `useEffect`/`useLayoutEffect`; spec doesn’t discuss aliasing, which is fine, but worth noting as a limitation.

### Actionable suggestions

- __Fix autofix suggestions__:
  - Replace suggestion builders to use `useSignalsEffect` / `useSignalsLayoutEffect`.
  - Implement import insertion/update: add `import { useSignalsEffect, useSignalsLayoutEffect } from '@preact/signals-react/runtime'` as needed; merge with existing imports when present.
  - Preserve dependencies arg: transform only the callee identifier when safe instead of replacing the entire call text.
- __Enforce `allowedPatterns`__:
  - Add a filename pattern matcher using the configured regex strings to skip reporting when the current file path matches an allowed pattern.
- __Prune stray messages__:
  - Remove `missingDependencies`/`unnecessaryDependencies`/`duplicateDependencies` from this rule’s messages and severity schema, or guard them as unused for now. Align spec accordingly if you keep them.
- __Document options in spec__:
  - List all message IDs (including layout effect and performance) and the per-message severity controls.
  - Document performance budget fields following the shared schema used across rules.
- __Improve detection__ (optional):
  - Prefer variable-definition-based tracking (already partially implemented via `visitNode` on declarators) over name-suffix heuristic for `identifier.value` when feasible to reduce false positives.

## 6) no-signal-creation-in-component [✓]

- __Files__: `src/no-signal-creation-in-component.ts`, `specs/spec-no-signal-creation-in-component.md`

### Purpose (spec)

- Prevent creating signals (`signal()`, `computed()`) inside React components, custom hooks, or effects.
- Encourage moving creation to module scope or extracting into a custom hook to avoid per-render creations, leaks, and perf issues.

### Implementation summary

- Rule: `noSignalCreationInComponentRule` (`meta.fixable: 'code'`, `hasSuggestions: true`).
- Context tracking: maintains `functionStack`, booleans `inComponent`, `inHook` via `isReactComponent()` and `isHookFunction()`. Sets `inEffect` when visiting effect callbacks.
- Signal create detection (in `CallExpression`):
  - Identifier calls matched against `signalCreatorLocals` (import/alias-aware).
  - Namespaced calls `ns.signal`/`ns.computed` where `ns` is in `signalNamespaces`.
  - Fallback heuristic: any member `.signal` or `.computed`.
- Reports `avoidSignalInComponent` when creation occurs in component/hook/effect; offers two suggestions.
- Performance: `createPerformanceTracker`, `trackOperation`, `shouldContinue()` on `maxNodes`. No explicit performance warning message.

### Options and messages (implementation)

- Options schema: `{ severity?: { [MessageId]: 'error'|'warn'|'off' }, performance?: PerformanceBudget }`.
- Defaults: `{ performance: DEFAULT_PERFORMANCE_BUDGET }` (no default severities provided, so `getSeverity()` falls back to `error`).
- Message IDs: `avoidSignalInComponent`, `suggestMoveToModuleLevel`, `suggestMoveToCustomHook`, `moveToModuleLevel`, `createCustomHook`.
- Spec’s described messages align (move to module level / create custom hook).

### Autofix and suggestions (implementation)

- __Move to module level__: inserts `const <varName> = <signalName>(<signalValue>);` before the first node; replaces call site with `<varName>`. Moves leading comments with the declaration (`getLeadingCommentsText()`).
- __Create custom hook__: inserts a new top-level `function useXxx() { return <signalName>(<signalValue>); }` after the last import (or at start). Uses `generateUniqueHookName()` to avoid collisions; replaces call site with `<hookName>()`.

### Inconsistencies (spec vs implementation)

- __Class component methods__: Spec says to catch creation in class component methods. Implementation focuses on function components and does not detect class methods; likely missing.
- __Severity option doc__: Spec omits per-message `severity` option; implementation supports it.
- __Performance docs__: Spec lists performance options; ensure it mentions `maxOperations` keyed by `PerformanceOperations` for parity with other rules.
- __Heuristic fallback__: Broad `.signal`/`.computed` member fallback may over-report; not called out in spec.
- __Effect set coverage__: Implementation flags `useEffect`/`useLayoutEffect`. If other variants are desired, specify; aliases aren’t handled.

### Actionable suggestions

- __Add class method coverage__: detect `ClassDeclaration`/`ClassExpression` React components and flag `signal()`/`computed()` in methods (e.g., `render`).
- __Document severity & performance__ in the spec, including `maxOperations`.
- __Consider narrowing the heuristic__ (prefer import/alias-based detection; keep fallback as off by default or guarded).
- __Unify insertion strategy__: consistently insert after the last import and preserve comments/spacing in both suggestions.

## 7) prefer-batch-updates [✓]

- __Files__: `src/prefer-batch-updates.ts`, `specs/spec-prefer-batch-updates.md`

### Purpose (spec)

- Detect multiple signal updates in the same scope and suggest wrapping them in `batch()` to reduce renders.
- Handle direct assignments, method calls (`set`, `update`), ++/--, and compound assignments.
- Ignore updates already inside `batch()` and analyze nested scopes appropriately.

### Implementation summary

- Rule: `preferBatchUpdatesRule` with `meta.fixable: 'code'` and `hasSuggestions: true`.
- Detection:
  - `isSignalUpdate(node)` covers `AssignmentExpression` to `.value`, `CallExpression` with `.set`/`.update`, `UpdateExpression` on `.value`.
  - Signal reference heuristic `isSignalReference()` checks identifier names ending with `Signal/signal/Sig/sig` and chained `.value` members.
  - Tracks if already inside batch via `batchScopeStack` plus ancestor scan (`isInsideBatchCall()` and `isBatchCall()` resolving imports/aliases of `batch`).
- Grouping logic:
  - Walks blocks via `processBlock()` to collect `SignalUpdate`s per immediate scope, honoring `minUpdates` and skipping nested scopes as needed.
  - Avoids scanning when `inBatch` and enforces budgets via `shouldContinue()` and performance tracker utilities.
- Signal detection:
  - Import-aware. Tracks creators (`signal`, `computed`) imported from `@preact/signals-react` (including via namespace) and marks variables initialized by those creators as signals.
  - Updates are recognized only when operating on tracked signal variables (e.g., `.value` assignments/updates, `.set`, `.update`).
- Reporting:
  - Emits `useBatch` with count and suggestion messages when threshold met and not inside a batch.
  - Inside an existing `batch()` callback:
    - Emits `nonUpdateSignalInBatch` for pure reads (no update) expressions.
    - When there is exactly one signal update in the callback body, emits `removeUnnecessaryBatch` even if other non‑update statements are present. Provides an autofix only when the body has a single statement and it is the update; otherwise reports without a fixer.

### Options and messages (implementation)

- Options:
  - `minUpdates` (default 2).
  - `performance` budget: `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, `maxUpdates`, `maxDepth`, and `maxOperations` keyed by `PerformanceOperations`.
  - `severity` per message id.
- Message IDs and texts match spec plus an extra:
  - `useBatch`, `suggestUseBatch`, `addBatchImport`, `wrapWithBatch`, `useBatchSuggestion`, `removeUnnecessaryBatch`.
 text "Performance limit exceeded: {{message}}".
- Defaults set all severities to `error`/`warn` appropriately in `defaultOptions`.

### Autofix and suggestions (implementation)

- Insert batch import if missing: `import { batch } from '@preact/signals-react';` before first import or program start.
- Replace the contiguous range of collected updates with `batch(() => { /* updates */ })`.
- Multiple fix paths exist in code to handle formatting variants (single-line and multi-line insertion).
- Skips offering wrapping when already inside a batch (via `batchScopeStack`).
- When a `batch` callback body contains exactly one signal update statement, emits `removeUnnecessaryBatch` and autofixes by replacing the entire `batch(...)` call with the inner single statement (preserving semicolons). Severity controlled per-message.

### Inconsistencies (spec vs implementation)

- __Spec/documentation alignment__: Spec and docs have been updated to include both `removeUnnecessaryBatch` and `nonUpdateSignalInBatch`, including the case where exactly one update exists alongside other non‑update statements (report both; fixer only when single statement).
- __Nested control-flow guidance__: Spec mentions wrapping whole control flow for loops/while. Implementation groups by immediate scope but does not include special casing for wrapping entire loop constructs; wrapping range is from first to last update statements, which may only partially cover loop bodies depending on placement.
- __Signal reference heuristic__: Name-suffix heuristic may over-report in non-signal variables; spec doesn’t mention heuristic or its limitations.
- __Severity docs__: Implementation supports per-message `severity`, spec does not document it.

### Actionable suggestions

- __Ensure tests cover dual-reporting__: DONE. Fixtures added and verified in `tests/prefer-batch-updates` for single-update + read inside `batch()` reporting both messages; fixer only in single-statement body.
- __Clarify grouping semantics in spec__: DONE. Spec updated to state minimal contiguous range in same scope and guidance for control-flow constructs.
- __Consider tightening isSignalReference__: FUTURE WORK. Potential improvement: incorporate import-aware/type-aware checks to reduce false positives; alternatively document limitations more explicitly if we keep heuristic.

## 8) prefer-computed [✓]

- __Files__: `src/prefer-computed.ts`, `specs/spec-prefer-computed.md`

### Purpose (spec)

- Encourage replacing `useMemo` that depends on signals with `computed()` from `@preact/signals-react` for automatic dependency tracking and performance.
- Handle direct `signal.value` and identifier-style dependencies, support multiple dependencies, and auto-import `computed` if missing.

### Implementation summary

- Rule: `preferComputedRule` with `meta.fixable: 'code'` and `hasSuggestions: true`.
- Detection:
  - Targets `CallExpression` of `useMemo`.
  - Analyzes the dependency array argument; for each element uses `getSignalDependencyInfo()` to detect signal deps via suffix regex built by `buildSuffixRegex()`.
  - Supports two message paths:
    - Single signal dep -> `preferComputedWithSignal` with `signalName`.
    - Multiple signal deps -> `preferComputedWithSignals` with `signalNames` list.
- Performance: full tracker integration (`createPerformanceTracker`, `trackOperation`, `startPhase`/`endPhase`), node budget (`shouldContinue()`)

### Options and messages (implementation)

- Options:
  - `performance` budget with `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, and `maxOperations` keyed by `PerformanceOperations`.
  - `severity` per message id with defaults applied in `getSeverity()`.
  - `suffix` (string) to customize what constitutes a signal name suffix; used by `buildSuffixRegex()` and `hasSignalSuffix()` for dependency detection.
- Default options: only `performance: DEFAULT_PERFORMANCE_BUDGET` provided; no default `severity` or `suffix` in `defaultOptions`.
- Message IDs: `preferComputedWithSignal`, `preferComputedWithSignals`, `suggestComputed`, `addComputedImport`, `suggestAddComputedImport`.

### Autofix and suggestions (implementation)

- Import handling: if `computed` is not imported from `@preact/signals-react`, the fixer either augments an existing import specifier list or inserts `import { computed } from '@preact/signals-react';` before the first program node.
- Suggestion messages: `suggestComputed`, `addComputedImport`, `suggestAddComputedImport` are emitted based on presence of deps and import state.

### Inconsistencies (spec vs implementation)

- __Severity option__: Implementation supports per-message `severity`; spec doesn’t document it.
- __Suffix configurability__: Implementation exposes a `suffix` option to tune detection; spec doesn’t document this option.
- __Dependency analysis scope__: Implementation strictly keys off the dependency array elements; spec is aligned but does not detail edge cases (e.g., non-literal deps, spread elements) — worth clarifying.

### Actionable suggestions

- __Document `severity`, `suffix`, and performance details__ in the spec, including `maxOperations`
- __Clarify supported dependency patterns__ in the spec (identifiers, member `.value`, spreads) and note limitations if any.
- __Tests__: Add tests for import augmentation (existing `@preact/signals-react` import without `computed`), multi-signal message formatting, custom `suffix`, and performance budget behavior.

## 9) prefer-for-over-map [✓]

- __Files__: `src/prefer-for-over-map.ts`, `specs/spec-prefer-for-over-map.md`

### Purpose (spec)

- Encourage using the `<For>` component from `@preact/signals-react` instead of `.map()` when rendering signal arrays for better fine‑grained reactivity and performance.
- Handles direct signal arrays and `.value` access; preserves mapping logic across different callback styles.

### Implementation summary

- Rule is defined with `meta.fixable: 'code'` and `hasSuggestions: true`.
- Detection via `isSignalArrayMap(node, suffixRegex)`:
  - Unwraps callee member to confirm `.map` call.
  - Extracts the receiver and determines if it’s a signal variable name (suffix regex) or a member chain whose base id matches the suffix; flags `.value` presence via `memberChainIncludesValue()`.
  - Caches results in `signalMapCache`.
- Reporting:
  - Emits `preferForOverMap` with suggest fix `suggestForComponent` when a signal array `.map()` is detected.
  - Severity per message via `getSeverity()`.
- Performance: integrated tracker (`createPerformanceTracker`, `trackOperation`, `startPhase`/`endPhase`), node budget with `shouldContinue()` using `maxNodes`.

### Options and messages (implementation)

- Options object (`Option`):
  - `performance?: PerformanceBudget` with `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, and `maxOperations` per `PerformanceOperations`.
  - `severity?: { preferForOverMap | suggestForComponent | addForImport }` each `'error' | 'warn' | 'off'`.
  - `suffix?: string` to customize the signal‑name suffix used by `buildSuffixRegex()`.
- Default options: `{ performance: DEFAULT_PERFORMANCE_BUDGET }`.
- `meta.messages` includes: `preferForOverMap`, `suggestForComponent`, `addForImport`.

### Autofix and suggestions (implementation)

- Primary fix builds a `<For each={...}>…</For>` replacement using `getForComponentReplacement()`:
  - Supports arrow functions (concise/block), function expressions, identifier callbacks, and other expressions by embedding as children.
  - Uses `signalName` or `signalName.value` based on detection.
- Import handling:
  - If `For` is not already imported from `@preact/signals-react` (checked via `checkForImport()`), fixer inserts a new `import { For } from '@preact/signals-react';` line before the first import (or first program node).
  - Does not merge into an existing `@preact/signals-react` import; inserts a separate import.
- Suggestions: `suggestForComponent` offered when enabled; may add import if allowed by `addForImport` severity.

### Inconsistencies (spec vs implementation)

- __Undocumented options__: Spec doesn’t document per‑message `severity`, `suffix`, or performance budget options; implementation supports all three.
- __Import augmentation behavior__: Spec says auto‑import `For` if missing; implementation inserts a new import rather than augmenting an existing `@preact/signals-react` import — acceptable but should be documented to set expectations.
- __React hooks constant__: `REACT_HOOKS` is defined but unused — likely leftover; consider removal or usage.

### Actionable suggestions

- __Spec updates__:
  - Document `severity`, `suffix`, and performance budget options
  - Clarify import behavior (insertion vs augmentation) to avoid surprises in formatting.
  - Optionally augment existing `@preact/signals-react` import instead of inserting a new import when present.
  - Remove the unused `REACT_HOOKS` constant.
- __Tests__:
  - `.map()` over `signal` vs `signal.value`.
  - All callback forms (concise/block arrow, function expression, identifier, and expression).
  - Import insertion when no imports; insertion before first import; and augmentation path if implemented.
  - Custom `suffix` option behavior and default suffix.
  - Performance `maxNodes` limiting path (no crashes, no reports beyond budget).

## 10) prefer-show-over-ternary [✓]

- __Files__: `src/prefer-show-over-ternary.ts`, `specs/spec-prefer-show-over-ternary.md`

### Purpose (spec)

- Encourage replacing ternary operators used in JSX for signal-based conditions with the `<Show>` component from `@preact/signals-react` to improve readability and performance.
- Supports complex conditions and configurable minimal complexity threshold.

### Implementation summary

- Rule: `preferShowOverTernaryRule` with `meta.fixable: 'code'` and `hasSuggestions: true`.
- Detection focuses on `ConditionalExpression` nodes whose parent is JSX (`isJSXNode(parent)`), i.e., ternaries inside JSX.
- Signal condition detection (test side) uses two heuristics:
  - Tracks local variables initialized via known creators in `option.signalNames` (default: `['signal','useSignal','createSignal']`) and checks their identifier presence in the test string.
  - Suffix-based detection via `buildSuffixRegex(option?.suffix)` and recursive scan of the test expression for identifiers/member chains whose base id matches the suffix.
- Complexity is computed by `getComplexity()` with additive scoring (JSX +1, CallExpression +1, ConditionalExpression +2) recursively across common AST keys. Rule triggers when `complexity >= minComplexity`.
- Performance: integrated tracker, node budget (`maxNodes`) via `shouldContinue()`, dynamic operation tracking per node type, and performance error handling during scope scanning.

### Options and messages (implementation)

- Options (`Option`):
  - `minComplexity?: number` (default 2).
  - `signalNames?: string[]` (default `['signal','useSignal','createSignal']`).
  - `suffix?: string` (default `'Signal'`) used by suffix-based identifier heuristic.
  - `performance?: PerformanceBudget` with budgets/metrics similar to other rules.
  - `severity?: { preferShowOverTernary | suggestShowComponent | addShowImport }` per-message levels.
- `meta.messages` includes: `preferShowOverTernary`, `suggestShowComponent`, `addShowImport`.
- Default options include `minComplexity`, `signalNames`, `suffix`, and `performance` budget; no default `severity` values beyond implicit `'error'` fallback.

### Autofix and suggestions (implementation)

- Suggestion `suggestShowComponent`: replaces the ternary with a `<Show when={test}>…</Show>`; when an alternate exists, adds `fallback={alternate}`. The generated text includes a `/* @ts-expect-error Server Component */` comment prefix.
- Suggestion `addShowImport`:
  - If no existing `@preact/signals-react` import, inserts `import { Show } from '@preact/signals-react';` before the first statement.
  - If present, augments the existing import specifiers by appending `, Show`.
- Import presence tracked via `hasShowImport` and verified in both initial pass and `Program` listener.

### Inconsistencies (spec vs implementation)

- __Undocumented options__: Spec doesn’t document `signalNames`, `suffix`, `severity`, or performance budget options; implementation supports all.
- __Injected comment__: The fix output includes a `/* @ts-expect-error Server Component */` comment, which the spec doesn’t mention. This may be surprising in client components; consider making it optional or removing.

### Actionable suggestions

- __Spec updates__:
  - Document `signalNames`, `suffix`, `severity`, and performance budget options
  - Clarify whether logical-AND (`condition && <JSX />`) should be transformed; if yes, update rule to support and document it. Otherwise, remove “without else” claim.
  - Note the presence (or configurability) of the `@ts-expect-error` comment in the autofix output.
- __Implementation improvements__:
  - Remove the dead `alternateText === ''` branch or extend detection to support `&&` expressions when enabled by an option (e.g., `transformLogicalAnd: boolean`).
  - Make the `@ts-expect-error` insertion optional (behind an option) or context-aware.
  - Consider unifying import augmentation logic with other rules for consistency.
- __Tests__:
  - Threshold behavior for `minComplexity` and nested conditions.
  - Detection via `signalNames`-initialized variables vs suffix-based identifiers; include false-positive guards.
  - Import augmentation vs insertion paths.

## 11) prefer-signal-effect [✓]

- __Files__: `src/prefer-signal-effect.ts`, `specs/spec-prefer-signal-effect.md`

### Purpose (spec)

- Replace `useEffect`/`useLayoutEffect` with `effect()` from `@preact/signals` when the dependency array contains only signals. Benefits: automatic dependency tracking, simpler code, and better performance.

### Implementation summary

- Rule: `preferSignalEffectRule` with `meta.type: 'problem'`, `fixable: 'code'`, `hasSuggestions: true`.
- Effect identification: builds `effectLocalNames` from React import aliases plus defaults, and `isUseEffectCall()` also handles member calls like `React.useEffect`/`React.useLayoutEffect`.
- Dependency analysis: requires exactly two args and the second to be an `ArrayExpression`; every element must satisfy `isSignalDependency()` which accepts `identifierWithSuffix` or `identifier.value` with configurable `suffix` (default `'Signal'`). Spread deps are ignored as non-signal.
- Reporting: emits `preferSignalEffect` when all deps are recognized as signals.
- Performance: standard integration (`createPerformanceTracker`, metrics, `maxNodes` via `shouldContinue()`).

### Options and messages (implementation)

- Options (`Option`):
  - `performance?: PerformanceBudget` with budgets/metrics fields (time, memory, nodes, maxOperations, enable/log metrics).
  - `severity?: { preferSignalEffect | suggestEffect | addEffectImport }` per-message levels.
  - `suffix?: string` to configure signal suffix detection.
- `meta.messages`: `preferSignalEffect`, `suggestEffect`, `addEffectImport`.
- Defaults: `performance: DEFAULT_PERFORMANCE_BUDGET`; no default `suffix` in `defaultOptions` (but helper defaults to `'Signal'`).

### Autofix and suggestions (implementation)

- Fixer (primary): replaces `useEffect(cb, deps)` with `effect(cb)` if and only if:
  - callback is an ArrowFunctionExpression or FunctionExpression,
  - has zero parameters,
  - and contains no top-level `return` (cleanup) in a block body.
  - Adds `import { effect } from '@preact/signals';` if missing (inserts new import before first import or first statement).
- Suggestion: `suggestEffect` mirrors replace behavior; also ensures `effect` import as needed.
- Import detection augments only by inserting a separate import; no merging into an existing `@preact/signals` import.

### Inconsistencies (spec vs implementation)

- __Undocumented options__: Spec doesn’t document `severity`, `suffix`, or performance budget options.
- __Safety constraints__: Spec says remove dependency array and preserve logic; implementation adds extra safety constraints (zero params, no cleanup) and otherwise skips autofix. This is stricter than spec; advisable but should be documented.
- __Import augmentation__: Spec promises preserving existing imports; implementation inserts a new `import { effect } ...` rather than augmenting an existing one. Consider clarifying/aligning.

### Actionable suggestions

- __Spec updates__:
  - Document `severity`, `suffix`, and performance options.
  - Clarify autofix preconditions (no cleanup return, zero-arg callback) and fallback to suggestion when unsafe.
  - Note import insertion vs augmentation behavior.
- __Implementation improvements__:
  - Optionally augment existing `@preact/signals` import instead of inserting a separate one.
  - Consider recognizing namespace/member `React.useEffect` aliasing more broadly in docs/examples.
- __Tests__:
  - Dep arrays with only signals: identifiers vs `.value`; spread elements should block.
  - Unsafe callback shapes (params, cleanup return) should report but not fix; suggestion still provided.
  - Import insertion before first import and augmentation path if implemented.

## 12) prefer-signal-in-jsx [✓]

- __Files__: `src/prefer-signal-in-jsx.ts`, `specs/spec-prefer-signal-in-jsx.md`

### Purpose (spec)

- Enforce direct signal usage in JSX by removing unnecessary `.value` (or `.peek()`) access, leveraging JSX auto-unwrapping for signals.

### Implementation summary

- Rule: `preferSignalInJsxRule` with `meta.fixable: 'code'`, `hasSuggestions: true`.
- Context tracking: maintains `jsxDepth` by incrementing on `JSXElement`/`JSXFragment` enter and decrementing on exit to ensure checks only inside JSX.
- Detection: handles `MemberExpression` where property is `value` or `peek` and object is an `Identifier` that is considered a signal via either:
  - Suffix-based check using `buildSuffixRegex(option?.suffix ?? 'Signal')` and `hasSignalSuffix()`; or
  - Variable declared from known creators (`signal`/`computed`) detected via `VariableDeclarator` and import scans from `@preact/signals-react` (both named and namespace imports).
- Safe-skip heuristics: skips if used within complex parent expressions (`MemberExpression`, `ChainExpression`, `BinaryExpression`, `UnaryExpression`, `LogicalExpression`), inside JSX attributes (`isInJSXAttribute`), inside function props (`isInFunctionProp()`), or within `JSON.stringify` chains (`isInJSONStringify()`). Skips when object is a nested `MemberExpression` or callee of a `CallExpression` not matching the `peek()` replacement pattern.
- Performance: standard tracker with `DEFAULT_PERFORMANCE_BUDGET`, `shouldContinue()` against `maxNodes`, and per-node operation tracking.

### Options and messages (implementation)

- Options (`Option`):
  - `performance?: PerformanceBudget` with time/memory/nodes/operations and metrics flags.
  - `severity?: { preferDirectSignalUsage?: 'error' | 'warn' | 'off' }`.
  - `suffix?: string` to match signal identifier suffix (default `'Signal'`).
- Messages: only `preferDirectSignalUsage`.
- Defaults: `performance: DEFAULT_PERFORMANCE_BUDGET`; no default `severity` (implicit `'error'`).

### Autofix and suggestions (implementation)

- Fix replaces redundant access:
  - For `.value`, replaces the entire `MemberExpression` with the identifier (e.g., `countSignal.value` -> `countSignal`).
  - For `.peek()`, when the `MemberExpression` is the callee of a `CallExpression`, replaces the full call with the identifier (e.g., `countSignal.peek()` -> `countSignal`).
- No separate suggestions array is emitted beyond the primary fix (despite `hasSuggestions: true`).

### Inconsistencies (spec vs implementation)

- __Type-aware claim__: Spec says rule is type-aware and only suggests when safe. Implementation is heuristic-based (suffix and local creator tracking) without TypeScript type services.
- __Message/suggestions__: Spec implies suggestions; implementation uses a direct fix and does not provide alternative suggestions or explanations.
- __Skipped cases alignment__: Implementation’s skip set is broader than spec examples (attributes, function props, JSON.stringify, complex parents). Spec could document these for clarity.
- __`peek()` handling__: Spec doesn’t explicitly mention `.peek()`, but implementation replaces it in JSX contexts; consider documenting.

### Actionable suggestions

- __Spec updates__:
  - Document `suffix`, `severity`, and performance options.
  - Explicitly list skipped contexts (attributes, function props, complex expressions, JSON.stringify) and support for `.peek()`.
  - Clarify that type-awareness is heuristic (unless type info is wired in later).
- __Implementation improvements__:
  - Either remove `hasSuggestions: true` or add a suggestion variant with explanatory text (e.g., “Use signal directly in JSX”).
  - Consider augmenting detection with import/type info where available to reduce false positives.
  - Add a configuration to allow `.peek()` in JSX if projects prefer explicit reads.
- __Tests__:
  - `.value` vs `.peek()` in simple JSX, nested JSX, fragments.
  - Skipped contexts: attributes, function props (inline and object property), JSON.stringify, and complex parent expressions.
  - Custom `suffix` and imported alias/namespace creators (`signal`, `computed`).

## 13) prefer-signal-methods [✓]

- __Files__: `src/prefer-signal-methods.ts`, `specs/spec-prefer-signal-methods.md`

### Purpose (spec)

- Enforce optimal usage of signal accessors across contexts:
  - In effects and non-reactive code, use `.peek()` to avoid subscriptions.
  - In JSX, use the signal directly (no `.value` or `.peek()`).

### Implementation summary

- Rule: `preferSignalMethodsRule` with `meta.type: 'suggestion'`, `fixable: 'code'`, `hasSuggestions: true`.
- Context tracking:
  - `isInEffect` toggled via selectors for `CallExpression[callee.name="useEffect"]` enter/exit. Note: only matches unqualified `useEffect`.
  - `isInJSX` toggled on `JSXElement`/`JSXFragment` enter/exit; also uses `isInJSXContext(node)` util.
- Signal identification:
  - By suffix match using `buildSuffixRegex(option?.suffix ?? 'Signal')` and `hasSignalSuffix(name)`.
  - By local variable tracking: any `VariableDeclarator` initialized by `signal()`/`computed()` detected from named or namespace imports of `@preact/signals-react`.
- Dependency arrays: uses `isInDependencyArray(node)` from `utils/react.js` to avoid modifying dependencies.
- Reporting logic in `Identifier` handler:
  - If identifier is a signal and NOT immediately a `MemberExpression` on it:
    - In an effect (and not in dependency array): report `usePeekInEffect` with fix to append `.peek()`.
    - In JSX: do nothing (delegated to `prefer-signal-in-jsx`).
  - If identifier IS object of a `MemberExpression`:
    - In JSX context and property is `value` or `peek`: skip (delegated to `prefer-signal-in-jsx`).
    - In effect (not in dependency array) and property is `value`: report `preferPeekInNonReactiveContext` with fix replacing `value` with `peek()`.
- Performance: integrated tracker (`createPerformanceTracker`, `DEFAULT_PERFORMANCE_BUDGET`, `shouldContinue()` via `maxNodes`, `perf.trackNode`, operation counters).

### Options and messages (implementation)

- Options (`Option`):
  - `performance?: PerformanceBudget` with budgets and metrics flags.
  - `severity?: { usePeekInEffect | useValueInJSX | preferDirectSignalUsage | preferPeekInNonReactiveContext }` per-message levels.
  - `suffix?: string` for signal suffix detection (default `'Signal'`).
- Schema includes only `performance` and `suffix` (no `severity` entry).
- `meta.messages` defines 4 messages, but only two are actively used by this rule (`usePeekInEffect`, `preferPeekInNonReactiveContext`). JSX-related messages are deferred to `prefer-signal-in-jsx`.

### Autofix and suggestions (implementation)

- `hasSuggestions: true` but no separate `suggest` code paths are emitted (fixes are primary).

### Inconsistencies (spec vs implementation)

- __Unqualified effect detection__: Spec discusses effects generally; implementation only tracks `useEffect` by callee.name equality, missing `React.useEffect`, `useLayoutEffect`, or aliased imports.
- __JSX enforcement in this rule__: Spec lists JSX behaviors and messages (`useValueInJSX`, `preferDirectSignalUsage`), but this rule explicitly defers JSX handling to `prefer-signal-in-jsx`. The messages exist but are not reported here.
- __Severity option__: Supported in implementation but not documented in schema/spec.
- __Suggestions__: Spec emphasizes auto-fix suggestions; implementation applies direct fixes and does not provide suggestion variants or rationale text.

### Actionable suggestions

- __Spec updates__:
  - Document `severity`, `suffix`, and performance options.
  - Clarify that JSX cases are handled by `prefer-signal-in-jsx` to avoid duplicated reports, or scope messages per rule accordingly.
  - Note limitations of effect detection (only bare `useEffect`) unless expanded.
- __Implementation improvements__:
  - Extend effect detection to `React.useEffect`, `useLayoutEffect`, alias imports, and member expressions.
  - Either remove unused JSX messages from this rule or emit them when appropriate if consolidation is desired.
  - Provide suggestion entries (not only fixes) with explanatory text; keep fixes idempotent.
- __Tests__:
  - `useEffect` vs `React.useEffect` vs alias; ensure only non-dependency-array reads are fixed.
  - `identifier` vs `member .value` reads inside effects; ensure `.peek()` insertion/replacement is correct with surrounding code.
  - Interop with `prefer-signal-in-jsx` to ensure no duplicate reports in JSX.
  - Custom `suffix` and creator/namespace import tracking from both `@preact/signals` and `@preact/signals-react`.

## 14) prefer-signal-reads [✓]

- __Files__: `src/prefer-signal-reads.ts`, `specs/spec-prefer-signal-reads.md`

### Purpose (spec)

- Require explicit `.value` when reading signals in non-JSX code. In JSX, signals auto-unwrap; elsewhere you must use `.value` to read the current value.

### Implementation summary

- Rule: `preferSignalReadsRule` with `meta.type: 'suggestion'`, `fixable: 'code'`, `hasSuggestions: true`.
- Signal identification:
  - Suffix heuristic via `buildSuffixRegex(option?.suffix ?? 'Signal')` and `hasSignalSuffix(name)`.
  - Local tracking: variables initialized from `signal()`/`computed()` detected from named and namespace imports of `@preact/signals-react`.
- JSX exclusion: skips inside JSX elements and attributes using `isInJSXContext(node)` and `isInJSXAttribute(node)`.
- Read-context filtering:
  - Skips if identifier is already part of `MemberExpression` with `.value` or `.peek`.
  - Skips when identifier is in binding/write positions (assignments, updates, params, patterns, variable declarators, catch params, etc.) via `isBindingOrWritePosition()`.
  - Skips non-read syntactic roles (callee, property key, TS types, labels, import/export specifiers, etc.).
- Reporting: `useValueInNonJSX` emitted on remaining identifiers; fix inserts `.value` after the identifier.
- Performance: integrated (`createPerformanceTracker`, `DEFAULT_PERFORMANCE_BUDGET`, `shouldContinue()` guarding `maxNodes`, `perf.trackNode`).

### Options and messages (implementation)

- Options (`Option`):
  - `performance?: PerformanceBudget` with budgets and metrics flags.
  - `severity?: { useValueInNonJSX?: 'error' | 'warn' | 'off' }`.
  - `suffix?: string` to tailor signal suffix (default `'Signal'`).
- Schema: includes `performance`, `suffix`, and explicitly documents `severity.useValueInNonJSX` with enum.
- Messages: `useValueInNonJSX`.

### Autofix and suggestions (implementation)

- Primary fix: `identifier` -> `identifier.value` by inserting `.value` directly after the identifier token.
- No separate suggestion entries are emitted despite `hasSuggestions: true`.

### Inconsistencies (spec vs implementation)

- __Type-aware claim__: Spec claims type-aware behavior; implementation is syntax/heuristics-based (suffix + creator-tracking) without TS type services.
- __Destructuring handling__: Spec mentions destructuring; implementation correctly avoids enforcing in binding patterns, but does not insert `.value` for destructured reads (appropriate). Consider clarifying examples.
- __Suggestions wording__: Spec emphasizes suggestions; implementation applies direct fixes and no explanatory suggestions.

### Actionable suggestions

- __Spec updates__:
  - Document `severity`, `suffix`, and performance options (already in schema—ensure narrative mentions them).
  - Clarify that type-awareness is heuristic unless type services are integrated.
  - Provide explicit examples for skipped positions (bindings, params, object/array patterns) and that `.peek` is considered a correct access.
- __Implementation improvements__:
  - Add suggestion entries with rationale text; keep the primary fix unchanged.
  - Consider optional config to accept raw identifiers in certain non-JSX contexts (e.g., when passing to known helpers).
- __Tests__:
  - Positive: plain reads in non-JSX, nested expressions, calls/ops where identifier is a value; ensures `.value` inserted once.
  - Negative: JSX elements/attributes; `.value`/`.peek` already present; binding/write positions; TS-only positions; callee/property positions.
  - Creator/namespace imports and custom `suffix`.

## 15) prefer-use-signal-over-use-state [✓]

- __Files__: `src/prefer-use-signal-over-use-state.ts`, `specs/spec-prefer-use-signal-over-use-state.md`

### Purpose (spec)

- Encourage replacing `useState` with `useSignal` from `@preact/signals-react` for primitive/simple state. Benefits: simpler code, better performance, fine-grained updates.

### Implementation summary

- Rule: `preferUseSignalOverUseStateRule` with `meta.type: 'suggestion'`, `fixable: 'code'`, `hasSuggestions: true`.
- Detection scope: only inside components/custom hooks by heuristic:
  - `FunctionDeclaration` with Capitalized name sets `inComponentOrHook` true during body.
  - `VariableDeclarator` of Capitalized identifier initialized to Arrow/FunctionExpression sets it true; reset on exit.
- `useState` identification:
  - Tracks local names imported from `react` for `useState`.
  - Also detects `React.useState` via namespace/default React imports.
- Candidate pattern: `const [stateVar, setterVar] = useState(init?)` where `setterVar` starts with `set`.
- `ignoreComplexInitializers` gate (default true): if true, only allow simple initializers (`Literal`, `Identifier`, `MemberExpression`, `UnaryExpression`, `BinaryExpression`, `ConditionalExpression`, `TemplateLiteral`). If false, allow any initializer. `undefined` init is allowed.
- Reporting: always as a suggestion (`preferUseSignal`) with `data.type` derived from init (`typeof literal` or `'state'`).
- Performance: standard tracker and node budget via `shouldContinue()`.

### Options and messages (implementation)

- `ignoreComplexInitializers?: boolean` (default true).
- `performance?: PerformanceBudget` with budgets/metrics flags.
- `severity?: { preferUseSignal?: 'error' | 'warn' | 'off' }`.
- `suffix?: string` to append to new signal variable name in fixes (default `'Signal'`).
- `meta.messages`: `preferUseSignal`.
- Schema documents `ignoreComplexInitializers`, `performance`, `severity`, `suffix`.

### Autofix and suggestions (implementation)

- The rule does not apply an automatic fix; it provides suggestions only:
  - Suggestion 1: ensure `import { useSignal } from '@preact/signals-react'` exists (augment or insert import).
  - Suggestion 2 (when init is `undefined`/`Literal`/`Identifier`): also replace the entire `VariableDeclarator` with:
    - `const stateVar{suffix} = useSignal(init)` where `{suffix}` defaults to `Signal`.
  - Both suggestions handle import augmentation or insertion before/after existing imports.
- It does not rewrite references to `setterVar` or usages elsewhere; changes are intentionally non-destructive suggestions.

### Inconsistencies (spec vs implementation)

- __Scope limitation__: Spec is general; implementation suggests only within heuristically detected components/hooks (Capitalized function names). Consider documenting.
- __Setter removal claim__: Spec says removes setter function; implementation only rewrites the declaration in a suggestion and does not update subsequent setter references. This should be clarified, and a codemod approach recommended instead of autofix.
- __Autofix vs suggestion__: Spec suggests auto-fix behavior; implementation uses suggestions only (safer). Align spec wording.
- __Variable renaming suffix__: Spec mentions adding `Signal` suffix; implementation makes it configurable via `suffix` option (undocumented in spec text but present in schema).

### Actionable suggestions

- __Spec updates__:
  - Clarify behavior is via suggestions (not automatic fix) and why.
  - Document `suffix`, `severity`, and performance options and the component-scope heuristic.
  - Adjust “removes setter” language to “suggests replacing declaration; follow-up edits required.”
- __Implementation improvements__:
  - Consider detecting `useLayoutEffect`/other contexts irrelevant here—no change needed.
  - Expand suggestion 2 to optionally rewrite tuple usages in the same scope behind a separate, opt-in suggestion (complex).
  - Provide suggestion text variants per `type` for clearer guidance.
- __Tests__:
  - Detect `useState` as named import alias, default/namespace `React.useState`.
  - `ignoreComplexInitializers` true vs false with various AST initializers.
  - Suggestion import augmentation vs new import insertion positioning.
  - Suffix application and ensuring suggestion is not emitted outside components/hooks or when `setterVar` doesn’t start with `set`.

## 16) restrict-signal-locations [✓]

- __Files__: `src/restrict-signal-locations.ts`, `specs/spec-restrict-signal-locations.md`

### Purpose (spec)

- Enforce where signals can be created: allowed at module scope or inside custom hooks, disallowed inside React component bodies. Optionally allow `computed` in components. Forbid exporting signals to avoid circular dependencies.

### Implementation summary

- Rule: `restrictSignalLocations` with `meta.type: 'suggestion'`, `hasSuggestions: false`, performance tracking enabled.
- Imports scanning: tracks local names for `signal`/`computed` only from `@preact/signals-react`; supports aliasing and namespace imports for `ns.signal`/`ns.computed`.
- Context tracking via `componentStack`:
  - Push on `FunctionDeclaration`, `ArrowFunctionExpression`, `FunctionExpression` using heuristics.
  - `isComponent`: capitalized function or variable name.
  - `isHook`: name matches configurable `customHookPattern` (default `^use[A-Z]`).
- Signal creation detection:
  - `isSignalCall()` and `isSignalCreation()` detect calls to `signal` or `computed` by identifier or namespace member.
  - Records declared signal variable names to catch re-exports.
- Reports:
  - `signalInComponent` for `signal(...)` inside component bodies (not hooks).
  - `computedInComponent` for `computed(...)` inside components (unless `allowComputedInComponents: true`).
  - `exportedSignal` for default/named exports of signals or variables initialized with signals.
- Allowed directories: if file path starts with any `allowedDirs` entry, rule skips restrictions (no reports in that file).

### Options and messages (implementation)

- Options:
  - `allowedDirs?: string[]` (default `[]`).
  - `allowComputedInComponents?: boolean` (default `false`).
  - `customHookPattern?: string` (default `^use[A-Z]`).
  - `performance?: PerformanceBudget` with budgets/metrics.
  - `severity?: { signalInComponent?; computedInComponent?; exportedSignal? }` each `'error' | 'warn' | 'off'`.
- Messages: `signalInComponent`, `computedInComponent`, `exportedSignal`.
- Spec documents the first three options; severity and performance are present in schema but not called out in spec narrative.

### Behavior details

- Component vs hook heuristic is name-based; anonymous functions rely on parent variable name.
- Namespace and alias support ensures robust detection: `import * as S from '@preact/signals-react'; S.signal()` is covered.
- Exports:
  - Default export of a signal call/identifier, variable declaration exports, and named `export { foo }` are flagged when `foo` is known as a signal variable.
  - Skipped entirely if file is under `allowedDirs`.
- No autofixes or suggestions are emitted; reports are informational only.

### Inconsistencies (spec vs implementation)

- __Spec phrasing on autofix__: Spec states no auto-fix; implementation aligns (no fixes and `hasSuggestions: false`).
- __Import sources__: Ensure spec/docs explicitly state only `@preact/signals-react` is recognized.
- __Export guidance__: Spec’s exported-signal section mentions using Biome for circular diagnostics; implementation message mirrors that. The spec examples focus on module-level `export const signal`—implementation also catches default exports and exported identifiers; mention these in spec.
- __Allowed directories semantics__: Implementation treats files under `allowedDirs` as fully allowed (no checks). Spec states “files in allowed directories can create signals anywhere” which matches; clarify path normalization and necessity of trailing slash not required.
- __Severity/performance options__: Present in implementation schema but not explicitly documented in spec.

### Actionable suggestions

- __Spec updates__:
  - Document `severity` and performance options and clarify component/hook heuristics.
  - Expand export section to list all covered export forms (default export of call/identifier, named exports, variable declaration exports).
  - Note that `allowedDirs` is prefix/startsWith-based on normalized paths.
- __Implementation improvements__:
  - Either set `hasSuggestions: false` (no suggestions) or add non-fixer suggestions with remediation text.
  - Consider supporting `ImportDefaultSpecifier` namespaces for signals packages, though typical packages don’t export default; current namespace support is sufficient.
  - Optional: expose `allowSignalInComponents` as a separate flag for parity with `allowComputedInComponents` (if ever desired).
- __Tests__:
  - Positive: detect `signal`/`computed` in capitalized component bodies; ignore in hooks matching `customHookPattern`.
  - Namespace and alias coverage for `@preact/signals-react`.
  - `allowedDirs` skip behavior across default and named exports and in-body creations.
  - `computedInComponent` suppressed when `allowComputedInComponents: true`.
  - `exportedSignal` for default export of call, default export of identifier, variable declaration export, and `export { foo }` when `foo` is a signal variable.

## 17) signal-variable-name [✓]

- __Files__: `src/signal-variable-name.ts`, `specs/spec-signal-variable-name.md`

### Purpose (spec)

- Enforce consistent naming for variables created by `signal()` and `computed()`.
- Names must start lowercase, must not start with `use...` (to avoid hook confusion), and must end with `Signal`.

### Implementation summary

- Rule: `signalVariableNameRule` with `meta.type: 'suggestion'`, `fixable: 'code'`, `hasSuggestions: false`.
- Detects variable declarators with identifier names where `init` is a call to `signal` or `computed`.
  - Tracks creators imported from `@preact/signals-react` only.
  - Supports aliasing of named imports and namespace imports (e.g., `S.signal()`), not default imports.
- Validity check via `isValidSignalName(name, suffixRegex)`:
  - Has required suffix (default `'Signal'`, configurable via `suffix`).
  - Starts with lowercase letter.
  - Does not begin with `use[A-Z]...`.
- On violation, reports with `invalidSignalName` or `invalidComputedName` and provides a fixer.
- Performance metrics and budgets integrated.

### Options and messages (implementation)

- Options (`Option`):
  - `suffix?: string` (default `'Signal'`).
  - `performance?: PerformanceBudget`.
  - `severity?: { invalidSignalName?; invalidComputedName? }`.
  - Schema documents `performance`, `suffix`, and `severity`.
- Messages: `invalidSignalName`, `invalidComputedName`.

### Autofix behavior (implementation)

- Single fixer rewrites:
  - Strips leading `use` if present.
  - Lowercases first character.
  - Appends required suffix if missing.
- Also updates all in-scope identifier references to the new name.
  - Skips the declaration identifier itself and property positions in member expressions (e.g., `obj.name`).
- No separate suggestions are emitted despite `hasSuggestions: true`.

### Inconsistencies (spec vs implementation)

- __Import coverage__: Correct. Scope is `@preact/signals-react` only (by design). Update spec/docs to clearly state this.
- __Configuration claims__: Spec says “no configuration options” and mentions custom suffix as future work. Implementation already supports `suffix` and performance options, and accepts a `severity` map (undocumented in schema/spec).
- __Suggestions flag__: `hasSuggestions: true` but no suggestions are produced; either add guidance suggestions or set to `false`.

### Actionable suggestions

- __Spec updates__:
  - Document current options: `suffix`, performance, and the (optional) `severity` map if kept.
  - Note the exact rename algorithm (remove `use` prefix, lowercase first char, ensure suffix).
  - Clarify import-source coverage: only `@preact/signals-react` is recognized (plugin scope).
- __Implementation improvements__:
  - Either emit a non-fixer suggestion explaining the rename or set `hasSuggestions: false`.
  - Consider guarding against collisions when the fixed name already exists in scope; bail out gracefully. [Implemented]
- __Tests__:
  - Positive: rename plain `signal` and `computed` identifiers; ensure all references in scope are updated; skip member property positions.
  - Options: custom `suffix`, severity on/off per message, performance budgets.
  - Imports: alias and namespace imports; absence of false positives for non-signal calls.

## 18) warn-on-unnecessary-untracked [✓]

- __Files__: `src/warn-on-unnecessary-untracked.ts`, `specs/spec-warn-on-unnecessary-untracked.md`

### Purpose (spec)

- Warn when `untracked()` and `.peek()` are used unnecessarily in reactive contexts (components, renders, effects) to avoid breaking tracking and to simplify code.

### Implementation summary

- Rule: `warnOnUnnecessaryUntrackedRule` with `meta.type: 'suggestion'`, `fixable: 'code'`, `hasSuggestions: true`.
- Imports scanning: tracks creator aliases/namespaces for `signal`/`computed` from `@preact/signals-react`. Records declared signal variable names to improve detection.
- Context detection:
  - `isInComponentOrHook(node)`: walks up the tree and treats functions with Capitalized names as components and names starting with `use` as hooks.
  - `isInReactiveContext(node, context)`: returns true if in component/hook, but may allow exceptions:
    - If `allowInEffects === false`, then inside `useSignalEffect` callbacks is considered non-reactive (thus skip reporting).
    - If `allowInEventHandlers === false`, then inside JSX `onX` handlers is considered non-reactive (skip reporting).
  - `isInSignalWriteContext(node, suffixRegex)`: detects `.value` writes/updates; used to optionally allow `.peek()` during writes when `allowForSignalWrites === true`.
- Detection logic:
  - `untracked`: `untracked(() => body)` with zero params, where `body` contains a signal `.value` read (suffix heuristic) or a `.value` read of a variable previously created by `signal/computed`.
  - `.peek()`: flags `fooSignal.value.peek()` with zero args in reactive context, unless in write context and allowed by option.
- Performance: standard perf tracker, budgets, and dynamic operation tracking.

### Options and messages (implementation)

- Options:
  - `suffix?: string` (default `'Signal'`) used for suffix-based detection of signals.
  - `allowInEffects?: boolean` (default `true`).
  - `allowInEventHandlers?: boolean` (default `true`).
  - `allowForSignalWrites?: boolean` (default `true`).
  - `performance?: PerformanceBudget` and `severity?: { unnecessaryUntracked | unnecessaryPeek | suggestRemoveUntracked | suggestRemovePeek }`.
- Messages: `unnecessaryUntracked`, `unnecessaryPeek`, plus suggestion message IDs.
- Schema documents all listed options including severity and performance.

### Autofix and suggestions (implementation)

- For `untracked(() => body)`: suggestion replaces the full call with the `body` expression text.
- For `.peek()`: suggestion replaces the entire `X.value.peek()` call with exactly `X.value` (avoids `.value.value`).
- The rule uses suggestions; no direct automatic fix is applied unless the user applies suggestions.

### Inconsistencies (spec vs implementation)

- __Component/Hook heuristic__: Spec loosely says “reactive contexts”; implementation defines via name-based heuristic (Capitalized or `use*`). Consider documenting this heuristic in the spec.
- __Render methods__: Spec mentions class component render methods; implementation does not explicitly detect class `render()`—heuristic only covers function components/hooks. If supporting classes is desired, expand detection or adjust spec wording.
- __`.peek()` pattern__: Implementation flags specifically `fooSignal.value.peek()`; spec broadly says “replace `.peek()` with `.value`”. Clarify that only `.peek()` chained off `.value` is targeted; other shapes aren’t considered.
- __Severity granularity__: Implementation supports per-message severity; spec doesn’t mention it.

### Actionable suggestions

- __Spec updates__:
  - Define “reactive context” per the rule’s current heuristic; call out JSX event handler and `useSignalEffect` options.
  - Clarify that the `.peek()` case handled is `signal.value.peek()` and note the write-context allowance.
  - Document `suffix`, `severity`, and performance options.
- __Implementation improvements__:
  - Extend `.peek()` detection to handle `someComputed.peek()` (if applicable) or document non-goal.
  - Optionally widen `untracked` detection to function expressions (not just arrow) if needed.
  - Consider adding a guard to avoid replacing when the `body` references outer `this` or relies on scope differences (rare in FCs).
- __Tests__:
  - Positive: `untracked(() => aSignal.value)` in component render/effect when not allowed; `.peek()` chained after `.value` in reactive contexts.
  - Negative: allowed in event handlers when `allowInEventHandlers: true`; allowed in `useSignalEffect` when `allowInEffects: true`; allowed for writes when `allowForSignalWrites: true`.
  - Suffix variations and alias/namespace imports from `@preact/signals-react`.

---

I will continue auditing rules 3–18 in sequence, appending sections here.
