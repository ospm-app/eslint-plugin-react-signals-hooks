# Prefer Signal Effect Rule

This rule enforces the use of the `effect()` function from `@preact/signals` instead of React's `useEffect` hook when all dependencies are signals. The `effect()` function provides automatic dependency tracking for signals, leading to more maintainable and less error-prone code.

## Rule Details

This rule detects `useEffect` hooks where all dependencies are signals and suggests replacing them with `effect()` from `@preact/signals`. The `effect()` function automatically tracks signal dependencies, eliminating the need to manually specify them in a dependency array.

### Why use effect()?

- **Automatic Dependency Tracking**: No need to manually maintain dependency arrays
- **Better Performance**: More efficient reactivity system
- **Fewer Bugs**: Eliminates bugs from missing or incorrect dependencies
- **Cleaner Code**: Removes boilerplate dependency arrays
- **Better Type Safety**: TypeScript can better infer types and dependencies

## Examples

### ❌ Incorrect

```typescript
import { useEffect } from 'react';
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  // ❌ Using useEffect with signal dependencies
  useEffect(() => {
    console.log(`Count is: ${count.value}`);
  }, [count]); // count is a signal
}
```

### ✅ Correct

```typescript
import { effect } from '@preact/signals';
import { signal } from '@preact/signals-react';

const count = signal(0);

function Counter() {
  // ✅ Using effect() with automatic dependency tracking
  effect(() => {
    console.log(`Count is: ${count.value}`);
  });
}
```

## Auto-fix

This rule provides an auto-fix that can automatically convert `useEffect` to `effect()` when appropriate. The fix will:

1. Replace `useEffect` with `effect`
2. Remove the dependency array
3. Add the `effect` import if needed
4. Preserve the effect callback and any cleanup function

## Options

This rule currently doesn't have any configuration options, but future versions might include:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-signal-effect": [
      "error",
      {
        "ignorePattern": "^_", // Ignore variables matching this pattern
        "allowNonSignalDeps": false // Whether to allow non-signal dependencies
      }
    ]
  }
}
```

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals` in your project
2. You have a specific reason to use `useEffect` with signals
3. You're working with a codebase that hasn't adopted signals yet

## Related Rules

- `prefer-batch-updates`: For batching multiple signal updates
- `prefer-signal-methods`: For proper signal method usage
- `no-mutation-in-render`: To prevent direct signal mutations during render

## Best Practices

1. **Use effect() for signal side effects**:

   ```typescript
   // Good: Using effect() for signal side effects
   effect(() => {
     document.title = `Count: ${count.value}`;
   });
   ```

2. **Clean up effects properly**:

   ```typescript
   effect(() => {
     const timer = setTimeout(() => {
       console.log('Delayed log:', count.value);
     }, 1000);
     
     // Return cleanup function
     return () => clearTimeout(timer);
   });
   ```

3. **Avoid mixing signals and non-signal dependencies**:

   ```typescript
   // ❌ Avoid mixing signals and non-signal dependencies
   const [user, setUser] = useState(null);
   const count = signal(0);
   
   // This should be two separate effects
   useEffect(() => {
     // ...
   }, [user, count]);
   
   // ✅ Better: Separate effects for signals and state
   useEffect(() => {
     // Handle user state changes
   }, [user]);
   
   effect(() => {
     // Handle count signal changes
     console.log(count.value);
   });
   ```

## Migration Guide

When migrating from `useEffect` to `effect()`:

1. **Simple Migration**: For effects that only depend on signals, simply replace `useEffect` with `effect` and remove the dependency array.

   ```typescript
   // Before
   useEffect(() => {
     console.log(count.value);
   }, [count]);
   
   // After
   effect(() => {
     console.log(count.value);
   });
   ```

2. **With Cleanup**: The cleanup function works the same way in `effect()` as it does in `useEffect`.

   ```typescript
   // Before
   useEffect(() => {
     const subscription = someSignal.subscribe(handler);
     return () => subscription.unsubscribe();
   }, [someSignal]);
   
   // After
   effect(() => {
     const subscription = someSignal.subscribe(handler);
     return () => subscription.unsubscribe();
   });
   ```

3. **Mixed Dependencies**: For effects that depend on both signals and regular values, you have a few options:

   - **Option 1**: Split into separate effects
   - **Option 2**: Use `useEffect` with `toValue` from `@preact/signals`
   - **Option 3**: Convert regular values to signals if they change often

## TypeScript Support

This rule works well with TypeScript and provides proper type checking for the effect callback and its dependencies. The `effect()` function provides better type inference than `useEffect` because it can automatically infer signal types.
