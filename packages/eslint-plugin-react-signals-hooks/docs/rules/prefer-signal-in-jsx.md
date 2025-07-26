# Prefer Signal in JSX Rule

This rule enforces direct usage of signals in JSX without explicit `.value` access. In JSX, signals can be used directly for better readability and cleaner code.

## Rule Details

This rule identifies instances where `.value` is used to access signal values within JSX and suggests removing the explicit `.value` access. This makes the code more concise and leverages the automatic `.value` access that happens in JSX expressions.

### When to use direct signal access in JSX

- **Use direct signal access when:**
  - Rendering a signal value directly in JSX
  - The signal is used as a prop value
  - The signal is used in a JSX expression

- **Keep `.value` access when:**
  - The signal is used in a function that's passed as a prop
  - The signal is used in a complex expression that requires explicit `.value` access
  - The signal is used in a template literal or string concatenation

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Direct .value access in JSX**

   ```tsx
   function UserProfile({ userSignal }) {
     const theme = useSignal('light');
     
     return (
       <div className={`profile ${theme.value}`}>
         <h1>{userSignal.value.name}'s Profile</h1>
         <p>Email: {userSignal.value.email}</p>
         <p>Member since: {new Date(userSignal.value.joinDate).toLocaleDateString()}</p>
       </div>
     );
   }
   ```

2. **Unnecessary .value in conditional rendering**

   ```tsx
   function NotificationBadge({ countSignal }) {
     return (
       <div>
         {countSignal.value > 0 && (
           <span className="badge">
             {countSignal.value} new notifications
           </span>
         )}
       </div>
     );
   }
   ```

3. **Redundant .value in string templates**

   ```tsx
   function WelcomeBanner({ userSignal }) {
     const timeOfDay = useSignal('morning');
     
     // ❌ Unnecessary .value in template literal
     return (
       <h2>{`Good ${timeOfDay.value}, ${userSignal.value.name}!`}</h2>
     );
   }
   ```

4. **Overusing .value in complex expressions**

   ```tsx
   function PriceDisplay({ priceSignal, discountSignal }) {
     // ❌ Unnecessary .value in calculation
     const finalPrice = priceSignal.value * (1 - discountSignal.value / 100);
     
     return (
       <div>
         <p>Original: ${priceSignal.value}</p>
         <p>Discount: {discountSignal.value}%</p>
         <p>Final: ${finalPrice.toFixed(2)}</p>
       </div>
     );
   }
   ```

### ✅ Recommended Patterns

1. **Direct signal usage in JSX**

   ```tsx
   function UserProfile({ userSignal }) {
     const theme = useSignal('light');
     
     return (
       <div className={`profile ${theme}`}>
         <h1>{userSignal.name}'s Profile</h1>
         <p>Email: {userSignal.email}</p>
         <p>Member since: {new Date(userSignal.joinDate).toLocaleDateString()}</p>
       </div>
     );
   }
   ```

2. **Clean conditional rendering**

   ```tsx
   function NotificationBadge({ countSignal }) {
     return (
       <div>
         {countSignal > 0 && (
           <span className="badge">
             {countSignal} new notifications
           </span>
         )}
       </div>
     );
   }
   ```

3. **Using signals in string templates**

   ```tsx
   function WelcomeBanner({ userSignal }) {
     const timeOfDay = useSignal('morning');
     
     // Direct signal usage in template literal
     return (
       <h2>{`Good ${timeOfDay}, ${userSignal.name}!`}</h2>
     );
   }
   ```

4. **Complex expressions with computed**

   ```tsx
   function PriceDisplay({ priceSignal, discountSignal }) {
     // Use computed for derived state
     const finalPrice = computed(() => 
       priceSignal * (1 - discountSignal / 100)
     );
     
     return (
       <div>
         <p>Original: ${priceSignal}</p>
         <p>Discount: {discountSignal}%</p>
         <p>Final: ${finalPrice.toFixed(2)}</p>
       </div>
     );
   }
   ```

5. **Signal props in components**

   ```tsx
   function ProductCard({ productSignal }) {
     return (
       <div className="card">
         <h3>{productSignal.name}</h3>
         <p>{productSignal.description}</p>
         <div className="price">
           ${productSignal.price} 
           {productSignal.isOnSale && (
             <span className="sale-badge">Sale!</span>
           )}
         </div>
         <button 
           onClick={() => productSignal.isInCart = !productSignal.isInCart}
         >
           {productSignal.isInCart ? 'Remove from Cart' : 'Add to Cart'}
         </button>
       </div>
     );
   }
   ```

6. **Using signals with array methods**

   ```tsx
   function TodoList({ todosSignal }) {
     return (
       <ul>
         <For each={todosSignal}>
           {(todo) => (
             <li className={todo.isCompleted ? 'completed' : ''}>
               <input 
                 type="checkbox"
                 checked={todo.isCompleted}
                 onChange={() => todo.isCompleted = !todo.isCompleted}
               />
               {todo.text}
             </li>
           )}
         </For>
       </ul>
     );
   }
   ```

## Auto-fix

This rule provides an auto-fix that removes the `.value` access in JSX contexts. The fix:

1. Removes the `.value` access
2. Preserves the signal name
3. Handles nested expressions appropriately

## When Not To Use It

You might want to disable this rule if:

1. You're using a version of React/Preact that doesn't support automatic `.value` access in JSX
2. You have custom JSX transforms that don't handle signal auto-unwrapping
3. You prefer explicit `.value` access for consistency

## Related Rules

- `react/jsx-curly-brace-presence`: Enforces consistent usage of curly braces in JSX
- `react/jsx-no-useless-fragment`: Prevents unnecessary fragments
- `prefer-batch-updates`: Suggests batching multiple signal updates

## Best Practices

1. **Use signals directly in JSX**: Let the framework handle the `.value` access
2. **Keep signal access simple**: Avoid complex expressions with signals in JSX
3. **Be explicit in callbacks**: Use `.value` in event handlers and effects
4. **Consider performance**: Direct signal access in JSX is optimized by the framework

## Migration Guide

When migrating from explicit `.value` access to direct signal usage:

1. Remove `.value` from signal access in JSX
2. Keep `.value` in callbacks and effects
3. Update any type definitions if needed

Example migration:

```tsx
// Before
function UserProfile({ userSignal }) {
  return (
    <div>
      <h1>{userSignal.value.name}</h1>
      <p>Email: {userSignal.value.email}</p>
      <button onClick={() => updateUser(userSignal.value.id)}>
        Update
      </button>
    </div>
  );
}

// After
function UserProfile({ userSignal }) {
  return (
    <div>
      <h1>{userSignal.name}</h1>
      <p>Email: {userSignal.email}</p>
      <button onClick={() => updateUser(userSignal.value.id)}>
        Update
      </button>
    </div>
  );
}
```
