# ESLint Plugin: react-signals-hooks — Rule Review

This document records a systematic review of rule implementations in `packages/eslint-plugin-react-signals-hooks/src/`.
For each rule: what it enforces, what’s missing, improvements, and cross-rule consistency.

---

## prefer-signal-reads (`src/prefer-signal-reads.ts`)

- __Purpose__: Enforce `.value` usage for signals in non-JSX. In JSX, skip (unwrapping is automatic).
- __Key logic__:
  - Tracks JSX via global `isInJSX` and helpers `isInJSXContext()` and `isInJSXAttribute()`.
  - Selects `Identifier` that ends with `Signal` or `signal`.
  - Skips if already part of `obj.value` member.
  - Reports and autofixes by inserting `.value` after the identifier when not in JSX.
  - Performance tracking via `utils/performance.*`.

### Findings

- __Severity options declared but unused__: `Severity.useValueInNonJSX` exists in type but code never consults it. The rule always reports. Add `getSeverity()` similar to other rules and gate `context.report`.
- __Logging noise__: Unconditional `console.info` in rule init and metrics printing in `Program:exit`. Recommend gating by `option.performance?.logMetrics === true` and/or `enableMetrics`.
- __Signal detection heuristic only by naming__: Uses `Identifier:matches([name$="Signal"],[name$="signal"])`. Consider centralizing detection (see Suggestions) and allow config.
- __Context detection duplication__: Maintains global `isInJSX` and also walks upwards in `isInJSXContext()`/`isInJSXAttribute()`. Prefer one consistent approach (depth counter as in `prefer-signal-in-jsx` is cheaper) via shared util.
- __Autofix safety__: Simple `fixer.insertTextAfter(node, ".value")` could break if identifier is callee, type reference, import, label, etc. It currently filters only by `.value` member presence but not other disallowed contexts. Consider negative contexts similar to `prefer-signal-in-jsx` (skip when part of call/callee, type positions, etc.).

### Suggestions

- __Use severity__: Implement `getSeverity('useValueInNonJSX', option)`.
- __Gate logs__: Only log when `enableMetrics && logMetrics`.
- __Centralize signal detection__: Move naming and future type-check logic into `src/utils/` (e.g., `isSignalIdentifier()`), align suffix handling with other rules.
- __Harden contexts__: Explicitly skip when identifier is
  - callee in a call expression, property key, type annotation, import/export, label, or member expression object that already has `.peek()`/`.value`.
- __Add tests__ for: JSX attribute values, JSX children, callee positions, optional chaining, nested member expressions, chained binary/logical expressions in non-JSX.

---

## prefer-signal-in-jsx (`src/prefer-signal-in-jsx.ts`)

- __Purpose__: In JSX, prefer direct signal over `.value` access.
- __Key logic__:
  - Tracks JSX with `jsxDepth` (increment/decrement in element/fragment enter/exit).
  - Checks `MemberExpression` where `property.name === 'value'` and `object` is `Identifier`.
  - Only enforces when `object.name.endsWith('Signal')` (NOTE: not `signal`).
  - Skips risky contexts: chained member expressions, call expressions, some expression categories, JSX attributes, function props, and `JSON.stringify(...)`.
  - Fix replaces the entire `member` with `object` identifier.

### Findings

- __Inconsistent suffix__: Only checks `endsWith('Signal')` (PascalCase). Other rules allow `'signal'` too. Leads to cross-rule inconsistency and missed cases.
- __Severity support present__: `Severity.preferDirectSignalUsage` and `getSeverity()` implemented. Good.
- __Context guards__: Better-than-average fix safety (skips many risky parents). Consider reusing this approach elsewhere.
- __No `.peek()` handling__: Rule is scoped to `.value`. `.peek()` in JSX is handled in `prefer-signal-methods`, but cross-rule overlap can cause duplication unless exclusions exist.
- __Logging noise__: Same as above—unconditional console logs. Gate by options.

### Suggestions

- __Unify detection__: Align suffix checks with other rules or centralize via util; optionally support regex or config.
- __Consolidate overlap__: Define a precedence model with `prefer-signal-methods` to avoid double reports in JSX for `.value` and `.peek()`.
- __Extend safety list__: Re-validate all parent node types for which fix is safe; broaden test coverage (conditional expressions in JSX, logical/ternary, template literals inside JSX expressions, optional chaining).

---

## prefer-signal-methods (`src/prefer-signal-methods.ts`)

- __Purpose__: Enforce correct contextual usage of `.value`/`.peek()` across effects, JSX, and non-reactive code.
- __Key logic__:
  - Tracks `isInEffect` via `'CallExpression[callee.name="useEffect"]'` enter/exit. Determines dependency array via upward scan in `isInDependencyArray()`.
  - Tracks `isInJSX` via element/fragment enter/exit plus `isInJSXContext()` helper.
  - Targets identifiers with names ending in `Signal` or `signal`.
  - Cases:
    - Direct signal in effect (outside dep array): suggest `.peek()`.
    - Direct signal in JSX: currently suggests adding `.value` (BUG; see below).
    - `.value` in JSX: suggest removing `.value`.
    - `.peek()` in JSX: suggest removing `.peek()`.
    - `.value` in effects outside dep arrays: suggest `peek()`.
  - Severity per message id using `getSeverity()`; performance tracking as others.

### Findings

- __Logical contradiction / bug__: For direct identifier in JSX, the rule reports `useValueInJSX` and autofixes by inserting `.value`:
  - In `gather`: when `node.parent.type !== MemberExpression`, branch under `isInJSX || isInJSXContext(node)` does `fixer.insertTextAfter(node, '.value')`.
  - This contradicts the rule description and other branches that remove `.value` in JSX.
  - __Impact__: Will fight with `prefer-signal-in-jsx` and itself, causing flip-flop fixes.
- __Effect detection limited__: Only matches `useEffect`. If the library introduces alternative effect APIs, this won’t catch them. Might be acceptable for React-only usage.
- __Logging noise__: Same unconditional logging.
- __Mixed context tracking__: Uses both boolean flags and upward scans; unify approach.

### Suggestions

- __Fix the JSX direct usage branch__: When in JSX and identifier is a signal used directly, do NOT add `.value`. Either do nothing, or if rule aims to enforce direct usage, report if `.value` is present (already implemented) and if `.peek()` is present (already implemented). Remove the branch inserting `.value`.
- __Overlap handling__: Clearly document and enforce precedence with `prefer-signal-in-jsx` to avoid duplicate reports. Possibly restrict `prefer-signal-methods` to effects and non-JSX contexts, leaving JSX-only concerns to `prefer-signal-in-jsx`.
- __Gate logs__ as above.
- __Tests__:
  - Direct signal inside JSX should be OK.
  - `.value` in JSX should be reported and fixed to direct signal.
  - `.peek()` in JSX should be reported and fixed to direct signal.
  - In `useEffect` body (outside deps), reading `.value` → `peek()`.
  - Ensure no reports in dependency arrays.

---

## Cross-rule comparisons and consistency

- __Signal identification__:
  - `prefer-signal-reads`: `endsWith('Signal' | 'signal')`.
  - `prefer-signal-in-jsx`: only `endsWith('Signal')`.
  - `prefer-signal-methods`: `endsWith('Signal' | 'signal')`.
  - __Action__: Centralize into `utils/is-signal.ts` (e.g., `isSignalIdentifier(name, option?)`), add configuration for custom suffix or regex, and use consistently.

- __JSX detection__:
  - Approaches differ: boolean flags vs `jsxDepth` vs upward scans. __Action__: Unify via shared utility (e.g., `createJsxContextTracker(listener)` returning enter/exit handlers and a checker) to avoid drift and bugs.

- __Severity handling__:
  - `prefer-signal-reads` declares but doesn’t use severity. Others do. __Action__: add `getSeverity()` to all rules; ensure default is `'error'` if unspecified.

- __Console logging__:
  - All three print logs regardless of options. __Action__: only print when `enableMetrics && logMetrics`; keep silent by default in CI.

- __Rule overlap__:
  - `prefer-signal-methods` covers JSX with `.value`/`.peek()` which overlaps with `prefer-signal-in-jsx`. __Action__: define scope boundaries to avoid duplicate diagnostics. Options:
    - Make `prefer-signal-methods` ignore JSX entirely, delegating JSX to `prefer-signal-in-jsx`.
    - Or keep JSX in one place and disable the other in docs/config presets.

- __Autofix safety__:
  - `prefer-signal-in-jsx` includes more parent checks; the other two should adopt similar safeguards.
  - Consider codemod-style helpers for safe replacement, with AST-based constraints and snapshot tests.

---

## Next steps

- Apply the concrete fixes above, starting with the critical bug in `prefer-signal-methods` (JSX direct usage inserting `.value`).
  - Unify detection, JSX tracking, and severity handling in shared utils.
  - Gate logging by performance options.
  - Continue reviewing the remaining rules and append to this document.

---

## prefer-use-signal-over-use-state (`src/prefer-use-signal-over-use-state.ts`)

- __Purpose__: Encourage replacing simple `useState` with `useSignal`.
- __Key logic__:
  - Detects `const [state, setState] = useState(init)`.
  - Option `ignoreComplexInitializers` to skip non-primitive initializers.
  - Reports when setter name starts with `set` and provides autofix to add `useSignal` import and rewrite declaration to `const stateSignal = useSignal(init)`.

### Findings

- __Initializer type check bug__: The complex-initializer guard compares `includes(node.type)` where `node` is the `VariableDeclarator`, not the initializer. This condition will never behave as intended, causing either false skips or no skipping. See block at `VariableDeclarator` where it checks `!['Literal', ...].includes(node.type)` instead of `node.init.arguments[0]?.type`.
- __Autofix incompleteness__: Fix replaces the entire declarator with a new variable but does not:
  - Update all references of `state` to `stateSignal.value`.
  - Remove or refactor usages of `setState` to writes to `stateSignal.value`.
  - Preserve destructuring form or handle multiple declarators.
  This can leave the code broken or with unused variables.
- __Import handling__: Adds `import { useSignal } from '@preact/signals-react'` but returns `null` if already present, skipping the variable rewrite as well due to early return. Import decision and variable rewrite should be independent.
- __React.useState not handled__: Only matches identifier `useState`, missing `React.useState` and alias imports.
- __Component scope__: No check to limit suggestions to React component or hook bodies; could fire in non-React contexts.
- __Logging noise__: Unconditional `console.info` and metrics printing.

### Suggestions

- __Fix initializer guard__: Inspect `const init = node.init.arguments[0]` and check its `type` against the allowlist. For lazy initializer functions, consider skipping when `ignoreComplexInitializers` is true.
- __Safer autofix plan__:
  - Keep the original array pattern but convert to a signal variable and remove the setter binding, or avoid autofix and offer suggestions only, unless a full codemod is implemented.
  - If fixing, perform scoped reference updates: `state` reads -> `stateSignal.value`, `setState(x)` calls -> `stateSignal.value = x` and `setState(prev => ...)` -> `stateSignal.value = prev(...)` where safe.
  - Ensure import insertion is independent from declaration rewrite.
- __Broaden detection__: Handle `React.useState`, alias imports, and namespaced calls.
- __Scope detection__: Optionally limit to components/hooks via a context tracker to reduce noise.
- __Gate logs__ behind `enableMetrics && logMetrics`.

---

## require-use-signals (`src/require-use-signals.ts`)

- __Purpose__: Ensure components that use signals also call `useSignals()`.
- __Key logic__:
  - Tracks component start on `FunctionDeclaration` with Capitalized name and variable-declared `ArrowFunctionExpression` with Capitalized identifier.
  - Tracks `hasUseSignals` by seeing `useSignals()` call, and `hasSignalUsage` via member `.value` on identifiers ending with `Signal` or direct identifier usage ending with `Signal`.
  - On `Program:exit`, reports on the component node and offers fixes to insert `useSignals();` at the top of the body and add missing import.

### Findings

- __Signal usage detection gaps__:
  - Only recognizes names ending in `Signal` (PascalCase suffix). Misses lower-case `signal` or other naming conventions configured elsewhere.
  - Does not consider `.peek()` usage or other APIs that imply signal usage.
  - Direct identifier check excludes member expressions but may still flag false positives if variables end with `Signal` but aren’t signals.
- __Component detection coverage__: Does not cover function expressions assigned to capitalized consts beyond arrows, class components, or default-exported anonymous functions assigned immediately.
- __Fix insertion limitations__: Only inserts `useSignals();` when the body is a non-empty `BlockStatement`. It won’t fix implicit-return arrows or empty bodies; also does not ensure the call is placed before early returns.
- __Import insertion__: Good check for existing import, but path and specifier assumptions are strict; does not handle aliased imports. No gating of logs.

### Suggestions

- __Centralize signal detection__: Reuse a shared `isSignalIdentifier` and include `.peek()` and possibly `.effect()` patterns. Allow configuration of suffix/regex.
- __Broaden component detection__: Include function expressions and default exports; consider a shared component/hook detector.
- __Fix strategy__: For implicit-return arrows, either skip autofix or convert to block with inserted call if safe. Ensure insertion before the first statement, but after directives/imports inside the function body.
- __Gate logs__ behind options.

---

## signal-variable-name (`src/signal-variable-name.ts`)

- __Purpose__: Enforce naming for signal/computed variables: lowercase start, end with `Signal`, not prefixed with `use`.
- __Key logic__:
  - Validates declarators calling `signal()` or `computed()`.
  - Auto-fix renames declaration identifier and attempts to update references in the same scope, skipping property positions.

### Findings

- __Rigid convention__: Forces `Signal` suffix even for `computed()`, which might deserve its own suffix or a configurable pattern.
- __No configurability__: No options to customize suffix, allow exceptions, or ignore files/patterns.
- __Reference updates__: Scope-based replacement is good, but can miss shadowed bindings or cross-file references; acceptable for a linter but worth documenting. Logging is unconditional.

### Suggestions

- __Config options__: Add `suffix` and `allowComputedSuffix` or a `naming` object to customize patterns per kind (`signal`, `computed`).
- __Shared helpers__: Reuse shared utilities for detecting calls to `signal`/`computed` (namespaced, aliased), and for safe renaming (skip exports, re-exports, and JSX component names).
- __Gate logs__ behind options; add tests for tricky scopes, destructuring, and JSX props.

---

## restrict-signal-locations (`src/restrict-signal-locations.ts`)

- __Purpose__: Prevent creating signals/computeds in component bodies; allow in module scope and custom hooks. Warn on exported signals.
- __Key logic__:
  - Maintains a `componentStack` to know if currently inside a component or hook (regex `customHookPattern`).
  - Reports `signal()`/`computed()` calls inside components (configurable allow for computed).
  - Reports exported variable declarations initialized with `signal()`/`computed()`.

### Findings

- __Arrow function/component detection bug__: Uses `node.id` on `ArrowFunctionExpression`, which doesn’t have `id`; component detection will often fail. Similar fragile checks appear in several function handlers with `in`/`name` guards.
- __Allowed directories check__: Uses `filename.includes(dir)`, which is fragile across platforms. Should normalize and compare path segments or use `path.resolve` and `startsWith`.
- __Performance schema inconsistency__: The schema lists fields like `maxNodeCount`, but the rule uses `option.performance.maxNodes` for budget checks. Inconsistent with other rules and with its own schema.
- __Limited call detection__: Only matches bare identifier callee `signal`/`computed`, missing namespaced `signals.signal` or aliased imports.
- __Opinionated exported message__: The `exportedSignal` message mixes guidance about circular deps and biome; consider neutral phrasing and linking docs instead.
- __Logging noise__: Same unconditional logs.

### Suggestions

- __Fix component/hook detection__: For arrows, derive name from `VariableDeclarator` parent when present. Encapsulate this logic in a shared helper to reduce duplication and errors.
- __Path matching__: Normalize paths and compare directory segments; consider using `path.posix` and ensure case sensitivity rules are documented.
- __Align performance options__: Reuse the shared `PerformanceBudget` structure and respect its fields consistently.
- __Broaden callee matching__: Detect namespaced members and imported aliases by resolving import specifiers.
- __Tone down message__ and provide actionable next steps with docs links.
- __Gate logs__ behind options.

---

## no-mutation-in-render (`src/no-mutation-in-render.ts`)

- __Purpose__: Disallow mutating signals during render; suggest moving to effects or event handlers.
- __Key logic__:
  - Tracks render vs hook/function contexts via `inRenderContext`, `renderDepth`, `hookDepth`, `functionDepth`.
  - Reports `AssignmentExpression`/`UpdateExpression` on `Identifier` or `.value` patterns, with suggestions to wrap in `useEffect` or extract handler.
  - Severity and performance tracking included, but logs are unconditional.

### Findings

- __Render context tracking fragility__: Complex depth counters can desync. There’s a duplicated `startPhase(perfKey, \`render:${name}\`)` call in `FunctionDeclaration`, likely unintended.
- __Dynamic perf op keys__: Uses `PerformanceOperations[\`${node.type}Processing\`]`; missing enum keys would be`undefined` and may skew metrics.
- __Allowed patterns bypass__: Regex from user string is constructed directly; errors are caught, but a bad pattern silently disables checks for that file match.
- __Autofix safety__: Suggestion replaces the entire node with `useEffect(() => { ... }, [dep])` or a handler function. This can change semantics, require imports, and introduce unused `handleEvent`.
- __Signal detection heuristics__: Value mutations detection mixes identifier name suffix checks elsewhere; might miss assignments to nested paths like `obj.signal.value`.
- __Unconditional logging__: Multiple `console.info` prints regardless of options.

### Suggestions

- __Centralize JSX/render context__: Reuse a shared render/hook tracker used by other rules to avoid drift; add tests for nested functions/hooks.
- __Remove duplicate `startPhase`__ and audit all depth increments/decrements; consider a stack of contexts instead of counters.
- __Guard dynamic perf ops__: Fallback when `PerformanceOperations[key]` is undefined.
- __Limit autofix__: Prefer suggestions without code changes or only offer handler extraction when inside event handler creation context. If inserting `useEffect`, also add missing import and preserve existing deps.
- __Broaden detection__: Handle `UpdateExpression` and compound assignments on `MemberExpression.object` known to be signals even if not simple identifiers.
- __Gate logs__ under `enableMetrics && logMetrics`.

---

## no-signal-creation-in-component (`src/no-signal-creation-in-component.ts`)

- __Purpose__: Forbid creating `signal()`/`computed()` within components, hooks, or effects.
- __Key logic__:
  - Detects components via capitalized function names and variable declarators; tracks hooks/effects; flags `CallExpression` to `signal`/`computed`.
  - Suggestions: move to module level or extract a custom hook by inserting a function after imports and replacing the call with `hookName()`.

### Findings

- __Aggressive autofix__: Inserts new function at top-level and rewrites call. This can break closures, depend on local variables, or duplicate logic; comment-moving is attempted but partial.
- __Component/hook tracking__: Uses `functionStack` + globals `inComponent`, `inHook`, `inEffect`; state transitions for class bodies and nested functions are error-prone.
- __Signal call matching__: Only bare identifiers; misses namespaced or aliased imports.
- __Severity/logging__: Severity helper exists; logs are unconditional.

### Suggestions

- __Narrow fixes__: Convert to non-fix suggestions by default. If fixing, only when initializer is side-effect-free and independent of local scope.
- __Shared detectors__: Use common signal-call resolver (handles imports/aliases) and shared component/hook/effect tracker.
- __Improve class handling__: Treat class methods as component members carefully; likely skip autofix inside classes.
- __Gate logs__ behind options; align performance option schema with other rules.

---

## no-signal-assignment-in-effect (`src/no-signal-assignment-in-effect.ts`)

- __Purpose__: Disallow writing to `signal.value` inside `useEffect`/`useLayoutEffect`; suggest `useSignalsEffect` variants.
- __Key logic__:
  - Tracks effect stack via `isEffectHook` and collects assignments to `.value` on known signal identifiers.
  - Reports per-effect with suggestions to replace the hook call.

### Findings

- __Suggestion bug__: The non-layout path suggests `useSignals(() => ...)` (missing `Effect` suffix). Likely should be `useSignalsEffect`.
- __Dependencies handling__: Replacement slices callback body and reconstructs call; dependency array handling is simplistic and can drop/alter dependencies.
- __Signal identification__: Suffix-based and cached; misses non-suffix signals and namespaced/aliased creations; doesn’t track from imports.
- __AllowedPatterns__: Bypass allows file-level; OK, but consider per-effect comment opt-outs.
- __Performance reporting as lint__: Emits a lint message for performance budget; uncommon for other rules.
- __Unconditional logs__ in metrics.

### Suggestions

- __Fix message/fix__: Use `useSignalsEffect`/`useSignalsLayoutEffect` consistently; preserve callback body and original deps array exactly; insert missing imports when suggesting replacements.
- __Better signal tracking__: Seed `signalVariables` from variable declarators calling recognized creators, including namespaced/aliased.
- __Opt-out comments__: Support `// signals-hooks: allow-assign-in-effect` pragmas per effect.
- __Gate logs__; consider not reporting performance overages as diagnostics unless opted-in.

---

## no-non-signal-with-signal-suffix (`src/no-non-signal-with-signal-suffix.ts`)

- __Purpose__: Ensure anything named with `Signal` suffix is actually a signal (variables, params, object properties).
- __Key logic__:
  - Tracks imports to recognize signal creators; checks initializers and scope-defs via `isSignalExpression`.
  - Reports and suggests renaming or converting to a signal.

### Findings

- __Duplicate checks__: `isSignalExpression` contains duplicated `MemberExpression` suffix checks; minor duplication to clean up.
- __Heuristic overreach__: Treats member names ending with `Signal` as valid signals; could allow false positives (e.g., `obj.userSignal` not being a signal instance).
- __Import/alias coverage__: Only tracks bare `signal` + a set of known hooks; doesn’t resolve aliased imports or namespace members.
- __Rename fixes risk__: Simple text replacements may break exports/usages across files; acceptable as suggestions but document limitations.
- __Performance budget check divergence__: Uses `option.performance.maxNodes` gate; align with others.
- __Unconditional logs__.

### Suggestions

- __Tighten validation__: Prefer variable-def origin analysis over property-name heuristics; only treat as signal if initializer resolves to a known creator.
- __Configurable suffix__: Allow `suffix` option (default `Signal`) and a `validateProperties` toggle.
- __Import resolution__: Resolve imports to track aliased/namespaced creators.
- __Fix safety__: Keep renames as suggestions; skip for exported or public API names.
- __Gate logs__; align performance options with shared schema.
