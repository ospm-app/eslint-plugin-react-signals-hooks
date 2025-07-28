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

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Multiple independent updates**

   ```tsx
   function updateUserProfile(user) {
     // ❌ Each assignment triggers a separate render
     firstNameSignal.value = user.firstName;
     lastNameSignal.value = user.lastName;
     emailSignal.value = user.email;
   }
   ```

2. **Updates in sequence**

   ```tsx
   function processForm() {
     // ❌ Each state update causes a separate render
     formState.value.isSubmitting = true;
     
     try {
       const result = await submitForm(formData);
       formState.value.isSuccess = true;
       formState.value.response = result;
     } catch (error) {
       formState.value.error = error.message;
     } finally {
       formState.value.isSubmitting = false; // ❌ Another render
     }
   }
   ```

3. **Nested signal updates**

   ```tsx
   function updateNestedData() {
     // ❌ Each nested update triggers a render
     userProfile.value.name = 'New Name';
     userProfile.value.preferences.theme = 'dark';
     userProfile.value.stats.visits++;
   }
   ```

4. **Signal updates in loops**

   ```tsx
   function processItems(items) {
     // ❌ Each iteration causes a render
     items.forEach((item, index) => {
       itemListSignal.value[index].processed = true;
     });
   }
   ```

### ✅ Recommended Patterns

1. **Batching multiple updates**

   ```tsx
   import { batch } from '@preact/signals-react';
   
   function updateUserProfile(user) {
     // ✅ All updates batched into a single render
     batch(() => {
       firstNameSignal.value = user.firstName;
       lastNameSignal.value = user.lastName;
       emailSignal.value = user.email;
     });
   }
   ```

2. **Batching async operations**

   ```tsx
   async function processForm() {
     // ✅ Batch all synchronous updates
     batch(() => {
       formState.value = {
         ...formState.value,
         isSubmitting: true,
         error: null,
         response: null
       };
     });
     
     try {
       const result = await submitForm(formData);
       // ✅ Batch success updates
       batch(() => {
         formState.value.isSubmitting = false;
         formState.value.isSuccess = true;
         formState.value.response = result;
       });
     } catch (error) {
       // ✅ Batch error updates
       batch(() => {
         formState.value.isSubmitting = false;
         formState.value.error = error.message;
       });
     }
   }
   ```

3. **Batching nested updates**

   ```tsx
   function updateNestedData() {
     // ✅ Single update for nested object
     batch(() => {
       userProfile.value = {
         ...userProfile.value,
         name: 'New Name',
         preferences: {
           ...userProfile.value.preferences,
           theme: 'dark'
         },
         stats: {
           ...userProfile.value.stats,
           visits: userProfile.value.stats.visits + 1
         }
       };
     });
   }
   ```

4. **Batching in loops**

   ```tsx
   function processItems(items) {
     // ✅ Single update for all items
     batch(() => {
       const updatedItems = itemListSignal.value.map((item, index) => ({
         ...item,
         processed: items.some(i => i.id === item.id)
       }));
       
       itemListSignal.value = updatedItems;
     });
   }
   ```

5. **Custom batching utilities**

   ```tsx
   // utils/signals.ts
   import { batch as signalBatch } from '@preact/signals-react';
   
   export function batchUpdates<T>(updater: () => T): T {
     let result: T;
     signalBatch(() => {
       result = updater();
     });
     return result!;
   }
   
   // Usage
   import { batchUpdates } from './utils/signals';
   
   function complexUpdate() {
     return batchUpdates(() => {
       // Multiple signal updates
       const newValue = computeNewValue();
       signal1.value = newValue.a;
       signal2.value = newValue.b;
       return transformResult(newValue);
     });
   }
   ```

6. **Event handlers with batching**

   ```tsx
   function FormComponent() {
     const formData = useSignal({
       name: '',
       email: '',
       preferences: { theme: 'light', notifications: true }
     });
     
     const handleInputChange = (field, value) => {
       // ✅ Batch field updates
       batch(() => {
         formData.value = {
           ...formData.value,
           [field]: value
         };
       });
     };
     
     const togglePreference = (prefKey, value) => {
       // ✅ Batch nested updates
       batch(() => {
         formData.value = {
           ...formData.value,
           preferences: {
             ...formData.value.preferences,
             [prefKey]: value
           }
         };
       });
     };
     
     // ... rest of the component
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
