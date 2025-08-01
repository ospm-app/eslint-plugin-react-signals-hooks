# Restrict Signal Locations Rule Specification

This rule enforces best practices for signal creation by restricting where signals can be created in your codebase. It helps prevent performance issues by ensuring signals are created in appropriate scopes.

## Core Functionality

The `restrict-signal-locations` rule prevents signal creation in React components and other disallowed locations where it could lead to performance issues or bugs. It ensures signals are created in module scope or custom hooks.

## Handled Cases

### 1. Signal Creation in Component Body

- Detects direct signal creation in React component bodies
- Example of incorrect usage:

  ```typescript
  function MyComponent() {
    const count = signal(0); // ❌ Signal created in component body

    return <div>{count}</div>;
  }
  ```

- Example of correct usage:

  ```typescript
  // ✅ Signal created at module level
  const count = signal(0);
  
  function MyComponent() {
    return <div>{count}</div>;
  }
  ```

### 2. Forbid exporting signals from react components

Exporting signals from a file often leads to circular imports and breaks the build with hard to debug. use @biomejs/biome for circular imports diagnostic.

  ```typescript
  export const count = signal(0); // ❌ Signal created at module level and exported.
  function MyComponent(): JSX.Element {

    return <div>{count}</div>;
  }
  ```

- Example of correct usage:

  ```typescript
  // ✅ Signal created at module level
  const count = signal(0);
  
  function MyComponent(): JSX.Element {
    return <div>{count}</div>;
  }
  ```

### 2. Allowed Directories Configuration

- Allows signal creation in specific directories when configured
- Configuration example:

  ```json
  {
    "rules": {
      "react-signals-hooks/restrict-signal-locations": [
        "error",
        { "allowedDirs": ["src/signals"] }
      ]
    }
  }
  ```

- Files in allowed directories can create signals anywhere

### 3. Computed in Components

- Can be configured to allow `computed` in components
- Configuration example:

  ```json
  {
    "rules": {
      "react-signals-hooks/restrict-signal-locations": [
        "error",
        { "allowComputedInComponents": true }
      ]
    }
  }
  ```

### 4. Signal Creation in Custom Hooks

- Allows signal creation in custom hooks (functions starting with 'use')
- Example of correct usage:

  ```typescript
  function useCounter() {
    const count = signal(0); // ✅ Allowed in custom hook
    const increment = () => count.value++;
    return { count, increment };
  }
  ```

## Error Messages

- `signalInComponent`: "Avoid creating signals in component bodies. Move to module level or a custom hook."
- `computedInComponent`: "Avoid creating computed values in component bodies. Consider using useMemo instead."

## Auto-fix Suggestions

This rule does not provide auto-fix suggestions as signal creation location changes require manual review to ensure proper state management.

## Benefits

1. **Performance**: Prevents unnecessary signal recreations on each render
2. **Predictability**: Ensures signals are created in predictable locations
3. **Maintainability**: Makes it easier to track signal lifecycle and dependencies
4. **Best Practices**: Encourages patterns that prevent common React performance issues

## When to Disable

This rule should only be disabled if:

1. You have a specific use case that requires dynamic signal creation in components
2. You're working with a legacy codebase where moving signals isn't feasible
3. You're writing tests that specifically test signal creation scenarios

## Configuration Options

### `allowedDirs` (string[])

Array of directory paths where signal creation is allowed anywhere

- Default: `[]`
- Example: `["src/signals", "src/state"]`

### `allowComputedInComponents` (boolean)

Whether to allow `computed` in component bodies

- Default: `false`
- Example: `true` to allow computed values in components

### `customHookPattern` (string)

Regex pattern to identify custom hooks

- Default: `'^use[A-Z]'`
- Example: `'^use'` to match any function starting with 'use'
