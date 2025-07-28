# Require Error Boundary Rule Specification

Ensures that components that can throw errors are wrapped in error boundaries, preventing application crashes and providing better error handling.

## Core Functionality

This rule identifies components that might throw errors and verifies they are properly wrapped in error boundaries, either directly or through a parent component in the component tree.

## Handled Cases

### 1. Error-Prone Components

- Identifies components with `async` operations
- Flags components with external data fetching
- Detects components with potentially unsafe operations

### 2. Error Boundary Detection

- Verifies presence of error boundaries in the component tree
- Checks for `componentDidCatch` or `static getDerivedStateFromError`
- Validates error boundary implementation

### 3. Context and Data Flow

- Tracks error boundaries through context
- Handles component composition patterns
- Validates error boundary placement in the component tree

## Error Messages

- `missingErrorBoundary": "Component '{{component}}' should be wrapped in an error boundary."
- `invalidErrorBoundary": "Error boundary '{{name}}' is missing required methods (componentDidCatch or getDerivedStateFromError)."
- `nestedErrorBoundary": "Error boundary '{{name}}' is nested within another error boundary. Consider restructuring your component tree."
- `asyncComponent": "Async component '{{name}}' must be wrapped in an error boundary to handle potential loading errors."

## Auto-fix Suggestions

- Wraps components in error boundaries
- Adds basic error boundary implementation
- Suggests error boundary placement
- Preserves existing error handling

## Benefits

1. **Improved Stability**: Prevents application crashes from uncaught errors
2. **Better UX**: Provides graceful error handling and recovery
3. **Easier Debugging**: Captures and reports errors effectively
4. **Proactive Error Handling**: Encourages thinking about error cases

## When to Disable

- For simple components that cannot throw errors
- When using a global error boundary at the application root
- In test files and documentation examples

## Configuration

```json
{
  "require-error-boundary": ["error", {
    "include": [
      "async",
      "fetch",
      "third-party",
      "dangerouslySetInnerHTML"
    ],
    "exclude": [
      "test",
      "story",
      "example"
    ],
    "errorBoundaryMethods": [
      "componentDidCatch",
      "getDerivedStateFromError"
    ],
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `include`: Array of patterns to include in error boundary checking
- `exclude`: Array of patterns to exclude from error boundary checking
- `errorBoundaryMethods`: Array of method names that indicate an error boundary
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use Multiple Boundaries**: Place error boundaries at granular levels
2. **Provide Fallback UI**: Show helpful error messages to users
3. **Log Errors**: Report errors to an error tracking service
4. **Test Error States**: Verify error handling works as expected
5. **Document Boundaries**: Comment complex error boundary usage

## Performance Impact

- Minimal runtime overhead
- Error boundaries only impact the components they wrap
- Helps prevent performance issues from uncaught errors

## TypeScript Integration

- Validates TypeScript types for error boundaries
- Works with React's ErrorBoundary type
- Handles generic components and error types
- Integrates with React's type system
