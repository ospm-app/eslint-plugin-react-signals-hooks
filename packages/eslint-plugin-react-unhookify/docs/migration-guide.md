# Migration Guide

This guide helps you migrate your React codebase to use `eslint-plugin-react-unhookify` effectively.

## Before You Start

### 1. Assess Your Current State

Run the plugin in "warn" mode to see what would be changed:

```js
// eslint.config.js
import reactUnhookify from '@ospm/eslint-plugin-react-unhookify';

export default [
  reactUnhookify.configs.recommended,
  {
    rules: {
      'react-unhookify/remove-use-memo': 'warn',
      'react-unhookify/remove-use-callback': 'warn',
      'react-unhookify/remove-memo': 'warn',
    }
  }
];
```

### 2. Create a Backup

```bash
# Create a git branch
git checkout -b remove-unnecessary-memoization

# Or create a backup
cp -r src src.backup
```

### 3. Measure Baseline Performance

Use React DevTools Profiler to measure current performance:

1. Open React DevTools
2. Go to Profiler tab
3. Record performance while using your app
4. Note any performance issues

## Migration Strategy

### Phase 1: Audit and Plan

Run the plugin to identify all potential changes:

```bash
# Run in dry-run mode
npx eslint --max-warnings 0 .

# Or with bun
bun x eslint --max-warnings 0 .
```

Review the output and categorize changes:

- **Safe to remove**: Simple computations, basic functions
- **Needs review**: Complex logic, performance-critical components
- **Keep**: Contains hooks, expensive operations

### Phase 2: Gradual Migration

#### Step 1: Start with Simple Components

Begin with small, simple components:

```bash
# Target specific directories
npx eslint src/components/simple --fix
```

#### Step 2: Test Each Change

After each batch of changes:

1. Run your test suite
2. Check component functionality
3. Measure performance impact

```bash
# Run tests
npm test

# Check performance
npm run build
```

#### Step 3: Move to Complex Components

Gradually move to more complex components:

```bash
# Target complex components
npx eslint src/components/complex --fix
```

### Phase 3: Performance Validation

After migration, validate performance:

1. **Run React DevTools Profiler** again
2. **Compare with baseline** measurements
3. **Identify regressions**

If you find performance issues:

```bash
# Add back memoization where needed
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    // Keep expensive calculations
  }, [data]);
  
  return <div>{processedData}</div>;
});
```

## Common Migration Patterns

### Pattern 1: Simple useMemo Removal

**Before:**

```tsx
const doubled = useMemo(() => value * 2, [value]);
```

**After:**

```tsx
const doubled = value * 2;
```

### Pattern 2: useCallback Removal

**Before:**

```tsx
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
```

**After:**

```tsx
const handleClick = () => {
  console.log('clicked');
};
```

### Pattern 3: memo HOC Removal

**Before:**

```tsx
const MyComponent = React.memo(() => {
  return <div>Hello</div>;
});
```

**After:**

```tsx
const MyComponent = () => {
  return <div>Hello</div>;
};
```

## Handling Edge Cases

### Case 1: Functions with Hooks

**Keep memoization when functions contain hooks:**

```tsx
// ❌ Don't remove - contains useState
const valueWithHook = useMemo(() => {
  const [state, setState] = useState(0);
  return state * 2;
}, []);
```

### Case 2: Complex Computations

**Measure before removing expensive computations:**

```tsx
// ⚠️ Measure first, then decide
const expensiveResult = useMemo(() => {
  return complexAlgorithm(largeDataSet);
}, [largeDataSet]);
```

### Case 3: Library Components

**Keep memoization for exported library components:**

```tsx
// ✅ Keep - part of public API
export default React.memo(LibraryComponent);
```

## Team Migration

### 1. Team Training

Educate your team about:

- When memoization is actually needed
- How to measure performance impact
- The plugin's safety features

### 2. Code Review Guidelines

Update your code review checklist:

- [ ] Is memoization actually needed?
- [ ] Have we measured the performance impact?
- [ ] Does the function contain other hooks?
- [ ] Is this a performance-critical component?

### 3. Gradual Rollout

Roll out changes gradually:

1. **Start with new features** - Apply rules to new code
2. **Gradual refactoring** - Apply to existing code during maintenance
3. **Team consensus** - Get team buy-in before large-scale changes

## Troubleshooting

### Issue: Performance Regression

**Symptoms:**

- Slower rendering after removing memoization
- Increased re-renders

**Solutions:**

1. Profile with React DevTools
2. Add back memoization where needed
3. Consider memoizing only the expensive parts

### Issue: Test Failures

**Symptoms:**

- Tests fail after auto-fix
- Component behavior changes

**Solutions:**

1. Check if tests were relying on memoization behavior
2. Update tests to reflect new component behavior
3. Add back memoization if it was required for correctness

### Issue: Build Errors

**Symptoms:**

- TypeScript errors after changes
- Import/export issues

**Solutions:**

1. Check that component exports are correct
2. Verify TypeScript types are preserved
3. Update type definitions if needed

## Best Practices

### 1. Measure, Don't Guess

Always measure performance impact before and after changes:

```tsx
// Before removing memoization
console.time('component-render');
// ... component renders
console.timeEnd('component-render');
```

### 2. Start Conservative

Begin with warn mode and gradually increase strictness:

```js
// Phase 1: Warnings only
'react-unhookify/remove-use-memo': 'warn'

// Phase 2: Errors for simple cases
'react-unhookify/remove-use-memo': ['error', {
  // Configure exceptions for complex cases
}]

// Phase 3: Full enforcement
'react-unhookify/remove-use-memo': 'error'
```

### 3. Document Decisions

Keep track of why certain memoization was kept:

```tsx
// Keep memoization - this component renders 1000+ items
const LargeList = React.memo(({ items }) => {
  return (
    <div>
      {items.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
});
```

## Rollback Plan

If migration causes issues:

1. **Immediate rollback:**

   ```bash
   git checkout main
   git checkout -b rollback-memoization-removal
   ```

2. **Selective rollback:**

   ```bash
   # Add back memoization for specific files
   git checkout src/components/problematic-component.tsx
   ```

3. **Gradual retry:**
   - Fix the issues
   - Retry migration in smaller batches
   - Monitor performance more closely

## Success Metrics

Track these metrics to ensure successful migration:

- **Performance**: No significant regression in render times
- **Bundle size**: Reduced bundle size from less memoization code
- **Code complexity**: Reduced cognitive complexity
- **Developer experience**: Faster development, fewer bugs
- **Test stability**: Tests remain reliable and meaningful

## Resources

- [React Performance Documentation](https://react.dev/learn/render-and-commit)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler)
- [Plugin Documentation](./usage.md)
- [Rule Reference](./rules.md)
