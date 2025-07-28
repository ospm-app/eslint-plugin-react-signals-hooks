# Signal Variable Name Rule

This rule enforces consistent naming conventions for signal and computed variables in your codebase. It ensures that signal variables follow a predictable pattern, making them easily identifiable and preventing naming conflicts.

## Rule Details

This rule enforces the following naming conventions for signal and computed variables:

1. **Must end with 'Signal'** (e.g., `countSignal`, `userDataSignal`)
2. **Must start with a lowercase letter** (e.g., `countSignal` not `CountSignal`)
3. **Must not start with 'use'** (to avoid confusion with React hooks)

### Why this rule?

- **Consistency**: Makes it immediately clear which variables are signals
- **Prevents Bugs**: Avoids confusion between signals and regular variables
- **Code Readability**: Signals stand out in the code, making the data flow more apparent
- **Tooling Support**: Makes it easier to write custom lint rules and refactoring tools

## Examples

### ❌ Incorrect

```typescript
// Starts with uppercase
const Count = signal(0);

// Missing 'Signal' suffix
const count = signal(0);

// Uses 'use' prefix (conflicts with React hooks)
const useCount = signal(0);

// Computed value without proper naming
const fullName = computed(() => `${firstName} ${lastName}`);
```

### ✅ Correct

```typescript
// Signal variables
const countSignal = signal(0);
const userDataSignal = signal({ name: 'John' });

// Computed variables
const fullNameSignal = computed(() => `${firstName} ${lastName}`);

// Local variables don't need the Signal suffix
const doubleCount = countSignal.value * 2;
```

## Auto-fix

This rule provides an auto-fix that can automatically rename signal variables to follow the convention. The fix will:

1. Add 'Signal' suffix if missing
2. Convert the first character to lowercase
3. Remove 'use' prefix if present

Example fix:

```typescript
// Before
const Count = signal(0);

// After auto-fix
const countSignal = signal(0);
```

## Options

This rule currently doesn't have any configuration options, but future versions might include:

```typescript
{
  "rules": {
    "react-signals-hooks/signal-variable-name": [
      "error",
      {
        "suffix": "Signal",  // Custom suffix (default: 'Signal')
        "ignorePattern": "^_" // Ignore variables matching this pattern
      }
    ]
  }
}
```

## When Not To Use It

You might want to disable this rule if:

1. You're working with an existing codebase that uses a different naming convention
2. You're using a different signal library with its own conventions
3. You have a specific reason to deviate from the recommended naming pattern

## Related Rules

- `no-non-signal-with-signal-suffix`: Prevents non-signal variables from using the 'Signal' suffix
- `prefer-signal-methods`: Enforces proper usage of signal methods
- `prefer-signal-in-jsx`: For using signals directly in JSX

## Best Practices

1. **Be consistent**: Always use the same naming pattern throughout your codebase
2. **Keep it clear**: The name should indicate it's a signal and what it represents
3. **Avoid abbreviations**: Prefer `userDataSignal` over `usrDtSgnl`
4. **Group related signals**: Consider using object properties for related signals

   ```typescript
   // Instead of:
   const userNameSignal = signal('');
   const userAgeSignal = signal(0);
   
   // Consider:
   const userSignal = signal({
     name: '',
     age: 0
   });
   ```

## Migration Guide

When adding this rule to an existing codebase:

1. Run the auto-fixer to automatically fix simple cases
2. For more complex cases, use the `--fix-dry-run` flag to see what would be changed
3. Update any tests or type definitions that reference the old variable names
4. Consider doing the migration in smaller chunks to make code reviews easier

Example migration:

```typescript
// Before
const [count, setCount] = useState(0);
const user = signal({ name: 'John' });

// After
const countSignal = signal(0);
const userSignal = signal({ name: 'John' });
```

## TypeScript Support

This rule works well with TypeScript and will properly handle type annotations:

```typescript
// Correct
const countSignal = signal<number>(0);

// Also correct with explicit type
interface User {
  name: string;
  age: number;
}
const userSignal = signal<User>({ name: 'John', age: 30 });
```
