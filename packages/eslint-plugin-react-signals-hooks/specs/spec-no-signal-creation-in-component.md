# No Signal Creation in Component Rule Specification

This rule prevents direct signal creation inside React components, hooks, or effects, promoting better performance and preventing potential memory leaks.

## Core Functionality

The `no-signal-creation-in-component` rule detects and prevents the creation of signals (`signal()` or `computed()`) inside React components, hooks, or effects. Instead, it recommends moving signal creation to module level or custom hooks.

## Handled Cases

### 1. Signal Creation in Function Components

- Detects `signal()` or `computed()` calls directly inside function components
- Example: `function Component() { const count = signal(0); ... }`
- Severity: Error

### 2. Signal Creation in Class Components

- Catches signal creation in class component methods
- Example: `class Component { render() { const count = signal(0); ... } }`
- Severity: Error

### 3. Signal Creation in Custom Hooks

- Identifies signal creation in custom hooks (functions starting with 'use')
- Example: `function useCounter() { const count = signal(0); ... }`
- Severity: Error

### 4. Signal Creation in Effects

- Detects signal creation inside `useEffect`, `useLayoutEffect`, etc.
- Example: `useEffect(() => { const count = signal(0); ... }, [])`
- Severity: Error

## Configuration Options

### `performance` (object)

Performance tuning options:

- `maxTime`: Maximum execution time in milliseconds
- `maxNodes`: Maximum AST nodes to process
- `maxMemory`: Maximum memory usage in bytes
- `maxOperations`: Operation-specific limits
  - `signalCheck`: Maximum number of signal checks
  - `componentCheck`: Maximum number of component checks
  - `hookCheck`: Maximum number of hook checks
  - `scopeLookup`: Maximum number of scope lookups
- `enableMetrics`: Enable detailed performance metrics
- `logMetrics`: Log metrics to console

## Error Messages

- `avoidSignalInComponent`: "Avoid creating signals inside React components, hooks, or effects. Move signal creation to module level or a custom hook."

## Auto-fix Suggestions

- **Move to module level**: Suggests moving the signal creation to the module level
- **Create custom hook**: Suggests extracting the signal logic into a custom hook

## Best Practices

1. Create signals at the module level when their value should be shared across components
2. Use custom hooks for signal creation when the signal is specific to a component's instance
3. Avoid creating signals inside effects or callbacks to prevent memory leaks
4. Consider using context or state management for complex state that needs to be shared across components

## Rationale

Creating signals inside components can lead to:

1. Unnecessary re-creation of signals on each render
2. Potential memory leaks if signals are not properly cleaned up
3. Inconsistent behavior between development and production
4. Performance degradation due to excessive signal creation

By moving signal creation to module level or custom hooks, you ensure that signals are created once and properly managed throughout the component's lifecycle.
