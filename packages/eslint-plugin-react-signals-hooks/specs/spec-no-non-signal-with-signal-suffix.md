# No Non-Signal With Signal Suffix Rule Specification

This rule enforces that variables, parameters, and properties with the 'Signal' suffix are actual signal instances created by signal creation functions.

## Plugin Scope

- Signal creator detection is scoped to `@preact/signals-react` only.
- The rule recognizes `signal()` and `computed()` created in-file via direct, aliased, or namespace imports from `@preact/signals-react`.

## Core Functionality

The `no-non-signal-with-signal-suffix` rule ensures naming consistency by requiring that any identifier with 'Signal' in its name is actually a signal instance. This helps prevent confusion and maintains code clarity by ensuring the name accurately reflects the type.

## Handled Cases

### 1. Variable Declarations

- Detects variables with 'Signal' suffix that are not signal instances
- Example: `const userSignal = getUser();` (when `getUser()` doesn't return a signal)
- Severity: Configurable (default: 'error')

### 2. Function/Method Parameters

- Catches parameters with 'Signal' suffix that are not typed as signals
- Example: `function process(userSignal) { ... }` (when `userSignal` isn't a signal)
- Severity: Configurable (default: 'error')

### 3. Object/Class Properties

- Identifies properties with 'Signal' suffix that don't contain signals
- Example: `const obj = { userSignal: {} };` (when the value isn't a signal)
- Severity: Configurable (default: 'error')

## Configuration Options

### `signalNames` (string[])

Custom signal function names to recognize

- Default: `['signal', 'useSignal', 'createSignal']`
- Example: `['signal', 'useSignal', 'createSignal', 'customSignal']`

### `ignorePattern` (string)

Pattern to ignore (regex string). If provided and non-empty, names matching the regex will be skipped.

- Default: `""`
- Example: `"^_|Signal$"` to ignore variables starting with underscore or ending with 'Signal'

### `suffix` (string)

Suffix to detect for signal-like names.

- Default: `"Signal"`

### `validateProperties` (boolean)

Whether to validate object/class properties that end with the suffix.

- Default: `true`

### `severity` (object)

Custom severity levels for different violation types:

- `variableWithSignalSuffixNotSignal`: For variable declarations (default: 'error')
- `parameterWithSignalSuffixNotSignal`: For function parameters (default: 'error')
- `propertyWithSignalSuffixNotSignal`: For object/class properties (default: 'error')

### `performance` (object)

Performance tuning options:

- `maxTime`: Maximum execution time in milliseconds (default: 35ms)
- `maxNodes`: Maximum AST nodes to process (default: 1200)
- `maxMemory`: Maximum memory usage in bytes (default: 35MB)
- `maxOperations`: Operation-specific limits
  - `signalCheck`: Max signal checks (default: 400)
  - `identifierCheck`: Max identifier checks (default: 300)
  - `scopeLookup`: Max scope lookups (default: 250)
  - `typeCheck`: Max type checks (default: 200)
- `enableMetrics`: Enable detailed performance metrics (default: false)
- `logMetrics`: Log metrics to console (default: false)

## Error Messages

- `variableWithSignalSuffixNotSignal`: "Variables with 'Signal' suffix should be signal instances"
- `parameterWithSignalSuffixNotSignal`: "Parameters with 'Signal' suffix should be of signal type"
- `propertyWithSignalSuffixNotSignal`: "Properties with 'Signal' suffix should contain signal values"

## Auto-fix Suggestions

- This rule provides suggestions (`hasSuggestions: true`) and autofixes where safe:
  - **Rename without suffix**: Suggests renaming the identifier to remove the 'Signal' suffix
  - **Convert to signal**: Suggests converting the value to a signal (when possible)

## Best Practices

1. Use 'Signal' suffix only for actual signal instances
2. Be consistent with signal naming across your codebase
3. Consider using TypeScript types to enforce signal types
4. Use the `signalNames` option to include any custom signal creation functions
