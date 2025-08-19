# ESLint Plugin React Signals Hooks

A comprehensive ESLint plugin for React applications using `@preact/signals-react`. This plugin provides specialized rules to ensure proper signal usage, optimal performance, and adherence to React signals best practices, along with support for popular validation libraries.

## Features

### 🎯 **Signal Validation**

- 21 specialized rules for React signals
- Complete replacement for `eslint-plugin-react-hooks/exhaustive-deps` rule
- Enhanced `exhaustive-deps` with signal awareness

### 🚀 **Performance Optimization**

- Automatic batching of signal updates
- Optimized dependency tracking
- Efficient signal access patterns
- Minimal runtime overhead

## Rules Overview

This plugin provides 22 specialized ESLint rules for React signals:

| Rule | Purpose | Autofix | Severity |
|------|---------|---------|----------|
| `exhaustive-deps` | Enhanced dependency detection for React hooks with @preact/signals-react support | ✅ | Error |
| `require-use-signals` | Enforces `useSignals()` hook in components using signals | ✅ | Error |
| `no-mutation-in-render` | Prevents signal mutations during render phase | ✅ | Error |
| `no-signal-creation-in-component` | Prevents signal creation in render | ✅ | Error |
| `no-signal-assignment-in-effect` | Prevents signal assignments in effects without deps | ✅ | Error |
| `no-non-signal-with-signal-suffix` | Ensures variables with 'Signal' suffix are signals | ✅ | Warning |
| `prefer-batch-updates` | Prefers batched updates for multiple signal changes | ✅ | Warning |
| `prefer-computed` | Suggests `computed()` over `useMemo` | ✅ | Warning |
| `prefer-for-over-map` | Suggests For component over `.map()` | ✅ | Warning |
| `prefer-show-over-ternary` | Suggests Show component for ternaries | ✅ | Warning |
| `prefer-signal-effect` | Prefers `effect()` over `useEffect` | ✅ | Warning |
| `prefer-signal-in-jsx` | Prefers direct signal usage in JSX | ✅ | Warning |
| `prefer-signal-methods` | Enforces signal methods over properties | ✅ | Warning |
| `prefer-signal-reads` | Optimizes signal access patterns | ✅ | Warning |
| `prefer-use-signal-over-use-state` | Suggests `useSignal` over `useState` | ✅ | Warning |
| `prefer-use-signal-ref-over-use-ref` | Suggests `useSignalRef` over `useRef` when `.current` is read during render | ✅ | Warning |
| `restrict-signal-locations` | Controls where signals can be created | ✅ | Error |
| `signal-variable-name` | Enforces signal naming conventions | ✅ | Error |
| `warn-on-unnecessary-untracked` | Warns about unnecessary `untracked()` usage | ✅ | Warning |
| `forbid-signal-re-assignment` | Forbids aliasing or re-assigning variables that hold a signal | ❌ | Error |
| `forbid-signal-destructuring` | Forbids destructuring signals into aliases (e.g., `{ value } = signal`) | ❌ | Error |
| `forbid-signal-update-in-computed` | Forbids updating signals inside `computed(...)` callbacks to keep them pure/read-only | ❌ | Error |

For detailed examples and options for each rule, see the docs in `docs/rules/`.

- [`prefer-use-signal-ref-over-use-ref` docs](./docs/rules/prefer-use-signal-ref-over-use-ref.md)
- [`prefer-for-over-map` docs](./docs/rules/prefer-for-over-map.md)
- [`forbid-signal-re-assignment` docs](./docs/rules/forbid-signal-re-assignment.md)
- [`forbid-signal-destructuring` docs](./docs/rules/forbid-signal-destructuring.md)
- [`forbid-signal-update-in-computed` docs](./docs/rules/forbid-signal-update-in-computed.md)

### `forbid-signal-destructuring` options (summary)

- `modules?: string[]`
  - Additional module specifiers to treat as exporting signal creators.
  - Works with aliased and namespaced imports.

- `enableSuffixHeuristic?: boolean` (default: `false`)
  - When `true`, enables suffix-based detection (e.g., variables ending with `Signal`) as a fallback.
  - Can increase false positives; keep off unless needed.

### `forbid-signal-re-assignment` options (summary)

- `modules?: string[]`
  - Additional module specifiers to treat as exporting signal creators. Merged with defaults (`@preact/signals-react`, `@preact/signals-core`).

- `allowBareNames?: boolean` (default: `false`)
  - When `true`, treats bare identifiers `signal`/`computed`/`effect` as creators even without imports. Can increase false positives; keep disabled unless needed.

- `suffix?: string` (default: `"Signal"`)
  - Variable-name suffix used as a heuristic when identifying signal-like variables.

### Rule spotlight: `prefer-use-signal-ref-over-use-ref`

Encourages `useSignalRef` from `@preact/signals-react/utils` instead of `useRef` when `.current` is read during render/JSX.

❌ Incorrect

```tsx
import { useRef } from 'react';

function Example() {
  const divRef = useRef<HTMLDivElement | null>(null);
  return <div ref={divRef}>{divRef.current}</div>; // render read
}
```

✅ Correct

```tsx
import { useSignalRef } from '@preact/signals-react/utils';

function Example() {
  const divRef = useSignalRef<HTMLDivElement | null>(null);
  return <div ref={divRef}>{divRef.current}</div>;
}
```

Autofix performs:

- Add import: `useSignalRef` from `@preact/signals-react/utils` (augments existing import when possible)
- Replace call: `useRef(...)` → `useSignalRef(...)`
- Rename variable and references: appends or replaces suffix with `SignalRef`

Example rename (autofixed):

```tsx
// Before
const inputRef = useRef<HTMLInputElement | null>(null);
<input ref={inputRef} onFocus={() => inputRef.current?.select()} />

// After (autofixed)
import { useSignalRef } from '@preact/signals-react/utils';
const inputSignalRef = useSignalRef<HTMLInputElement | null>(null);
<input ref={inputSignalRef} onFocus={() => inputSignalRef.current?.select()} />
```

Option:

- `onlyWhenReadInRender` (default: `true`) — only warn when `.current` is read in render/JSX. Imperative-only usage (effects/handlers) is ignored.

## Key Features

### 🎯 **Smart Signal Detection**

- Detects signal usage patterns across all React hooks
- Handles complex property chains and computed member expressions
- Excludes inner-scope variables from dependency requirements
- Supports both direct signals and `.value` property access

### 🔧 **Comprehensive Autofix**

- Automatically fixes missing dependencies
- Removes redundant and unnecessary dependencies
- Adds required imports (`useSignals`, `Show`, `For`)
- Transforms variable names to follow conventions

### 🛡️ **Context-Aware Analysis**

- Distinguishes between JSX and hook contexts
- Detects render vs. effect contexts for mutation rules
- Handles event handlers, callbacks, and nested functions
- Supports both React hooks and signals-core patterns

## Installation

Install the plugin alongside `@preact/signals-react`:

```bash
# npm
npm install --save-dev @ospm/eslint-plugin-react-signals-hooks @preact/signals-react

# yarn
yarn add --dev @ospm/eslint-plugin-react-signals-hooks @preact/signals-react

# pnpm
pnpm add -D @ospm/eslint-plugin-react-signals-hooks @preact/signals-react
```

You must disable the `react-hooks/exhaustive-deps` rule when using this plugin, since this plugin provides a signal-aware replacement:

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "off"
  }
}
```

## Configuration

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import reactSignalsHooks from '@ospm/eslint-plugin-react-signals-hooks';

export default [
  {
    plugins: {
      'react-signals-hooks': reactSignalsHooks,
    },
    rules: {
      // Enhanced dependency detection
      'react-signals-hooks/exhaustive-deps': [
        'error',
        {
          enableAutoFixForMemoAndCallback: true,
          enableDangerousAutofixThisMayCauseInfiniteLoops: false,
        },
      ],
      
      // Signal usage enforcement
      'react-signals-hooks/require-use-signals': 'error',
      'react-signals-hooks/signal-variable-name': 'error',
      'react-signals-hooks/no-mutation-in-render': 'error',
      
      // Performance and best practices
      'react-signals-hooks/prefer-signal-in-jsx': 'warn',
      'react-signals-hooks/prefer-show-over-ternary': 'warn',
      'react-signals-hooks/prefer-for-over-map': 'warn',
      'react-signals-hooks/prefer-signal-effect': 'warn',
      'react-signals-hooks/prefer-computed': 'warn',
      'react-signals-hooks/prefer-use-signal-ref-over-use-ref': 'warn',
    },
  },
];
```

### Legacy ESLint Config

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['react-signals-hooks'],
  rules: {
    // Enhanced dependency detection
    'react-signals-hooks/exhaustive-deps': [
      'error',
      {
        enableAutoFixForMemoAndCallback: true,
        enableDangerousAutofixThisMayCauseInfiniteLoops: false,
      },
    ],
    
    // Signal usage enforcement
    'react-signals-hooks/require-use-signals': 'error',
    'react-signals-hooks/signal-variable-name': 'error',
    'react-signals-hooks/no-mutation-in-render': 'error',
    
    // Performance and best practices
    'react-signals-hooks/prefer-signal-in-jsx': 'warn',
    'react-signals-hooks/prefer-show-over-ternary': 'warn',
    'react-signals-hooks/prefer-for-over-map': 'warn',
    'react-signals-hooks/prefer-signal-effect': 'warn',
    'react-signals-hooks/prefer-computed': 'warn',
  },
};
```

## Rule Documentation

### 1. `exhaustive-deps` - Enhanced Dependency Detection

Extends React's exhaustive-deps rule with signal-aware dependency detection.

**Options:**

- `enableAutoFixForMemoAndCallback` (boolean, default: `false`) - Enable autofix for safe hooks
- `enableDangerousAutofixThisMayCauseInfiniteLoops` (boolean, default: `false`) - Enable autofix for effect hooks

```tsx
// ❌ Missing signal dependency
const value = useMemo(() => countSignal.value * 2, []);
// ✅ Fixed
const value = useMemo(() => countSignal.value * 2, [countSignal.value]);
```

### 2. `require-use-signals` - Enforce useSignals Hook

Requires components using signals to call `useSignals()` for optimal performance.

```tsx
// ❌ Missing useSignals()
function Component() {
  return <div>{countSignal.value}</div>;
}

// ✅ With useSignals()
function Component() {
  const store = useSignals(1);

  try {
    return <div>{countSignal.value}</div>;
  } finally {
    store.f();
  }
}
```

### 3. `no-mutation-in-render` - Prevent Render Mutations

Prevents signal mutations during component render phase.

```tsx
// ❌ Mutation during render
function Component() {
  countSignal.value++; // Error: mutation in render
  return <div>{countSignal.value}</div>;
}

// ✅ Mutation in effect
function Component() {
  useEffect(() => {
    countSignal.value++; // OK: mutation in effect
  }, []);
  return <div>{countSignal.value}</div>;
}
```

### 4. `no-signal-creation-in-component` - Prevent Signal Creation in Render

Prevents signal creation inside component render functions.

```tsx
// ❌ Signal creation in render
function Component() {
  const countSignal = signal(0); // Error: signal created in render
  return <div>{countSignal.value}</div>;
}

// ✅ Signal created at module level or in hooks
const countSignal = signal(0);
function Component() {
  return <div>{countSignal.value}</div>;
}
```

### 5. `no-signal-assignment-in-effect` - Safe Effect Dependencies

Prevents signal assignments in effects without proper dependency tracking.

```tsx
// ❌ Unsafe signal assignment in effect
useEffect(() => {
  countSignal.value = 42; // Missing dependency
}, []);

// ✅ With proper dependency
useEffect(() => {
  countSignal.value = 42;
}, [someDependency]);
```

### 6. `no-non-signal-with-signal-suffix` - Consistent Naming

Ensures variables with 'Signal' suffix are actual signal instances.

```tsx
// ❌ Incorrect usage of Signal suffix
const dataSignal = { value: 42 }; // Not a real signal

// ✅ Correct usage
const dataSignal = signal(42);
```

### 7. `prefer-batch-updates` - Batch Signal Updates

Encourages batching multiple signal updates.

```tsx
// ❌ Separate updates
function handleClick() {
  setA(a + 1);
  setB(b + 1);
}

// ✅ Batched updates (autofixed)
function handleClick() {
  batch(() => {
    setA(a + 1);
    setB(b + 1);
  });
}
```

### 8. `prefer-computed` - Computed Values

Prefers `computed()` over `useMemo` for signal-derived values.

```tsx
// ❌ useMemo with only signal dependencies
const doubled = useMemo(() => countSignal.value * 2, [countSignal.value]);

// ✅ Using computed() (autofixed)
const doubled = computed(() => countSignal.value * 2);
```

### 9. `prefer-for-over-map` - For Component

Suggests using For component over `.map()` for better performance with signal arrays.

```tsx
// ❌ Using .map() in JSX
{itemsSignal.value.map(item => <div key={item.id}>{item.name}</div>)}

// ✅ Using For component (autofixed)
<For each={itemsSignal}>
  {item => <div>{item.name}</div>}
</For>
```

### 10. `prefer-show-over-ternary` - Show Component

Suggests using Show component for conditional rendering with signals.

```tsx
// ❌ Complex ternary with signal
{visibleSignal.value ? (
  <div>Content</div>
) : null}

// ✅ Using Show component (autofixed)
<Show when={visibleSignal.value}>
  <div>Content</div>
</Show>
```

### 11. `prefer-signal-effect` - Signal Effects

Prefers `effect()` over `useEffect` when dependencies are only signals.

```tsx
// ❌ useEffect with only signal dependencies
useEffect(() => {
  console.log(countSignal.value);
}, [countSignal.value]);

// ✅ Using effect() (autofixed)
effect(() => {
  console.log(countSignal.value);
});
```

### 12. `prefer-signal-in-jsx` - Direct Signal Usage

Prefers direct signal usage over `.value` in JSX.

```tsx
// ❌ Using .value in JSX
<div>{messageSignal.value}</div>

// ✅ Direct signal usage (autofixed)
<div>{messageSignal}</div>
```

### 13. `prefer-signal-methods` - Signal Methods

Encourages using signal methods over direct property access.

```tsx
// ❌ Direct property access
const value = signal(0);
value.value = 1;

// ✅ Using methods (autofixed)
const value = signal(0);
value.set(1);
```

### 14. `prefer-signal-reads` - Optimized Signal Reading

Optimizes signal access patterns for better performance.

```tsx
// ❌ Multiple signal reads
function double() {
  return countSignal.value * 2;
}

// ✅ Single read (autofixed)
function double() {
  const count = countSignal.value;
  return count * 2;
}
```

### 15. `prefer-use-signal-over-use-state` - Signal State

Suggests `useSignal` over `useState` for primitive values.

```tsx
// ❌ Using useState for primitive
const [count, setCount] = useState(0);

// ✅ Using useSignal (autofixed)
const countSignal = useSignal(0);
```

### 16. `restrict-signal-locations` - Signal Scope Control

Controls where signals can be created in the codebase.

**Options:**

- `allowedPaths`: Array of glob patterns where signals can be created
- `disallowedPaths`: Array of glob patterns where signals cannot be created

```tsx
// ❌ Signal creation in disallowed location
function Component() {
  const signal = createSignal(0); // Error: Signal creation not allowed here
  return <div>{signal.value}</div>;
}
```

### 17. `signal-variable-name` - Naming Conventions

Enforces consistent naming for signal variables.

**Rules:**

- Must end with 'Signal'
- Must start with lowercase
- Must not start with 'use'

```tsx
// ❌ Incorrect naming
const counter = signal(0);
const useDataSignal = signal('');

// ✅ Correct naming (autofixed)
const counterSignal = signal(0);
const dataSignal = signal('');
```

### 18. `warn-on-unnecessary-untracked` - Optimize Untracked Usage

Warns about unnecessary `untracked()` usage.

```tsx
// ❌ Unnecessary untracked
const value = untracked(() => countSignal.value);

// ✅ Direct access is sufficient
const value = countSignal.value;
```

## Usage Examples

### ✅ **Correct Usage**

```tsx
import { useCallback, useMemo, useEffect } from 'react';
import { counterSignal, nameSignal } from './signals';

function MyComponent() {
  const count = counterSignal.value;
  const name = nameSignal.value;

  // ✅ Correct: includes signal.value dependencies
  const memoizedValue = useMemo(() => {
    return count * 2 + name.length;
  }, [count, name]); // or [counterSignal.value, nameSignal.value]

  // ✅ Correct: useRef is stable, no dependency needed
  const ref = useRef(null);
  const callback = useCallback(() => {
    ref.current?.focus();
  }, []); // useRef values are stable

  // ✅ Correct: computed member expressions
  const data = useMemo(() => {
    return items.find(item => item.id === selectedId);
  }, [items, selectedId]); // selectedId from outer scope

  return <div>{memoizedValue}</div>;
}
```

### ❌ **Incorrect Usage (Will be flagged)**

```tsx
// ❌ Missing signal.value dependencies
const memoizedValue = useMemo(() => {
  return counterSignal.value * 2;
}, []); // Missing: counterSignal.value

// ❌ Using base signal instead of .value
const memoizedValue = useMemo(() => {
  return counterSignal.value * 2;
}, [counterSignal]); // Should be: [counterSignal.value]

// ❌ Redundant base dependency
const memoizedValue = useMemo(() => {
  return counterSignal.value * 2;
}, [counterSignal, counterSignal.value]); // counterSignal is redundant

// ❌ Including useRef unnecessarily
const ref = useRef(null);
const callback = useCallback(() => {
  ref.current?.focus();
}, [ref]); // useRef values should not be dependencies
```

## Advanced Patterns

### Complex Signal Dependencies

```tsx
// ✅ Handles deep property access and computed members
const value = useMemo(() => {
  return hexagonsSignal.value[hexId].neighbors?.top?.id;
}, [hexagonsSignal.value[hexId].neighbors?.top?.id, hexId]);

// ✅ Inner-scope variable exclusion
const filtered = useMemo(() => {
  return items.filter((item) => {
    return signalMap.value[item.id]; // item.id is inner-scope
  });
}, [signalMap.value, items]); // item.id not required
```

### Assignment vs. Read Detection

```tsx
// ✅ Assignment-only: no signal dependency needed
const updateData = useCallback(() => {
  dataSignal.value[key] = newValue;
}, [key, newValue]);

// ✅ Read + assignment: signal dependency required
const conditionalUpdate = useCallback(() => {
  if (!dataSignal.value[key]) {
    dataSignal.value[key] = newValue;
  }
}, [dataSignal.value[key], key, newValue]);
```

## Supported Hooks and Patterns

- ✅ `useMemo`, `useCallback`, `useEffect`, `useLayoutEffect`
- ✅ Custom hooks following the `use*` pattern
- ✅ `effect()` and `computed()` from `@preact/signals-core`
- ✅ Signal property chains and computed member expressions
- ✅ Inner-scope variable detection in callbacks

## TypeScript Support

Fully compatible with TypeScript and `@typescript-eslint/parser`.

- Works with both Flat config (`eslint.config.js`) and legacy `.eslintrc`.
- Understands TS syntax features (generics, `as const`, enums, type-only imports).
- Analyzes computed members and property chains with proper type info when available.

Parser setup example (legacy config):

```js
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'] }, // optional but recommended for best type-aware results
  plugins: ['react-signals-hooks'],
  rules: {
    'react-signals-hooks/exhaustive-deps': 'error',
  },
};
```

Flat config example:

```js
// eslint.config.js
import tseslint from 'typescript-eslint';
import reactSignalsHooks from '@ospm/eslint-plugin-react-signals-hooks';

export default [
  ...tseslint.config({
    parserOptions: { project: ['./tsconfig.json'] }, // optional
  }),
  {
    plugins: { 'react-signals-hooks': reactSignalsHooks },
    rules: { 'react-signals-hooks/exhaustive-deps': 'error' },
  },
];
```

Note: a `project` reference is not strictly required, but it can improve precision for complex expressions.

## Compatibility

- React 18+
- `@preact/signals-react` 2.x+
- Node.js 18+
- ESLint 8.56+ (legacy) or 9+ (Flat config)

## IDE Integration

- Works out of the box with VS Code ESLint extension.
- Autofixes are safe-by-default. For aggressive fixes in effects, enable: `enableDangerousAutofixThisMayCauseInfiniteLoops` in `exhaustive-deps` options.
- Many rules provide code actions and rename-safe fixes (imports/identifiers updated consistently).

## Performance

- Uses targeted AST visitors and avoids repeated traversal.
- Skips inner-scope variables for dependency inference to reduce noise.
- Provides internal performance tracking hooks in rule implementations.

Tips:

- Run ESLint with `--cache` in CI and locally.
- Prefer Flat config for faster startup in ESLint 9+.

## Limitations

- The plugin does not execute code; dynamic patterns may require manual review.
- If you heavily customize signal creators or use unusual abstractions, consider enabling `modules` and/or `enableSuffixHeuristic` options in relevant rules.
- Aggressive autofix for effects can introduce loops if your effect writes to values it also reads; keep `enableDangerousAutofixThisMayCauseInfiniteLoops` off unless you know the codebase patterns.

## FAQ

- Why replace `react-hooks/exhaustive-deps`? — React Hooks rules are not signal-aware. This plugin understands `.value`, computed chains, and signal semantics to provide accurate deps and safer fixes.
- Can I keep both rules on? — No. Disable `react-hooks/exhaustive-deps` to avoid conflicts and duplicate/contradictory diagnostics.
- Does it support custom hooks? — Yes. Any `use*` function is analyzed as a hook callback site for dependency inference.

## Contributing

Contributions are welcome! Please open an issue or PR. Follow the repository’s lint/test conventions, and add rule docs under `packages/eslint-plugin-react-signals-hooks/docs/rules/` following the structure described in `rules.md`.

## License

MIT © OSPM
