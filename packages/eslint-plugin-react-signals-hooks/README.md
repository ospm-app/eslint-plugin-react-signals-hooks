# ESLint Plugin React Signals Hooks

A comprehensive ESLint plugin for React applications using `@preact/signals-react`. This plugin provides specialized rules to ensure proper signal usage, optimal performance, and adherence to React signals best practices, along with support for popular validation libraries.

## Features

### 🎯 **Signal Validation**

- 19 specialized rules for React signals
- Complete replacement for `eslint-plugin-react-hooks/exhaustive-deps` rule
- Enhanced `exhaustive-deps` with signal awareness

### 🚀 **Performance Optimization**

- Automatic batching of signal updates
- Optimized dependency tracking
- Efficient signal access patterns
- Minimal runtime overhead

## Rules Overview

This plugin provides 19 specialized ESLint rules for React signals:

| Rule | Purpose | Autofix | Severity |
|------|---------|---------|----------|
| `exhaustive-deps` | Enhanced dependency detection for React hooks with @preact/signals-react support | ✅ | Error |
| `require-use-signals` | Enforces `useSignals()` hook in components using signals | ✅ | Error |
| `no-mutation-in-render` | Prevents signal mutations during render phase | ✅ | Error |
| `no-signal-creation-in-component` | Prevents signal creation in render | ✅ | Error |
| `no-signal-assignment-in-effect` | Prevents signal assignments in effects without deps | ✅ | Error |
| `no-non-signal-with-signal-suffix` | Ensures variables with 'Signal' suffix are signals | ✅ | Warning |
| `prefer-batch-for-multi-mutations` | Suggests batching multiple signal mutations | ✅ | Warning |
| `prefer-batch-updates` | Prefers batched updates for multiple signal changes | ✅ | Warning |
| `prefer-computed` | Suggests `computed()` over `useMemo` | ✅ | Warning |
| `prefer-for-over-map` | Suggests For component over `.map()` | ✅ | Warning |
| `prefer-show-over-ternary` | Suggests Show component for ternaries | ✅ | Warning |
| `prefer-signal-effect` | Prefers `effect()` over `useEffect` | ✅ | Warning |
| `prefer-signal-in-jsx` | Prefers direct signal usage in JSX | ✅ | Warning |
| `prefer-signal-methods` | Enforces signal methods over properties | ✅ | Warning |
| `prefer-signal-reads` | Optimizes signal access patterns | ✅ | Warning |
| `prefer-use-signal-over-use-state` | Suggests `useSignal` over `useState` | ✅ | Warning |
| `restrict-signal-locations` | Controls where signals can be created | ✅ | Error |
| `signal-variable-name` | Enforces signal naming conventions | ✅ | Error |
| `warn-on-unnecessary-untracked` | Warns about unnecessary `untracked()` usage | ✅ | Warning |

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

### Installation

```bash
# npm
npm install --save-dev @ospm/eslint-plugin-react-signals-hooks @preact/signals-react

# yarn
yarn add --dev @ospm/eslint-plugin-react-signals-hooks @preact/signals-react

# pnpm
pnpm add -D @ospm/eslint-plugin-react-signals-hooks @preact/signals-react
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

### 7. `prefer-batch-for-multi-mutations` - Batch Updates

Suggests batching multiple signal mutations for better performance.

```tsx
// ❌ Multiple unbatched updates
function update() {
  aSignal.value++;
  bSignal.value++;
  cSignal.value++;
}

// ✅ Batched updates (autofixed)
function update() {
  batch(() => {
    aSignal.value++;
    bSignal.value++;
    cSignal.value++;
  });
}
```

### 8. `prefer-batch-updates` - Batch Signal Updates

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

### 9. `prefer-computed` - Computed Values

Prefers `computed()` over `useMemo` for signal-derived values.

```tsx
// ❌ useMemo with only signal dependencies
const doubled = useMemo(() => countSignal.value * 2, [countSignal.value]);

// ✅ Using computed() (autofixed)
const doubled = computed(() => countSignal.value * 2);
```

### 10. `prefer-for-over-map` - For Component

Suggests using For component over `.map()` for better performance with signal arrays.

```tsx
// ❌ Using .map() in JSX
{itemsSignal.value.map(item => <div key={item.id}>{item.name}</div>)}

// ✅ Using For component (autofixed)
<For each={itemsSignal.value}>
  {item => <div>{item.name}</div>}
</For>
```

### 11. `prefer-show-over-ternary` - Show Component

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

### 12. `prefer-signal-effect` - Signal Effects

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

### 13. `prefer-signal-in-jsx` - Direct Signal Usage

Prefers direct signal usage over `.value` in JSX.

```tsx
// ❌ Using .value in JSX
<div>{messageSignal.value}</div>

// ✅ Direct signal usage (autofixed)
<div>{messageSignal}</div>
```

### 14. `prefer-signal-methods` - Signal Methods

Encourages using signal methods over direct property access.

```tsx
// ❌ Direct property access
const value = signal(0);
value.value = 1;

// ✅ Using methods (autofixed)
const value = signal(0);
value.set(1);
```

### 15. `prefer-signal-reads` - Optimized Signal Reading

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

### 16. `prefer-use-signal-over-use-state` - Signal State

Suggests `useSignal` over `useState` for primitive values.

```tsx
// ❌ Using useState for primitive
const [count, setCount] = useState(0);

// ✅ Using useSignal (autofixed)
const countSignal = useSignal(0);
```

### 17. `restrict-signal-locations` - Signal Scope Control

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

### 18. `signal-variable-name` - Naming Conventions

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

### 19. `warn-on-unnecessary-untracked` - Optimize Untracked Usage

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

## Validation Library Integration

### Configuration

In your `.eslintrc.js`:

```javascript
module.exports = {
  extends: [
    'plugin:@ospm/react-signals-hooks/recommended',
    // Add validation plugins you need
    '@ospm/eslint-plugin-valibot',
    '@ospm/eslint-plugin-zod',
    // ... other plugins
  ],
  rules: {
    // Your custom rules
  },
};
```

### Available Rules

#### Valibot

- `valibot/require-valibot-import` - Ensures Valibot is imported
- `valibot/consistent-import-name` - Enforces consistent import names

#### Zod

- `zod/require-zod-import` - Ensures Zod is imported
- `zod/consistent-import-name` - Enforces consistent import names

#### Joi

- `joi/require-joi-import` - Ensures Joi is imported
- `joi/consistent-import-name` - Enforces consistent import names

#### Arktype

- `arktype/require-arktype-import` - Ensures Arktype is imported
- `arktype/consistent-import-name` - Enforces consistent import names

## Migration Between Validation Libraries

To migrate from one validation library to another, you can use the built-in migration rules:

1. Install the target validation library
2. Add the corresponding ESLint plugin
3. Run the migration command:

```bash
npx eslint --fix --ext .ts,.tsx,.js,.jsx src/
```

The plugin will automatically convert schemas between different validation libraries where possible.

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
