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

## Options

This rule accepts an options object with the following properties:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-batch-for-multi-mutations": [
      "warn",
      {
        "minMutations": 2  // Minimum number of mutations to trigger the rule (default: 2)
      }
    ]
  }
}
```

### `minMutations`

Type: `number`  
Default: `2`

Minimum number of signal mutations required in the same scope to trigger the rule.

## When Not To Use It

You might want to disable this rule if:

1. You're working with a codebase that doesn't use `@preact/signals-react`
2. You have a specific performance optimization that makes batching unnecessary
3. You're working with a small number of simple components where the performance impact is negligible

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
