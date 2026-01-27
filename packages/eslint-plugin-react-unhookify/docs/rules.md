# Rules Documentation

## `remove-use-memo`

**Description**: Removes `React.useMemo()` calls and inlines the computed value to simplify code by eliminating unnecessary memoization.

### When it triggers

The rule triggers when it finds a `React.useMemo()` or `useMemo()` call that:

1. Has the correct signature: `useMemo(factoryFn, dependencies)`
2. The factory function is a simple arrow or regular function
3. The factory function returns a single expression or has one return statement
4. The computed value doesn't contain other React hooks

### Examples

#### ❌ Incorrect

```tsx
// Simple computation
const doubled = React.useMemo(() => value * 2, [value]);

// Concise arrow function
const memoized = useMemo(() => computeExpensiveValue(a, b), [a, b]);

// Function expression
const result = React.useMemo(function() {
  return processData(data);
}, [data]);

// Empty dependencies
const constant = React.useMemo(() => 42, []);
```

#### ✅ Correct

```tsx
// Direct computation
const doubled = value * 2;

// Direct function call
const memoized = computeExpensiveValue(a, b);

// Direct function
const result = processData(data);

// Direct constant
const constant = 42;
```

#### Edge Cases (will NOT be flagged)

```tsx
// Contains hooks - kept for safety
const unsafe = React.useMemo(() => {
  const [state, setState] = useState(0);
  return state * 2;
}, []);

// Multiple statements - kept for safety
const complex = React.useMemo(() => {
  const temp = calculateSomething();
  const result = processTemp(temp);
  return result;
}, [data]);

// Wrong signature - not processed
const invalid = React.useMemo(() => computeValue());
```

### Options

```js
{
  'react-unhookify/remove-use-memo': ['error', {
    severity: {
      removeUseMemo: 'warn' // 'error' | 'warn' | 'off'
    },
    performance: {
      maxNodes: 1000,
      maxTime: 100,
      enableMetrics: false,
      logMetrics: false
    }
  }]
}
```

---

## `remove-use-callback`

**Description**: Removes `React.useCallback()` calls and inlines the function to simplify code by eliminating unnecessary memoization.

### When it triggers

The rule triggers when it finds a `React.useCallback()` or `useCallback()` call that:

1. Has the correct signature: `useCallback(fn, dependencies)`
2. The callback is a function (arrow or regular)
3. Has a dependencies array

### Examples

#### ❌ Incorrect

```tsx
// Simple arrow function
const handleClick = React.useCallback(() => {
  doSomething();
}, [doSomething]);

// With parameters
const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
}, []);

// Function expression
const handleSubmit = React.useCallback(function() {
  submitForm();
}, [submitForm]);

// Empty dependencies
const constantCallback = React.useCallback(() => {
  return 'constant';
}, []);
```

#### ✅ Correct

```tsx
// Direct arrow function
const handleClick = () => {
  doSomething();
};

// With parameters
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
};

// Function expression
const handleSubmit = function() {
  submitForm();
};

// Direct function
const constantCallback = () => {
  return 'constant';
};
```

### Options

```js
{
  'react-unhookify/remove-use-callback': ['error', {
    severity: {
      removeUseCallback: 'warn' // 'error' | 'warn' | 'off'
    },
    performance: {
      maxNodes: 1000,
      maxTime: 100,
      enableMetrics: false,
      logMetrics: false
    }
  }]
}
```

---

## `remove-memo`

**Description**: Removes `React.memo()` HOC calls and uses the component directly to simplify code by eliminating unnecessary memoization.

### When it triggers

The rule triggers when it finds a `React.memo()` or `memo()` call that:

1. Has at least one argument (the component)
2. The argument is a function component

### Examples

#### ❌ Incorrect

```tsx
// Arrow function component
const MemoizedComponent = React.memo(() => {
  return <div>Hello World</div>;
});

// Function expression component
const MemoizedComponent2 = React.memo(function() {
  return <div>Hello Again</div>;
});

// With props
interface Props {
  name: string;
}

const MemoizedComponent3 = React.memo<Props>(({ name }) => {
  return <div>Hello {name}</div>;
});

// Direct memo import
const MemoizedComponent4 = memo(() => {
  return <div>Direct Memo</div>;
});

// JSX in arrow function
const MemoizedComponent5 = React.memo(() => <div>JSX</div>);
```

#### ✅ Correct

```tsx
// Arrow function component
const MemoizedComponent = () => {
  return <div>Hello World</div>;
};

// Function expression component
const MemoizedComponent2 = function() {
  return <div>Hello Again</div>;
};

// With props
interface Props {
  name: string;
}

const MemoizedComponent3 = ({ name }: Props) => {
  return <div>Hello {name}</div>;
};

// Direct function
const MemoizedComponent4 = () => {
  return <div>Direct Memo</div>;
};

// JSX in arrow function
const MemoizedComponent5 = () => <div>JSX</div>;
```

#### Edge Cases (will NOT be flagged)

```tsx
// No arguments - not processed
const invalid = React.memo();

// Not a function - not processed
const invalid2 = React.memo("string");

// Class component - not processed
class Component extends React.Component {}
const invalid3 = React.memo(Component);
```

### Options

```js
{
  'react-unhookify/remove-memo': ['error', {
    severity: {
      removeMemo: 'warn' // 'error' | 'warn' | 'off'
    },
    performance: {
      maxNodes: 1000,
      maxTime: 100,
      enableMetrics: false,
      logMetrics: false
    }
  }]
}
```

---

## Performance Considerations

All rules include performance tracking to handle large codebases efficiently:

- **maxNodes**: Maximum number of AST nodes to process per file
- **maxTime**: Maximum time in milliseconds to spend per file
- **enableMetrics**: Enable detailed performance metrics
- **logMetrics**: Log performance metrics to console

### Example Performance Configuration

```js
{
  rules: {
    'react-unhookify/remove-use-memo': ['error', {
      performance: {
        maxNodes: 500,        // Process max 500 nodes per file
        maxTime: 50,          // Spend max 50ms per file
        enableMetrics: true,  // Enable metrics collection
        logMetrics: true      // Log metrics to console
      }
    }]
  }
}
```

## Migration Strategy

### Phase 1: Audit

```js
{
  rules: {
    'react-unhookify/remove-use-memo': 'warn',
    'react-unhookify/remove-use-callback': 'warn',
    'react-unhookify/remove-memo': 'warn',
  }
}
```

### Phase 2: Auto-fix

```bash
npx eslint --fix --max-warnings 0 .
```

### Phase 3: Test & Measure

- Run your test suite
- Use React DevTools Profiler
- Measure performance impact

### Phase 4: Enforce

```js
{
  rules: {
    'react-unhookify/remove-use-memo': 'error',
    'react-unhookify/remove-use-callback': 'error',
    'react-unhookify/remove-memo': 'error',
  }
}
```

## Safety Features

The rules include several safety checks to prevent breaking changes:

1. **Hook Detection**: Won't process values containing React hooks
2. **Complexity Analysis**: Won't inline complex functions
3. **Signature Validation**: Only processes valid patterns
4. **Type Preservation**: Maintains TypeScript types
5. **Performance Limits**: Prevents infinite loops in complex files
