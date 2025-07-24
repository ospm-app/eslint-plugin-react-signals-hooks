# Warn on Unnecessary Untracked Rule

This rule identifies and warns about unnecessary uses of the `untracked()` function from `@preact/signals-react`. It helps keep your code clean by detecting when `untracked()` is used in a way that doesn't provide any benefit.

## Rule Details

This rule flags `untracked()` calls that don't actually contain any signal access or only access signal values in a way that doesn't require tracking. The `untracked()` function is used to read signal values without creating a dependency, but it's unnecessary when:

1. The callback doesn't access any signal values
2. The callback only accesses signal values in a way that doesn't create a dependency
3. The code isn't in a reactive context where tracking would occur

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

// Unnecessary in non-reactive context
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
```

## Auto-fix

This rule provides an auto-fix suggestion that can automatically remove unnecessary `untracked()` calls. The fix will:

1. Remove the `untracked()` wrapper
2. Keep the inner function body
3. Preserve any comments and formatting

## Options

This rule currently doesn't have any configuration options, but future versions might include:

```typescript
{
  "rules": {
    "react-signals-hooks/warn-on-unnecessary-untracked": [
      "warn",
      {
        "ignorePatterns": ["^_"] // Ignore variables matching this pattern
      }
    ]
  }
}
```

## When Not To Use It

You might want to disable this rule if:

1. You're working with a codebase that uses `untracked()` defensively
2. You have a specific performance optimization that requires explicit `untracked()`
3. You're using a custom signal implementation with different behavior

## Related Rules

- `prefer-signal-methods`: Enforces proper signal method usage
- `prefer-signal-in-jsx`: For using signals directly in JSX
- `no-mutation-in-render`: To prevent direct signal mutations during render

## Best Practices

1. **Only use `untracked()` when needed**:

   ```typescript
   // Only use untracked when you specifically want to avoid tracking
   const name = computed(() => {
     // Only track changes to user.id, not user.name
     return `User ${userSignal.value.id}: ${untracked(() => userSignal.value.name)}`;
   });
   ```

2. **Avoid nested `untracked` calls**:

   ```typescript
   // ❌ Unnecessary nesting
   const value = untracked(() => untracked(() => someSignal.value));
   
   // ✅ Better
   const value = untracked(() => someSignal.value);
   ```

3. **Consider using `computed` for derived values**:

   ```typescript
   // Instead of:
   const fullName = () => untracked(() => `${firstName.value} ${lastName.value}`);
   
   // Prefer:
   const fullName = computed(() => `${firstName.value} ${lastName.value}`);
   ```

## Performance Considerations

While `untracked()` can be useful for optimization, unnecessary usage can actually hurt performance:

- Each `untracked()` call adds a small overhead
- Overusing `untracked()` can make the code harder to understand
- Premature optimization with `untracked()` can lead to subtle bugs

## TypeScript Support

This rule works well with TypeScript and properly handles type checking:

```typescript
// TypeScript will infer the correct return type
const value = untracked(() => someSignal.value);
```

## Common False Positives

In some cases, the rule might flag `untracked()` calls that appear unnecessary but are actually needed. You can use an ESLint disable comment in these cases:

```typescript
// eslint-disable-next-line react-signals-hooks/warn-on-unnecessary-untracked
const value = untracked(() => someSignal.value);
```
