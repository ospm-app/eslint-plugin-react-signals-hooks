# ESLint Plugin React Signals Hooks

A comprehensive ESLint plugin for React applications using `@preact/signals-react`. This plugin provides 9 specialized rules to ensure proper signal usage, optimal performance, and adherence to React signals best practices.

This is partial replacement for eslint-plugin-react-hooks. Partially because it replaces `react-hooks/exhaustive-deps` rule with `react-signals-hooks/exhaustive-deps` rule.

## Rules Overview

This plugin provides 9 specialized ESLint rules for React signals:

| Rule | Purpose | Autofix | Severity |
|------|---------|---------|----------|
| `exhaustive-deps` | Enhanced dependency detection for React hooks with signals | ✅ | Error |
| `require-use-signals` | Enforces `useSignals()` hook in components using signals | ✅ | Error |
| `no-mutation-in-render` | Prevents signal mutations during render phase | ❌ | Error |
| `prefer-signal-in-jsx` | Prefers direct signal usage over `.value` in JSX | ✅ | Warning |
| `prefer-show-over-ternary` | Suggests Show component for complex ternary expressions | ✅ | Warning |
| `prefer-for-over-map` | Suggests For component over `.map()` for signal arrays | ✅ | Warning |
| `prefer-signal-effect` | Prefers `effect()` over `useEffect` for signal-only deps | ✅ | Warning |
| `prefer-computed` | Prefers `computed()` over `useMemo` for signal-derived values | ✅ | Warning |
| `signal-variable-name` | Enforces naming conventions for signal variables | ✅ | Error |

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

```bash
npm install --save-dev @ospm/eslint-plugin-react-signals-hooks
```

```bash
yarn add --dev @ospm/eslint-plugin-react-signals-hooks
```

```bash
pnpm install --save-dev @ospm/eslint-plugin-react-signals-hooks
```

you have to turn off `react-hooks/exhaustive-deps` rule in your eslint config if you use this plugin.

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
  useSignals();
  return <div>{countSignal.value}</div>;
}
```

### 3. `signal-variable-name` - Naming Conventions

Enforces consistent naming for signal and computed variables.

**Rules:**

- Must end with 'Signal'
- Must start with lowercase
- Must not start with 'use'

```tsx
// ❌ Incorrect naming
const counter = signal(0);
const useDataSignal = signal('');
const CounterSignal = signal(0);

// ✅ Correct naming (autofixed)
const counterSignal = signal(0);
const dataSignal = signal('');
const counterSignal = signal(0);
```

### 4. `no-mutation-in-render` - Prevent Render Mutations

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

### 5. `prefer-signal-in-jsx` - Direct Signal Usage

Prefers direct signal usage over `.value` in JSX for better reactivity.

**Exclusions:** Property access, array indexing, method calls, className usage

```tsx
// ❌ Using .value in JSX
<div>{messageSignal.value}</div>

// ✅ Direct signal usage (autofixed)
<div>{messageSignal}</div>

// ✅ Property access (not flagged)
<div>{userSignal.value.name}</div>
<div className={themeSignal.value}>Content</div>
```

### 6. `prefer-show-over-ternary` - Show Component

Suggests using Show component for complex conditional rendering with signals.

```tsx
// ❌ Complex ternary with signal
{visibleSignal.value ? (
  <div>
    <h1>Title</h1>
    <p>Complex content</p>
  </div>
) : null}

// ✅ Using Show component (autofixed)
<Show when={visibleSignal.value}>
  <div>
    <h1>Title</h1>
    <p>Complex content</p>
  </div>
</Show>
```

### 7. `prefer-for-over-map` - For Component

Suggests using For component over `.map()` for better performance with signal arrays.

```tsx
// ❌ Using .map() in JSX
{itemsSignal.value.map(item => <div key={item.id}>{item.name}</div>)}

// ✅ Using For component (autofixed)
<For each={itemsSignal.value}>
  {item => <div>{item.name}</div>}
</For>
```

### 8. `prefer-signal-effect` - Signal Effects

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

### 9. `prefer-computed` - Computed Values

Prefers `computed()` over `useMemo` for signal-derived values.

```tsx
// ❌ useMemo with only signal dependencies
const doubled = useMemo(() => countSignal.value * 2, [countSignal.value]);

// ✅ Using computed() (autofixed)
const doubled = computed(() => countSignal.value * 2);
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

## Error Messages and Autofix

The plugin provides clear, actionable error messages with autofix indicators:

```text
✖ React Hook useMemo has a missing dependency: 'counterSignal.value' [AUTOFIXABLE]
✖ Signal variable 'counter' should end with 'Signal' [AUTOFIXABLE]
✖ Consider using Show component for complex conditional rendering [AUTOFIXABLE]
✖ Signal mutation detected during render phase [NO AUTOFIX]
```

### Autofix Indicators

- **`[AUTOFIXABLE]`**: Error can be automatically fixed with `--fix` option
- **`[SUGGESTIONS AVAILABLE]`**: Error has suggested fixes available in your IDE
- **`[NO AUTOFIX]`**: Error requires manual intervention

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

Fully compatible with TypeScript and `@typescript-eslint/parser`. Handles:

- Type assertions (`as` keyword)
- Generic type parameters
- Complex type definitions
- Interface and type alias references

## Troubleshooting

### Common Issues

1. **"Plugin not found" error**
   - Ensure the plugin is installed in the correct location
   - Check your ESLint config file path

2. **Autofix not working**
   - Enable `enableAutoFixForMemoAndCallback: true` in rule options
   - Use `--fix` flag when running ESLint

3. **False positives for stable values**
   - The plugin should automatically detect `useRef`, `useCallback` with empty deps, etc.
   - If you encounter issues, please file a bug report

## Contributing

This plugin is part of a larger React signals ecosystem. When contributing:

1. Ensure all existing tests pass
2. Add tests for new functionality
3. Update documentation for new features
4. Follow the existing code style

## License

MIT License - see LICENSE file for details. --

## Changelog

### Latest Version

- ✅ Enhanced autofixable error indicators
- ✅ Fixed `useRef` stability detection
- ✅ Improved computed member expression handling
- ✅ Added redundant dependency detection
- ✅ Enhanced inner-scope variable detection
- ✅ Fixed assignment-only detection for complex expressions
