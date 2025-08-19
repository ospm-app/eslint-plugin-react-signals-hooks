# Prefer Signal in JSX Rule

This rule enforces direct usage of signals in JSX without explicit `.value` access. In JSX, signals can be used directly for better readability and cleaner code, as they are automatically unwrapped when used in JSX expressions.

## Rule Details

This rule identifies instances where `.value` is used to access signal values within JSX and suggests removing the explicit `.value` access. This makes the code more concise and leverages the automatic `.value` access that happens in JSX expressions.

## Plugin Scope

- Signal creator detection is scoped to `@preact/signals-react` only.
- The rule recognizes signals created in-file via `signal()` / `computed()` (direct, aliased, or namespace imports) from `@preact/signals-react`.

### When to use direct signal access in JSX

- **Use direct signal access when:**
  - Rendering a signal value directly in JSX
  - The signal is used as a prop value
  - The signal is used in a JSX expression
  - The signal is used in JSX attributes
  - The signal is used in JSX fragments
  - The signal is used in conditional JSX rendering

- **Keep `.value` access when:**
  - The signal is used in a function that's passed as a prop
  - The signal is used in a complex expression that requires explicit `.value` access
  - The signal is used in a template literal or string concatenation
  - The signal is used in a callback function inside JSX
  - The signal is used with `JSON.stringify()` or other functions that need the actual value

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
       <>
         {countSignal.value > 0 && (
           <span className="badge">{countSignal.value}</span>
         )}
       </>
     );
   }
   ```

3. **.value in JSX attributes**

   ```tsx
   function Avatar({ userSignal }) {
     const size = useSignal(32);
     
     return (
       <img 
         src={userSignal.value.avatar} 
         alt={userSignal.value.name}
         width={size.value}
         height={size.value}
       />
     );
   }
   ```

4. **.value in JSX fragments**

   ```tsx
   function UserInfo({ userSignal }) {
     return (
       <>
         <h1>Welcome back, {userSignal.value.name}!</h1>
         <p>Your email is: {userSignal.value.email}</p>
       </>
     );
   }
   ```

### ✅ Correct Patterns

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

2. **Direct signal in conditional rendering**

   ```tsx
   function NotificationBadge({ countSignal }) {
     return (
       <>
         {countSignal > 0 && (
           <span className="badge">{countSignal}</span>
         )}
       </>
     );
   }
   ```

3. **Direct signal in JSX attributes**

   ```tsx
   function Avatar({ userSignal }) {
     const size = useSignal(32);
     
     return (
       <img 
         src={userSignal.avatar} 
         alt={userSignal.name}
         width={size}
         height={size}
       />
     );
   }
   ```

4. **When to keep .value**

   ```tsx
   function UserProfile({ userSignal }) {
     // Keep .value when passing to functions
     const fullName = `${userSignal.value.firstName} ${userSignal.value.lastName}`;
     
     // Keep .value in callbacks
     const handleClick = useCallback(() => {
       console.log('User ID:', userSignal.value.id);
     }, [userSignal]);
     
     // Keep .value with JSON.stringify
     const userData = JSON.stringify(userSignal.value);
     
     // But use directly in JSX
     return (
       <div>
         <h1>{fullName}</h1>
         <button onClick={handleClick}>Log User</button>
         <pre>{userData}</pre>
       </div>
     );
   }
   ```

## Performance Considerations

### Benefits of Direct Signal Usage

1. **Cleaner Code**: Removes unnecessary `.value` access, making JSX more readable
2. **Better Performance**: Leverages React's automatic signal unwrapping in JSX
3. **Consistency**: Encourages a consistent pattern across the codebase

### When to Disable

You might want to disable this rule in specific cases:

1. **Complex Expressions**: When the signal is part of a complex expression

   ```tsx
   // eslint-disable-next-line react-signals-hooks/prefer-signal-in-jsx
   const result = someCondition ? signal.value : defaultValue;
   ```

2. **Template Literals**: When using signals in template literals

   ```tsx
   // eslint-disable-next-line react-signals-hooks/prefer-signal-in-jsx
   const greeting = `Hello, ${userSignal.value.name}!`;
   ```

## Options

This rule accepts an options object with the following properties:

```ts
interface Options {
  severity?: {
    preferDirectSignalUsage?: 'error' | 'warn' | 'off';
  };
  performance?: PerformanceBudget;
  suffix?: string;
  extraCreatorModules?: string[];
  extraCreatorNames?: string[];
  extraCreatorNamespaces?: string[];
  suggestOnly?: boolean;
}
```

- `performance`: Enables performance tracking/budgeting.
- `severity`: Per-message severity control. Defaults to `error`.
- `suffix`: Custom suffix for detecting signal variable names.
- `extraCreatorModules`: Additional modules exporting `signal`/`computed` creators (merged with defaults like `@preact/signals-react`).
- `extraCreatorNames`: Additional local creator function identifiers (e.g., `['signal', 'computed', 'sig']`).
- `extraCreatorNamespaces`: Additional namespaces that contain creator methods (e.g., `['Signals']`).
- `suggestOnly`: When true, do not apply autofix automatically; offer suggestions instead.

## Autofix and Suggestions

- Autofix: Yes (fixable: `code`).
- Suggestions: Yes (`hasSuggestions: true`). When `suggestOnly: true`, fixes are offered as suggestions rather than applied automatically.

## TypeScript Support

This rule works well with TypeScript and provides proper type checking:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userSignal }: { userSignal: Signal<User> }) {
  // TypeScript knows the type of userSignal.value
  const userId = userSignal.value.id;
  
  // But in JSX, we can use it directly
  return (
    <div>
      <h1>{userSignal.name}</h1>
      <p>{userSignal.email}</p>
    </div>
  );
}
```

## Edge Cases

### Nested Signals

When working with nested signals, you still don't need `.value` in JSX:

```tsx
function NestedSignalExample() {
  const userSignal = useSignal({
    name: 'John',
    address: signal({
      street: '123 Main St',
      city: 'Anytown'
    })
  });
  
  return (
    <div>
      <h1>{userSignal.name}</h1>
      <p>{userSignal.address.street}, {userSignal.address.city}</p>
    </div>
  );
}
```

### Signal Arrays

When working with arrays of signals:

```tsx
function TodoList() {
  const todos = useSignal([
    signal({ id: 1, text: 'Learn Signals', completed: false }),
    signal({ id: 2, text: 'Build app', completed: false })
  ]);
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input 
            type="checkbox" 
            checked={todo.completed} 
            onChange={() => {
              // Need .value here to update the signal
              todo.value = { ...todo.value, completed: !todo.value.completed };
            }} 
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

## Migration Guide

### From .value to Direct Signal Usage

1. **Identify .value usage in JSX**: Look for `.value` in JSX expressions and attributes

2. **Remove .value in JSX**:

   ```tsx
   // Before
   <div>{signal.value}</div>
   
   // After
   <div>{signal}</div>
   ```

3. **Keep .value in callbacks and effects**:

   ```tsx
   // Keep .value in callbacks
   const handleClick = useCallback(() => {
     console.log(signal.value);
   }, [signal]);
   
   // Keep .value in effects
   useEffect(() => {
     const subscription = someObservable.subscribe(value => {
       signal.value = value;
     });
     return () => subscription.unsubscribe();
   }, [signal]);
   ```

4. **Redundant .value in string templates**

   ```tsx
   function WelcomeBanner({ userSignal }) {
     const timeOfDay = useSignal('morning');
     
     // ❌ Unnecessary .value in template literal
     return (
       <h2>{`Good ${timeOfDay.value}, ${userSignal.value.name}!`}</h2>
     );
   }
   ```

5. **Overusing .value in complex expressions**

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
