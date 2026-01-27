# eslint-plugin-react-unhookify

ESLint plugin to remove React hooks (useMemo, useCallback) and memo HOC for cleaner React code.

## Philosophy

This plugin follows the philosophy that:

1. **Memoization should be intentional**: Only use memoization when you have measured performance problems
2. **Code simplicity matters**: Unnecessary memoization adds complexity without benefits
3. **React is fast**: Modern React is already optimized, and premature optimization can hurt more than help
4. **Developer experience**: Cleaner code is easier to read, maintain, and debug

## Rules

### `remove-use-memo`

Removes `React.useMemo` calls and inlines the computed value to simplify code by eliminating unnecessary memoization.

**❌ Incorrect**

```tsx
const expensiveValue = React.useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedResult = useMemo(() => a + b, [a, b]);
```

**✅ Correct**

```tsx
const expensiveValue = computeExpensiveValue(a, b);
const memoizedResult = a + b;
```

**Edge Cases (will NOT be flagged):**

- `useMemo` calls containing other React hooks (for safety)
- Complex functions with multiple statements
- Incorrect `useMemo` signatures

### `remove-use-callback`

Removes `React.useCallback` calls and inlines the function to simplify code by eliminating unnecessary memoization.

**❌ Incorrect**

```tsx
const handleClick = React.useCallback(() => {
  doSomething();
}, [doSomething]);

const handleChange = useCallback((event) => {
  console.log(event.target.value);
}, []);
```

**✅ Correct**

```tsx
const handleClick = () => {
  doSomething();
};

const handleChange = (event) => {
  console.log(event.target.value);
};
```

### `remove-memo`

Removes `React.memo` HOC calls and uses the component directly to simplify code by eliminating unnecessary memoization.

**❌ Incorrect**

```tsx
const MyComponent = React.memo(() => {
  return <div>Hello</div>;
});

const MemoizedComponent = memo(({ name }) => {
  return <div>Hello {name}</div>;
});
```

**✅ Correct**

```tsx
const MyComponent = () => {
  return <div>Hello</div>;
};

const MemoizedComponent = ({ name }) => {
  return <div>Hello {name}</div>;
};
```

## Installation

```bash
npm install @ospm/eslint-plugin-react-unhookify --save-dev
```

## Usage

### Flat config (ESLint 9+)

```js
import reactUnhookify from '@ospm/eslint-plugin-react-unhookify';

export default [
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

### Legacy config (ESLint 8)

```js
module.exports = {
  plugins: ['react-unhookify'],
  rules: {
    'react-unhookify/remove-use-memo': 'error',
    'react-unhookify/remove-use-callback': 'error',
    'react-unhookify/remove-memo': 'error',
  },
};
```

## Recommended Configuration

This plugin exports a recommended configuration that enables all rules.

### Flat config

```js
import reactUnhookify from '@ospm/eslint-plugin-react-unhookify';

export default [
  reactUnhookify.configs.recommended,
];
```

### Legacy config

```js
module.exports = {
  extends: ['plugin:react-unhookify/recommended'],
};
```

## Options

All rules support the following options:

- `severity`: Configure severity level for specific messages
- `performance`: Configure performance tracking options

```js
{
  rules: {
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
}
```

## Auto-fixing

All rules support auto-fixing. The plugin will:

1. **For `useMemo`**: Extract the computed value and inline it
2. **For `useCallback`**: Remove the wrapper and inline the function
3. **For `memo`**: Remove the HOC wrapper and use the component directly

### Example Auto-fix

**Before:**

```tsx
const value = React.useMemo(() => calculateSomething(a, b), [a, b]);
const fn = useCallback(() => doSomething(), []);
const Component = React.memo(() => <div>Hello</div>);
```

**After auto-fix:**

```tsx
const value = calculateSomething(a, b);
const fn = () => doSomething();
const Component = () => <div>Hello</div>;
```

## Safety Considerations

The plugin includes safety checks to avoid breaking changes:

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

## Migration Strategy

1. **Start with warnings**: Use `'warn'` severity instead of `'error'` initially
2. **Review changes**: Manually review auto-fixes before applying
3. **Test thoroughly**: Ensure components still work after memoization removal
4. **Measure performance**: Verify that removal doesn't impact performance

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT
