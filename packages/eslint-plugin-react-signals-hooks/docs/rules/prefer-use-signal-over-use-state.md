# Prefer useSignal Over useState Rule

This rule encourages the use of `useSignal` from `@preact/signals-react` instead of `useState` for managing primitive values and simple state in React components. `useSignal` offers a more concise syntax and better performance characteristics for certain use cases.

## Rule Details

This rule identifies `useState` hooks that could be replaced with `useSignal` for better readability and performance. It's particularly useful for primitive values like numbers, strings, and booleans.

### When to use `useSignal` over `useState`

- **Use `useSignal` when:**
  - Managing primitive values (numbers, strings, booleans)
  - The state doesn't need to trigger re-renders of the entire component
  - You want more granular control over reactivity
  - You're working with forms or inputs that update frequently

- **Stick with `useState` when:**
  - The state is an object or array that needs to be updated as a whole
  - You rely on the component re-rendering on every state change
  - You're working with complex state logic that benefits from the React's batching

## Examples

### ❌ Incorrect

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(false);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </div>
  );
}
```

### ✅ Correct

```tsx
import { useSignal } from '@preact/signals-react';

function Counter() {
  const count = useSignal(0);
  const name = useSignal('');
  const isActive = useSignal(false);
  
  return (
    <div>
      <button onClick={() => count.value++}>Count: {count}</button>
      <input value={name} onInput={e => (name.value = e.target.value)} />
      <button onClick={() => (isActive.value = !isActive.value)}>
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </div>
  );
}
```

## Auto-fix

This rule provides an auto-fix that can automatically convert `useState` to `useSignal` when possible. The fix will:

1. Replace `useState` with `useSignal`
2. Remove the setter function
3. Add `.value` to all updates
4. Add the necessary import if not already present

## Options

This rule accepts an options object with the following properties:

```ts
{
  "rules": {
    "react-signals-hooks/prefer-use-signal-over-use-state": [
      "error",
      {
        "ignoreComplexInitializers": true // Default: true
      }
    ]
  }
}
```

- `ignoreComplexInitializers` (boolean) - When `true` (default), the rule will skip non-primitive initializers. Set to `false` to enforce the rule for all `useState` calls.

## When Not To Use It

You might want to disable this rule if:

1. You're working on a project that doesn't use `@preact/signals-react`
2. You prefer the React's built-in state management for all cases
3. You're working with class components that can't use hooks

## Related Rules

- `prefer-signal-in-jsx`: For using signals directly in JSX
- `prefer-signal-methods`: For proper signal method usage
- `no-mutation-in-render`: To prevent direct signal mutations during render

## Best Practices

1. **Start with `useSignal` for primitive values**:

   ```tsx
   // Good
   const count = useSignal(0);
   
   // Less ideal for simple values
   const [count, setCount] = useState(0);
   ```

2. **Use `useState` for complex state objects**:

   ```tsx
   // Better for complex state
   const [user, setUser] = useState({ name: '', age: 0 });
   
   // More verbose with signals
   const user = useSignal({ name: '', age: 0 });
   // Need to update like this:
   // user.value = { ...user.value, name: 'John' };
   ```

3. **Consider performance implications**:
   - `useSignal` is more efficient for frequent updates
   - `useState` triggers re-renders which might be necessary for some UIs

## Migration Guide

When migrating from `useState` to `useSignal`:

1. Replace `useState` with `useSignal`
2. Remove the setter function from destructuring
3. Add `.value` when reading or updating the signal
4. In JSX, use the signal directly (no `.value` needed)

Example migration:

```tsx
// Before
const [count, setCount] = useState(0);
const increment = () => setCount(c => c + 1);

// After
const count = useSignal(0);
const increment = () => count.value++;

// In JSX
// Before
<button onClick={increment}>{count}</button>

// After (same syntax in JSX)
<button onClick={increment}>{count}</button>
```
