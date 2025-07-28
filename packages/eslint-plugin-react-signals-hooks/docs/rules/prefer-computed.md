# Prefer Computed Rule

This rule encourages using `computed()` from `@preact/signals-react` over `useMemo` when working with signals to derive values. This provides better performance and automatic dependency tracking for signal-based computations.

## Rule Details

This rule identifies instances where `useMemo` is used with signal dependencies and suggests replacing them with `computed()` for better performance and maintainability. The `computed()` function provides automatic dependency tracking and better optimization for signal-based computations.

### When to use `computed()` vs `useMemo`

- **Use `computed()` when:**
  - Deriving values from one or more signals
  - The computation depends on reactive values (signals)
  - You want automatic dependency tracking
  - You need the value to be reactive in the template

- **Use `useMemo` when:**
  - The computation is expensive but doesn't depend on signals
  - You need to memoize non-reactive values
  - You need to control when the computation runs via explicit dependencies

## Common Patterns and Anti-patterns

### ❌ Common Anti-patterns

1. **Using useMemo with signal dependencies**

   ```tsx
   function ShoppingCart() {
     const items = useSignal([
       { id: 1, name: 'Item 1', price: 10, quantity: 2 },
       { id: 2, name: 'Item 2', price: 20, quantity: 1 }
     ]);
     
     // ❌ Using useMemo with signal values
     const total = useMemo(() => {
       return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0);
     }, [items.value]);
     
     return <div>Total: ${total}</div>;
   }
   ```

2. **Redundant useMemo for derived signal state**

   ```tsx
   function UserProfile() {
     const user = useSignal({
       firstName: 'John',
       lastName: 'Doe',
       email: 'john@example.com'
     });
     
     // ❌ Unnecessary useMemo for derived signal state
     const fullName = useMemo(
       () => `${user.value.firstName} ${user.value.lastName}`,
       [user.value.firstName, user.value.lastName]
     );
     
     return <h1>{fullName}</h1>;
   }
   ```

3. **Complex computations in render**

   ```tsx
   function DataGrid({ data }) {
     const sortConfig = useSignal({ key: 'name', direction: 'asc' });
     
     // ❌ Complex computation in render without proper memoization
     const sortedData = [...data].sort((a, b) => {
       if (a[sortConfig.value.key] < b[sortConfig.value.key]) {
         return sortConfig.value.direction === 'asc' ? -1 : 1;
       }
       if (a[sortConfig.value.key] > b[sortConfig.value.key]) {
         return sortConfig.value.direction === 'asc' ? 1 : -1;
       }
       return 0;
     });
     
     // ...
   }
   ```

### ✅ Recommended Patterns

1. **Using computed for derived values**

   ```tsx
   function ShoppingCart() {
     const items = useSignal([
       { id: 1, name: 'Item 1', price: 10, quantity: 2 },
       { id: 2, name: 'Item 2', price: 20, quantity: 1 }
     ]);
     
     // ✅ Using computed for derived signal values
     const total = computed(() => 
       items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
     );
     
     return <div>Total: ${total.value}</div>;
   }
   ```

2. **Composing computed values**

   ```tsx
   function UserProfile() {
     const user = useSignal({
       firstName: 'John',
       lastName: 'Doe',
       email: 'john@example.com',
       lastLogin: new Date('2023-01-01')
     });
     
     // ✅ Composing multiple computed values
     const fullName = computed(() => 
       `${user.value.firstName} ${user.value.lastName}`
     );
     
     const lastLoginText = computed(() => {
       const now = new Date();
       const diff = now - user.value.lastLogin;
       const days = Math.floor(diff / (1000 * 60 * 60 * 24));
       return `Last seen ${days} day${days !== 1 ? 's' : ''} ago`;
     });
     
     return (
       <div>
         <h1>{fullName.value}</h1>
         <p>{lastLoginText.value}</p>
       </div>
     );
   }
   ```

3. **Complex data transformations**

   ```tsx
   function DataGrid({ data }) {
     const sortConfig = useSignal({ key: 'name', direction: 'asc' });
     
     // ✅ Using computed for complex data transformations
     const sortedData = computed(() => {
       return [...data].sort((a, b) => {
         if (a[sortConfig.value.key] < b[sortConfig.value.key]) {
           return sortConfig.value.direction === 'asc' ? -1 : 1;
         }
         if (a[sortConfig.value.key] > b[sortConfig.value.key]) {
           return sortConfig.value.direction === 'asc' ? 1 : -1;
         }
         return 0;
       });
     });
     
     // ...
   }
   ```

4. **Filtering and mapping signals**

   ```tsx
   function TodoList() {
     const todos = useSignal([
       { id: 1, text: 'Learn Signals', completed: true },
       { id: 2, text: 'Build app', completed: false },
       { id: 3, text: 'Deploy', completed: false }
     ]);
     const filter = useSignal('all');
     
     // ✅ Using computed for filtered lists
     const filteredTodos = computed(() => {
       switch (filter.value) {
         case 'completed':
           return todos.value.filter(todo => todo.completed);
         case 'active':
           return todos.value.filter(todo => !todo.completed);
         default:
           return todos.value;
       }
     });
     
     // ✅ Derived computed value
     const remainingCount = computed(() => 
       todos.value.filter(todo => !todo.completed).length
     );
     
     // ...
   }
   ```

5. **Combining multiple signals**

   ```tsx
   function Dashboard() {
     const sales = useSignal(1000);
     const expenses = useSignal(600);
     const taxRate = useSignal(0.2);
     
     // ✅ Combining multiple signals in computed
     const profit = computed(() => sales.value - expenses.value);
     const tax = computed(() => profit.value * taxRate.value);
     const netProfit = computed(() => profit.value - tax.value);
     
     return (
       <div>
         <div>Sales: ${sales.value}</div>
         <div>Expenses: ${expenses.value}</div>
         <div>Profit: ${profit.value}</div>
         <div>Tax ({taxRate.value * 100}%): ${tax.value}</div>
         <div>Net Profit: ${netProfit.value}</div>
       </div>
     );
   }
   ```

6. **Memoizing expensive calculations**

   ```tsx
   function DataVisualization({ dataset }) {
     const selectedMetric = useSignal('average');
     const timeRange = useSignal('week');
     
     // ✅ Memoizing expensive calculations with computed
     const processedData = computed(() => {
       // Expensive calculation based on dataset and signals
       return processDataset(dataset, {
         metric: selectedMetric.value,
         range: timeRange.value
       });
     });
     
     // The computed value will only be recalculated when inputs change
     return <Chart data={processedData.value} />;
   }
   ```

## Auto-fix

This rule provides auto-fix suggestions to:

1. Replace `useMemo` with `computed()`
2. Add the `computed` import if it's not already imported

## When Not To Use It

You might want to disable this rule if:

1. You're not using `@preact/signals-react` in your project
2. You have specific performance requirements that require manual control over memoization
3. You're working with non-reactive values that don't benefit from signals

## Related Rules

- `react-hooks/exhaustive-deps`: Ensures all dependencies are properly specified in hooks
- `no-mutation-in-render`: Prevents direct signal mutations during render
- `prefer-batch-updates`: Suggests batching multiple signal updates

## Performance Considerations

Using `computed()` for signal-derived values provides several performance benefits:

1. **Automatic Dependency Tracking**: No need to manually specify dependencies
2. **Lazy Evaluation**: Computations only run when their result is actually needed
3. **Efficient Updates**: Only re-computes when dependencies change
4. **Glitch-free**: Ensures consistent state by batching updates

## Best Practices

1. **Prefer `computed` for signal-derived values**: This makes the reactive nature of the value explicit
2. **Keep computations pure**: Computed values should be pure functions of their dependencies
3. **Avoid side effects**: Don't modify state inside computed getters
4. **Use meaningful names**: Name computed values based on what they represent, not how they're computed
5. **Compose computations**: You can use computed values as dependencies for other computed values

## Migration Guide

When migrating from `useMemo` to `computed()`:

1. Move the computation outside the component if it doesn't depend on component props/state
2. Remove the dependency array (computed tracks dependencies automatically)
3. Access the value using `.value` in your component
4. Update any dependencies to use `.value` when accessing signal values

Example migration:

```tsx
// Before
function Component({ multiplier }) {
  const count = signal(0);
  const result = useMemo(
    () => count.value * multiplier,
    [count.value, multiplier]
  );
  
  return <div>{result}</div>;
}

// After
function Component({ multiplier }) {
  const count = signal(0);
  // Note: If multiplier is a prop, you might still need useMemo
  // or consider making it a signal if it changes reactively
  const result = computed(() => count.value * multiplier);
  
  return <div>{result.value}</div>;
}
```
