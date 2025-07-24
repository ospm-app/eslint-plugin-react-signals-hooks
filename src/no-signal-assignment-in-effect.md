# No Signal Assignment in Effect Rule

This rule prevents direct signal assignments inside React's `useEffect` and `useLayoutEffect` hooks, which can cause unexpected behavior in React 18+ strict mode. Instead, it suggests using `useSignalsEffect` or `useSignalsLayoutEffect` from `@preact/signals-react/runtime`.

## Rule Details

This rule helps prevent common issues that can occur when directly mutating signals inside React effects, especially in concurrent rendering scenarios.

### Why is this important?

In React 18+ with strict mode, effects can run multiple times in development. Direct signal assignments in effects can lead to:

- Inconsistent UI state
- Race conditions
- Hard-to-debug issues
- Problems with React's concurrent features

### What's considered a signal assignment?

A signal assignment is any assignment to a property named `value` on an identifier that ends with `Signal` or `signal` (case-sensitive). For example:

```typescript
countSignal.value = newValue;
userSignal.value.name = 'New Name';
```

## Examples

### ❌ Incorrect

```tsx
import { useEffect } from 'react';
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  useEffect(() => {
    // Direct signal assignment in useEffect
    count.value = 1;
    
    // Another direct assignment
    const newCount = 10;
    count.value = newCount;
    
    return () => {
      // Cleanup with direct assignment
      count.value = 0;
    };
  }, []);
  
  return <div>{count}</div>;
}
```

### ✅ Correct

```tsx
import { useSignalsEffect } from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  // Using useSignalsEffect for signal assignments
  useSignalsEffect(() => {
    // Signal assignments are safe here
    count.value = 1;
    
    return () => {
      // Cleanup is also safe here
      count.value = 0;
    };
  });
  
  return <div>{count}</div>;
}
```

## Options

This rule doesn't have any configuration options.

## Auto-fix

This rule provides auto-fix suggestions to:

1. Replace `useEffect` with `useSignalsEffect` when signal assignments are detected
2. Replace `useLayoutEffect` with `useSignalsLayoutEffect` when signal assignments are detected

## When Not To Use It

You might want to disable this rule if:

1. You're not using React 18+ with strict mode
2. You have a specific use case that requires direct signal assignments in effects
3. You're using a different signal library with different semantics

## Related Rules

- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render

## Migration Guide

If you're migrating an existing codebase:

1. Install the required runtime:

   ```bash
   npm install @preact/signals-react@latest
   ```

2. Replace imports:

   ```diff
   - import { useEffect } from 'react';
   + import { useSignalsEffect } from '@preact/signals-react/runtime';
   ```

3. Update effect hooks that modify signals:

   ```diff
   - useEffect(() => {
   + useSignalsEffect(() => {
       count.value = 1;
     }, []);
   ```

4. For layout effects:

   ```diff
   - useLayoutEffect(() => {
   + useSignalsLayoutEffect(() => {
       scrollPosition.value = window.scrollY;
     }, []);
   ```
