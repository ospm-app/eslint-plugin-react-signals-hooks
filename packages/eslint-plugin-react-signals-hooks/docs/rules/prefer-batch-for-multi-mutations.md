# Prefer Batch for Multiple Mutations Rule

This rule enforces the use of the `batch()` function from `@preact/signals-react` when making multiple signal mutations within the same scope. Batching multiple signal updates together can significantly improve performance by reducing the number of renders.

## Rule Details

This rule detects when multiple signal mutations occur within the same function or block scope and suggests wrapping them in a `batch()` call. The `batch()` function ensures that all signal updates within it are applied in a single batch, which means React will only re-render once after all updates are complete.

### Why use batch()?

- **Performance Optimization**: Reduces the number of renders when updating multiple signals
- **Atomic Updates**: Ensures related state changes are applied together
- **Prevents Inconsistent UI**: Avoids showing intermediate states to users
- **Better Developer Experience**: Makes the intent of atomic updates explicit

## Examples

### ❌ Incorrect

```typescript
function updateUser() {
  // Each of these will trigger a separate re-render
  userSignal.value.name = 'John';
  userSignal.value.age = 30;
  userSignal.value.email = 'john@example.com';
}
```

### ✅ Correct

```typescript
import { batch } from '@preact/signals-react';

function updateUser() {
  // All updates are batched into a single re-render
  batch(() => {
    userSignal.value.name = 'John';
    userSignal.value.age = 30;
    userSignal.value.email = 'john@example.com';
  });
}
```

## Auto-fix

This rule provides an auto-fix that can automatically wrap multiple signal mutations in a `batch()` call. The fix will:

1. Add the `batch` import if it's not already present
2. Wrap the mutations in a `batch()` call
3. Preserve the existing code structure and formatting

## Configuration Options

This rule accepts an options object with the following properties:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-batch-for-multi-mutations": [
      "warn",
      {
        "minMutations": 2,  // Minimum number of mutations to trigger the rule
        "maxMutations": 10, // Maximum mutations before suggesting to split logic
        "performance": {    // Performance tuning options
          "maxTime": 100,   // Max time in ms to spend analyzing a file
          "maxMemory": 100, // Max memory in MB to use
          "maxNodes": 2000, // Max number of nodes to process
          "enableMetrics": false, // Enable performance metrics
          "logMetrics": false     // Log metrics to console
        }
      }
    ]
  }
}
```

### Options Details

- `minMutations` (number, default: 2)
  - Minimum number of signal mutations in the same scope to trigger the rule

- `maxMutations` (number, default: 10)
  - If exceeded, suggests splitting the logic into smaller functions
  - Helps maintain code readability and performance

- `performance` (object)
  - `maxTime`: Maximum time in milliseconds to spend analyzing a file
  - `maxMemory`: Maximum memory in MB to use
  - `maxNodes`: Maximum number of AST nodes to process
  - `enableMetrics`: Enable performance metrics collection
  - `logMetrics`: Log performance metrics to console

## Error Messages

This rule can report the following messages:

- `useBatch`: "Multiple signal mutations should be wrapped in batch()"
- `suggestBatch`: "Wrap these mutations in batch()"
- `addBatchImport`: "Add batch import from @preact/signals-react"
- `performanceLimitExceeded`: "Performance limit exceeded while analyzing mutations"

Example of enabling specific error levels:

```json
{
  "rules": {
    "react-signals-hooks/prefer-batch-for-multi-mutations": [
      "error",
      {
        "minMutations": 2,
        "severity": {
          "useBatch": "error",
          "suggestBatch": "warn"
        }
      }
    ]
  }
}
```

## TypeScript Support

This rule works seamlessly with TypeScript and provides proper type checking for signal mutations. It understands:

1. **Type Narrowing**:

   ```typescript
   function processSignal(signal: Signal<number> | null) {
     if (!signal) return;
     // TypeScript knows signal is Signal<number> here
     signal.value = 42; // Properly typed
   }
   ```

2. **Generic Components**:

   ```typescript
   function useSignalState<T>(initial: T) {
     const signal = useSignal(initial);
     // ...
   }
   ```

3. **Type Assertions**:

   ```typescript
   const signal = {} as Signal<number>;
   signal.value = 42; // Properly typed
   ```

4. **Mapped Types**:

   ```typescript
   type User = { name: string; age: number };
   const userSignal = signal<User>({ name: 'John', age: 30 });
   ```

## When Not To Use It

You might want to disable this rule if:

1. You're working with a codebase that doesn't use `@preact/signals-react`
2. You have a specific performance optimization that makes batching unnecessary
3. You're working with a small number of simple components where the performance impact is negligible
4. You're using a different state management solution that handles batching internally

## Edge Cases and Limitations

1. **Nested Functions**:

   ```typescript
   function outer() {
     // These won't be batched together
     const inner1 = () => { signal1.value = 1; };
     const inner2 = () => { signal2.value = 2; };
     
     // Only immediate mutations are batched
     inner1();
     inner2();
   }
   ```

2. **Conditional Logic**:

   ```typescript
   function update(condition: boolean) {
     // Only some mutations might be batched
     signal1.value = 1;
     if (condition) {
       signal2.value = 2; // Not batched with the first mutation
     }
   }
   ```

3. **Loops and Iterations**:

   ```typescript
   function updateItems(items: string[]) {
     // Each iteration is a separate mutation
     items.forEach((item, i) => {
       signals[i].value = item; // Not batched automatically
     });
     
     // Better approach:
     batch(() => {
       items.forEach((item, i) => {
         signals[i].value = item;
       });
     });
   }
   ```

## Troubleshooting

### False Positives

If you encounter false positives, you can:

1. Use an ESLint disable comment:

   ```typescript
   // eslint-disable-next-line react-signals-hooks/prefer-batch-for-multi-mutations
   signal1.value = 1;
   signal2.value = 2;
   ```

2. Adjust the `minMutations` option:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-batch-for-multi-mutations": [
         "warn",
         { "minMutations": 3 }
       ]
     }
   }
   ```

### Performance Issues

If you experience performance problems:

1. Increase the performance limits:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-batch-for-multi-mutations": [
         "warn",
         {
           "performance": {
             "maxTime": 200,
             "maxNodes": 5000
           }
         }
       ]
     }
   }
   ```

2. Disable the rule for specific files using overrides:

   ```json
   {
     "overrides": [
       {
         "files": ["**/*.test.tsx"],
         "rules": {
           "react-signals-hooks/prefer-batch-for-multi-mutations": "off"
         }
       }
     ]
   }
   ```

## Related Rules

- `prefer-batch-updates`: For batching multiple signal updates in effects
- `no-mutation-in-render`: To prevent direct signal mutations during render
- `prefer-signal-methods`: For proper signal method usage

## Best Practices

1. **Batch related updates**:

   ```typescript
   // Good: Related updates are batched together
   function updateProfile(user) {
     batch(() => {
       profileSignal.value.name = user.name;
       profileSignal.value.email = user.email;
       profileSignal.value.lastUpdated = new Date();
     });
   }
   ```

2. **Avoid unnecessary nesting**:

   ```typescript
   // ❌ Unnecessary nesting
   batch(() => {
     batch(() => {
       countSignal.value++;
     });
   });
   
   // ✅ Better
   batch(() => {
     countSignal.value++;
   });
   ```

3. **Use with async operations**:

   ```typescript
   async function fetchUser() {
     loadingSignal.value = true;
     try {
       const user = await fetch('/api/user').then(res => res.json());
       batch(() => {
         userSignal.value = user;
         lastUpdatedSignal.value = new Date();
         errorSignal.value = null;
       });
     } catch (err) {
       errorSignal.value = err.message;
     } finally {
       loadingSignal.value = false;
     }
   }
   ```

## Migration Guide

When adding this rule to an existing codebase:

1. Start with a higher `minMutations` value (e.g., 3-4) and gradually lower it
2. Use the auto-fix feature to handle simple cases
3. Manually review complex cases to ensure the batching makes sense
4. Consider using the `--fix` flag to automatically fix all issues

Example migration:

```typescript
// Before
function updateSettings(settings) {
  themeSignal.value = settings.theme;
  fontSizeSignal.value = settings.fontSize;
  darkModeSignal.value = settings.darkMode;
}

// After
import { batch } from '@preact/signals-react';

function updateSettings(settings) {
  batch(() => {
    themeSignal.value = settings.theme;
    fontSizeSignal.value = settings.fontSize;
    darkModeSignal.value = settings.darkMode;
  });
}
```

## Performance Considerations

- **Render Optimization**: Batching can significantly reduce the number of renders in your application
- **Memory Usage**: Using `batch()` doesn't increase memory usage and can actually reduce it by preventing intermediate renders
- **CPU Usage**: Fewer renders mean less work for the browser's layout and paint engines
- **User Experience**: Smoother UI updates with less jank and fewer visual glitches
