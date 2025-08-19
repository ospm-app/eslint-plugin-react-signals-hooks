# Rule Review: `prefer-computed`

## Potential Issues / Edge Cases

- __Heuristic-based detection__: Relies on naming suffix and `.value` access; signals without suffix or via indirect references may be missed. — STATUS: TODO
- __Rename breadth__: Variable renaming and reference updates are non-trivial; could miss shadowed bindings or special patterns (destructuring, re-exports, type-only refs). — STATUS: TODO
- __useMemo variants__: Member-access forms (e.g., `React.useMemo`) should be consistently covered; ensure all callee shapes are handled. — STATUS: TODO
- __Accessor inference__: The JSX and scope-based rules are heuristic; some contexts may need different accessor usage (e.g., inside computed itself or in nested callbacks). — STATUS: TODO
- __Import merging__: When an existing `@preact/signals-react` import exists, adding `, computed` assumes named import list formatting and may affect code style tools. — STATUS: TODO
- __Import merging__: Uses shared `ensureNamedImportFixes()` to merge/add `computed` respecting existing specifiers, quote, and semicolon style. — STATUS: DONE

## Recommendations

1. __Robust callee detection__ — STATUS: TODO
   - Ensure both `useMemo` and `React.useMemo` are consistently matched. — STATUS: TODO
2. __Safer renaming__ — STATUS: TODO
   - Use scope analysis to avoid renaming across shadowed bindings; detect and bail out on complex cases. — STATUS: TODO
3. __Accessor adjustments__ — STATUS: TODO
   - Expand context analysis for `.value` vs `.peek()` (e.g., inside event handlers, async callbacks, or memo bodies). — STATUS: TODO
4. __Import handling__ — STATUS: DONE
   - Merge import specifiers while preserving formatting/order; avoid trailing comma pitfalls. — STATUS: DONE
5. __Configurability__ — STATUS: TODO
   - Add options to skip auto-renaming or to require explicit suffix, and to control JSX accessor behavior. — STATUS: TODO
