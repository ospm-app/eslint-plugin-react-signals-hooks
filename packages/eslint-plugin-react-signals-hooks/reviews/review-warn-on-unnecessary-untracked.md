# Rule Review: `warn-on-unnecessary-untracked`

## Potential Issues / Edge Cases

- __Reactive-context breadth__: Depending on project patterns, `isInReactiveContext` may under/over-approximate “reactive”; consider tuning options.
- __Complex arrow bodies__: Replacing `untracked` with body text assumes source fidelity; unusual formatting/comments may need manual review.
- __Chained calls__: `.peek()` detection is specific to `.value.peek()` with no args; other forms won’t be flagged.

## Recommendations

1. __Document reactive-context definition__
   - Clarify what contexts are considered reactive. Provide examples for effects, event handlers, and render.
2. __Broaden `.peek()` detection__
   - Consider recognizing `.peek()` directly on signals when projects implement custom wrappers.
3. __Config to always suggest in effects__
   - Add an option to surface suggestions even when `allowInEffects` is true, but perhaps as `warn` severity.

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
