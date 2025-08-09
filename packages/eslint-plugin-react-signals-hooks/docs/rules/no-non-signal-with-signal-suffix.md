# No Non-Signal with Signal Suffix Rule

This rule enforces that any variable, parameter, or property with a 'Signal' suffix is actually a signal instance. This helps maintain consistency in naming conventions and prevents confusion about the types of values being used.

## Plugin Scope

- Signal detection and auto-fix imports are scoped to `@preact/signals-react` only.

## Rule Details

This rule flags identifiers that end with 'Signal' but are not actually signal instances. It helps catch potential bugs where the naming suggests a signal is being used, but the actual value is not a signal.

### What's considered a signal?

For the purposes of this rule, a signal is considered to be:

- A value created by `signal()` from `@preact/signals-react`
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
   import { signal, computed, useSignal } from '@preact/signals-react';
   
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
   import { Signal } from '@preact/signals-react';
   
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
   import { signal, type Signal } from '@preact/signals-react';
   
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
     
     const increment = useCallback(() => {
       countSignal.value++;
     }, [])

     const decrement = useCallback(() => {
       countSignal.value--;
     }, [])
     
     return {
       countSignal,
       increment,
       decrement
     };
   }
   ```

## Options

This rule accepts an options object with the following properties:

```typescript
interface Options {
  /** Regex pattern for variable names to ignore */
  ignorePattern?: string;
  
  /** Custom signal function names to recognize (e.g., ['createSignal', 'customSignal']) */
  signalNames?: string[];
  
  /** Suffix to detect (configurable); default 'Signal' */
  suffix?: string;
  
  /** Whether to validate object/class properties that end with the suffix; default true */
  validateProperties?: boolean;
  
  /** Severity levels for different violation types */
  severity?: {
    /** Severity for variables with Signal suffix that aren't signals */
    variableWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off';
    /** Severity for parameters with Signal suffix that aren't signals */
    parameterWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off';
    /** Severity for properties with Signal suffix that aren't signals */
    propertyWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off';
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
  "ignorePattern": "",
  "signalNames": ["signal", "useSignal", "createSignal"],
  "suffix": "Signal",
  "validateProperties": true,
  "severity": {
    "variableWithSignalSuffixNotSignal": "error",
    "parameterWithSignalSuffixNotSignal": "error",
    "propertyWithSignalSuffixNotSignal": "error"
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
    "react-signals-hooks/no-non-signal-with-signal-suffix": [
      "error",
      {
        "ignorePattern": "^Test|mock",
        "signalNames": ["createSignal", "customSignal"],
        "severity": {
          "variableWithSignalSuffixNotSignal": "error",
          "parameterWithSignalSuffixNotSignal": "warn",
          "propertyWithSignalSuffixNotSignal": "warn"
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

## Error Messages

This rule can report the following types of issues:

### Variable with Signal Suffix Not a Signal

- **Message**: "Variable '{{name}}' has 'Signal' suffix but is not a signal."
- **Description**: A variable with 'Signal' suffix is not initialized as a signal.
- **Fix Suggestions**:
  - Remove the 'Signal' suffix if the variable shouldn't be a signal
  - Initialize the variable as a signal if it should be one

### Parameter with Signal Suffix Not a Signal

- **Message**: "Parameter '{{name}}' has 'Signal' suffix but is not typed as a signal."
- **Description**: A function parameter with 'Signal' suffix is not typed as a signal.
- **Fix Suggestions**:
  - Remove the 'Signal' suffix if the parameter shouldn't be a signal
  - Properly type the parameter as a signal (e.g., `Signal<T>`)

### Property with Signal Suffix Not a Signal

- **Message**: "Property '{{name}}' has 'Signal' suffix but is not a signal."
- **Description**: An object/class property with 'Signal' suffix is not a signal.
- **Fix Suggestions**:
  - Remove the 'Signal' suffix if the property shouldn't be a signal
  - Make the property a signal if it should be one

### Performance Limit Exceeded

- **Message**: "Performance limit exceeded for no-non-signal-with-signal-suffix rule {{ message }}"
- **Description**: The rule analysis took too long or used too many resources.
- **How to fix**:
  - Increase performance limits in rule options
  - Split large files into smaller ones
  - Use the `ignorePattern` option to exclude certain files

## Auto-fix and Suggestions

This rule provides suggestions (`hasSuggestions: true`) and autofixes where safe:

1. Rename to remove the 'Signal' suffix
2. Convert the value to a proper signal (when possible), e.g. `const nameSignal = signal(originalValue)`

## When Not To Use It

You might want to disable this rule if:

1. You're working with a legacy codebase that uses 'Signal' suffix for non-signal values
2. You're using a different naming convention for signals
3. You have a good reason to have 'Signal' in a non-signal identifier name

## Related Rules

- `naming-convention`: More general naming convention rules
- `@typescript-eslint/naming-convention`: TypeScript-specific naming conventions
