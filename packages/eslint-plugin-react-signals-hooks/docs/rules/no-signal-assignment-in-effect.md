# No Signal Assignment in Effect Rule

This rule prevents direct signal assignments inside React's `useEffect` and `useLayoutEffect` hooks, which can cause unexpected behavior in React 18+ strict mode. Instead, it suggests using `useSignalsEffect` or `useSignalsLayoutEffect` from `@preact/signals-react/runtime`.

## Options

This rule accepts an options object with the following properties:

```typescript
interface Options {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: string[];
  
  /** File patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: string[];
  
  /** 
   * Custom severity levels for different violation types 
   * @default { signalAssignmentInEffect: 'error', signalAssignmentInLayoutEffect: 'error' }
   */
  severity?: {
    // Severity for signal assignments in useEffect hooks
    signalAssignmentInEffect?: 'error' | 'warn' | 'off';
    // Severity for signal assignments in useLayoutEffect hooks
    signalAssignmentInLayoutEffect?: 'error' | 'warn' | 'off';
    // Severity for performance limit exceeded warnings
    performanceLimitExceeded?: 'error' | 'warn' | 'off';
  };
  
  /** Performance tuning options */
  performance?: {
    maxTime?: number;
    maxMemory?: number;
    maxNodes?: number;
    enableMetrics?: boolean;
    logMetrics?: boolean;
    maxOperations?: Record<string, number>;
  };
}
```

### Default Options

```json
{
  "signalNames": ["Signal"],
  "allowedPatterns": [],
  "severity": {
    "signalAssignmentInEffect": "error",
    "signalAssignmentInLayoutEffect": "error",
    "performanceLimitExceeded": "warn"
  },
  "performance": {
    "maxTime": 1000,
    "maxNodes": 2000,
    "enableMetrics": false,
    "logMetrics": false
  }
}
```

### Example Configuration

```json
{
  "rules": {
    "react-signals-hooks/no-signal-assignment-in-effect": [
      "error",
      {
        "signalNames": ["Signal", "useSignal", "createSignal"],
        "allowedPatterns": ["^test/", ".spec.ts$"],
        "severity": {
          "signalAssignmentInEffect": "error",
          "signalAssignmentInLayoutEffect": "warn"
        },
        "performance": {
          "maxTime": 2000,
          "maxNodes": 3000
        }
      }
    ]
  }
}
```

## Rule Details

This rule helps prevent common issues that can occur when directly mutating signals inside React effects, especially in concurrent rendering scenarios.

## Error Messages

This rule can report the following types of issues:

### Signal Assignment in Effect

- **Message**: "Avoid direct signal assignments inside useEffect. Use useSignalsEffect from '@preact/signals-react/runtime' instead."
- **Description**: Direct signal assignments in useEffect can cause issues with React's concurrent features.
- **Fix Suggestion**: Replace useEffect with useSignalsEffect

### Signal Assignment in Layout Effect

- **Message**: "Avoid direct signal assignments inside useLayoutEffect. Use useSignalsLayoutEffect from '@preact/signals-react/runtime' instead."
- **Description**: Direct signal assignments in useLayoutEffect can cause issues with React's concurrent features.
- **Fix Suggestion**: Replace useLayoutEffect with useSignalsLayoutEffect

### Performance Limit Exceeded

- **Message**: "Performance limit exceeded for rule no-signal-assignment-in-effect {{message}}"
- **Description**: The rule analysis took too long or used too many resources.
- **How to fix**
  - Increase performance limits in rule options
  - Split large components into smaller ones
  - Use the `allowedPatterns` option to exclude test files

### When Not To Use It

You might want to disable this rule in these cases:

1. **Testing**: When writing tests that verify effect behavior

   ```tsx
   // test/Component.test.tsx
   test('updates signal in effect', () => {
     // eslint-disable-next-line react-signals-hooks/no-signal-assignment-in-effect
     useEffect(() => {
       testSignal.value = 'test';
     }, []);
     // ...
   });
   ```

2. **Legacy Code**: When migrating large codebases, you might want to disable the rule temporarily

3. **Third-party Libraries**: When working with libraries that have their own signal management

4. **Performance-sensitive Code**: In rare cases where the performance overhead of `useSignalsEffect` is not acceptable

## Why is this important?

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

## TypeScript Support

This rule works well with TypeScript and provides proper type checking for signal assignments. Here are some TypeScript-specific examples:

```tsx
// TypeScript correctly infers signal types
const count = useSignal(0);
const user = useSignal({ name: 'John', age: 30 });

// The rule understands type guards and type narrowing
function processUser(userSignal: Signal<{ name: string; age: number }>) {
  useEffect(() => {
    // ❌ Still caught by the rule despite type narrowing
    if (userSignal.value.age > 18) {
      userSignal.value = { ...userSignal.value, isAdult: true };
    }
  }, []);
}

// Works with generic components and hooks
function useCustomHook<T>(initialValue: T) {
  const signal = useSignal(initialValue);
  
  useEffect(() => {
    // ❌ Caught by the rule
    signal.value = initialValue;
  }, [initialValue]);
  
  return signal;
}
```

## Performance Considerations

This rule includes several performance optimizations:

1. **Selective Analysis**: Only analyzes functions that contain signal assignments
2. **Pattern Caching**: Caches signal name patterns for faster matching
3. **Early Exit**: Stops processing once the maximum number of issues is found
4. **Configurable Limits**: All performance limits are configurable via options

For large codebases, consider these optimizations:

```json
{
  "rules": {
    "react-signals-hooks/no-signal-assignment-in-effect": [
      "error",
      {
        "performance": {
          "maxTime": 2000,  // Increase time limit for large files
          "maxNodes": 5000,  // Increase node limit for complex components
          "enableMetrics": false  // Disable in production
        }
      }
    ]
  }
}
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
