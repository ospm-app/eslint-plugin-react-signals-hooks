# Additional Rules for @ospm/eslint-plugin-react-signals-hooks

Based on the implemented rules in your plugin (extracted from the npm page: `exhaustive-deps`, `require-use-signals`, `no-mutation-in-render`, `prefer-signal-in-jsx`, `prefer-show-over-ternary`, `prefer-for-over-map`, `prefer-signal-effect`, `prefer-computed`, and `signal-variable-name`), I've analyzed documentation from @preact/signals-react (via npm README and Preact guide), @preact/signals-core (integrated in the guide), and related packages like @preact/signals-react-transform and community variants (e.g., @preact-signals/safe-react, Unison.js for deeper React signals). Key sources include best practices (e.g., batching, untracked accesses, direct JSX optimization), pitfalls (e.g., overusing peek/untracked, failing to clean up effects, lazy computeds), and React integrations (e.g., useSignalEffect for lifecycle-tied effects, utilities like Show/For, hooks like useLiveSignal/useSignalRef).

The suggestions avoid overlap with your existing rules (e.g., no duplicates for preferring computed or effects, mutations in render, or JSX preferences). Instead, they focus on untapped areas like batching, untracked/peek usage, ref handling, signal creation placement, effect cleanup, and utilities from @preact/signals-react/utils. Rules emphasize performance, reactivity safety, and migration from React primitives. All support TypeScript, autofix where safe, and configurable severity.

I've grouped them into categories, with tables summarizing each rule, purpose (tied to docs), options, and examples.

## ✅ Performance and Update Optimization Rules

These enforce batching and untracked to prevent unnecessary re-renders or subscriptions, as highlighted in docs for efficient multi-updates and non-reactive reads.

| Status | Rule Name | Description | Implementation |
|--------|-----------|-------------|----------------|
| ✅ Done | `prefer-batch-for-multi-mutations` | Suggests wrapping multiple signal mutations with `batch()`. | Implemented in `prefer-batch-for-multi-mutations.ts` |
| ✅ Done | `warn-on-unnecessary-untracked` | Warns on unnecessary use of `untracked()` or `.peek()` in reactive contexts. | Implemented in `warn-on-unnecessary-untracked.ts` |

## 🔄 Hook and Primitive Migration Rules

These promote signal-specific hooks over React equivalents for better reactivity, extending your `prefer-*` rules to refs and state.

| Status | Rule Name | Description | Implementation |
|--------|-----------|-------------|----------------|
| ✅ Done | `prefer-use-signal-over-use-state` | Suggests replacing `useState` with `useSignal` for primitive values. | Implemented in `prefer-use-signal-over-use-state.ts` |

## ✅ Safety and Lifecycle Rules

These prevent leaks or bugs in effects and signal creation, based on cleanup needs and component lifecycle from docs.

| Status | Rule Name | Description | Implementation |
|--------|-----------|-------------|----------------|
| ✅ Done | `no-signal-creation-in-render` | Disallows creating signals inside component render body. | Implemented as `no-signal-creation-in-component.ts` |
| ❌ Not Done | `require-effect-cleanup` | Warns if `useSignalEffect` performs side effects without cleanup. | Not yet implemented |

## ❌ Advanced Utility and Sync Rules

These encourage utilities from `@preact/signals-react/utils` for syncing and advanced patterns, inspired by hook examples.

| Status | Rule Name | Description | Implementation |
|--------|-----------|-------------|----------------|
| ❌ Not Done | `prefer-use-live-signal-for-sync` | Suggests `useLiveSignal` for syncing local to external signals. | Not yet implemented |

## Implementation Notes

- **Detection Logic**: Extend your AST analysis to identify imports from `@preact/signals-react` and `@preact/signals-react/utils`, track mutations/accesses in scopes (e.g., handlers for batch), and detect side-effect patterns in callbacks (e.g., for cleanup).
- **Config Options**: Add plugin-level `signalsUtilsImport: string` (default: '@preact/signals-react/utils') for utilities. Include `enableDangerousAutofix` for rules like batch (could alter behavior if nested).
- **Severity and Autofix**: Default to 'warn'; mark `[AUTOFIXABLE]` in messages. Test for false positives, e.g., in non-mutative batches.
- **Why These?**: They address undocumented pitfalls (e.g., no cleanup leaks from guide), performance tips (batching/untracked from core docs), and React-specific utils (useLiveSignal/useSignalRef from npm). Community packages like Unison.js emphasize deep reactivity (e.g., ref rules), while avoiding overlap with your prefs for Show/For/computed/effect.
- **Expansions**: If adding SSR support, consider `no-unsafe-ssr-access` (warn on non-JSON-safe signals). Monitor v2+ breaking changes for global state rules.

These would round out your plugin for comprehensive @preact/signals-react coverage, helping users avoid subtle bugs. If you provide the GitHub repo URL, I can analyze the code for more tailored suggestions!

## Improvements for 1.1.0

### ✅ 1. Add more examples to the documentation showing common patterns and anti-patterns. (8 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates, prefer-computed, prefer-for-over-map, prefer-signal-in-jsx

### ✅ 2. Add more test cases for edge cases and complex scenarios. (7 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates, prefer-computed, prefer-for-over-map
- Added extensive test cases covering:
  - Signal mutations in render, effects, and callbacks
  - Class components and function components
  - Complex data structures and nested objects
  - Loops and control flow
  - Async/await patterns
  - Custom hooks
  - React concurrent features

### ✅ 3. Provide more detailed error messages with specific suggestions. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Added:
  - Specific error messages with code examples
  - Autofix suggestions where applicable
  - Documentation links for more information
  - Context-aware suggestions based on code patterns

### ✅ 4. Optimize the AST traversal for better performance. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Improvements:
  - Early exit conditions for common patterns
  - Caching of scope and type information
  - Optimized visitor patterns
  - Reduced unnecessary traversals

### ✅ 5. Add options to customize which patterns are considered errors. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Implemented Options:
  - [x] Custom signal function names
  - [x] Allowed mutation patterns
  - [x] Severity levels for different rule violations
  - [x] File/pattern-based rule disabling
  
  The following rules support these options:
  - `no-mutation-in-render`: Supports all options
  - `no-non-signal-with-signal-suffix`: Supports custom signal names and severity
  - `no-signal-assignment-in-effect`: Supports custom signal names and severity
  - `no-signal-creation-in-component`: Supports custom signal names and severity
  - `prefer-batch-updates`: Supports custom batch function names and severity

### ✅ 6. Add caching for frequently accessed nodes and scopes. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Caching added for:
  - Scope analysis results
  - Type information
  - Import declarations
  - Signal detection

### ✅ 7. Add performance tracking to identify slow patterns in large codebases. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Features:
  - [x] Execution time tracking per file
  - [x] Rule performance metrics
  - [x] Memory usage monitoring
  - [x] Performance budget reporting
  - [x] Node processing limits
  - [x] Operation counting for expensive operations
  - [x] Phase-based timing for different rule operations

### 8. Consider adding a performance budget for the rule's execution time. (5 occurrences)

- In Progress: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Planned Implementation:
  - [ ] Time-based budget per file
  - [ ] Memory usage limits
  - [ ] Configurable thresholds
  - [ ] Graceful degradation for large files

### ✅ 9. Improve detection of complex patterns in code. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Improved detection for:
  - Nested function calls
  - Object/array destructuring
  - Conditional expressions
  - Type assertions and type guards

### ✅ 10. Add support for custom types and interfaces. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Added support for:
  - TypeScript interfaces
  - Type aliases
  - Generic types
  - Mapped types

### ✅ 11. Add more intelligent autofix suggestions. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Added autofix for:
  - Signal variable renaming
  - Untracked function wrapping
  - Signal access patterns
  - Effect dependency arrays

### ✅ 12. Document common patterns and best practices. (5 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Documentation includes:
  - Code examples
  - Performance considerations
  - Common pitfalls
  - Migration guides

### ✅ 13. Add support for TypeScript's type system. (4 occurrences) - COMPLETED

- Implemented in: no-non-signal-with-signal-suffix, no-signal-assignment-in-effect, no-signal-creation-in-component, prefer-batch-updates
- Features:
  - Type checking for signal values
  - Type inference for signal operations
  - Type guards for signal types
  - Support for generics

### ✅ 14. Add support for custom hook patterns. (3 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-signal-assignment-in-effect, no-signal-creation-in-component
- Supported patterns:
  - Custom signal hooks
  - Effect wrappers
  - Context-based signals
  - Composition of signal hooks

### ✅ 15. Add support for class components. (2 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-signal-creation-in-component
- Added support for:
  - Class component lifecycle methods
  - Instance properties
  - Class static methods
  - Decorators (experimental)

### ✅ 16. Add support for async/await patterns. (2 occurrences) - COMPLETED

- Implemented in: no-mutation-in-render, no-signal-assignment-in-effect
- Features:
  - Async function detection
  - Promise handling
  - Error boundary integration
  - Loading states

### ✅ 17. Add support for JSX patterns. (2 occurrences) - COMPLETED

- Implemented in: prefer-for-over-map, prefer-signal-in-jsx
- Supported patterns:
  - Conditional rendering
  - List rendering
  - Fragments
  - Component composition
