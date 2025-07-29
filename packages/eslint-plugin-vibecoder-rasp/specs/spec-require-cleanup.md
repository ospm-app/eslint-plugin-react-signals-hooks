# Require Cleanup Rule Specification

Ensures that all effects that set up event listeners, timeouts, or subscriptions properly clean them up, preventing memory leaks and unexpected behavior in React applications.

## Core Functionality

This rule enforces the cleanup of side effects in React's `useEffect` hooks and class component lifecycle methods. It identifies potential memory leaks by checking for missing cleanup functions in effects that set up persistent resources.

## Handled Cases

### 1. Event Listeners

- Detects `addEventListener` calls in effects without corresponding `removeEventListener`
- Handles both DOM and custom event listeners
- Accounts for event listener references stored in variables

### 2. Timers

- Identifies `setTimeout` and `setInterval` calls without matching `clearTimeout` or `clearInterval`
- Handles timer IDs stored in refs or variables

### 3. Subscriptions

- Detects subscription patterns without proper unsubscription
- Works with common patterns like RxJS, WebSocket, and custom subscriptions

### 4. AbortController

- Ensures `AbortController` instances are properly aborted
- Checks for cleanup of fetch requests using AbortController

## Error Messages

- `missingCleanup`: "Effect with {{resourceType}} requires a cleanup function to prevent memory leaks."
- `incorrectCleanup`: "Cleanup function should clean up {{resourceType}}. Expected to find {{expectedCleanup}}."
- `unnecessaryCleanup`: "Unnecessary cleanup function for effect without side effects that require cleanup."

## Auto-fix Suggestions

- Adds basic cleanup function stubs with appropriate cleanup code
- Converts `setTimeout`/`setInterval` to use `useRef` for timer ID storage
- Adds missing cleanup for event listeners and subscriptions

## Benefits

1. **Prevents Memory Leaks**: Ensures all resources are properly released
2. **Improves Application Stability**: Prevents "ghost" event listeners and timers
3. **Better Resource Management**: Encourages proper resource cleanup patterns
4. **Easier Debugging**: Reduces hard-to-find memory-related issues

## When to Disable

- In cases where cleanup is handled by a parent component
- When using third-party libraries that manage their own cleanup internally
- For effects that are guaranteed to run only once in the application's lifetime

## Configuration

```json
{
  "require-cleanup": ["error", {
    "checkAll": true,
    "ignore": ["passive"],
    "includeNativeEvents": true,
    "ignorePatterns": ["^Test", "\.test\."]
  }]
}
```

### Options

- `checkAll`: Check all effects, not just those with dependencies (default: true)
- `ignore`: Array of resource types to ignore (e.g., ["passive"] for passive event listeners)
- `includeNativeEvents`: Check for native DOM event listeners (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Always Clean Up**: Every effect that sets up a persistent resource should return a cleanup function
2. **Use Refs for Mutable Values**: Store timer IDs and event handlers in refs when needed across renders
3. **Handle Component Unmount**: Ensure cleanup runs when components unmount
4. **Test Cleanup**: Write tests that verify cleanup behavior

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by preventing memory leaks
- Helps identify potential performance issues in effect cleanup

## TypeScript Integration

- Fully compatible with TypeScript's type system
- Preserves type information when suggesting fixes
- Works with generic components and complex type inference
