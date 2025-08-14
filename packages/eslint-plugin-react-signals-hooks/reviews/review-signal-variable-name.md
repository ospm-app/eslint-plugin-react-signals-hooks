# Rule Review: `signal-variable-name`

## Potential Issues / Edge Cases

- __Over-eager accessor insertion__: Heuristics for JSX vs non-JSX and component scope are best-effort; some contexts might need manual review (e.g., argument position detection in complex calls).
- __Interference with existing API contracts__: If a variable is exported or part of a public API, renaming may require coordinated changes downstream (the rule performs local edits only).
- __Hook-like names not hooks__: Legitimate non-hook variables starting with `use` will be renamed; this matches the rule's goals but should be documented for teams.

## Recommendations

1. __Optional "rename-only" mode__
   - Provide an option to perform only renaming without accessor edits, for teams that prefer staged changes.
2. __Suffix default clarity__
   - Document the implicit default suffix (`Signal`) and show how to configure it explicitly.
3. __Import-aware detection docs__
   - Clarify that detection respects aliased/namespaced imports from `@preact/signals-react` to reduce surprises.
4. __Safer reference updates__
   - Consider suggestion-only mode for complex files where broad edits could be risky, offering a codemod path in docs.

## Example

- ❌ Incorrect

```ts
const count = signal(0); // name does not end with "Signal" and starts lowercase but fails suffix
```

- ✅ Correct

```ts
const countSignal = signal(0);
// reads in JSX:
// return <div>{countSignal.value}</div>
```
