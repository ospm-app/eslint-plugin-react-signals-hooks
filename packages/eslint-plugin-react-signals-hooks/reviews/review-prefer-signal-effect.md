# Rule Review: `prefer-signal-effect`

## Potential Issues / Edge Cases

- __Mixed deps__: Arrays with non-signal deps are intentionally ignored; consider an option to suggest splitting or refactoring.
- __No deps array__: `useEffect(cb)` without deps isn’t targeted; rule could optionally flag effects that read signals inside the body.
- __Custom wrappers__: Project-specific wrappers around `useEffect` won’t be detected unless imported and recognized as effects.
- __Import merging nuances__: Appending `, effect` assumes named import list; doesn’t handle namespace or type-only imports.
- __Cleanup semantics__: `effect` cleanup differs from React unmount timing; developer confirmation may be needed in complex cases.

## Recommendations

1. __Extend detection to body reads__
   - Optionally flag `useEffect` bodies that read signals even without a deps array, with a suggestion to move to `effect`.
2. __Configurable deps policy__
   - Add an option to report mixed deps and offer refactoring tips or suggestions to split logic.
3. __Import handling improvements__
   - Merge specifiers robustly, avoid duplicates, and handle empty/namespaced imports.
4. __Documentation notes__
   - Document behavioral differences (timing/cleanup) between React effects and signals `effect` to inform safe migration.
