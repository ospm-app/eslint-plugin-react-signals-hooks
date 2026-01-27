# eslint-plugin-react-unhookify

ESLint plugin to remove React hooks (useMemo, useCallback) and memo HOC for cleaner React code.

> **Note**: With React Compiler 1.0 now stable, automatic memoization is handled at build time. This plugin is most useful for:
>
> - Projects not yet using React Compiler
> - Codebases where manual memoization was over-used
> - Migrating legacy code before adopting React Compiler

## Philosophy

This plugin follows the philosophy that:

1. **Memoization should be intentional**: Only use memoization when you have measured performance problems
2. **Code simplicity matters**: Unnecessary memoization adds complexity without benefits  
3. **React is fast**: Modern React is already optimized, and premature optimization can hurt more than help
4. **Developer experience**: Cleaner code is easier to read, maintain, and debug

## React Compiler 1.0 Context

React Compiler 1.0 (released October 2025) provides **automatic memoization at build time**, making manual `useMemo`, `useCallback`, and `React.memo` unnecessary in most cases.

### Key Benefits of React Compiler

- **Automatic optimization**: Analyzes component data flow and memoizes automatically
- **Better than manual**: Can memoize in cases where hooks cannot be used (e.g., after early returns)
- **Production proven**: Battle-tested at Meta with 12% faster loads and 2.5× faster interactions
- **Zero code changes**: Works without requiring code rewrites

### When to Use This Plugin vs React Compiler

| Scenario | Recommended Approach |
|----------|----------------------|
| **New projects** | Use React Compiler 1.0 |
| **Existing projects** | Adopt React Compiler incrementally, use this plugin to clean up over-memoization |
| **Legacy codebases** | Use this plugin to remove unnecessary memoization before compiler adoption |
| **Performance-critical code** | Use React Compiler + manual memoization only as escape hatches |

### React Compiler Recommendations

> **For new code**: Rely on the compiler for memoization and use `useMemo`/`useCallback` only when you need precise control.
>
> **For existing code**: Either leave existing memoization in place (removing it can change compilation output) or carefully test before removing.

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

### Option 1: React Compiler 1.0 (Recommended for new projects)

```bash
npm install --save-dev --save-exact babel-plugin-react-compiler@latest
npm install --save-dev eslint-plugin-react-hooks@latest
```

### Option 2: This Plugin (For legacy cleanup or pre-compiler migration)

```bash
npm install @ospm/eslint-plugin-react-unhookify --save-dev
```

### Option 3: Combined Approach

Use React Compiler for automatic optimization and this plugin to clean up legacy memoization:

```bash
npm install --save-dev --save-exact babel-plugin-react-compiler@latest
npm install --save-dev eslint-plugin-react-hooks@latest
npm install @ospm/eslint-plugin-react-unhookify --save-dev
```

## Comparison: React Compiler vs Manual Memoization

| Feature | React Compiler 1.0 | Manual Memoization | This Plugin |
|---------|-------------------|-------------------|------------|
| **Automatic optimization** | ✅ Build-time analysis | ❌ Manual implementation | ❌ Manual cleanup |
| **Performance** | 12% faster loads, 2.5× interactions | Varies by implementation | Removes unnecessary overhead |
| **Code simplicity** | ✅ No manual hooks needed | ❌ Adds boilerplate | ✅ Cleaner code |
| **Control** | Limited (escape hatches available) | ✅ Full control | ✅ Selective removal |
| **Learning curve** | Low (install and enable) | High (need to understand patterns) | Low (auto-fix available) |
| **Best for** | Most applications | Performance-critical cases | Legacy code cleanup |

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

- **You're using React Compiler 1.0**: The compiler handles memoization automatically
- **You have measured performance issues**: Keep memoization that solves real performance problems
- **You're working on performance-critical components**: Manual memoization may still be necessary
- **Your team has established memoization patterns**: Consider team conventions and code review practices
- **You're building a library**: Memoization might be part of your public API
- **You need precise control**: Use manual memoization as escape hatches with React Compiler

## React Compiler Migration Strategy

If you're planning to adopt React Compiler 1.0:

### Phase 1: Preparation

1. **Audit current memoization**: Use this plugin to identify unnecessary `useMemo`, `useCallback`, and `React.memo`
2. **Clean up over-memoization**: Remove memoization that doesn't provide value
3. **Test thoroughly**: Ensure components work correctly after changes

### Phase 2: Compiler Adoption

1. **Install React Compiler**: `npm install --save-dev --save-exact babel-plugin-react-compiler@latest`
2. **Enable gradually**: Start with non-critical components
3. **Monitor performance**: Measure improvements and regressions

### Phase 3: Optimization

1. **Use manual memoization sparingly**: Only as escape hatches for precise control
2. **Leverage compiler diagnostics**: Use eslint-plugin-react-hooks@latest for compiler-powered linting
3. **Profile and measure**: Verify the compiler is providing expected benefits

### Real-world Results

- **Meta Quest Store**: 12% faster initial loads, 2.5× faster interactions
- **Sanity Studio**: 20-30% reduction in render time and latency
- **Wakelet**: 10% LCP improvement, 15% INP improvement

## Traditional Migration Strategy (Without React Compiler)

If you're not adopting React Compiler:

1. **Start with warnings**: Use `'warn'` severity instead of `'error'` initially
2. **Review changes**: Manually review auto-fixes before applying
3. **Test thoroughly**: Ensure components still work after memoization removal
4. **Measure performance**: Verify that removal doesn't impact performance

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT
