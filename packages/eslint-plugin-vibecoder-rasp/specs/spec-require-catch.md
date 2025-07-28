# Require Catch Rule Specification

Ensures that all `try` blocks have a corresponding `catch` block, preventing unhandled promise rejections and runtime errors in JavaScript/TypeScript applications.

## Core Functionality

This rule enforces the use of `catch` blocks for all `try` statements. It helps prevent unhandled promise rejections and ensures proper error handling throughout the codebase.

## Handled Cases

### 1. Missing Catch Block

- Detects `try` blocks without a corresponding `catch` block
- Handles both regular and async/await try-catch patterns
- Works with TypeScript type annotations in catch clauses

### 2. Empty Catch Blocks

- Identifies empty catch blocks that silently swallow errors
- Suggests proper error handling patterns

## Error Messages

- `missingCatch`: "Missing catch block for try statement. Always handle errors appropriately."
- `emptyCatch`: "Empty catch block. At minimum, log the error for debugging purposes."

## Auto-fix Suggestions

- Adds a basic catch block with proper error handling
- Includes TypeScript type annotations when in TypeScript context
- Suggests proper error logging and rethrowing patterns

## Benefits

1. **Prevents Unhandled Errors**: Ensures all potential errors are caught and handled
2. **Improves Debugging**: Encourages proper error logging
3. **Better Error Recovery**: Prompts developers to consider error handling strategies
4. **Type Safety**: Maintains type safety in TypeScript projects

## Examples

### Incorrect

```typescript
try {
  // some code that might throw
}
// Missing catch block

// or

try {
  // some code that might throw
} catch (error) {
  // Empty catch block
}
```

### Correct

```typescript
try {
  // some code that might throw
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else if (typeof error === 'string') {
    console.error(error);
  } else {
    console.error('An unknown error occurred:', JSON.stringify(error));
  }
  // Consider whether to rethrow or handle the error
  // throw error;
}

// For async/await
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Async operation failed:', error);
  throw error; // Re-throw to let the caller handle it
}
```

## Configuration

This rule accepts an options object with the following properties:

```typescript
{
  "require-catch": ["error", {
    "allowEmpty": false,      // Whether to allow empty catch blocks
    "requireTypeCheck": true // Whether to require type checking in TypeScript
  }]
}
```
