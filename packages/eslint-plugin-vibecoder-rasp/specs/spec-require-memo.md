# Require Memo Rule Specification

Enforces the use of `React.memo` for function components that don't use context, helping to optimize performance by preventing unnecessary re-renders.

## Core Functionality

This rule identifies function components that would benefit from being wrapped in `React.memo` because they don't use context or other external state. It helps maintain optimal rendering performance in React applications.

## Handled Cases

### 1. Pure Function Components

- Detects function components that only use their props
- Identifies components that don't use hooks or context
- Handles both named and anonymous function components

### 2. Context Usage

- Detects components that use `useContext` or the Context API
- Identifies components that consume context providers
- Handles both direct and indirect context usage

### 3. Performance Optimization

- Suggests `React.memo` for components that would benefit from memoization
- Identifies components with expensive rendering logic
- Flags components that frequently re-render with the same props

## Error Messages

- `memoRecommended`: "Component '{{component}}' doesn't use context and could be wrapped in `React.memo` for better performance."
- `memoNotNeeded": "`React.memo` is not needed for component '{{component}}' because it uses context."
- `missingDisplayName": "Memoized components should have a`displayName` for better debugging."

## Auto-fix Suggestions

- Automatically wraps components in `React.memo`
- Adds appropriate `displayName` for memoized components
- Preserves existing props and type annotations
- Handles both named and default exports

## Benefits

1. **Improved Performance**: Reduces unnecessary re-renders
2. **Better Developer Experience**: Makes performance optimizations more discoverable
3. **Consistent Code Style**: Encourages consistent use of `React.memo`
4. **Type Safety**: Works with TypeScript to ensure type safety

## When to Disable

- For components that always receive new props
- When using a state management solution that handles optimizations
- For components that are rarely re-rendered

## Configuration

```json
{
  "require-memo": ["error", {
    "checkTypeAnnotations": true,
    "allowExportDefault": true,
    "ignoreComponents": [],
    "typescript": {
      "strictNullChecks": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `checkTypeAnnotations`: Check TypeScript type annotations (default: true)
- `allowExportDefault`: Allow default exports (default: true)
- `ignoreComponents`: Array of component names to ignore (default: [])
- `typescript.strictNullChecks`: Enforce strict null checks (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use `React.memo` for Presentational Components**: Especially those that render often
2. **Add `displayName`**: Always set a `displayName` for memoized components
3. **Profile First**: Use React DevTools to profile before and after adding `React.memo`
4. **Avoid Over-Memoization**: Don't memoize components that always receive new props
5. **Test Performance**: Always measure the actual performance impact

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve rendering performance
- Helps identify components that would benefit from optimization

## TypeScript Integration

- Validates component props and types
- Works with generic components
- Handles type inference for memoized components
- Integrates with React's built-in type utilities
