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

### Examples

#### ❌ Incorrect

```tsx
// Variable with Signal suffix but not a signal
const userSignal = { name: 'John' };

// Parameter with Signal suffix but not typed as signal
function processUser(userSignal: User) {
  // ...
}

// Property with Signal suffix but not a signal
const state = {
  countSignal: 0, // Should be a signal
};
```

#### ✅ Correct

```tsx
import { signal } from '@preact/signals';
import { useSignal } from '@preact/signals-react';

// Proper signal usage
const countSignal = signal(0);
const doubleSignal = computed(() => countSignal.value * 2);

// In a component
function Counter() {
  const countSignal = useSignal(0);
  // ...
}

// Explicitly typed as signal
function processSignal(userSignal: Signal<User>) {
  // ...
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
