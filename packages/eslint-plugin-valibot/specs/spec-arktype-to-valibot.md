# Spec: arktype-to-valibot

- __Rule name__: `valibot/arktype-to-valibot`
- __Type__: suggestion, autofixable (code)
- __Docs__: `packages/eslint-plugin-valibot/docs/rules/arktype-to-valibot.md`

## Summary

Promotes migration from Arktype to Valibot. Detects `import 'arktype'` and offers an autofix to `import 'valibot'`. Future iterations rewrite common Arktype patterns to Valibot equivalents when safely matchable.

## Why

- Unify validation across the repo.

## Bad

```ts
import { type } from 'arktype';
```

## Good

```ts
import * as v from 'valibot';
```

## Autofix

- __Imports__: Replace `ImportDeclaration.source.value === 'arktype'` with `'valibot'`.

- __Identifier namespace (safe)__: Where a namespace/default import `type` (or alias) from `'arktype'` is used as a factory, introduce/ensure `import * as v from 'valibot'` and migrate usages gradually (see stages).

- __Selected transformations (when unambiguous)__
  - Arktype object-like definitions to `v.object({...})` when a plain object literal schema is detected.
  - Basic string/number constraints mapped to Valibot actions when clearly expressed.

## Edge cases

- If both Arktype and Valibot are imported, only change the Arktype specifier.

- Do not transform template-string type expressions or inferred contracts unless patterns are explicitly supported.

## Performance

- Single-pass AST visitor focusing on `ImportDeclaration`, with optional passes for safe expression transforms.

## Autofix details

- __Minimal change__: Replace only the module source string `"arktype"` → `"valibot"`.
- __Preserve specifiers__: Keep default/namespace/named imports intact; do not rename locals in this stage.
- __Preserve formatting__: Keep quotes/semicolons/comments and multi-line layouts as-is.
- __Supported import forms__: default, namespace, named, mixed, type-only, side-effect imports.
- __Guardrails__: Exact match only; no changes to usage sites unless covered by stages below.

- __Planned expression rewrites (incremental)__
  - Object shapes: `type({ name: 'string', age: 'number' })` → `v.object({ name: v.string(), age: v.number() })`.
  - String constraints (examples): `'string & email'` → `v.pipe(v.string(), v.email())` when represented as explicit API, not opaque strings.
  - Number constraints: `'number & > 0'` → `v.pipe(v.number(), v.minValue(1))` when expressed as API calls.

### Transform stages (implementation plan)

- __Stage 1: Import rewrite__
  - Selector: `ImportDeclaration[source.value='arktype']` → `'valibot'`.

- __Stage 2: Namespace ensure__
  - Ensure a single `import * as v from 'valibot'` exists for later rewrites. Avoid collisions (`v`, `v1`, ...).

- __Stage 3: Object literal schemas__
  - Detect `type({ ... })` where values are simple scalar kinds (`'string'`, `'number'`, `'boolean'`).
  - Rewrite to `v.object({...})` with `v.string()`, `v.number()`, `v.boolean()`.
  - Safety: skip if values are unions/intersections or computed expressions.

- __Stage 4: Basic refinements__
  - Map clearly identifiable constraints to Valibot actions (e.g., min/max length/value) only when represented as explicit function calls, not string formulas.

- __Stage 5: Parse-like APIs__
  - If an Arktype contract exposes parse/validate equivalents and the schema AST is known, wrap via `v.parse(schema, input)` where possible.

- __Stage 6: Options/messages__
  - Normalize error messages to Valibot's per-step string argument when available.

- __Safety & Limits__
  - Skip template-literal type expressions (e.g., `` type`{name: string}` ``) unless a reliable parser is integrated.
  - Do not change runtime semantics for dynamic/unknown expressions.

### Test plan (concise)

- Imports: all forms; formatting preserved.
- Object literal schema detection → `v.object` with scalar fields.
- Skip complex or computed expressions.
- Introduce/ensure `import * as v from 'valibot'` once.
- Idempotency across multiple rule runs.

- Add safe transforms for common Arktype primitives and object schemas to Valibot equivalents (see docs table).

## Implementation notes

- File: `src/arktype-to-valibot.ts`.

## Safety & limits

- Only transform when Arktype imports are detected; respect scope and avoid shadowed identifiers.
- Apply atomic fixes per top-level statement; skip partial rewrites when any sub-part is unsupported.
- Idempotent across runs; do not re-apply changes if already migrated.
- Avoid string-based template type parsing; operate only on explicit API calls and literals.

## Fix application strategy

- __Order__: Import rewrite → Namespace ensure → Object schema mapping → Basic refinements → Parse-like APIs → Messages.
- __Atomic chunks__: Apply per-top-level statement to avoid partial transformations.
- __Multiple passes__: Allow a follow-up pass after initial name/namespace changes to enable subsequent mappings.
- __Idempotency__: Re-running the rule should produce no diffs.

## Scope and conflicts

- __Scope-aware__: Ensure that targeted identifiers originate from `'arktype'`; skip shadowed/redeclared locals.
- __Namespace target__: Prefer `import * as v from 'valibot'`. If `v` collides, choose `v1` consistently.
- __Mixed libs__: If both Arktype and Valibot are present, proceed with transforms but do not remove remaining Arktype usage in this rule.

## References

- Valibot docs: <https://valibot.dev>
