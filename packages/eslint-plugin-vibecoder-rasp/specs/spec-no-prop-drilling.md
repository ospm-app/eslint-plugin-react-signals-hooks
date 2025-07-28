# No Prop Drilling Rule Specification

Prevents prop drilling beyond a configurable depth, encouraging better state management patterns in React applications.

## Core Functionality

This rule detects when props are passed through multiple components without being used, which is a code smell known as "prop drilling." It helps maintain a clean component hierarchy by encouraging better state management practices.

## Handled Cases

### 1. Deep Prop Drilling

- Detects props passed through multiple components without being used
- Flags components that only pass props down without using them

### 2. Shallow Prop Drilling

- Allows props to be passed through a configurable number of levels
- Configurable depth threshold (default: 3)

### 3. Context and Redux Usage

- Recognizes when context or Redux should be used instead of prop drilling
- Suggests appropriate state management solutions

## Error Messages

- `propDrillingDetected`: "Prop drilling detected. '{{propName}}' is passed through {{depth}} components without being used. Consider using Context or state management."
- `maxDrillingDepthExceeded`: "Maximum prop drilling depth ({{maxDepth}}) exceeded for prop '{{propName}}'"

## Auto-fix Suggestions

- Converts deep props to context when possible
- Suggests component restructuring
- Cannot automatically fix all cases due to architectural implications

## Benefits

1. **Improved Maintainability**: Reduces the "tunnel vision" effect in component hierarchies
2. **Better Performance**: Minimizes unnecessary re-renders caused by prop changes
3. **Cleaner Code**: Encourages better component composition
4. **Easier Refactoring**: Components become more independent and reusable

## When to Disable

- In small applications where prop drilling is not yet an issue
- When working with third-party components that require prop passing
- During migrations to better state management solutions

## Configuration

```json
{
  "no-prop-drilling": ["error", {
    "maxDepth": 3,
    "ignore": ["children", "className", "style"],
    "include": ["^[A-Z]"],
    "exclude": ["^Test", "\.test\."]
  }]
}
```

### Options

- `maxDepth`: Maximum allowed depth for prop drilling (default: 3)
- `ignore`: Array of prop names to always ignore (e.g., "children", "className")
- `include`: Array of regex patterns for prop names to check (default: all)
- `exclude`: Array of regex patterns for files to exclude from checking

## Best Practices

1. **Use Context for Global State**: When state needs to be accessed by many components
2. **Component Composition**: Break down components to minimize prop depth
3. **Custom Hooks**: Extract logic into reusable hooks
4. **State Management Libraries**: Consider Redux, MobX, or similar for complex state

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by reducing unnecessary re-renders
- Helps identify performance bottlenecks in component hierarchies

## TypeScript Integration

- Fully compatible with TypeScript
- Preserves type information when suggesting context migrations
- Works with generic components and type parameters
