# Spec: joi-to-valibot

- __Rule name__: `valibot/joi-to-valibot`
- __Type__: suggestion, autofixable (code)
- __Docs__: `packages/eslint-plugin-valibot/docs/rules/joi-to-valibot.md`

## Summary

Encourages migration from Joi to Valibot. Detects `import 'joi'` and offers an autofix to `import 'valibot'`. Future iterations rewrite common Joi schemas to Valibot equivalents when safely matchable.

## Why

- Standardize on Valibot. Reduce dependency surface area.

## Bad

```ts
import Joi from 'joi';
```

## Good

```ts
import * as v from 'valibot';
```

## Autofix

- __Imports__: Replace `ImportDeclaration.source.value === 'joi'` with `'valibot'`.

- __Selected transformations (when unambiguous)__
  - `Joi.string().email()` → `v.pipe(v.string(), v.email())`.
  - `Joi.number().min(0).max(10)` → `v.pipe(v.number(), v.minValue(0), v.maxValue(10))`.
  - `Joi.array().items(Joi.string()).min(1)` → `v.pipe(v.array(v.string()), v.minSize(1))`.
  - `Joi.object({ name: Joi.string() })` → `v.object({ name: v.string() })`.
  - `schema.validate(value)` → `v.parse(schema, value)` when `schema` is mapped to a Valibot schema in-situ.

## Options

- None.

## Edge cases

- Preserve imported identifiers; only change module path.
- Skip dynamic composition or custom Joi extensions.

## Performance

- Single-pass import visitor; optional safe passes for known patterns.

## Autofix details

- __Minimal change__: Replace only the module source string `"joi"` → `"valibot"`.
- __Preserve specifiers__: Keep default/namespace/named imports intact; do not rename locals in this stage.
- __Preserve formatting__: Keep quotes/semicolons/comments and multi-line layouts as-is.
- __Supported import forms__: default, namespace, named, mixed, type-only, side-effect imports.
- __Guardrails__: Exact match only; no changes to usage sites unless covered by stages below.

- __Planned expression rewrites (incremental)__
  - Strings: `.email()`, `.min(n)`, `.max(n)`, `.pattern(re)` → corresponding Valibot actions `email`, `minLength`, `maxLength`, `regex` when statically known.
  - Numbers: `.min(n)`, `.max(n)`, `.greater(n)`, `.less(n)`, `.integer()` → `minValue`, `maxValue`, `gtValue`, `ltValue`, `integer`.
  - Arrays: `.items(inner)`, `.min(n)`, `.max(n)` → `v.array(inner)`, `minSize`, `maxSize`.
  - Objects: `Joi.object(shape)` → `v.object(mappedShape)`.
  - Validation calls: `.validate(value)` / `.validateAsync(value)` → `v.parse(schema, value)` / `await v.parseAsync(schema, value)` where safe.

### Transform stages (implementation plan)

- __Stage 1: Import rewrite__ → `'valibot'`.
- __Stage 2: Namespace ensure__ → ensure `import * as v from 'valibot'` (resolve collisions `v`, `v1`).
- __Stage 3: Object shape mapping__ → map `Joi.object({ ... })` to `v.object` when every field is safely mappable.
- __Stage 4: Chain mapping__ → map known `.email/.min/.max/...` to `v.pipe(...)` preserving order and messages.
- __Stage 5: Array items__ → `Joi.array().items(inner)` → `v.array(mappedInner)`.
- __Stage 6: Validate APIs__ → `.validate/.validateAsync` → `v.parse/v.parseAsync` if schema mapped.
- __Stage 7: Messages__ → normalize error messages to Valibot per-step string.

### Safety & limits

- Only transform when the callee object is the imported `Joi` (or local alias) from `'joi'`.
- Skip unknown methods, dynamic/computed callees, or custom extensions.
- Apply atomic fixes per top-level statement; skip partial chains.
- Idempotent across runs.

## Fix application strategy

- __Order__: Import rewrite → Namespace ensure → Object/Chain mappings → Validate APIs → Messages.
- __Atomic chunks__: Apply per-top-level statement to avoid partial chain rewrites if a mapping fails.
- __Multiple passes__: Allow a second pass after simple rewrites to enable subsequent mappings.
- __Idempotency__: Re-running the rule should yield no diffs.

## Scope and conflicts

- __Scope-aware__: Ensure transformations only target `Joi` imported from `'joi'`; respect shadowed variables.
- __Namespace target__: Prefer `import * as v from 'valibot'`. If `v` is taken, choose `v1` consistently.
- __Mixed libs__: If both Joi and Valibot are present, proceed with transforms but do not remove remaining Joi imports in this rule.

## References

- Valibot docs: <https://valibot.dev>

## Test plan (concise)

- Imports: all forms; formatting preserved.
- String/number/array chain mappings with messages.
- Object shape mapping with nested inner schemas.
- `.validate`/`.validateAsync` conversions when schema mapped.
- Edge cases: unknown methods, dynamic callee, mixed imports, shadowed `Joi`.

## Implementation notes

- File: `src/joi-to-valibot.ts`
- Uses `ESLintUtils.RuleCreator(getRuleDocUrl)`.
