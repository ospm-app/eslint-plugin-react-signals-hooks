# Forbid Signal Re-assignment Rule Specification

This rule forbids re-assigning a variable that holds a signal (or hook return that is a signal) to another variable. Re-assigning signals obscures data flow, reduces readability, and can lead to subtle bugs where consumers operate on aliases instead of the original signal reference.

## Core Functionality

The `forbid-signal-re-assignment` rule detects code that assigns a signal-bearing variable to a new variable (by simple assignment or via destructuring that creates new aliases) and reports it.

- Disallows aliasing a signal: `const alias = countSignal;`.
- Disallows re-binding signals across scopes: `let a = countSignal; a = otherSignal;`.
- Disallows destructuring that rebinds a signal object itself (see Edge Cases for `.value`).

## Handled Cases

- __Direct aliasing__
  - ❌ `const s = countSignal;`
  - ❌ `let s; s = countSignal;`
  - ❌ `function f(sig = countSignal) {}` (default param alias)

- __Re-assignment of a signal-holding variable__
  - ❌ `let s = countSignal; s = otherSignal;`

- __Object/array aliasing__
  - ❌ `const arr = [countSignal]; const s = arr[0];`
  - ❌ `const obj = { s: countSignal }; const s = obj.s;`

- __Destructuring that aliases the signal itself__
  - ❌ `const { s } = { s: countSignal };`
  - ❌ `const [s] = [countSignal];`

## Not Flagged (allowed)

- __Accessing or re-assigning `.value`__
  - ✅ `const v = countSignal.value;`
  - ✅ `let v; v = countSignal.value;`
  - Rationale: The rule targets aliasing the signal reference, not reading its value.

- __Passing a signal as an argument (no alias creation)__
  - ✅ `fn(countSignal);`

- __Storing signals in collections without creating a named alias__
  - This can be controversial; by default we only flag when a named variable is introduced.

## Configuration Options

### `suffix` (string)
- Suffix used to detect signal identifiers; defaults to `"Signal"`.

### `severity` (object)
- `reassignSignal`: severity for re-assignment/aliasing (default: `error`).

### `performance` (object)
- Standard performance budget used across rules.

## Error Messages

- `reassignSignal`: "Avoid re-assigning or aliasing signal '{{name}}'. Access its `.value` or pass it directly instead."

## Auto-fix Suggestions

- Where safe, suggest replacing aliasing with direct usage.
  - Example: `const s = countSignal; doSomething(s.value);`
    - Suggest: inline usage: `doSomething(countSignal.value)` and remove the alias declaration.
- For re-assignment lines, suggest removing the alias or referencing the original name.

Note: Some fixes require non-trivial inlining; default to non-fixable when confidence is low.

## Edge Cases and Clarifications

- __`.value` destructuring__
  - ✅ `const { value } = countSignal;` is allowed (reads the value once). If the project prefers explicit `.value`, consider another rule to enforce style.
- __Type positions / imports / JSX identifiers__
  - Must be excluded from detection.
- __Hook returns that are signals__
  - If a custom hook returns a signal (e.g., `useCountSignal()`), its variable should be treated as a signal and not aliased.

## Examples

### Incorrect

```ts
const s = countSignal;
let a; a = userSignal;
const { s } = { s: countSignal };
const [x] = [countSignal];
```

### Correct

```ts
const v = countSignal.value;
fn(countSignal);
// Prefer direct use instead of aliasing
doSomething(countSignal.value);
```

## Rationale

Aliasing signals hides the reactive source and makes it harder to reason about reactivity boundaries. Keeping the original signal names in use sites improves clarity and discourages patterns that later lead to unsafe mutations or confusing ownership.
