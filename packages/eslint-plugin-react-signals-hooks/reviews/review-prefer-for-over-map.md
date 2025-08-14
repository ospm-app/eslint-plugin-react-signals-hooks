# Rule Review: `prefer-for-over-map`

## Potential Issues / Edge Cases

- __Complex callbacks__: Reconstruction for object-pattern params or destructuring may not preserve all semantics, especially when the callback body relies on parameter shape.
- __Index inference__: Determining the index parameter name is heuristic; may miss or misname in unusual patterns.
- __Chained expressions__: Cases like `fooSignal?.value.map` or additional method chaining around `.map()` may need broader handling.
- __Formatting__: Replacement may affect code formatting/line breaks; consider using `sourceCode.getText()` judiciously or emitting structured fixes.
- __Import positioning__: Always inserting before the first import may not respect groupings or sort order enforced by linters/formatters.

## Recommendations

1. __Enhance callback analysis__
   - Improve handling of destructured parameters and rest/spread; bail out safely on very complex patterns.
2. __Robust callee matching__
   - Ensure support for optional chaining and nested chains (`ChainExpression`) around `.map()` in all call shapes.
3. __Safer import edits__
   - Detect existing `@preact/signals-react/utils` import and merge `For` specifier rather than always inserting a new import.
4. __Formatting-aware fixes__
   - Consider preserving surrounding whitespace/indentation and using multi-step fixes for better readability.
5. __Configurability__
   - Option to limit rule to known signal libs or disable auto-fix while keeping suggestions.
