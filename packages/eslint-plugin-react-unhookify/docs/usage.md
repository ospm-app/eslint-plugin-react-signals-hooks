# ESLint Plugin React Unhookify - Usage Guide

## Overview

The `eslint-plugin-react-unhookify` plugin helps you remove unnecessary React memoization patterns to write cleaner, more maintainable code.

## Installation

```bash
npm install @ospm/eslint-plugin-react-unhookify --save-dev
# or
bun add @ospm/eslint-plugin-react-unhookify --dev
```

## Configuration

### Flat Config (ESLint 9+)

```js
import reactUnhookify from '@ospm/eslint-plugin-react-unhookify';

export default [
  reactUnhookify.configs.recommended,
  // or manually:
  {
    plugins: {
      'react-unhookify': reactUnhookify,
    },
    rules: {
      'react-unhookify/remove-use-memo': 'error',
      'react-unhookify/remove-use-callback': 'error',
      'react-unhookify/remove-memo': 'error',
    },
  },
];
```

### Legacy Config (ESLint 8)

```js
module.exports = {
  extends: ['plugin:react-unhookify/recommended'],
  // or manually:
  plugins: ['react-unhookify'],
  rules: {
    'react-unhookify/remove-use-memo': 'error',
    'react-unhookify/remove-use-callback': 'error',
    'react-unhookify/remove-memo': 'error',
  },
};
```

## Rules

### `remove-use-memo`

Removes `React.useMemo()` calls and inlines the computed value.

**Before:**
```tsx
const expensiveValue = React.useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const memoizedResult = useMemo(() => a + b, [a, b]);
```

**After:**
```tsx
const expensiveValue = computeExpensiveValue(a, b);
const memoizedResult = a + b;
```

**Edge Cases (will NOT be flagged):**
- `useMemo` calls containing other React hooks (for safety)
- Complex functions with multiple statements
- Incorrect `useMemo` signatures (missing dependencies)

### `remove-use-callback`

Removes `React.useCallback()` calls and inlines the function.

**Before:**
```tsx
const handleClick = React.useCallback(() => {
  doSomething();
}, [doSomething]);

const handleChange = useCallback((event) => {
  console.log(event.target.value);
}, []);
```

**After:**
```tsx
const handleClick = () => {
  doSomething();
};

const handleChange = (event) => {
  console.log(event.target.value);
};
```

### `remove-memo`

Removes `React.memo()` HOC calls and uses the component directly.

**Before:**
```tsx
const MyComponent = React.memo(() => {
  return <div>Hello</div>;
});

const MemoizedComponent = memo(({ name }) => {
  return <div>Hello {name}</div>;
});
```

**After:**
```tsx
const MyComponent = () => {
  return <div>Hello</div>;
};

const MemoizedComponent = ({ name }) => {
  return <div>Hello {name}</div>;
};
```

## Auto-fixing

All rules support auto-fixing. Use the `--fix` flag with ESLint:

```bash
npx eslint --fix .  # or: bun x eslint --fix .
```

## Options

### Severity Configuration

You can configure the severity level for each rule:

```js
{
  rules: {
    'react-unhookify/remove-use-memo': ['error', {
      severity: {
        removeUseMemo: 'warn' // 'error' | 'warn' | 'off'
      }
    }],
    'react-unhookify/remove-use-callback': ['error', {
      severity: {
        removeUseCallback: 'warn'
      }
    }],
    'react-unhookify/remove-memo': ['error', {
      severity: {
        removeMemo: 'warn'
      }
    }]
  }
}
```

### Performance Options

Configure performance tracking (useful for large codebases):

```js
{
  rules: {
    'react-unhookify/remove-use-memo': ['error', {
      performance: {
        maxNodes: 1000,        // Max nodes to process per file
        maxTime: 100,          // Max time in milliseconds
        enableMetrics: false, // Enable performance metrics
        logMetrics: false     // Log metrics to console
      }
    }]
  }
}
```

## Migration Strategy

### 1. Start with Warnings
```js
{
  rules: {
    'react-unhookify/remove-use-memo': 'warn',
    'react-unhookify/remove-use-callback': 'warn', 
    'react-unhookify/remove-memo': 'warn',
  }
}
```

### 2. Review Changes
Run ESLint with `--fix` and manually review the changes:

```bash
npx eslint --fix --max-warnings 0 .
```

### 3. Test Thoroughly
- Run your test suite
- Check component behavior
- Measure performance if needed

### 4. Enable Errors
Once confident, change to `'error'` severity.

## Safety Considerations

The plugin includes safety checks:

- **Hook Detection**: Won't remove `useMemo` if the computed value contains other React hooks
- **Complex Functions**: Won't inline functions with multiple statements  
- **Signature Validation**: Only processes valid hook/memo signatures
- **Type Safety**: Maintains TypeScript types and interfaces

## When NOT to Use This Plugin

Do not use this plugin if:

- You have measured performance issues that require memoization
- You're working on performance-critical components
- Your team has established memoization patterns
- You're building a library where memoization is part of the API

## Best Practices

### Before Removing Memoization

1. **Measure Performance**: Use React DevTools Profiler to identify actual bottlenecks
2. **Check Dependencies**: Ensure dependencies arrays are correct
3. **Test Components**: Verify components work correctly after changes

### After Removing Memoization

1. **Run Tests**: Ensure all tests pass
2. **Check Performance**: Verify no performance regression
3. **Code Review**: Have team members review the changes

## Examples

### Safe to Remove
```tsx
// ✅ Simple computation
const doubled = React.useMemo(() => value * 2, [value]);

// ✅ Simple function
const handleClick = React.useCallback(() => {
  console.log('clicked');
}, []);
```

### Keep Memoization
```tsx
// ❌ Contains hooks - keep for safety
const valueWithHook = React.useMemo(() => {
  const [state, setState] = useState(0);
  return state * 2;
}, []);

// ❌ Complex computation - measure first
const expensiveComputation = React.useMemo(() => {
  // Complex algorithm with loops/recursion
  return processData(largeDataSet);
}, [largeDataSet]);

// ❌ Library component - part of API
export default React.memo(LibraryComponent);
```

## Troubleshooting

### Common Issues

**Issue**: Plugin doesn't detect `useMemo` calls
**Solution**: Ensure the calls have the correct signature with dependencies array

**Issue**: Auto-fix breaks code
**Solution**: Check if the computed value contains React hooks or complex logic

**Issue**: Performance regression after removing memoization
**Solution**: Profile your app and add back memoization only where needed

### Getting Help

- Check the [GitHub Issues](https://github.com/ospm-app/eslint-plugin-react-signals-hooks/issues)
- Review the [React Performance Documentation](https://react.dev/learn/render-and-commit-escape-hatches)
- Use React DevTools Profiler to measure performance impact
