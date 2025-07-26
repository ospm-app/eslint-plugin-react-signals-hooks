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
   import { For } from '@preact/signals-react/flexibles';
   
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
