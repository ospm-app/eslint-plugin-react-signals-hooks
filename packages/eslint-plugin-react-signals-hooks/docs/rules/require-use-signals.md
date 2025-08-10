# Require useSignals Hook Rule

This rule enforces the use of the `useSignals()` hook in components that utilize signals from `@preact/signals-react`. The `useSignals` hook is essential for proper signal reactivity in React components.

## Plugin Scope

- Signal creators are detected only from `@preact/signals-react` (direct, aliased, or namespace imports).
- The `useSignals` hook is imported from `@preact/signals-react/runtime` by autofixes when needed.

## Rule Details

This rule ensures that any React component using signals includes the `useSignals()` hook. The hook is required for signals to work correctly in React components, as it sets up the necessary reactivity system. The rule detects signal usage via:

- Variables created with `signal()` or `computed()` from `@preact/signals-react`
- Accesses like `someSignal.value` and `someSignal.peek()`
- Identifiers ending with a configurable suffix (default `"Signal"`)

### Why is this important?

- **Reactivity**: The `useSignals` hook enables React components to properly react to signal changes.
- **Performance**: It optimizes re-renders by only updating components when their used signals change.
- **Consistency**: Ensures a consistent pattern for using signals across the codebase.

## Examples

### ❌ Incorrect

```tsx
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  // Missing useSignals() hook
  return (
    <div>
      <button onClick={() => count.value++}>
        Count: {count}
      </button>
    </div>
  );
}
```

### ✅ Correct

```tsx
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const count = signal(0);

function Counter() {
  useSignals(); // Required for signal reactivity
  
  return (
    <div>
      <button onClick={() => count.value++}>
        Count: {count}
      </button>
    </div>
  );
}
```

## Auto-fix

This rule provides an auto-fix that can automatically add the `useSignals()` hook and the necessary import. The fix will:

1. Insert `const store = useSignals();` as the first statement in the component body
2. Wrap the component body in a `try { ... } finally { store.f(); }` to ensure proper lifecycle cleanup
3. Add or augment `import { useSignals } from '@preact/signals-react/runtime'`
4. Preserve existing code formatting and any directive prologues (e.g., `'use client'`)
5. For expression-bodied arrow components, convert to a block and insert `const store = useSignals(); try { return <expr>; } finally { store.f(); }`

### Auto-fix example

Before:

```tsx
function F_NotificationDebugButton(): JSX.Element {
  // Missing lifecycle-safe useSignals usage
  return (
    <Fragment>
      {/* ... */}
    </Fragment>
  );
}
```

After auto-fix:

```tsx
import { useSignals } from '@preact/signals-react/runtime';

function F_AsyncStorageDebugButton(): JSX.Element {
  const store = useSignals();
  try {
    // component logic
    return (
      <Fragment>
        {/* ... */}
      </Fragment>
    );
  } finally {
    store.f();
  }
}
```

## Options

This rule accepts an options object with the following properties:

```ts
{
  "rules": {
    "react-signals-hooks/require-use-signals": [
      "error",
      {
        "ignoreComponents": ["PureComponent"]
      }
    ]
  }
}
```

- `ignoreComponents` (string[]) - An array of component names to exclude from this rule.
- `suffix` (string) - Suffix used by the heuristic to detect signal-like identifiers (default: `"Signal"`).
- `severity` (object) - Per-message overrides, e.g. `{ missingUseSignals: 'error' | 'warn' | 'off' }`.
- `performance` (object) - Performance budgets and metrics toggles (`maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, `maxOperations`).

## When Not To Use It

You might want to disable this rule if:

1. You're using a custom signal integration that doesn't require `useSignals`
2. You're working with a component that conditionally renders signal-based content
3. You have a specific performance optimization that makes `useSignals` unnecessary

## Related Rules

- `prefer-signal-in-jsx`: For using signals directly in JSX
- `prefer-signal-methods`: For proper signal method usage
- `no-mutation-in-render`: To prevent direct signal mutations during render

## Best Practices

1. **Always use `useSignals`**:

   ```tsx
   function Component() {
     useSignals(); // Always at the top of the component
     // ... rest of the component
   }
   ```

2. **Don't conditionally call `useSignals`**:

   ```tsx
   // ❌ Bad
   function Component() {
     if (someCondition) {
       useSignals(); // This violates React's rules of hooks
     }
   }
   
   // ✅ Good
   function Component() {
     useSignals(); // Always call it unconditionally
     // ... rest of the component
   }
   ```

3. **Use with custom hooks**:

   ```tsx
   function useCustomHook() {
     // No need for useSignals here
     // Just use signals directly
     const value = someSignal.value;
     return value;
   }
   
   function Component() {
     useSignals(); // Only needed in components
     const value = useCustomHook();
     // ...
   }
   ```

## Migration Guide

When adding this rule to an existing codebase:

1. Run the auto-fixer to add `useSignals()` to all components using signals
2. For components that should be excluded, add them to the `ignoreComponents` option
3. Ensure all signal-using components are properly importing `useSignals`

Example migration:

```tsx
// Before
function UserProfile({ userSignal }) {
  return (
    <div>
      <h1>{userSignal.value.name}</h1>
      <p>{userSignal.value.email}</p>
    </div>
  );
}

// After
import { useSignals } from '@preact/signals-react/runtime';

function UserProfile({ userSignal }) {
  useSignals();
  
  return (
    <div>
      <h1>{userSignal.value.name}</h1>
      <p>{userSignal.value.email}</p>
    </div>
  );
}
```
