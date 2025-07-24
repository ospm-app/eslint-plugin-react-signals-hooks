# Prefer Batch Updates Rule

This rule encourages batching multiple signal updates together to optimize performance by reducing the number of renders. It detects multiple signal updates in the same scope and suggests wrapping them in a `batch` call.

## Rule Details

This rule helps optimize React components by reducing the number of renders caused by multiple signal updates. When multiple signals are updated in sequence, each update would normally trigger a re-render. By batching these updates together, you can reduce this to a single render.

### What's considered a signal update?

1. Direct assignments to signal values:

   ```tsx
   countSignal.value = newValue;
   ```

2. Method calls on signals:

   ```tsx
   countSignal.set(newValue);
   countSignal.update(prev => prev + 1);
   ```

### When does this rule apply?

The rule activates when it detects multiple signal updates (default: 2 or more) in the same scope that could be batched together.

## Examples

### ❌ Incorrect

```tsx
function updateCounts() {
  // Each of these would cause a separate render
  count1.value += 1;
  count2.value += 1;
  count3.value += 1;
}
```

### ✅ Correct

```tsx
import { batch } from '@preact/signals-react';

function updateCounts() {
  // All updates are batched into a single render
  batch(() => {
    count1.value += 1;
    count2.value += 1;
    count3.value += 1;
  });
}
```

## Options

This rule accepts an options object with the following property:

- `minUpdates` (number): Minimum number of signal updates required to trigger the rule (default: 2)

### Example configuration

```json
{
  "rules": {
    "react-signals-hooks/prefer-batch-updates": [
      "error",
      { "minUpdates": 3 }
    ]
  }
}
```

This configuration would only warn when 3 or more signal updates are detected in the same scope.

## Auto-fix

This rule provides auto-fix suggestions to:

1. Wrap multiple signal updates in a `batch` call
2. Add the `batch` import if it's not already imported

## When Not To Use It

You might want to disable this rule if:

1. You're not concerned about the performance impact of multiple renders
2. You have a specific reason to trigger renders on each signal update
3. You're working with a codebase that doesn't use `@preact/signals-react`

## Related Rules

- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render
- `no-signal-assignment-in-effect`: Prevents signal assignments in effects

## Performance Considerations

Batching signal updates can significantly improve performance in components that update multiple signals in response to user interactions or other events. The performance benefits are most noticeable when:

1. Multiple signals are updated in sequence
2. The component has expensive render logic
3. The updates are triggered frequently (e.g., in response to user input)

## Best Practices

1. **Batch related updates**: Group updates that are logically related
2. **Keep batches small**: Don't batch unrelated updates just to reduce the number of batches
3. **Consider React's batching**: React already batches state updates in event handlers, but batching signal updates gives you more control
4. **Measure performance**: Use React DevTools to profile your components and verify that batching is having the desired effect
