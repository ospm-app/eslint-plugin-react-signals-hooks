# Prefer For Over Map Rule

This rule encourages using the `<For>` component from `@preact/signals-react` instead of the `.map()` method for rendering arrays of data in React components. This provides better performance and reactivity when working with signal arrays.

## Plugin Scope

- Only signals imported from `@preact/signals-react` are considered.
- Autofix will add or augment imports from `@preact/signals-react`.

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

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Basic array mapping**

   ```tsx
   function TodoList({ todos }) {
     const todoItems = useSignal([
       { id: 1, text: 'Learn React', completed: false },
       { id: 2, text: 'Learn Signals', completed: true },
     ]);
     
     return (
       <ul>
         {todoItems.value.map(todo => (
           <li key={todo.id}>
             <input 
               type="checkbox" 
               checked={todo.completed}
               onChange={() => {
                 // This will cause unnecessary re-renders
                 todoItems.value = todoItems.value.map(t => 
                   t.id === todo.id ? { ...t, completed: !t.completed } : t
                 );
               }}
             />
             {todo.text}
           </li>
         ))}
       </ul>
     );
   }
   ```

2. **Mapping with index as key**

   ```tsx
   function UserList({ users }) {
     const userList = useSignal([
       { name: 'Alice' },
       { name: 'Bob' },
       { name: 'Charlie' }
     ]);
     
     // ❌ Using array index as key
     return (
       <div>
         {userList.value.map((user, index) => (
           <UserItem 
             key={index} // ❌ Anti-pattern: Using index as key
             user={user} 
           />
         ))}
       </div>
     );
   }
   ```

3. **Complex mapping with multiple operations**

   ```tsx
   function ProductList({ products }) {
     const productSignals = useSignal(products);
     
     // ❌ Chaining multiple array methods before rendering
     return (
       <div>
         {productSignals.value
           .filter(p => p.inStock)
           .sort((a, b) => a.price - b.price)
           .map(product => (
             <ProductCard key={product.id} product={product} />
           ))}
       </div>
     );
   }
   ```

### ✅ Recommended Patterns

1. **Basic For component usage**

   ```tsx
   import { For } from '@preact/signals-react';
   
   function TodoList({ todos }) {
     const todoItems = useSignal([
       { id: 1, text: 'Learn React', completed: false },
       { id: 2, text: 'Learn Signals', completed: true },
     ]);
     
     return (
       <ul>
         <For each={todoItems}>
           {(todo) => (
             <li>
               <input 
                 type="checkbox"
                 checked={todo.completed}
                 onChange={() => {
                   // More efficient updates with For
                   todo.completed = !todo.completed;
                   todoItems.value = [...todoItems.value];
                 }}
               />
               {todo.text}
             </li>
           )}
         </For>
       </ul>
     );
   }
   ```

2. **Using For with complex items**

   ```tsx
   function UserDashboard() {
     const users = useSignal([
       { id: '1', name: 'Alice', role: 'admin' },
       { id: '2', name: 'Bob', role: 'user' },
     ]);
     
     return (
       <div className="user-grid">
         <For each={users}>
           {(user) => (
             <div className="user-card">
               <h3>{user.name}</h3>
               <p>Role: {user.role}</p>
               <button 
                 onClick={() => {
                   // Direct mutation works with For's reactivity
                   user.role = user.role === 'admin' ? 'user' : 'admin';
                   users.value = [...users.value];
                 }}
               >
                 Toggle Role
               </button>
             </div>
           )}
         </For>
       </div>
     );
   }
   ```

3. **Combining with other array operations**

   ```tsx
   function ProductCatalog() {
     const products = useSignal([
       { id: 1, name: 'Laptop', price: 999, inStock: true },
       { id: 2, name: 'Phone', price: 699, inStock: false },
       { id: 3, name: 'Tablet', price: 399, inStock: true },
     ]);
     
     // Compute derived state with computed
     const filteredProducts = computed(() => 
       products.value.filter(p => p.inStock).sort((a, b) => a.price - b.price)
     );
     
     return (
       <div className="product-grid">
         <h2>Available Products</h2>
         <For each={filteredProducts}>
           {(product) => (
             <div className="product-card">
               <h3>{product.name}</h3>
               <p>${product.price}</p>
               <button 
                 onClick={() => {
                   // Update product stock status
                   const updated = products.value.map(p => 
                     p.id === product.id 
                       ? { ...p, inStock: false } 
                       : p
                   );
                   products.value = updated;
                 }}
               >
                 Mark as Sold Out
               </button>
             </div>
           )}
         </For>
       </div>
     );
   }
   ```

4. **Using For with context**

   ```tsx
   const ThemeContext = createContext('light');
   
   function ThemedList({ items }) {
     const theme = useContext(ThemeContext);
     const itemSignals = useSignal(items);
     
     return (
       <div className={`theme-${theme}`}>
         <For each={itemSignals}>
           {(item, index) => (
             <div className="list-item">
               <span className="item-number">{index() + 1}.</span>
               <span className="item-text">{item.text}</span>
               <button 
                 onClick={() => {
                   // Remove item by index
                   itemSignals.value = itemSignals.value.filter((_, i) => i !== index());
                 }}
               >
                 Remove
               </button>
             </div>
           )}
         </For>
       </div>
     );
   }
   ```

5. **For with dynamic components**

   ```tsx
   function DynamicForm({ fields }) {
     const formFields = useSignal(fields);
     
     const renderField = (field) => {
       switch (field.type) {
         case 'text':
           return (
             <input 
               type="text" 
               value={field.value}
               onChange={(e) => {
                 field.value = e.target.value;
                 formFields.value = [...formFields.value];
               }}
             />
           );
         case 'checkbox':
           return (
             <input 
               type="checkbox"
               checked={field.checked}
               onChange={(e) => {
                 field.checked = e.target.checked;
                 formFields.value = [...formFields.value];
               }}
             />
           );
         default:
           return null;
       }
     };
     
     return (
       <form>
         <For each={formFields}>
           {(field) => (
             <div className="form-field">
               <label>{field.label}</label>
               {renderField(field)}
             </div>
           )}
         </For>
       </form>
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

## Configuration

This rule accepts an options object with the following properties:

```js
{
  "rules": {
    "react-signals-hooks/prefer-for-over-map": [
      "error",
      {
        "performance": {
          "enableMetrics": false,  // Enable performance metrics
          "logMetrics": false,     // Log metrics to console
          "maxNodes": 2000        // Maximum nodes to process before bailing out
        }
      }
    ]
  }
}
```

### Performance Options

- `enableMetrics`: When `true`, enables collection of performance metrics
- `logMetrics`: When `true`, logs performance metrics to the console
- `maxNodes`: Maximum number of AST nodes to process before bailing out (prevents performance issues on large files)

## When Not To Use It

You might want to disable this rule in the following cases:

1. **Performance is not a concern** for the specific use case
2. **Chaining array methods** is required for your logic
3. **Working with non-reactive arrays** that won't change over time
4. **Using array methods** like `filter` or `sort` in combination with `map`
5. **Legacy codebases** where migrating to `<For>` would be too disruptive

## Edge Cases and Limitations

1. **Chained Array Methods**

   ```tsx
   // The rule won't autofix chained array methods
   {itemsSignal.value
     .filter(x => x.active)
     .map(item => <div key={item.id}>{item.name}</div>)}
   ```

2. **Complex Callbacks**

   ```tsx
   // Complex callbacks might need manual adjustment
   {itemsSignal.value.map((item, index, array) => {
     // Complex logic here
     return <Item key={item.id} item={item} index={index} />;
   })}
   ```

3. **Non-React Components**

   ```tsx
   // The rule only flags .map() in JSX contexts
   const itemList = itemsSignal.value.map(item => createElement('div', null, item));
   ```

## Troubleshooting

### False Positives

If the rule reports issues incorrectly:

1. Use an ESLint disable comment:

   ```tsx
   // eslint-disable-next-line react-signals-hooks/prefer-for-over-map
   {itemsSignal.value.map(item => <Item key={item.id} item={item} />)}
   ```

2. Disable the rule for specific files:

   ```json
   {
     "overrides": [
       {
         "files": ["*.test.tsx", "*.stories.tsx"],
         "rules": {
           "react-signals-hooks/prefer-for-over-map": "off"
         }
       }
     ]
   }
   ```

### Performance Issues

If you experience performance problems with the rule:

1. Increase the `maxNodes` threshold:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-for-over-map": [
         "error",
         {
           "performance": {
             "maxNodes": 5000
           }
         }
       ]
     }
   }
   ```

2. Disable performance metrics in production:

   ```json
   {
     "rules": {
       "react-signals-hooks/prefer-for-over-map": [
         "error",
         {
           "performance": {
             "enableMetrics": false,
             "logMetrics": false
           }
         }
       ]
     }
   }
   ```

## TypeScript Support

This rule provides excellent TypeScript support and understands:

1. **Type Narrowing**

   ```tsx
   function UserList({ users }: { users: Signal<Array<{ id: string; name: string }>> }) {
     return (
       <ul>
         <For each={users}>
           {(user) => (
             // TypeScript knows user is { id: string; name: string }
             <li key={user.id}>{user.name}</li>
           )}
         </For>
       </ul>
     );
   }
   ```

2. **Generic Components**

   ```tsx
   function List<T>({ items, renderItem }: { 
     items: Signal<Array<T>>;
     renderItem: (item: T) => React.ReactNode;
   }) {
     return (
       <div>
         <For each={items}>
           {(item) => (
             // TypeScript preserves the generic type T
             <div key={String(item.id)}>{renderItem(item)}</div>
           )}
         </For>
       </div>
     );
   }
   ```

3. **Type Assertions**

   ```tsx
   const items = useSignal<Array<{ id: string; name: string }>>([]);
   
   // Type assertion works as expected
   <For each={items as Signal<Array<{ id: string; name: string }>>}>
     {(item) => <div key={item.id}>{item.name}</div>}
   </For>
   ```

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
import { For } from '@preact/signals-react';

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
