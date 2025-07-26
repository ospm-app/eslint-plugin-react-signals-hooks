# No Non-Signal with Signal Suffix Rule

This rule enforces that any variable, parameter, or property with a 'Signal' suffix is actually a signal instance. This helps maintain consistency in naming conventions and prevents confusion about the types of values being used.

## Rule Details

This rule flags identifiers that end with 'Signal' but are not actually signal instances. It helps catch potential bugs where the naming suggests a signal is being used, but the actual value is not a signal.

### What's considered a signal?

For the purposes of this rule, a signal is considered to be:

- A value created by `signal()` from `@preact/signals`
- A value created by `useSignal()`, `useComputed()`, or other signal-related hooks
- A value that is explicitly typed as a signal type
- A value that is the result of a signal operation

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Non-signal variables with Signal suffix**

   ```tsx
   // ❌ Incorrect: Variable has Signal suffix but isn't a signal
   const userSignal = { name: 'John' };
   const isLoadingSignal = false;
   const itemsSignal = [1, 2, 3];
   ```

2. **Function parameters with Signal suffix**

   ```tsx
   // ❌ Incorrect: Parameter suggests it's a signal but isn't
   function processUser(userSignal: User) {
     console.log(userSignal.name);
   }
   
   // ❌ Also incorrect: Even with a default value
   function toggle(initialValueSignal = false) {
     // ...
   }
   ```

3. **Object/class properties with Signal suffix**

   ```tsx
   const state = {
     countSignal: 0,  // ❌ Should be a signal
     userSignal: {    // ❌ Should be a signal
       name: 'John'
     }
   };
   
   class Store {
     private dataSignal: Data;  // ❌ Should be Signal<Data>
   }
   ```

### ✅ Recommended Patterns

1. **Proper signal usage**

   ```tsx
   import { signal, computed } from '@preact/signals';
   import { useSignal } from '@preact/signals-react';
   
   // ✅ Correct: Signal variables
   const countSignal = signal(0);
   const userSignal = signal({ name: 'John' });
   const isLoadingSignal = signal(false);
   
   // ✅ Correct: Computed signals
   const doubleCountSignal = computed(() => countSignal.value * 2);
   
   // In a component
   function Counter() {
     // ✅ Correct: Hooks that return signals
     const countSignal = useSignal(0);
     const [todosSignal] = useTodoListSignal();
     
     return <div>{countSignal.value}</div>;
   }
   ```

2. **TypeScript type annotations**

   ```tsx
   import { Signal } from '@preact/signals';
   
   // ✅ Correct: Explicit signal types
   function processUser(userSignal: Signal<User>) {
     // TypeScript will ensure userSignal is a signal
     console.log(userSignal.value.name);
   }
   
   // ✅ Correct: Generic signal type
   function createSignalWithDefault<T>(initialValue: T): Signal<T> {
     return signal(initialValue);
   }
   ```

3. **Signal properties in objects/classes**

   ```tsx
   import { signal, type Signal } from '@preact/signals';
   
   // ✅ Correct: Object with signal properties
   const appState = {
     countSignal: signal(0),
     userSignal: signal({ name: 'John' })
   };
   
   // ✅ Correct: Class with signal properties
   class UserStore {
     private _usersSignal: Signal<User[]>;
     
     constructor(initialUsers: User[] = []) {
       this._usersSignal = signal(initialUsers);
     }
     
     get usersSignal() {
       return this._usersSignal;
     }
   }
   ```

4. **Custom hooks that return signals**

   ```tsx
   // ✅ Correct: Custom hook returning a signal
   function useCounter(initialValue = 0) {
     const countSignal = useSignal(initialValue);
     
     const increment = () => countSignal.value++;
     const decrement = () => countSignal.value--;
     
     return {
       countSignal,
       increment,
       decrement
     };
   }
   ```

## Options

This rule accepts an options object with the following property:

- `ignorePattern` (string): A regex pattern for variable names to ignore. For example, you might want to ignore test files or certain utility functions.

### Example with options

```json
{
  "rules": {
    "react-signals-hooks/no-non-signal-with-signal-suffix": [
      "error",
      { "ignorePattern": "^Test" }
    ]
  }
}
```

This configuration would ignore variables that start with "Test" (case-sensitive).

## Auto-fix

This rule provides auto-fix suggestions to either:

1. Remove the 'Signal' suffix from the identifier name
2. Convert the value to a proper signal (when possible)

## When Not To Use It

You might want to disable this rule if:

1. You're working with a legacy codebase that uses 'Signal' suffix for non-signal values
2. You're using a different naming convention for signals
3. You have a good reason to have 'Signal' in a non-signal identifier name

## Related Rules

- `naming-convention`: More general naming convention rules
- `@typescript-eslint/naming-convention`: TypeScript-specific naming conventions
