# warn-on-unnecessary-untracked Rule Specification

Warns when `untracked()` or `.peek()` is used unnecessarily in reactive contexts, as they can lead to subtle bugs by breaking reactivity.

## Core Functionality

This rule identifies and warns about unnecessary usage of `untracked()` and `.peek()` in reactive contexts where they don't provide any benefit and might actually hide potential reactivity issues. The rule helps maintain code clarity and prevents accidental breaking of reactivity.

## Handled Cases

### 1. Unnecessary `untracked()` in Component Render

- Detects when `untracked()` is used in component render functions where it's not needed
- This includes function components and class component render methods

### 2. Unnecessary `.peek()` in Reactive Contexts

- Detects when `.peek()` is used in reactive contexts where normal signal access would be more appropriate
- This includes computed values, effects, and render functions

### 3. Allowed Usage Patterns

- `untracked()` and `.peek()` are allowed in effects when writing to another signal based on its previous value
- They are also allowed in event handlers and other non-reactive callbacks by default (configurable)

## Error Messages

- `unnecessaryUntracked`: "Avoid unnecessary 'untracked()' in reactive context"
- `unnecessaryPeek`: "Avoid unnecessary '.peek()' in reactive context"

## Auto-fix Suggestions

- Removes unnecessary `untracked()` wrappers
- Replaces `.peek()` with direct signal access (`.value`)

## Benefits

1. **Prevents Bugs**: Helps avoid subtle reactivity issues that can occur when signals are accidentally not tracked
2. **Improves Readability**: Makes the code more explicit about when reactivity is intentionally being bypassed
3. **Better Performance**: Reduces unnecessary function calls and object property access
4. **Consistent Code Style**: Encourages consistent patterns for handling reactivity

## When to Disable

This rule can be disabled when:

- Working with third-party libraries that require `untracked()` or `.peek()` in specific ways
- In performance-critical code where you've measured a benefit to using these methods
- When intentionally breaking reactivity for specific edge cases (though consider restructuring if possible)

## Configuration

```json
{
  "react-signals-hooks/warn-on-unnecessary-untracked": ["error", {
    "allowInEffects": true,
    "allowInEventHandlers": true,
    "allowForSignalWrites": true
  }]
}
```

### Options

- `allowInEffects` (default: `true`): Allow in `useSignalEffect` callbacks
- `allowInEventHandlers` (default: `true`): Allow in DOM event handlers
- `allowForSignalWrites` (default: `true`): Allow when used to prevent circular dependencies in effects

## Best Practices

1. **Prefer Direct Signal Access**: Use `.value` by default in reactive contexts
2. **Document Intent**: Add comments when `untracked()` or `.peek()` is intentionally used
3. **Consider Alternatives**: Often, restructuring components or using derived values can eliminate the need for these methods
4. **Profile Performance**: If using these methods for performance, always measure the impact

## Performance Impact

- The rule has minimal performance impact as it only analyzes the AST structure
- The benefits of catching unnecessary reactivity bypasses often outweigh the cost of the rule

## TypeScript Integration

- The rule works with TypeScript and provides proper type information
- No additional configuration is needed for TypeScript support
