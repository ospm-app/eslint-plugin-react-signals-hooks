# Error Boundary Fallback Rule Specification

Ensures that error boundaries provide appropriate fallback UI and error handling, improving the user experience when errors occur.

## Core Functionality

This rule verifies that error boundaries implement proper fallback UI and error handling mechanisms, including error reporting and recovery options.

## Handled Cases

### 1. Fallback UI

- Requires a `fallback` prop or `renderError` method
- Validates the presence of user-friendly error messages
- Checks for recovery options (e.g., retry buttons)

### 2. Error Reporting

- Ensures errors are logged or reported
- Validates error boundary state management
- Checks for error context in development mode

### 3. Recovery Mechanisms

- Verifies the presence of recovery actions
- Validates error boundary reset functionality
- Checks for proper cleanup in `componentWillUnmount`

## Error Messages

- `missingFallback`: "Error boundary '{{name}}' must provide a fallback UI via a 'fallback' prop or 'renderError' method."
- `missingErrorReporting`: "Error boundary '{{name}}' should log or report errors for debugging purposes."
- `missingRecovery`: "Consider adding a recovery mechanism (e.g., retry button) to error boundary '{{name}}'."
- `missingErrorState`: "Error boundary '{{name}}' should maintain error state to prevent error loops."

## Auto-fix Suggestions

- Adds a basic fallback UI component
- Implements error logging
- Adds error state management
- Includes recovery options

## Benefits

1. **Better UX**: Provides clear feedback when errors occur
2. **Improved Debugging**: Ensures errors are properly logged
3. **Graceful Recovery**: Allows users to recover from errors
4. **Consistent Error Handling**: Standardizes error boundary implementation

## When to Disable

- For simple applications with a single, top-level error boundary
- When using a third-party error boundary component
- In test files and documentation examples

## Configuration

```json
{
  "error-boundary-fallback": ["error", {
    "requireFallback": true,
    "requireErrorReporting": true,
    "requireRecovery": true,
    "allowedFallbackComponents": ["ErrorBoundary", "ErrorFallback"],
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `requireFallback`: Whether a fallback UI is required (default: true)
- `requireErrorReporting`: Whether error reporting is required (default: true)
- `requireRecovery`: Whether recovery mechanisms are required (default: true)
- `allowedFallbackComponents`: Array of component names that provide fallback UI
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **User-Friendly Messages**: Provide clear, actionable error messages
2. **Log Errors**: Report errors to a monitoring service
3. **Offer Recovery**: Include retry or reset options
4. **Maintain State**: Prevent error loops with proper state management
5. **Test Error States**: Verify error handling works as expected

## Performance Impact

- Minimal runtime overhead
- Prevents performance issues from uncaught errors
- Helps identify error-related performance problems

## TypeScript Integration

- Validates TypeScript types for error boundaries
- Works with React's ErrorBoundary type
- Handles generic error types
- Integrates with React's type system
