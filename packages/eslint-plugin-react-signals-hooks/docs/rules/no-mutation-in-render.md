# No Mutation in Render Rule

This rule prevents direct signal mutations during the render phase of React components. Signal mutations should only occur in effects, event handlers, or other side-effect contexts to ensure predictable component behavior and prevent rendering issues.

## Rule Details

This rule flags direct signal mutations that happen during the render phase of a React component. It helps prevent common pitfalls that can lead to unexpected behavior, infinite loops, or performance issues.

### What's considered a signal mutation?

1. Direct assignment to `signal.value`
2. Update operations on `signal.value` (++, --, +=, etc.)
3. Property assignments on signal values
4. Array index assignments on signal values
5. Nested property assignments on signal values

### When is the rule active?

The rule is active in:

- Function components (PascalCase functions)
- Arrow function components
- Class render methods

### When is the rule not active?

The rule is not active in:

- `useEffect` callbacks
- `useLayoutEffect` callbacks
- `useCallback` callbacks
- `useMemo` callbacks
- Event handlers
- Custom hooks
- Non-component functions

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Direct mutation in render**

   ```tsx
   function Counter() {
     const count = signal(0);
     count.value++; // ❌ Direct mutation during render
     return <div>{count}</div>;
   }
   ```

2. **Mutation in conditional logic**

   ```tsx
   function UserProfile({ user }) {
     const userData = signal({ name: 'John' });
     
     if (user.isAdmin) {
       userData.value.role = 'admin'; // ❌ Mutation in conditional
     }
     
     return <div>{userData.value.name}</div>;
   }
   ```

3. **Mutation in array methods**

   ```tsx
   function TodoList() {
     const todos = signal([{ id: 1, text: 'Learn Signals', done: false }]);
     
     return (
       <ul>
         {todos.value.map(todo => {
           todo.done = true; // ❌ Mutation in render
           return <li key={todo.id}>{todo.text}</li>;
         })}
       </ul>
     );
   }
   ```

### ✅ Recommended Patterns

1. **Using effects for side effects**

   ```tsx
   function Counter() {
     const count = signal(0);
     
     useEffect(() => {
       // ✅ Safe to mutate in effects
       const timer = setInterval(() => count.value++, 1000);
       return () => clearInterval(timer);
     }, []);
     
     return <div>{count}</div>;
   }
   ```

2. **Using event handlers**

   ```tsx
   function TodoItem({ todo }) {
     const [isEditing, setIsEditing] = useState(false);
     const editedText = signal(todo.text);
     
     const handleSave = () => {
       // ✅ Safe to mutate in event handlers
       todo.text = editedText.value;
       setIsEditing(false);
     };
     
     return (
       <div>
         {isEditing ? (
           <input 
             value={editedText.value}
             onChange={e => editedText.value = e.target.value}
           />
         ) : (
           <span>{todo.text}</span>
         )}
         <button onClick={handleSave}>Save</button>
       </div>
     );
   }
   ```

3. **Deriving state**

   ```tsx
   function UserList({ users }) {
     const activeUsers = computed(() => 
       users.filter(user => user.isActive)
     );
     
     // ✅ No mutations, just deriving new values
     return (
       <ul>
         {activeUsers.value.map(user => (
           <li key={user.id}>{user.name}</li>
         ))}
       </ul>
     );
   }
   ```

4. **Using batch for multiple updates**

   ```tsx
   function ComplexForm() {
     const form = signal({
       firstName: '',
       lastName: '',
       email: ''
     });
     
     const handleReset = () => {
       // ✅ Batch multiple updates together
       batch(() => {
         form.value.firstName = '';
         form.value.lastName = '';
         form.value.email = '';
       });
     };
     
     return (
       <form>
         {/* form fields */}
         <button type="button" onClick={handleReset}>
           Reset Form
         </button>
       </form>
     );
   }
   ```

## Options

This rule doesn't have any configuration options.

## When Not To Use It

You might want to disable this rule if:

1. You have a specific use case that requires direct mutations during render (very rare)
2. You're working with a codebase that follows a different state management pattern
3. You're using a custom signal implementation with different semantics

## Related Rules

- `react/no-direct-mutation-state`: Similar concept but for React component state
- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
