# Signal Variable Name Rule Specification

This rule enforces consistent naming conventions for signal and computed variables, improving code readability and maintainability.

## Core Functionality

The `signal-variable-name` rule ensures that all signal and computed variables follow a consistent naming pattern, making it easier to identify reactive values in your codebase.

## Naming Rules

### For Signal Variables

Signal variables must:

1. End with `Signal` (case-sensitive)
2. Start with a lowercase letter
3. Not start with `use` (reserved for hooks)

### For Computed Variables

Computed variables must follow the same naming rules as signal variables.

## Auto-fix

The rule provides a safe autofix (no separate suggestions) that will:

1. Add 'Signal' suffix if missing
2. Convert first character to lowercase
3. Remove 'use' prefix if present at the start
4. Preserve the rest of the name

Notes:

- References are updated where safe within the same scope; property names (e.g., `obj.nameSignal`) are not rewritten.
- A collision guard prevents renaming when the target name already exists in scope; in that case, no fix is applied.

## Error Messages

- `invalidSignalName`: "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'"
- `invalidComputedName`: "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'"

## Benefits

1. **Consistency**: Ensures all signal-related variables follow the same pattern
2. **Readability**: Makes it immediately clear which variables are signals
3. **Prevents Bugs**: Reduces confusion between regular variables and reactive signals
4. **Tooling Support**: Enables better IDE support and code navigation

## When to Disable

This rule can be disabled for:

1. Legacy codebases where renaming isn't feasible
2. When using a different naming convention
3. For specific variables that need to deviate from the standard

## Migration Strategy

1. Enable the rule in your ESLint configuration
2. Use the `--fix` option to automatically fix most issues
3. Manually review and fix any remaining cases
4. Add `// eslint-disable-next-line` comments for any intentional exceptions

## Configuration

```json
{
  "react-signals-hooks/signal-variable-name": [
    "error",
    {
      "suffix": "Signal",
      "severity": {
        "invalidSignalName": "error",
        "invalidComputedName": "error"
      },
      "performance": {
        "maxTime": 200,
        "maxMemory": 256,
        "maxNodes": 100000,
        "enableMetrics": false,
        "logMetrics": false
      }
    }
  ]
}
```

### Options

- `suffix` (string, default: `"Signal"`): Required suffix for signal/computed names.
- `severity` (object): Per-message severity override for `invalidSignalName` and `invalidComputedName`.
- `performance` (object): Performance budgets and optional metrics logging.

### Detection Notes

- Signal/computed creators are detected via imports (direct, aliased, or namespace) from `@preact/signals-react` only (plugin scope).

## Best Practices

1. Use descriptive names that indicate the signal's purpose
2. Keep signal names concise but meaningful
3. Group related signals with consistent prefixes
4. Consider using domain-specific terminology in signal names

## TypeScript Integration

This rule works well with TypeScript's type system to ensure type safety when working with signals. The naming convention makes it easier to distinguish between:

- Signal types: `Signal<T>`
- Regular values: `T`
- Computed signals: `Computed<T>`
