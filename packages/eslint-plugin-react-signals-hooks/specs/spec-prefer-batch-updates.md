# Prefer Batch Updates Rule Specification

This rule suggests batching multiple signal updates to optimize performance by reducing the number of renders.

## Core Functionality

The `prefer-batch-updates` rule detects multiple signal updates within the same scope and suggests wrapping them in a `batch()` call. This helps minimize the number of renders by batching multiple signal updates together.

## Handled Cases

### 1. Multiple Signal Updates in Same Scope

- Detects multiple signal value updates in the same function or block

- Suggests wrapping in `batch()`

### 2. Signal Update Operations

- Handles various update operations:
  - Direct assignment: `signal.value = x`
  - Method calls: `signal.set(x)`
  - Increment/Decrement: `signal.value++`, `--signal.value`
  - Compound assignments: `signal.value += x`

### 3. Nested Scopes

- Analyzes updates within nested blocks and functions
- Only reports when multiple updates occur in the same immediate scope
- ignores updates inside batch calls
- updates inside loops, while loops, and other control flow statements should require wrapping whole flow statement, not just assignment itself

## Configuration Options

### `minUpdates` (number)

Minimum number of signal updates required before suggesting batching

- Default: `2`
- Example: Set to `3` to only suggest batching for 3+ updates

### `performance` (object)

Performance tuning options:

- `maxTime`: Maximum execution time in milliseconds (default: 35ms)
- `maxNodes`: Maximum AST nodes to process (default: 1800)
- `maxMemory`: Maximum memory usage in bytes (default: 45MB)
- `maxOperations`: Operation-specific limits
  - `signalAccess`: Max signal access checks (default: 1000)
  - `signalCheck`: Max signal checks (default: 500)
  - `identifierResolution`: Max identifier resolutions (default: 1000)
  - `scopeLookup`: Max scope lookups (default: 1000)
  - `typeCheck`: Max type checks (default: 500)
  - `batchAnalysis`: Max batch operations to analyze (default: 100)
- `enableMetrics`: Enable detailed performance metrics (default: false)
- `logMetrics`: Log metrics to console (default: false)

## Error Messages

- `useBatch`: "{{count}} signal updates detected in the same scope. Use `batch` to optimize performance by reducing renders."
- `suggestUseBatch`: "Use `batch` to group {{count}} signal updates"
- `addBatchImport`: "Add `batch` import from '@preact/signals-react'"
- `wrapWithBatch`: "Wrap with `batch` to optimize signal updates"
- `useBatchSuggestion`: "Use `batch` to group {{count}} signal updates"

## Auto-fix Suggestions

- **Wrap with `batch`**: Automatically wraps the updates in a `batch()` call
- **Add batch import**: Automatically adds the batch import from '@preact/signals-react' if missing
- Should not wrap with batch if it is already inside a batch
- Should offer to remove batch if there is only single signal update

## Best Practices

1. Use `batch()` when making multiple signal updates in sequence
2. Group related state updates together within the same batch
3. Consider using batch for any group of signal updates that don't require intermediate renders

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
