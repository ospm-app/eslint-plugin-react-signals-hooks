# Additional Rules for @ospm/eslint-plugin-react-signals-hooks

Based on the implemented rules in your plugin (extracted from the npm page: `exhaustive-deps`, `require-use-signals`, `no-mutation-in-render`, `prefer-signal-in-jsx`, `prefer-show-over-ternary`, `prefer-for-over-map`, `prefer-signal-effect`, `prefer-computed`, and `signal-variable-name`), I've analyzed documentation from @preact/signals-react (via npm README and Preact guide), @preact/signals-core (integrated in the guide), and related packages like @preact/signals-react-transform and community variants (e.g., @preact-signals/safe-react, Unison.js for deeper React signals). Key sources include best practices (e.g., batching, untracked accesses, direct JSX optimization), pitfalls (e.g., overusing peek/untracked, failing to clean up effects, lazy computeds), and React integrations (e.g., useSignalEffect for lifecycle-tied effects, utilities like Show/For, hooks like useLiveSignal/useSignalRef).

The suggestions avoid overlap with your existing rules (e.g., no duplicates for preferring computed or effects, mutations in render, or JSX preferences). Instead, they focus on untapped areas like batching, untracked/peek usage, ref handling, signal creation placement, effect cleanup, and utilities from @preact/signals-react/utils. Rules emphasize performance, reactivity safety, and migration from React primitives. All support TypeScript, autofix where safe, and configurable severity.

I've grouped them into categories, with tables summarizing each rule, purpose (tied to docs), options, and examples.

## Performance and Update Optimization Rules

These enforce batching and untracked to prevent unnecessary re-renders or subscriptions, as highlighted in docs for efficient multi-updates and non-reactive reads.

| Rule Name | Description | Why Add It? | Options | Example (Incorrect ➡️ Correct) |
|-----------|-------------|-------------|---------|--------------------------------|
| `prefer-batch-for-multi-mutations` | Suggests wrapping multiple signal mutations (e.g., `.value =`) in the same scope (like event handlers) with `batch()`. | Docs stress `batch()` to combine updates into one commit, reducing re-renders; common pitfall in event handlers with sequential changes. Autofix: Wrap in `batch()`. | `minMutations: number` (default: 2) – Threshold for triggering. | ❌ `function handleClick() { count.value++; total.value++; }`<br>✅ `function handleClick() { batch(() => { count.value++; total.value++; }); }` |
| `warn-on-unnecessary-untracked` | Warns on `untracked()` or `.peek()` in reactive contexts (e.g., render or computed) where subscription is typically needed. | Pitfalls warn against overusing `untracked()/peek()` as it breaks reactivity; guide advises sparingly for effects only. No autofix (suggest removal). | `allowInEffects: boolean` (default: true) – Permit in effects. | ❌ `function Component() { return <div>{count.peek()}</div>; } // No re-renders`<br>✅ `function Component() { return <div>{count.value}</div>; }` |

## Hook and Primitive Migration Rules

These promote signal-specific hooks over React equivalents for better reactivity, extending your `prefer-*` rules to refs and state.

| Rule Name | Description | Why Add It? | Options | Example (Incorrect ➡️ Correct) |
|-----------|-------------|-------------|---------|--------------------------------|
| `prefer-use-signal-over-use-state` | Suggests replacing `useState` with `useSignal` for primitive values or simple initializers. | Docs recommend `useSignal` for local reactive state; aligns with signals' ergonomics over React hooks, reducing deps issues. Autofix: Convert, replace setter with `.value =`. | `ignoreComplexInitializers: boolean` (default: true) – Skip non-primitive inits. | ❌ `const [count, setCount] = useState(0);`<br>✅ `const count = useSignal(0); // Use count.value, count.value++` |
| `prefer-use-signal-ref-over-use-ref` | Warns on `useRef` for mutable values; suggests `useSignalRef` for reactive ref-like behavior. | `@preact/signals-react/utils` provides `useSignalRef` for refs that trigger updates on change; useful for DOM refs needing reactivity. Autofix: Convert, import if needed. | `enableAutofix: boolean` (default: true). | ❌ `const ref = useRef(null);`<br>✅ `const ref = useSignalRef(null); // Access ref.current reactively` |

## Safety and Lifecycle Rules

These prevent leaks or bugs in effects and signal creation, based on cleanup needs and component lifecycle from docs.

| Rule Name | Description | Why Add It? | Options | Example (Incorrect ➡️ Correct) |
|-----------|-------------|-------------|---------|--------------------------------|
| `no-signal-creation-in-render` | Disallows creating signals (via `signal()`) inside component render body; suggests moving outside or using `useSignal`. | Creating signals in render recreates them per render, causing bugs; docs advise external or hook-based creation for stability. No autofix (suggest relocation). | `allowUseSignal: boolean` (default: true) – Permit `useSignal`. | ❌ `function Component() { const count = signal(0); return <div>{count.value}</div>; }`<br>✅ `const count = signal(0); function Component() { return <div>{count.value}</div>; }` or use `useSignal` |
| `require-effect-cleanup` | Warns if `useSignalEffect` (or `effect`) callback performs side effects (e.g., subscriptions, timers) without returning a cleanup function. | Docs emphasize returning cleanup from effects to avoid leaks; common pitfall in long-lived components. No autofix (suggest adding return). | `ignoreSimpleLogs: boolean` (default: true) – Skip pure logs. | ❌ `useSignalEffect(() => { subscribeToEvent(); });`<br>✅ `useSignalEffect(() => { subscribeToEvent(); return () => unsubscribe(); });` |

## Advanced Utility and Sync Rules

These encourage utilities from `@preact/signals-react/utils` for syncing and advanced patterns, inspired by hook examples.

| Rule Name | Description | Why Add It? | Options | Example (Incorrect ➡️ Correct) |
|-----------|-------------|-------------|---------|--------------------------------|
| `prefer-use-live-signal-for-sync` | Suggests `useLiveSignal` when manually syncing a local signal to an external one (e.g., via effect). | Utils provide `useLiveSignal` for automatic syncing; prevents manual effect-based bugs in shared state. Autofix: Replace with `useLiveSignal`. | `enableAutofix: boolean` (default: true). | ❌ `const local = useSignal(external.value); useSignalEffect(() => { local.value = external.value; });`<br>✅ `const local = useLiveSignal(external);` |

## Implementation Notes

- **Detection Logic**: Extend your AST analysis to identify imports from `@preact/signals-react` and `@preact/signals-react/utils`, track mutations/accesses in scopes (e.g., handlers for batch), and detect side-effect patterns in callbacks (e.g., for cleanup).
- **Config Options**: Add plugin-level `signalsUtilsImport: string` (default: '@preact/signals-react/utils') for utilities. Include `enableDangerousAutofix` for rules like batch (could alter behavior if nested).
- **Severity and Autofix**: Default to 'warn'; mark `[AUTOFIXABLE]` in messages. Test for false positives, e.g., in non-mutative batches.
- **Why These?**: They address undocumented pitfalls (e.g., no cleanup leaks from guide), performance tips (batching/untracked from core docs), and React-specific utils (useLiveSignal/useSignalRef from npm). Community packages like Unison.js emphasize deep reactivity (e.g., ref rules), while avoiding overlap with your prefs for Show/For/computed/effect.
- **Expansions**: If adding SSR support, consider `no-unsafe-ssr-access` (warn on non-JSON-safe signals). Monitor v2+ breaking changes for global state rules.

These would round out your plugin for comprehensive @preact/signals-react coverage, helping users avoid subtle bugs. If you provide the GitHub repo URL, I can analyze the code for more tailored suggestions!
