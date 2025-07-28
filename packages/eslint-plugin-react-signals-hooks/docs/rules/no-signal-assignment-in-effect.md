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

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Direct signal assignment in useEffect**

   ```tsx
   import { useEffect } from 'react';
   import { signal } from '@preact/signals-react';
   
   const userData = signal({ name: 'John', age: 30 });
   
   function UserProfile() {
     useEffect(() => {
       // ❌ Direct signal assignments in useEffect
       userData.value = { ...userData.value, age: 31 };
       
       // ❌ Nested property assignment
       userData.value.age = 31;
       
       // ❌ In cleanup function
       return () => {
         userData.value = { name: '', age: 0 };
       };
     }, []);
     
     return <div>{userData.value.name}</div>;
   }
   ```

2. **Signal assignment in async effects**

   ```tsx
   function DataFetcher() {
     const dataSignal = useSignal(null);
     const loadingSignal = useSignal(false);
     
     useEffect(() => {
       // ❌ Signal assignments in async functions inside useEffect
       const fetchData = async () => {
         loadingSignal.value = true;
         try {
           const response = await fetch('/api/data');
           const result = await response.json();
           dataSignal.value = result; // ❌ Assignment after await
         } finally {
           loadingSignal.value = false; // ❌ Assignment in finally
         }
       };
       
       fetchData();
     }, []);
     
     // ...
   }
   ```

3. **Multiple signal assignments**

   ```tsx
   function MultiSignalComponent() {
     const aSignal = useSignal(0);
     const bSignal = useSignal(0);
     const cSignal = useSignal(0);
     
     useEffect(() => {
       // ❌ Multiple signal assignments in sequence
       aSignal.value = 1;
       bSignal.value = 2;
       cSignal.value = 3;
       
       // ❌ Signal assignments in conditions
       if (someCondition) {
         aSignal.value = 10;
       }
     }, [someCondition]);
     
     // ...
   }
   ```

### ✅ Recommended Patterns

1. **Using useSignalsEffect**

   ```tsx
   import { useSignalsEffect } from '@preact/signals-react/runtime';
   
   function Counter() {
     const countSignal = useSignal(0);
     
     // ✅ Using useSignalsEffect for signal assignments
     useSignalsEffect(() => {
       // Safe to assign to signals here
       countSignal.value = 1;
       
       // Cleanup is also safe
       return () => {
         countSignal.value = 0;
       };
     });
     
     // ...
   }
   ```

2. **Handling async operations**

   ```tsx
   function DataFetcher() {
     const dataSignal = useSignal(null);
     const loadingSignal = useSignal(false);
     
     useSignalsEffect(() => {
       // ✅ Using a separate async function inside useSignalsEffect
       const fetchData = async () => {
         loadingSignal.value = true;
         try {
           const response = await fetch('/api/data');
           const result = await response.json();
           dataSignal.value = result; // ✅ Safe in useSignalsEffect
         } finally {
           loadingSignal.value = false; // ✅ Safe in useSignalsEffect
         }
       };
       
       fetchData();
     });
     
     // ...
   }
   ```

3. **Multiple signal updates with batch**

   ```tsx
   import { batch } from '@preact/signals';
   
   function MultiUpdateComponent() {
     const aSignal = useSignal(0);
     const bSignal = useSignal(0);
     
     useSignalsEffect(() => {
       // ✅ Batch multiple signal updates
       batch(() => {
         aSignal.value = 1;
         bSignal.value = 2;
       });
       
       // ✅ Conditional updates are fine
       if (someCondition) {
         aSignal.value = 10;
       }
     });
     
     // ...
   }
   ```

4. **Derived state with computed**

   ```tsx
   function UserProfile() {
     const userSignal = useSignal({ firstName: 'John', lastName: 'Doe' });
     
     // ✅ Use computed for derived state instead of effects
     const fullName = useComputed(() => 
       `${userSignal.value.firstName} ${userSignal.value.lastName}`
     );
     
     // No need for an effect to derive fullName
     return <div>{fullName}</div>;
   }
   ```

5. **Event handlers for user interactions**

   ```tsx
   function Counter() {
     const countSignal = useSignal(0);
     
     // ✅ Handle user interactions with event handlers, not effects
     const handleIncrement = () => {
       countSignal.value += 1;
     };
     
     // No effect needed for user interactions
     return (
       <div>
         <span>Count: {countSignal.value}</span>
         <button onClick={handleIncrement}>Increment</button>
       </div>
     );
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
