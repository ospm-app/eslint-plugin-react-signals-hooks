# Prefer Batch For Multi-Mutations Rule Specification

This rule encourages the use of `batch()` when making multiple signal mutations within the same scope to optimize performance by reducing the number of renders.

## Core Functionality

The `prefer-batch-for-multi-mutations` rule detects multiple signal mutations within the same function scope and suggests wrapping them in a `batch()` call. This helps minimize the number of renders by batching multiple signal updates together.

## Handled Cases

### 1. Multiple Signal Mutations in Same Scope

- Detects multiple assignments to signal values in the same function
- Example:

  ```typescript
  // Without batch
  countSignal.value++;
  nameSignal.value = 'new name';
  ```

- Suggests wrapping in `batch()`

### 2. Signal Update Operations

- Handles various update operations:
  - Assignment: `signal.value = x`
  - Increment/Decrement: `signal.value++`, `--signal.value`
  - Compound assignments: `signal.value += x`

### 3. Nested Scopes

- Analyzes mutations within nested blocks and functions
- Only reports when multiple mutations occur in the same immediate function scope

## Configuration Options

### `minMutations` (number)

Minimum number of signal mutations required before suggesting batching

- Default: `2`
- Example: Set to `3` to only suggest batching for 3+ mutations

## Error Messages

- `useBatch`: "Multiple signal mutations detected. Use `batch()` to optimize performance by reducing renders."

## Auto-fix Suggestions

- **Wrap with `batch()`**: Automatically wraps the mutations in a `batch()` call
- **Add batch import**: Automatically adds the batch import from '@preact/signals-react' if missing

## Best Practices

1. Use `batch()` when making multiple signal updates in sequence
2. Keep related state updates together within the same batch
3. Consider using batch for any group of signal updates that don't require intermediate renders

## Auto-import

The rule can automatically add the batch import if it's not already present

## Performance Impact

Batching multiple signal updates can significantly improve performance by:

1. Reducing the number of renders
2. Minimizing layout thrashing
3. Improving user experience with smoother updates

## When Not to Use Batch

Avoid batching when:

1. You need intermediate renders between updates
2. The updates are not logically related
3. The updates happen in response to different user interactions
