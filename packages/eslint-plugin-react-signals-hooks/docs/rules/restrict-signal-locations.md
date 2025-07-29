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
   * @default '^use[A-Z]'
   */
  customHookPattern?: string;
  
  /** Performance tuning options */
  performance?: {
    maxNodeCount?: number;
    maxNodeCountPerRun?: number;
    maxFixCount?: number;
    maxFixCountPerRun?: number;
    maxFixIterations?: number;
    maxFixTimeMs?: number;
    maxTotalTimeMs?: number;
    enableMetrics?: boolean;
  };
}
```

### Default Options

```json
{
  "allowedDirs": [],
  "allowComputedInComponents": false,
  "customHookPattern": "^use[A-Z]",
  "performance": {
    "maxTime": 1000,
    "maxNodes": 2000,
    "enableMetrics": false,
    "logMetrics": false
  }
}
```

## Error Messages

### signalInComponent

- **Message**: "Avoid creating signals in component bodies. Move to module level or a custom hook."
- **Description**: A signal is being created inside a React component body
- **Fix Suggestion**: Move the signal creation to the module level or a custom hook

### computedInComponent

- **Message**: "Avoid creating computed values in component bodies. Consider using useMemo instead."
- **Description**: A computed value is being created inside a React component body
- **Fix Suggestion**: Use `useMemo` for computed values inside components or move the computation to a custom hook

### exportedSignal

- **Message**: "Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. Use @biomejs/biome for circular imports diagnostic."
- **Description**: A signal is being exported from a module
- **Fix Suggestion**: Avoid exporting signals directly to prevent circular dependencies

## Examples

### ❌ Incorrect

```tsx
// signals.ts - Exporting signals (not recommended)
export const count = signal(0);

export function Counter() {
  // Creating signal in component body (not recommended)
  const [name, setName] = createSignal('');
  
  // Computed value in component body (not recommended)
  const fullName = createMemo(() => `User: ${name()}`);
  
  return <div>{fullName()}</div>;
}
```

### ✅ Correct

```tsx
// hooks/useUser.ts - Custom hook for user-related state
export function useUser() {
  const name = signal('');
  const fullName = computed(() => `User: ${name.value}`);
  
  return { name, fullName };
}

// components/Counter.tsx
import { useUser } from '../hooks/useUser';

export function Counter() {
  const { name, fullName } = useUser();
  
  return <div>{fullName}</div>;
}
```

## Configuration Examples

### Allow signals in specific directories

```json
{
  "rules": {
    "react-signals-hooks/restrict-signal-locations": [
      "error",
      {
        "allowedDirs": ["src/store", "src/lib"]
      }
    ]
  }
}
```

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
