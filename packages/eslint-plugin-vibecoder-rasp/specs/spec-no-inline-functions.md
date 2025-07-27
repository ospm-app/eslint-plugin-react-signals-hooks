# No Inline Functions Rule Specification

Prevents the definition of inline functions in JSX props, which can cause unnecessary re-renders and impact performance in React applications.

## Core Functionality

This rule identifies and prevents the creation of new function instances within JSX props, which can lead to unnecessary re-renders of child components. It encourages the use of memoized callbacks and proper dependency management.

## Handled Cases

### 1. Inline Arrow Functions

- Detects arrow functions defined directly in JSX props
- Identifies both single-line and multi-line arrow functions
- Handles implicit and explicit returns

### 2. Function Bindings

- Catches `.bind()` calls in JSX
- Identifies `Function.prototype.bind` usage
- Flags `::` function bind syntax

### 3. Function Constructors

- Detects `new Function()` usage in JSX
- Identifies `Function` constructor calls
- Flags dynamic function creation

## Error Messages

- `noInlineFunction`: "Avoid inline functions in JSX props. Move the function definition outside the component or wrap it in useCallback."
- `noFunctionBind`: "Avoid using .bind() in JSX. Use arrow functions or class properties instead."
- `noFunctionConstructor": "Avoid creating functions dynamically in JSX. Define functions outside the render method."

## Auto-fix Suggestions

- Extracts inline functions to class properties or module-level functions
- Converts `.bind()` calls to arrow functions
- Wraps functions in `useCallback` with appropriate dependencies
- Preserves function names and comments

## Benefits

1. **Improved Performance**: Reduces unnecessary re-renders of child components
2. **Better Memory Usage**: Prevents creating new function instances on every render
3. **Consistent Code Style**: Encourages a consistent approach to event handlers
4. **Easier Testing**: Makes it easier to test event handlers in isolation

## When to Disable

- For simple components where performance is not a concern
- When using a library that requires inline functions
- During prototyping or quick experiments

## Configuration

```json
{
  "no-inline-functions": ["error", {
    "allowArrowFunctions": false,
    "allowBind": false,
    "allowFunctions": false,
    "allowObject": true,
    "allowPrototypeMethods": false,
    "ignoreRefs": false,
    "typescript": {
      "allowTypedFunctionExpressions": false
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowArrowFunctions`: Allow arrow functions (default: false)
- `allowBind`: Allow .bind() calls (default: false)
- `allowFunctions`: Allow function expressions (default: false)
- `allowObject`: Allow functions in object literals (default: true)
- `allowPrototypeMethods`: Allow prototype methods (default: false)
- `ignoreRefs`: Skip checking ref callbacks (default: false)
- `typescript.allowTypedFunctionExpressions`: Allow typed function expressions (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use useCallback**: Memoize callbacks with useCallback
2. **Extract Handlers**: Define event handlers as class properties or module-level functions
3. **Pass Dependencies**: Include all dependencies in the dependency array
4. **Name Functions**: Use descriptive names for better debugging
5. **Consider useMemo**: For expensive calculations in render

## Performance Impact

- Reduces garbage collection pressure
- Minimizes unnecessary re-renders
- Improves overall application performance
- Has minimal runtime overhead during linting

## TypeScript Integration

- Validates function types in TypeScript
- Handles generic components and type parameters
- Works with React's built-in type utilities
- Supports type-only imports and exports
