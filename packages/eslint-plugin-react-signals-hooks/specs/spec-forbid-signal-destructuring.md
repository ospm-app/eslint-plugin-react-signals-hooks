# Forbid Signal Destructuring Rule Specification

This rule forbids destructuring that creates new bindings from a signal reference. Destructuring obscures the original reactive source and encourages aliasing patterns that reduce clarity and can lead to subtle bugs.

## Core Functionality

The `forbid-signal-destructuring` rule detects destructuring patterns that bind variables from a signal or from containers that immediately destructure a signal into local aliases.

- Disallows object/array destructuring where the right-hand side (RHS) is a signal or includes a signal.
- Applies to variable declarations and assignment patterns.

## Handled Cases

- __Direct destructuring from a signal__
  - ❌ `const { value } = countSignal;`
  - ❌ `const [s] = [countSignal];`
  - ❌ `({ s } = { s: userSignal });`

- __Nested destructuring that aliases a signal__
  - ❌ `const { s } = { s: countSignal };`
  - ❌ `const { user: { signal: s } } = data; // if data.user.signal is a signal`
  - ❌ `const [firstSignal] = someArrayHoldingSignals;`

- __Hook returns that are signals__
  - ❌ `const { signal: s } = useCountSignal(); // if hook returns a signal`

## Not Flagged (allowed)

- __Plain member access without destructuring__
  - ✅ `const v = countSignal.value;`
  - ✅ `doSomething(countSignal.value);`

- __Destructuring of non-signal values__
  - ✅ `const { id } = user;`

- __Passing signals without binding new names__
  - ✅ `fn(countSignal);`

## Configuration Options

### `suffix` (string)
- Suffix used to detect signal identifiers; defaults to `"Signal"`.

### `severity` (object)
- `destructureSignal`: severity for destructuring that aliases signals (default: `error`).

### `performance` (object)
- Standard performance budget used across rules.

## Error Messages

- `destructureSignal`: "Avoid destructuring from signal '{{name}}'. Read from '.value' or use direct member access instead."

## Auto-fix Suggestions

- Where safe, suggest replacing destructuring with direct member access.
  - Example: `const { value } = countSignal;` → `const value = countSignal.value;`
  - Example: `const { s } = { s: countSignal };` → `const s = countSignal;` (may still be disallowed by aliasing rules; prefer inlining in usage if possible)

Note: Complex patterns (renaming, deep nesting, computed keys) may be left without auto-fix to avoid unsafe changes.

## Examples

### Incorrect

```ts
const { value } = countSignal;
const { s } = { s: countSignal };
const [sig] = [countSignal];
({ s } = { s: userSignal });
```

### Correct

```ts
const v = countSignal.value;
fn(countSignal.value);
```

## Rationale

Destructuring hides the fact that a binding originates from a reactive signal and makes dataflow harder to track. Prefer explicit property access (e.g., `signal.value`) or direct usage to maintain clarity and avoid fragile aliasing.
