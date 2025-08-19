# Prefer Signal Effect Rule

This rule enforces the use of the `effect()` function from `@preact/signals-react` instead of React's `useEffect` hook when all dependencies are signals. The `effect()` function provides automatic dependency tracking for signals, leading to more maintainable and less error-prone code.

## Plugin Scope

- Only signals imported from `@preact/signals-react` are considered by this plugin.
- Autofixes add or augment imports from `@preact/signals-react`.

## Rule Details

This rule detects `useEffect` hooks where all dependencies are signals and suggests replacing them with `effect()` from `@preact/signals-react`. The `effect()` function automatically tracks signal dependencies, eliminating the need to manually specify them in a dependency array.

### Why use effect()?

- **Automatic Dependency Tracking**: No need to manually maintain dependency arrays
- **Better Performance**: More efficient reactivity system
- **Fewer Bugs**: Eliminates bugs from missing or incorrect dependencies
- **Cleaner Code**: Removes boilerplate dependency arrays
- **Better Type Safety**: TypeScript can better infer types and dependencies

## Configuration

This rule accepts an options object with performance tuning options:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-signal-effect": [
      "error",
      {
        "performance": {
          "maxTime": 100,             // Max time in ms to spend analyzing a file
          "maxMemory": 100,           // Max memory in MB to use
          "maxNodes": 2000,           // Max number of nodes to process
          "enableMetrics": false,     // Enable performance metrics collection
          "logMetrics": false         // Log metrics to console
        }
      }
    ]
  }
}
```

### Default Configuration

```typescript
{
  performance: {
    maxTime: 100,
    maxMemory: 100,
    maxNodes: 2000,
    enableMetrics: false,
    logMetrics: false
  }
}
```

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
import { effect, signal } from '@preact/signals-react';

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

```jsonc
{
  "rules": {
    "react-signals-hooks/prefer-signal-effect": [
      "warn",
      {
        // Per-message severity overrides
        "severity": {
          "preferSignalEffect": "error" | "warn" | "off",
          "suggestEffect": "error" | "warn" | "off",
          "addEffectImport": "error" | "warn" | "off"
        },
        // Performance budgets/metrics
        "performance": {
          "maxTime": 1000,
          "maxMemory": 100,
          "maxNodes": 5000,
          "maxOperations": {},
          "enableMetrics": false,
          "logMetrics": false
        }
      }
    ]
  }
}
```

## When Not To Use It

You might want to disable this rule if:

1. **Mixed Dependencies**: When your effect depends on both signals and non-signal values

   ```typescript
   // Disable when mixing signals with regular state/props
   useEffect(() => {
     console.log(`Count: ${countSignal.value}, User: ${userName}`);
   }, [countSignal, userName]); // userName is not a signal
   ```

2. **Lifecycle Requirements**: When you need specific React lifecycle behavior

   ```typescript
   // Use useEffect for component mount/unmount behavior
   useEffect(() => {
     // Setup code
     return () => {
       // Cleanup code that needs to run on unmount
     };
   }, []);
   ```

3. **Concurrent Mode**: When using React's concurrent features that depend on `useEffect`'s scheduling

   ```typescript
   // Use useEffect for concurrent mode transitions
   useEffect(() => {
     startTransition(() => {
       // State updates that can be interrupted
     });
   }, [someValue]);
   ```

4. **Legacy Codebases**: When migrating incrementally to signals

   ```typescript
   // Disable rule during migration phase
   // eslint-disable-next-line react-signals-hooks/prefer-signal-effect
   useEffect(() => {
     // Legacy effect code
   }, [legacyDeps]);
   ```

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

2. **Cleanup with effect()**:

   ```typescript
   // Proper cleanup with effect()
   effect(() => {
     const timer = setTimeout(() => {
       console.log('Delayed log:', count.value);
     }, 1000);
     
     return () => clearTimeout(timer);
   });
   ```

3. **Batch signal updates**:

   ```typescript
   // Batch multiple signal updates
   effect(() => {
     // All signal updates are batched
     const total = items.value.reduce((sum, item) => sum + item.price, 0);
     const discount = total * 0.1;
     
     // Both updates will be batched
     summary.value = { total, discount };
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

## Edge Cases and Limitations

1. **Mixed Dependencies**: For effects that depend on both signals and regular values:

   ```typescript
   // Option 1: Split into separate effects
   effect(() => {
     // Signal-only logic
     const fullName = `${firstNameSignal.value} ${lastNameSignal.value}`;
   });
   
   useEffect(() => {
     // Regular effect with non-signal dependencies
     console.log(`User ID: ${userId}`);
   }, [userId]);
   
   // Option 2: Convert to signals if possible
   const userIdSignal = useSignal(userId);
   effect(() => {
     console.log(`User ID: ${userIdSignal.value}`);
   });
   ```

2. **Nested Signal Access**:

   ```typescript
   // Handles nested signal access
   effect(() => {
     // Correctly tracks nested signal access
     console.log(userProfile.value.preferences.notifications);
   });
   ```

3. **Array and Object Signals**:

   ```typescript
   // Works with array and object signals
   effect(() => {
     const activeItems = items.value.filter(item => item.isActive);
     console.log('Active items:', activeItems);
   });
   ```

## TypeScript Support

This rule provides excellent TypeScript support:

1. **Type Inference**:

   ```typescript
   const count = signal(0); // Inferred as Signal<number>
   effect(() => {
     // count.value is properly typed as number
     const doubled = count.value * 2;
   });
   ```

2. **Generic Types**:

   ```typescript
   function createEffectWithSignal<T>(signal: Signal<T>, callback: (value: T) => void) {
     effect(() => {
       callback(signal.value);
     });
   }
   ```

3. **Type Guards**:

   ```typescript
   const data = signal<Data | null>(null);
   
   effect(() => {
     if (data.value) {
       // TypeScript knows data.value is not null here
       console.log(data.value.id);
     }
   });
   ```

## Troubleshooting

### False Positives

If the rule reports issues incorrectly:

1. Use an ESLint disable comment:

   ```typescript
   // eslint-disable-next-line react-signals-hooks/prefer-signal-effect
   useEffect(() => {
     // Effect with signal that needs to stay as useEffect
   }, [signal.value]);
   ```

2. Disable for specific files:

   ```json
   {
     "overrides": [
       {
         "files": ["*.test.tsx", "*.stories.tsx"],
         "rules": {
           "react-signals-hooks/prefer-signal-effect": "off"
         }
       }
     ]
   }
   ```

### Performance Issues

If you experience performance problems with the rule:

1. Increase the `maxNodes` threshold:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-signal-effect": [
         "error",
         {
           "performance": {
             "maxNodes": 5000
           }
         }
       ]
     }
   }
   ```

2. Disable performance metrics in production:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-signal-effect": [
         "error",
         {
           "performance": {
             "enableMetrics": false,
             "logMetrics": false
           }
         }
       ]
     }
   }
   ```

## TypeScript Support

This rule works well with TypeScript and provides proper type checking for the effect callback and its dependencies. The `effect()` function provides better type inference than `useEffect` because it can automatically infer signal types.
