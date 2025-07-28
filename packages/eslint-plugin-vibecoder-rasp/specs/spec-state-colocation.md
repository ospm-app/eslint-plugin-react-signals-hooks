# State Colocation Rule Specification

Ensures that component state is placed as close as possible to where it's used, improving code organization and maintainability.

## Core Functionality

This rule enforces the principle of colocation by analyzing the distance between state declarations and their usages. It helps prevent "state lifting" that creates unnecessary prop drilling and makes components harder to maintain.

## Handled Cases

### 1. Local State Usage

- When state is only used within a single component
- Ensures state remains local to that component

### 2. Shared State

- When state is used by multiple components
- Suggests moving state to the nearest common ancestor

### 3. Prop Drilling

- Detects when state is passed through multiple components without being used
- Suggests better component organization or state management

## Error Messages

- `stateShouldBeColocated`: "State should be colocated with its usage. Move this state closer to where it's used."
- `considerContextForState`: "This state is used in multiple components. Consider using Context or state management."

## Auto-fix Suggestions

- Moves state declarations closer to their usage when possible
- Suggests creating new components when appropriate
- Cannot automatically fix all cases due to potential logic dependencies

## Benefits

1. **Improved Maintainability**: State is easier to understand and modify when it's close to where it's used.
2. **Better Performance**: Reduces unnecessary re-renders by localizing state changes.
3. **Clearer Code Organization**: Makes component responsibilities more obvious.
4. **Easier Refactoring**: Local state is simpler to extract or modify when needed.

## When to Disable

- In legacy codebases where restructuring would be too disruptive
- When using complex state management patterns that intentionally separate state from UI
- For temporary workarounds that will be refactored later

## Configuration

```json
{
  "state-colocation": ["error", {
    "maxDepth": 3,
    "ignorePatterns": ["^Test", "\.test\."]
  }]
}
```

### Options

- `maxDepth`: Maximum allowed depth for prop drilling (default: 3)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Keep state as local as possible**: Only lift state up when necessary.
2. **Use composition**: Break down components to better colocate state.
3. **Consider context for widely shared state**: When state needs to be accessed by many components.
4. **Group related state**: Keep related state variables together.

## Performance Impact

- Minimal runtime overhead during linting
- Can significantly improve application performance by encouraging better state management
- Reduces unnecessary re-renders by keeping state localized

## TypeScript Integration

- Works with TypeScript's type system
- Preserves type information when suggesting fixes
- Properly handles generic components and type parameters
