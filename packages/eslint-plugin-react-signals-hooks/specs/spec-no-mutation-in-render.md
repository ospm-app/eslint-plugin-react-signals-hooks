# No Mutation in Render Rule Specification

This rule prevents direct signal mutations during the render phase of React components, which can lead to unexpected behavior and performance issues.

## Core Functionality

The `no-mutation-in-render` rule detects and prevents direct signal mutations that occur during the render phase of React components. Signal mutations should be moved to effects, event handlers, or other side-effect contexts.

## Handled Cases

### 1. Direct Signal Value Assignment

- Detects direct assignments to `signal.value` in render
- Example: `signal.value = newValue`
- Severity: Configurable (default: 'error')

### 2. Signal Value Updates with Operators

- Catches operations like `++`, `--`, `+=`, `-=`, etc. on signal values
- Example: `signal.value++` or `signal.value += 1`
- Severity: Same as direct assignment

### 3. Signal Property Assignment

- Detects direct property assignments on signal values
- Example: `signal.value.prop = newValue`
- Severity: Configurable (default: 'error')

### 4. Array Index Assignment

- Catches array index mutations on signal values
- Example: `signal.value[0] = newValue`
- Severity: Configurable (default: 'error')

### 5. Nested Property Assignment

- Detects deep property mutations on signal values
- Example: `signal.value.nested.prop = newValue`
- Severity: Configurable (default: 'error')

## Configuration Options

### `signalNames` (string[])

Custom signal function names to check (e.g., `['createSignal', 'useSignal']`)

- Default: `['signal', 'useSignal', 'createSignal']`

### `allowedPatterns` (string[])

File patterns where mutations are allowed (e.g., `['^test/', '.spec.ts$']`)

- Default: `[]`

### `severity` (object)

Custom severity levels for different violation types:

- `signalValueAssignment`: Severity for direct value assignments
- `signalPropertyAssignment`: Severity for property assignments
- `signalArrayIndexAssignment`: Severity for array index assignments
- `signalNestedPropertyAssignment`: Severity for nested property assignments

### `performance` (object)

Performance tuning options:

- `maxTime`: Maximum execution time in milliseconds (default: 50ms)
- `maxNodes`: Maximum AST nodes to process (default: 2000)
- `maxMemory`: Maximum memory usage in bytes (default: 50MB)
- `maxOperations`: Operation-specific limits
  - `signalAccess`: Max signal accesses (default: 500)
  - `nestedPropertyCheck`: Max nested property checks (default: 200)
  - `identifierResolution`: Max identifier resolutions (default: 300)
  - `scopeLookup`: Max scope lookups (default: 400)
- `enableMetrics`: Enable detailed performance metrics (default: false)
- `logMetrics`: Log metrics to console (default: false)

## Error Messages

- `signalValueAssignment`: "Avoid mutating signal.value directly in render. Move this to an effect or event handler."
- `signalValueUpdate`: "Avoid updating signal.value with operators (++, --, +=, etc.) in render. Move this to an effect or event handler."
- `signalPropertyAssignment`: "Avoid mutating signal properties directly in render. Move this to an effect or event handler."
- `signalArrayIndexAssignment`: "Avoid mutating array indexes of signal values in render. Move this to an effect or event handler."
- `signalNestedPropertyAssignment`: "Avoid mutating nested properties of signal values in render. Move this to an effect or event handler."

## Auto-fix Suggestions

- **Wrap in useEffect**: Suggests moving the mutation into a `useEffect` hook
- **Move to event handler**: Suggests moving the mutation into an event handler

## Best Practices

1. Move signal mutations to `useEffect` hooks when they should happen after render
2. Use event handlers for user interactions that should trigger updates
3. For derived state, consider using computed values instead of manual updates
4. Batch multiple signal updates together when possible
