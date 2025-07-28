# No Signal Assignment in Effect Rule Specification

This rule prevents direct signal assignments inside React's `useEffect` and `useLayoutEffect` hooks, which can lead to unexpected behavior in React 18+ strict mode.

## Core Functionality

The `no-signal-assignment-in-effect` rule detects and prevents direct signal assignments within React's effect hooks. Instead, it recommends using `useSignalsEffect` or `useSignalsLayoutEffect` from `@preact/signals-react/runtime` for signal assignments in effects.

## Handled Cases

### 1. Signal Assignments in useEffect

- Detects direct assignments to signal values inside `useEffect`
- Example: `useEffect(() => { signal.value = newValue; }, [])`
- Severity: Configurable (default: 'error')

### 2. Signal Assignments in useLayoutEffect

- Catches direct assignments to signal values inside `useLayoutEffect`
- Example: `useLayoutEffect(() => { signal.value = newValue; }, [])`
- Severity: Configurable (default: 'error')

## Configuration Options

### `signalNames` (string[])

Custom signal function names to check (e.g., `['createSignal', 'useSignal']`)

- Default: `['signal', 'useSignal', 'createSignal']`

### `allowedPatterns` (string[])

File patterns where signal assignments are allowed (e.g., `['^test/', '.spec.ts$']`)

- Default: `[]`

### `severity` (object)

Custom severity levels for different violation types:

- `signalAssignmentInEffect`: For assignments in `useEffect` (default: 'error')
- `signalAssignmentInLayoutEffect`: For assignments in `useLayoutEffect` (default: 'error')

### `performance` (object)

Performance tuning options:

- `maxTime`: Maximum execution time in milliseconds (default: 40ms)
- `maxNodes`: Maximum AST nodes to process (default: 1000)
- `maxMemory`: Maximum memory usage in bytes (default: 40MB)
- `maxOperations`: Operation-specific limits
  - `signalAccess`: Max signal accesses (default: 300)
  - `effectCheck`: Max effect checks (default: 150)
  - `identifierResolution`: Max identifier resolutions (default: 250)
  - `scopeLookup`: Max scope lookups (default: 300)
- `enableMetrics`: Enable detailed performance metrics (default: false)
- `logMetrics`: Log metrics to console (default: false)

## Error Messages

- `avoidSignalAssignmentInEffect`: "Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode."

## Auto-fix Suggestions

- **Use useSignalsEffect**: Suggests replacing `useEffect` with `useSignalsEffect` from `@preact/signals-react/runtime`
- **Use useSignalsLayoutEffect**: Suggests replacing `useLayoutEffect` with `useSignalsLayoutEffect`

## Best Practices

1. Use `useSignalsEffect` for signal assignments in effects
2. Use `useSignalsLayoutEffect` for signal assignments in layout effects
3. Keep side effects minimal and focused
4. Consider using derived state or computed values when possible

## Rationale

Direct signal assignments in React effects can cause issues in React 18+ strict mode due to:

1. Double-invocation of effects in development
2. Potential race conditions in concurrent rendering
3. Unexpected behavior with React's batching and scheduling

By using the specialized `useSignalsEffect` and `useSignalsLayoutEffect` hooks, you ensure proper integration between React's effect system and the signals reactivity model.
