# Prefer Show Over Ternary Rule

This rule encourages using the `<Show>` component from `@preact/signals-react` instead of ternary operators for conditional rendering when working with signals. This leads to better performance and more readable code when dealing with signal-based conditions.

## Rule Details

This rule flags ternary operators used for conditional rendering in JSX when they could be replaced with the `<Show>` component. The `<Show>` component is specifically optimized for conditional rendering with signals and provides better performance characteristics.

### Why use Show over ternary?

- **Better Performance**: The `<Show>` component is optimized for signal-based conditions
- **Improved Readability**: Makes the conditional rendering intent clearer
- **Consistent Patterns**: Encourages consistent patterns across the codebase
- **Better DX**: Provides better TypeScript support and autocompletion

## Examples

### ❌ Incorrect

```tsx
function UserProfile({ user }) {
  return (
    <div>
      {user.value ? (
        <div>
          <h1>{user.value.name}</h1>
          <p>{user.value.bio}</p>
        </div>
      ) : (
        <div>Loading user data...</div>
      )}
    </div>
  );
}
```

### ✅ Correct

```tsx
import { Show } from '@preact/signals-react';

function UserProfile({ user }) {
  return (
    <div>
      <Show when={user.value} fallback={<div>Loading user data...</div>}>
        <div>
          <h1>{user.value.name}</h1>
          <p>{user.value.bio}</p>
        </div>
      </Show>
    </div>
  );
}
```

## Auto-fix

This rule provides an auto-fix that can automatically convert ternary operators to `<Show>` components. The fix will:

1. Replace the ternary with a `<Show>` component
2. Move the condition to the `when` prop
3. Move the consequent to the children
4. Move the alternate to the `fallback` prop (if present)
5. Add the necessary import if missing

## Options

This rule accepts an options object with the following properties:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-show-over-ternary": [
      "error",
      {
        "minComplexity": 2  // Minimum complexity score to trigger the rule (default: 2)
      }
    ]
  }
}
```

### `minComplexity`

Type: `number`  
Default: `2`

Only report ternary operators with a complexity score greater than or equal to this value. The complexity is calculated based on the structure of the JSX within the ternary.

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals-react`
2. You have simple conditions that are more readable as ternaries
3. You're working with a codebase that has standardized on ternary operators

## Related Rules

- `prefer-signal-in-jsx`: For using signals directly in JSX
- `prefer-signal-methods`: Enforces proper signal method usage
- `no-mutation-in-render`: To prevent direct signal mutations during render

## Best Practices

1. **Use Show for complex conditions**:

   ```tsx
   // Good for complex conditions
   <Show when={user.value}>
     <UserProfile user={user.value} />
   </Show>
   ```

2. **Use fallback for loading/empty states**:

   ```tsx
   <Show 
     when={user.value} 
     fallback={<LoadingSpinner />}
   >
     <UserProfile user={user.value} />
   </Show>
   ```

3. **Keep it simple for simple conditions**:

   ```tsx
   // Still okay for very simple conditions
   {isLoading ? <Spinner /> : <Content />}
   ```

## Migration Guide

When adding this rule to an existing codebase:

1. Start with a high `minComplexity` value and gradually lower it
2. Use the auto-fix for simple conversions
3. Manually review complex cases to ensure the conversion makes sense
4. Consider using the `--fix` flag to automatically fix all issues

Example migration:

```tsx
// Before
{user.value ? (
  <div>
    <h1>{user.value.name}</h1>
    <p>{user.value.bio}</p>
  </div>
) : (
  <div>Loading user data...</div>
)}

// After
<Show 
  when={user.value} 
  fallback={<div>Loading user data...</div>}
>
  <div>
    <h1>{user.value.name}</h1>
    <p>{user.value.bio}</p>
  </div>
</Show>
```

## TypeScript Support

This rule works well with TypeScript and provides proper type checking for the `when` prop and children content.
