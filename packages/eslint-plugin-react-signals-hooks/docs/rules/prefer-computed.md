# Prefer Computed Rule

This rule encourages using `computed()` from `@preact/signals-react` over `useMemo` when working with signals to derive values. This provides better performance and automatic dependency tracking for signal-based computations.

## Rule Details

This rule identifies instances where `useMemo` is used with signal dependencies and suggests replacing them with `computed()` for better performance and maintainability. The `computed()` function provides automatic dependency tracking and better optimization for signal-based computations.

## Error Messages

This rule can report the following messages:

- `preferComputedWithSignal`: Suggests using `computed()` when a single signal is used
- `preferComputedWithSignals`: Suggests using `computed()` when multiple signals are used
- `suggestComputed`: Quick fix suggestion to convert to `computed()`
- `addComputedImport`: Suggestion to add the `computed` import
- `suggestAddComputedImport`: Suggestion to add the `computed` import with fix

## Performance Considerations

- `computed()` provides better performance than `useMemo` for signal-based computations
- Computed values are only recalculated when their dependencies change
- The rule includes performance optimizations to handle large codebases efficiently
- For complex computations, consider using `computed` with `effect` for side effects

## Configuration Options

This rule accepts an options object with the following properties:

```typescript
{
  "rules": {
    "react-signals-hooks/prefer-computed": [
      "warn",
      {
        "performance": {               // Performance tuning options
          "maxTime": 100,             // Max time in ms to spend analyzing a file
          "maxMemory": 100,           // Max memory in MB to use
          "maxNodes": 2000,           // Max number of nodes to process
          "maxOperations": {          // Operation-specific limits
            "signalDependencyCheck": 500, // Max signal dependency checks
            "computedConversion": 200     // Max computed conversions to process
          },
          "enableMetrics": false,     // Enable performance metrics collection
          "logMetrics": false         // Log metrics to console
        }
      }
    ]
  }
}
```

### Default Configuration

```typescript
{
  performance: {
    maxTime: 100,
    maxMemory: 100,
    maxNodes: 2000,
    maxOperations: {
      signalDependencyCheck: 500,
      computedConversion: 200
    },
    enableMetrics: false,
    logMetrics: false
  }
}
```

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

## When Not To Use It

You might want to disable this rule in the following cases:

1. **Working with non-reactive values** that don't depend on signals
2. **Need to control execution timing** precisely with `useEffect`
3. **Working with non-signal dependencies** that require manual dependency tracking
4. **Using React's concurrent features** that depend on `useMemo`'s scheduling
5. **Legacy codebases** where migrating to `computed()` would be too disruptive

## Edge Cases and Limitations

1. **Mixed Dependencies**

   ```tsx
   // The rule won't autofix when both signals and non-signals are used
   const value = useMemo(() => {
     return baseSignal.value * props.multiplier;
   }, [baseSignal.value, props.multiplier]);
   ```

2. **Complex Dependencies**

   ```tsx
   // Complex dependency arrays might need manual adjustment
   const result = useMemo(() => {
     return computeExpensiveValue(
       baseSignal.value,
       anotherSignal.value,
       props.value
     );
   }, [baseSignal.value, anotherSignal.value, props.value]);
   ```

3. **Non-Signal Dependencies**

   ```tsx
   // The rule ignores non-signal dependencies
   const result = useMemo(() => {
     return baseSignal.value * multiplier; // 'multiplier' is a prop or state
   }, [baseSignal.value, multiplier]);
   ```

## Troubleshooting

### False Positives

If the rule reports issues incorrectly:

1. Use an ESLint disable comment:

   ```tsx
   // eslint-disable-next-line react-signals-hooks/prefer-computed
   const value = useMemo(() => {
     return baseSignal.value * 2;
   }, [baseSignal.value]);
   ```

2. Disable the rule for specific files:

   ```json
   {
     "overrides": [
       {
         "files": ["*.test.tsx", "*.stories.tsx"],
         "rules": {
           "react-signals-hooks/prefer-computed": "off"
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
       "react-signals-hooks/prefer-computed": [
         "warn",
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
       "react-signals-hooks/prefer-computed": [
         "warn",
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
   function UserProfile({ user }: { user: Signal<User | null> }) {
     const fullName = computed(() => {
       // TypeScript knows user is not null here
       if (!user.value) return 'Guest';
       return `${user.value.firstName} ${user.value.lastName}`;
     });
     
     return <div>{fullName}</div>;
   }
   ```

2. **Generic Types**

   ```tsx
   function List<T>({ items, renderItem }: { 
     items: Signal<Array<T>>;
     renderItem: (item: T) => React.ReactNode;
   }) {
     const itemCount = computed(() => items.value.length);
     
     return (
       <div>
         <p>Total items: {itemCount}</p>
         <For each={items}>
           {(item) => renderItem(item)}
         </For>
       </div>
     );
   }
   ```

3. **Type Assertions**

   ```tsx
   const data = useSignal<Data | null>(null);
   
   // Type assertion in computed
   const processed = computed(() => {
     return (data as Signal<Data>).value.items.map(processItem);
   });
   ```

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
