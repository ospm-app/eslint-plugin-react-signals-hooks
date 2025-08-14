# Restrict Signal Locations Rule

This rule enforces best practices for signal creation by restricting where signals can be created. Signals should typically be created at the module level or within custom hooks, not inside component bodies. This helps prevent performance issues and unexpected behavior in React components.

## Rule Details

This rule restricts where signals can be created in your codebase to enforce better architectural patterns and prevent common issues:

1. **Module-level signal creation** (✅ Allowed)
   - Signals created at the top level of a module
   - Signals created in custom hooks

2. **Component-level signal creation** (❌ Not recommended)
   - Signals created inside React component bodies
   - Computed values created inside component bodies (unless explicitly allowed)

3. **Exported signals** (❌ Not recommended)
   - Signals that are exported from a module (can cause circular imports)

## Why is this important?

1. **Performance**: Creating signals inside components can lead to unnecessary re-renders and memory leaks
2. **Predictability**: Module-level signals have a more predictable lifecycle
3. **Debugging**: Easier to track signal updates when they're not recreated on every render
4. **Import cycles**: Prevents circular dependencies that can break the build

## Options

This rule accepts an options object with the following properties:

```typescript
interface Options {
  /**
   * Array of directory patterns where signal creation is allowed
   * @default []
   */
  allowedDirs?: string[];
  
  /**
   * Whether to allow computed values in component bodies
   * @default false
   */
  allowComputedInComponents?: boolean;
  
  /**
   * Pattern to identify custom hooks
   * @default '^use[A-Z][a-zA-Z0-9]*$'
   */
  customHookPattern?: string;
  
  /**
   * Per-message overrides for severity
   */
  severity?: {
    signalInComponent?: 'error' | 'warn' | 'off';
    signalInHook?: 'error' | 'warn' | 'off';
    signalExported?: 'error' | 'warn' | 'off';
  };
  
  /** Performance tuning options */
  performance?: {
    maxTime?: number;
    maxMemory?: number;
    maxNodes?: number;
    enableMetrics?: boolean;
    logMetrics?: boolean;
  };
}
```

### Default Options

```json
{
  "allowedDirs": [],
  "allowComputedInComponents": false,
  "customHookPattern": "^use[A-Z][a-zA-Z0-9]*$",
  "severity": {
    "signalInComponent": "error",
    "signalInHook": "error",
    "signalExported": "error"
  },
  "performance": {
    "maxTime": 200,
    "maxMemory": 256,
    "maxNodes": 100000,
    "enableMetrics": false,
    "logMetrics": false
  }
}
```

## Error Messages

### signalInComponent

- **Message**: "Avoid creating signals in component bodies. Move to module level or to external file"
- **Description**: A signal is being created inside a React component body

### computedInComponent

- **Message**: "Avoid creating computed values in component bodies. Consider using useMemo instead."
- **Description**: A computed value is being created inside a React component body

### exportedSignal

- **Message**: "Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. Use @biomejs/biome for circular imports diagnostic."
- **Description**: A signal is being exported from a module

## Examples

### ❌ Incorrect

```tsx
// Bad: creating a signal inside a component
import { signal, computed } from '@preact/signals-react';

export function Counter() {
  const count = signal(0);
  const doubleCount = computed(() => count.value * 2);
  
  return <div>Count: {count.value}, Double Count: {doubleCount.value}</div>;
}
```

### ✅ Correct

```tsx
// Good: creating a signal at the module level
import { signal, computed } from '@preact/signals-react';

const count = signal(0);
const doubleCount = computed(() => count.value * 2);

export function Counter() {
  return <div>Count: {count.value}, Double Count: {doubleCount.value}</div>;
}
```

## Configuration Examples

### Options

This rule supports the following options:

### Allow computed values in components

```json
{
  "rules": {
    "react-signals-hooks/restrict-signal-locations": [
      "error",
      {
        "allowComputedInComponents": true
      }
    ]
  }
}
```

### Custom hook pattern

```json
{
  "rules": {
    "react-signals-hooks/restrict-signal-locations": [
      "error",
      {
        "customHookPattern": "^use[A-Z][a-zA-Z0-9]*$"
      }
    ]
  }
}
```

## When Not To Use It

You might want to disable this rule when:

1. Working with test files where component-level signals are needed for testing
2. Migrating legacy code to the new pattern
3. Working with third-party libraries that require a different pattern

## Related Rules

- `no-signal-assignment-in-effect`: Prevents direct signal assignments in effects
- `no-mutation-in-render`: Prevents signal mutations during render
- `prefer-signal-effect`: Encourages using signals with effects properly

---

## Additional Guidance and Examples

### ❌ Incorrect: Exported signals

Exporting signals from modules can lead to circular imports and make data flow harder to reason about.

```tsx
// bad.tsx
import { signal } from '@preact/signals-react';

// Named export of a signal variable — not recommended
export const exportedSignal = signal('x');

// Default export of a signal identifier — not recommended
const defaultSignal = signal('y');
export default defaultSignal;

// Default export of a call expression creating a signal — not recommended
export default signal('z');
```

### ✅ Correct: Avoid exporting signals directly

Prefer exporting factories or plain values derived at call-sites.

```tsx
// good.tsx
import { signal } from '@preact/signals-react';

// Export a factory that creates signals locally where needed
export function createCounter() {
  const count = signal(0);
  const inc = () => count.value++;
  return { count, inc };
}
```

### ❌ Incorrect: Creating signals in memo/forwardRef-wrapped components

Components wrapped in `memo` or `forwardRef` are still components. Creating signals inside them is flagged.

```tsx
import { memo, forwardRef } from 'react';
import { signal } from '@preact/signals-react';

export const MemoWrapped = memo(() => {
  const s = signal(0); // ❌ flagged
  return <div>{s}</div>;
});

export const ForwardRefWrapped = forwardRef(function Fwd() {
  const s = signal(0); // ❌ flagged
  return <div>{s}</div>;
});
```

### ℹ️ Aliased and namespaced imports are detected

Aliased `signal`/`computed` and namespace imports (e.g., `S.signal`) are recognized by the rule.

```tsx
import { signal as sig, computed as cmp } from '@preact/signals-react';
import * as S from '@preact/signals-react';

export function Component() {
  // Both calls below are treated as signal/computed creations inside a component
  const a = sig(1);      // flagged
  const b = cmp(() => a.value + 1); // flagged (unless allowComputedInComponents: true)
  return <div>{a} {b}</div>;
}
```
