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
interface Options {
  /**
   * Minimum complexity score to trigger the rule (1-10)
   * @default 3
   */
  minComplexity?: number;

  /**
   * Custom signal function names (e.g., ['createSignal', 'useSignal'])
   * @default ['createSignal', 'useSignal', 'signal']
   */
  signalNames?: string[];

  /** Performance tuning options */
  performance?: {
    // Maximum time in milliseconds to spend analyzing a file
    maxTime?: number;
    // Maximum memory in MB to use during analysis
    maxMemory?: number;
    // Maximum number of nodes to process before bailing out
    maxNodes?: number;
    // Enable collection of performance metrics
    enableMetrics?: boolean;
    // Log performance metrics to console
    logMetrics?: boolean;
  };

  /** Custom severity levels for different violation types */
  severity?: {
    // Severity for preferring Show component over ternary
    preferShowOverTernary?: 'error' | 'warn' | 'off';
    // Severity for suggesting Show component
    suggestShowComponent?: 'error' | 'warn' | 'off';
    // Severity for adding Show import
    addShowImport?: 'error' | 'warn' | 'off';
    // Severity for performance limit exceeded
    performanceLimitExceeded?: 'error' | 'warn' | 'off';
  };
}
```

### Options Details

- `minComplexity` (number): The minimum complexity score (1-10) required to trigger the rule. Higher values make the rule less aggressive. Default is 3.
- `signalNames` (string[]): Custom signal function names to check for in the condition. Default is `['createSignal', 'useSignal', 'signal']`.
- `performance` (object): Performance tuning options for the rule.
- `severity` (object): Custom severity levels for different violation types.

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals-react`
2. You have simple conditions that are more readable as ternaries
3. You're working with a codebase that has standardized on ternary operators
4. You're using a different conditional rendering pattern consistently
5. The condition doesn't involve signals (for non-signal conditions, ternaries might be more appropriate)

## Edge Cases and Limitations

1. **Nested Conditions**:

   ```tsx
   // Can become hard to read with deeply nested Show components
   <Show when={user.value}>
     <Show when={user.value.isAdmin}>
       <AdminPanel />
     </Show>
   </Show>
   
   // Sometimes better as:
   {user.value?.isAdmin && <AdminPanel />}
   ```

2. **Complex Conditions**:

   ```tsx
   // Complex conditions might be better as variables
   const shouldShow = user.value && 
                     (user.value.isAdmin || user.value.isModerator) && 
                     !user.value.isSuspended;
   
   <Show when={shouldShow}>
     <ModeratorTools />
   </Show>
   ```

3. **Performance with Large Components**:

   ```tsx
   // For very large components, consider extracting to a separate component
   <Show when={shouldShowLargeComponent}>
     <LargeComponent />
   </Show>
   ```

## Related Rules

- `prefer-signal-in-jsx`: For using signals directly in JSX
- `prefer-signal-methods`: Enforces proper signal method usage
- `no-mutation-in-render`: To prevent direct signal mutations during render
- `prefer-batch-updates`: For batching multiple signal updates
- `warn-on-unnecessary-untracked`: For optimizing signal usage in components

## Troubleshooting

### False Positives

If the rule reports issues incorrectly:

1. Use an ESLint disable comment:

   ```tsx
   // eslint-disable-next-line react-signals-hooks/prefer-show-over-ternary
   {condition ? <A /> : <B />}
   ```

2. Adjust the `minComplexity` option:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-show-over-ternary": [
         "warn",
         { "minComplexity": 3 }  // Only report more complex ternaries
       ]
     }
   }
   ```

### Performance Issues

If you experience performance problems with the rule:

1. Increase the complexity threshold:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-show-over-ternary": [
         "error",
         { 
           "minComplexity": 3,
           "performance": {
             "maxTime": 100,
             "maxNodes": 5000
           }
         }
       ]
     }
   }
   ```

2. Disable for specific files:

   ```json
   {
     "overrides": [
       {
         "files": ["**/*.test.tsx"],
         "rules": {
           "react-signals-hooks/prefer-show-over-ternary": "off"
         }
       }
     ]
   }
   ```

## TypeScript Support

This rule provides excellent TypeScript support and understands:

1. **Type Narrowing**:

   ```tsx
   function UserProfile({ user }: { user: Signal<User | null> }) {
     return (
       <Show when={user.value}>
         {/* TypeScript knows user.value is not null here */}
         <h1>{user.value.name}</h1>
       </Show>
     );
   }
   ```

2. **Generic Components**:

   ```tsx
   function Conditional<T>({ data, children }: { 
     data: Signal<T | null>; 
     children: (data: T) => ReactNode;
   }) {
     return (
       <Show when={data.value}>
         {children(data.value)}  {/* Properly typed */}
       </Show>
     );
   }
   ```

3. **Type Assertions**:

   ```tsx
   const user = useSignal<User | null>(null);
   // ...
   <Show when={user.value as User}>  // Type assertion when needed
     <UserProfile user={user.value as User} />
   </Show>
   ```

## Performance Considerations

The `<Show>` component provides several performance benefits:

1. **Lazy Evaluation**: Children are only evaluated when the condition is true
2. **Stable References**: Helps prevent unnecessary re-renders
3. **Signal Optimization**: Better integration with Preact's reactivity system

```tsx
// More efficient than ternary for signal conditions
<Show when={expensiveToComputeSignal.value}>
  <ExpensiveComponent />
</Show>
```

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
