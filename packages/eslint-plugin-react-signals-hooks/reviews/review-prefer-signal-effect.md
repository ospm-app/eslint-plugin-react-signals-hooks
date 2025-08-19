# Rule Review: `prefer-signal-effect`

## Potential Issues / Edge Cases

- __Mixed deps__: Arrays with non-signal deps are intentionally ignored; consider an option to suggest splitting or refactoring. — STATUS: TODO
- __No deps array__: `useEffect(cb)` without deps is now suggested (not auto-fixed) when the callback reads signals. — STATUS: DONE (suggestion-only)
- __Custom wrappers__: Project-specific wrappers around `useEffect` won’t be detected unless imported and recognized as effects. — STATUS: TODO
- __Import merging nuances__: Appending `, effect` assumes named import list; doesn’t handle namespace or type-only imports. — STATUS: DONE (handled via `ensureNamedImportFixes` that merges/augments existing imports and avoids duplicates)
- __Cleanup semantics__: `effect` cleanup differs from React unmount timing; developer confirmation may be needed in complex cases. — STATUS: TODO

## Recommendations

1. __Extend detection to body reads__ — STATUS: DONE (suggestion-only)
   - Flag `useEffect` bodies that read signals even without a deps array, with a suggestion to move to `effect`. — STATUS: DONE
2. __Configurable deps policy__ — STATUS: TODO
   - Add an option to report mixed deps and offer refactoring tips or suggestions to split logic. — STATUS: TODO
3. __Import handling improvements__ — STATUS: DONE
   - Merge specifiers robustly, avoid duplicates, and handle empty/namespaced imports. — STATUS: DONE (via `ensureNamedImportFixes`)
4. __Documentation notes__ — STATUS: TODO
   - Document behavioral differences (timing/cleanup) between React effects and signals `effect` to inform safe migration. — STATUS: TODO
