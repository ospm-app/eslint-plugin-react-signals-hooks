# Rule Review: `restrict-signal-locations`

## Potential Issues / Edge Cases

- __False positives in atypical component naming__: If components use unconventional naming, `isComponent` heuristics (PascalCase/memo/forwardRef) may miss or misclassify. — STATUS: TODO
- __Allowed directories require absolute/normalized paths__: Mixed path forms can cause mismatches; documentation should emphasize normalization. — STATUS: TODO
- __Aliased wrapper factories__: If projects wrap `signal`/`computed` in local factories, rule won’t catch without additional configuration. — STATUS: TODO
- __No autofix__: Moving signal creation out of components or inlining values is intentionally manual; consider codemod guidance in docs. — STATUS: TODO

## Recommendations

1. __Document directory matching__ — STATUS: TODO
   - Clarify path expectations and examples for `allowedDirs` (absolute vs relative) and platform path separators. — STATUS: TODO
2. __Configurable component detection__ — STATUS: TODO
   - Expose an option to provide a component name regex, similar to `customHookPattern`. — STATUS: TODO
3. __Custom creators option__ — STATUS: TODO
   - Allow specifying additional factory identifiers treated as signals/computed, for teams with wrappers. — STATUS: TODO
4. __Suggestion mode__ — STATUS: TODO
   - Non-fix suggestions that link to docs or recommended refactor patterns could aid adoption without risky edits. — STATUS: TODO

## Example

- ❌ Incorrect

```tsx
function Counter() {
  const count = signal(0);
  return <div>{count.value}</div>;
}

export const globalCount = signal(0);
```

- ✅ Correct

```tsx
// signals created in module scope are allowed (and not exported)
const count = signal(0);

function Counter() {
  const n = count.value; // read only
  return <div>{n}</div>;
}

// if you must share, export getters or utils, not the signal itself
export function getGlobalCount() {
  return globalCount.value;
}
```
