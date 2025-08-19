# Rule Review: `warn-on-unnecessary-untracked`

## Potential Issues / Edge Cases

- __Reactive-context breadth__: Depending on project patterns, `isInReactiveContext` may under/over-approximate “reactive”; consider tuning options. — STATUS: TODO
- __Complex arrow bodies__: Replacing `untracked` with body text assumes source fidelity; unusual formatting/comments may need manual review. — STATUS: TODO
- __Chained calls__: `.peek()` detection is specific to `.value.peek()` with no args; other forms won’t be flagged. — STATUS: TODO

## Recommendations

1. __Document reactive-context definition__ — STATUS: TODO
   - Clarify what contexts are considered reactive. Provide examples for effects, event handlers, and render. — STATUS: TODO
2. __Broaden `.peek()` detection__ — STATUS: TODO
   - Consider recognizing `.peek()` directly on signals when projects implement custom wrappers. — STATUS: TODO
3. __Config to always suggest in effects__ — STATUS: TODO
   - Add an option to surface suggestions even when `allowInEffects` is true, but perhaps as `warn` severity. — STATUS: TODO

## Example

- ❌ Incorrect

```tsx
// In render/JSX
const v = untracked(() => countSignal.value);
return <div>{countSignal.value.peek()}</div>;
```

- ✅ Correct

```tsx
const v = countSignal.value;
return <div>{countSignal.value}</div>;
```
