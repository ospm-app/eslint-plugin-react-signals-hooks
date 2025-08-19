# Rule Review: `prefer-for-over-map`

## Potential Issues / Edge Cases

- __Complex callbacks__: Reconstruction for object-pattern params or destructuring may not preserve all semantics, especially when the callback body relies on parameter shape. — STATUS: TODO
- __Index inference__: Determining the index parameter name is heuristic; may miss or misname in unusual patterns. — STATUS: TODO
- __Chained expressions__: Cases like `fooSignal?.value.map` or additional method chaining around `.map()` may need broader handling. — STATUS: TODO
- __Formatting__: Replacement may affect code formatting/line breaks; consider using `sourceCode.getText()` judiciously or emitting structured fixes. — STATUS: TODO
- __Import positioning__: Always inserting before the first import may not respect groupings or sort order enforced by linters/formatters. — STATUS: TODO

## Recommendations

1. __Enhance callback analysis__ — STATUS: TODO
   - Improve handling of destructured parameters and rest/spread; bail out safely on very complex patterns. — STATUS: TODO
2. __Robust callee matching__ — STATUS: TODO
   - Ensure support for optional chaining and nested chains (`ChainExpression`) around `.map()` in all call shapes. — STATUS: TODO
3. __Safer import edits__ — STATUS: TODO
   - Detect existing `@preact/signals-react/utils` import and merge `For` specifier rather than always inserting a new import. — STATUS: TODO
4. __Formatting-aware fixes__ — STATUS: TODO
   - Consider preserving surrounding whitespace/indentation and using multi-step fixes for better readability. — STATUS: TODO
5. __Configurability__ — STATUS: TODO
   - Option to limit rule to known signal libs or disable auto-fix while keeping suggestions. — STATUS: TODO
