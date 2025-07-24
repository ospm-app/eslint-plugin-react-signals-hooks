# Prefer For Over Map Rule

This rule encourages using the `<For>` component from `@preact/signals-react` instead of the `.map()` method for rendering arrays of data in React components. This provides better performance and reactivity when working with signal arrays.

## Rule Details

This rule identifies instances where `.map()` is used with signal arrays and suggests replacing them with the `<For>` component. The `<For>` component is optimized for rendering reactive arrays and provides better performance by minimizing re-renders.

### When to use `<For>` vs `.map()`

- **Use `<For>` when:**
  - Rendering arrays that come from signals
  - The array is reactive (may change over time)
  - You need optimal rendering performance
  - The array items have stable identities

- **Use `.map()` when:**
  - The array is static and won't change
  - You need to chain array methods
  - You're working with non-reactive data
  - You need to transform data before rendering

## Examples

### ❌ Incorrect

```tsx
import { signal } from '@preact/signals-react';

const items = signal([1, 2, 3]);

function Component() {
  return (
    <div>
      {items.value.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}
```

### ✅ Correct

```tsx
import { signal } from '@preact/signals-react';
import { For } from '@preact/signals-react/flexibles';

const items = signal([1, 2, 3]);

function Component(): JSX.Element {
  return (
    <div>
      <For each={items}>
        {(item) => <div>{item}</div>}
      </For>
    </div>
  );
}
```

## Auto-fix

This rule provides auto-fix suggestions to:

1. Replace `.map()` calls with `<For>` components
2. Add the `For` import if it's not already imported
3. Handle different callback patterns (arrow functions, regular functions, etc.)

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals-react` in your project
2. You need to chain multiple array methods before rendering
3. You're working with non-reactive arrays that won't change
4. You have specific performance requirements that require manual optimization

## Related Rules

- `react/jsx-key`: Ensures that elements in an array have unique keys
- `react/no-array-index-key`: Prevents using array indices as keys
- `prefer-batch-updates`: Suggests batching multiple signal updates

## Performance Considerations

Using `<For>` instead of `.map()` provides several performance benefits:

1. **Efficient Updates**: Only re-renders items that have actually changed
2. **Stable Keys**: Automatically handles keys for list items
3. **Less GC Pressure**: Reuses DOM nodes when possible
4. **Better Memory Usage**: Only renders items that are currently visible (with virtualization)

## Best Practices

1. **Always provide stable keys**: The `<For>` component handles this automatically
2. **Keep item components simple**: Extract complex item rendering to separate components
3. **Use `each` prop for the array**: This is required for the `<For>` component
4. **Consider virtualization**: For very large lists, consider using a virtualized list component
5. **Memoize callbacks**: If your render function is expensive, memoize it with `useCallback`

## Migration Guide

When migrating from `.map()` to `<For>`:

1. Replace the `.map()` call with a `<For>` component
2. Move the array to the `each` prop
3. Move the render function as children
4. Remove the explicit `key` prop (handled by `<For>`)

Example migration:

```tsx
// Before
function TodoList({ todos }: { todos: Todo[] }): JSX.Element {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}

// After
import { For } from '@preact/signals-react/flexibles';

function TodoList({ todos }: { todos: Todo[] }): JSX.Element {
  return (
    <ul>
      <For each={todos}>
        {(todo) => <li>{todo.text}</li>}
      </For>
    </ul>
  );
}
```
