# Max Renders Rule Specification

Warns about components that re-render too frequently, helping to identify performance bottlenecks in React applications by analyzing rendering patterns.

## Core Functionality

This rule monitors component re-renders and warns when a component exceeds a configurable threshold of re-renders, which can indicate potential performance issues or unnecessary re-renders.

## Handled Cases

### 1. Render Counting

- Tracks component render counts
- Identifies components that re-render too frequently
- Handles both function and class components

### 2. Context Analysis

- Detects context consumers that cause re-renders
- Identifies components that subscribe to frequently changing context
- Suggests context optimization strategies

### 3. Performance Patterns

- Flags components with expensive render logic
- Identifies unnecessary re-renders of pure components
- Detects render thrashing in response to state/prop changes

## Error Messages

- `tooManyRenders": "Component '{{component}}' has re-rendered {{count}} times. Consider optimizing to prevent performance issues."
- `expensiveRender": "Render in '{{component}}' is expensive ({{time}}ms). Consider optimizing the render logic."
- `contextTriggeredRenders": "'{{component}}' is re-rendering frequently due to context changes. Consider using selectors or memoization."
- `unnecessaryRerender": "'{{component}}' is re-rendering with the same props/state. Consider using React.memo or useMemo."

## Auto-fix Suggestions

- Suggests memoization with React.memo
- Recommends useMemo/useCallback for expensive calculations
- May suggest context optimization strategies
- Can help identify state that could be moved down

## Benefits

1. **Performance Optimization**: Identifies components that need optimization
2. **Better UX**: Helps maintain smooth user experience
3. **Efficient Updates**: Reduces unnecessary DOM operations
4. **Proactive Monitoring**: Catches performance issues early

## When to Disable

- For components that naturally re-render frequently (e.g., animations)
- During development when focusing on functionality first
- When using third-party components with known re-render behavior

## Configuration

```json
{
  "max-renders": ["warn", {
    "maxRenders": 10,
    "sampleSize": 100,
    "thresholdMs": 16,
    "ignorePatterns": ["^Test", "\\.test\\."],
    "typescript": {
      "strict": true
    },
    "profiling": {
      "enabled": true,
      "sampleRate": 0.1
    }
  }]
}
```

### Options

- `maxRenders`: Maximum allowed re-renders before warning (default: 10)
- `sampleSize`: Number of renders to analyze (default: 100)
- `thresholdMs`: Threshold for expensive renders in milliseconds (default: 16)
- `profiling.enabled`: Enable React Profiler integration (default: true)
- `profiling.sampleRate`: Sampling rate for profiling (0-1, default: 0.1)
- `typescript.strict`: Enable TypeScript strict mode (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use React.memo**: For components that render often with the same props
2. **Memoize Values**: Use useMemo for expensive calculations
3. **Optimize Context**: Avoid frequently changing values in context
4. **Use useCallback**: For function props to prevent child re-renders
5. **Profile First**: Always measure before optimizing

## Performance Impact

- Minimal runtime overhead during development
- Can be disabled in production
- Helps identify the most impactful optimizations

## TypeScript Integration

- Works with TypeScript's type system
- Validates component props and types
- Handles generic components
- Integrates with React's built-in type utilities
