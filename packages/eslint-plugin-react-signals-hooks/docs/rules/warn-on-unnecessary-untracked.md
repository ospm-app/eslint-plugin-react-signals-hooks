# Warn on Unnecessary Untracked/Peek Rule

This rule identifies and warns about unnecessary uses of the `untracked()` function and `.peek()` method from `@preact/signals-react`. It helps keep your code clean by detecting when these features are used in a way that doesn't provide any benefit or could be simplified.

## Rule Details

This rule flags `untracked()` calls and `.peek()` method calls that don't actually provide any benefit. These features are used to read signal values without creating a dependency, but they're unnecessary when:

1. The code isn't in a reactive context where tracking would occur
2. The signal access doesn't create an unwanted dependency
3. The same could be achieved with direct `.value` access

### What's the difference between `untracked()` and `.peek()`?

- `untracked(() => expr)` - Prevents tracking of any signal reads inside the callback
- `signal.value.peek()` - Prevents tracking for just that specific signal access

Both serve similar purposes but have slightly different use cases and performance characteristics.

### Why is this important?

- **Performance**: Unnecessary `untracked()` calls add overhead
- **Code Clarity**: Removing unnecessary code makes the intent clearer
- **Best Practices**: Encourages proper use of `untracked()` only when needed

## Examples

### ❌ Incorrect

```typescript
// Unnecessary untracked with no signal access
const value = untracked(() => 42);

// Unnecessary untracked with only .value access
const name = untracked(() => userSignal.value.name);

// Unnecessary .peek() in reactive context
const count = countSignal.value.peek();

// Unnecessary untracked in non-reactive context
function formatName() {
  return untracked(() => `${firstName} ${lastName}`);
}
```

### ✅ Correct

```typescript
// Proper usage when signal access would create unwanted dependency
const fullName = computed(() => {
  // Only track changes to firstName, not lastName
  return `${firstName.value} ${untracked(() => lastName.value)}`;
});

// Proper usage in effect
effect(() => {
  // Only run effect when user.id changes, not when user.name changes
  const name = untracked(() => userSignal.value.name);
  console.log(`User ${userSignal.value.id}: ${name}`);
});

// Using .peek() to prevent circular dependencies
effect(() => {
  // Only update when the value changes, but don't create a circular dependency
  const current = countSignal.value;
  if (current > 0) {
    countSignal.value = current - 1;
  }
});
```

## Auto-fix

This rule provides auto-fix suggestions that can:

1. Remove unnecessary `untracked()` wrappers, keeping the inner function body
2. Replace unnecessary `.peek()` calls with direct `.value` access
3. Preserve any comments and formatting

## Options

This rule accepts an options object with the following properties:

```typescript
{
  "rules": {
    "react-signals-hooks/warn-on-unnecessary-untracked": [
      "warn",
      {
        "allowInEffects": true,        // Allow in useSignalEffect callbacks
        "allowInEventHandlers": true,  // Allow in DOM event handlers
        "allowForSignalWrites": true   // Allow when used to prevent circular deps
      }
    ]
  }
}
```

### Options Details

- `allowInEffects` (default: `true`): Allow `untracked()` and `.peek()` in `useSignalEffect` callbacks where they might be used to prevent unnecessary re-runs.
- `allowInEventHandlers` (default: `true`): Allow `untracked()` and `.peek()` in DOM event handlers where they might be used for performance.
- `allowForSignalWrites` (default: `true`): Allow `.peek()` when it's used to prevent circular dependencies when writing to signals in effects.

## When Not To Use It

You might want to disable this rule if:

1. You're working with a codebase that uses `untracked()` or `.peek()` defensively
2. You have specific performance optimizations that require explicit `untracked()` or `.peek()`
3. You're using a custom signal implementation with different behavior
4. The rule is flagging valid use cases that can't be expressed through the configuration options

## Related Rules

- `prefer-signal-methods`: Enforces proper signal method usage
- `prefer-signal-in-jsx`: For using signals directly in JSX
- `no-mutation-in-render`: To prevent direct signal mutations during render
- `prefer-batch-updates`: For batching multiple signal updates together

## Best Practices

1. **Only use `untracked()` and `.peek()` when needed**:

   ```typescript
   // Only use untracked when you specifically want to avoid tracking
   const name = computed(() => {
     // Only track changes to user.id, not user.name
     return `User ${userSignal.value.id}: ${untracked(() => userSignal.value.name)}`;
   });

   // Use .peek() for simple cases where you just need to read without tracking
   const currentCount = countSignal.value.peek();
   ```

2. **Prefer `.peek()` for simple cases**:

   ```typescript
   // ❌ More verbose
   const value = untracked(() => someSignal.value);
   
   // ✅ More concise
   const value = someSignal.value.peek();
   
   // But avoid nesting either:
   // ❌ Unnecessary nesting
   const value = untracked(() => untracked(() => someSignal.value));
   ```

3. **Use `.peek()` to prevent circular dependencies in effects**:

   ```typescript
   // Instead of:
   effect(() => {
     // This would create a circular dependency
     if (countSignal.value > 0) {
       countSignal.value--;
     }
   });
   
   // Prefer:
   effect(() => {
     // Using .peek() prevents the circular dependency
     const current = countSignal.value;
     if (current > 0) {
       countSignal.value = current - 1;
     }
   });
   ```

## Performance Considerations

While `untracked()` and `.peek()` can be useful for optimization, unnecessary usage can actually hurt performance and maintainability:

- Each `untracked()` call adds a small overhead
- `.peek()` is generally more lightweight than `untracked()` for single signal access
- Overusing these features can make the code harder to understand
- Premature optimization can lead to subtle bugs and maintenance issues
- The React Signals runtime is already optimized for most common cases

## TypeScript Support

This rule works well with TypeScript and properly handles type checking for both `untracked()` and `.peek()`:

```typescript
// TypeScript will infer the correct return types
const value1 = untracked(() => someSignal.value);
const value2 = someSignal.value.peek();
```

Note that `.peek()` is a type-safe operation that returns the same type as `.value`.

## Common False Positives

In some cases, the rule might flag `untracked()` or `.peek()` calls that appear unnecessary but are actually needed. You can use an ESLint disable comment in these cases:

```typescript
// eslint-disable-next-line react-signals-hooks/warn-on-unnecessary-untracked
const value = untracked(() => someSignal.value);

// Or for .peek()
// eslint-disable-next-line react-signals-hooks/warn-on-unnecessary-untracked
const count = countSignal.value.peek();
```

Alternatively, you can adjust the rule's configuration to better match your codebase's patterns.
