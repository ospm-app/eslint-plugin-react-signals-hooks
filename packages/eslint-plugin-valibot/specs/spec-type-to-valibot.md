# Spec: type-to-valibot

- __Rule name__: `valibot/type-to-valibot`
- __Type__: suggestion, autofixable (code)
- __Docs__: `packages/eslint-plugin-valibot/docs/rules/type-to-valibot.md`

## Summary

Guides converting TypeScript-only validation assumptions into explicit Valibot schemas.

- Ensures Valibot availability (namespace import presence).
- Optionally scaffolds conservative runtime schemas for simple shapes.

## Why

- Explicit runtime validation is preferable to relying on TS-only checks.

## Bad

```ts
type User = { name: string }
// no runtime schema
```

## Good

```ts
import * as v from 'valibot';
const userSchema = v.object({ name: v.string() });
type User = v.InferOutput<typeof userSchema>;
```

## Autofix

- __Imports__: Ensure `import * as v from 'valibot'` exists (respect existing import groups). If `v` collides, use `v1`.
- __Schema scaffolding (optional, conservative)__:
  - For inline type literals attached to variables with validation intent (heuristics), propose inserting a sibling `const <Name>Schema = v.object(...)`.
  - Only scaffold for simple shapes: string/number/boolean/date arrays/objects without unions/intersections.

### Message IDs

- `ensureValibotImport`: Suggest adding the Valibot namespace import.
- `scaffoldSchema`: Suggest scaffolding a corresponding Valibot schema for simple type literals.

## Options

- None.

## Performance

- Low. Single-pass AST scan. Uses `context.sourceCode.getDeclaredVariables` and syntactic checks; no type services required.

## Implementation notes

- File: `src/type-to-valibot.ts`.

## Autofix details

- __Minimal changes first__: only insert a namespace import for Valibot if missing. No deletion/renames of existing code.
- __Formatting__: Preserve quote style/semicolons/comments and import order.
- __Guardrails__: Do not attempt to transform arbitrary types; scaffolding is limited to clear, literal object shapes.

### Transform stages (implementation plan)

- __Stage 1: Namespace ensure__
  - Ensure a single `import * as v from 'valibot'` at top-level. Handle collisions: `v`, `v1`, etc.

- __Stage 2: Detect simple object literal types__
  - Pattern: `type X = { a: string; b: number }` or `interface X { a: string; b: number }` in files that also perform validation/IO.
  - Scaffold (suggest or fix, behind option): `const XSchema = v.object({ a: v.string(), b: v.number() })`.

- __Stage 3: Primitive arrays__
  - `string[]` → `v.array(v.string())` when used as property in the object literal.

- __Stage 4: Messages & options__
  - None by default; leave placeholders for later refinement.

### Triggers (diagnostics)

- __Missing Valibot import__
  - If file contains any of:
    - `type`/`interface` declarations AND any usage suggesting validation/IO boundaries (heuristics: fetch, api, router, parse, serialize, form submission, props typing in components).
  - Report `ensureValibotImport` at the file start (Program node) or at first import group boundary.

- __Eligible simple shapes__
  - `TSInterfaceDeclaration` or `TSTypeAliasDeclaration` with a top-level `TSTypeLiteral` containing only:
    - `TSStringKeyword`, `TSNumberKeyword`, `TSBooleanKeyword`, `TSTypeReference<Date>`
    - `TSArrayType` of the previous primitives
  - Report `scaffoldSchema` on the identifier name, proposed fix adds `const NameSchema = v.object({ ... })` below the declaration.

### Autofix algorithm details

- __Import ensure__
  1. Scan top-level import declarations.
  2. If no `import * as v from 'valibot'`, insert one above the first non-comment token, preserving newline and grouping.

- __Scaffold schema__ (only for simple shapes)
  1. Build property map by visiting `TSPropertySignature`s of the shape.
  2. Map TS primitives to Valibot:
     - `string` → `v.string()`
     - `number` → `v.number()`
     - `boolean` → `v.boolean()`
     - `Date` → `v.date()`
     - `T[]` or `Array<T>` → `v.array(<mapped T>)`
  3. Emit: `const ${schemaNamePattern} = v.object({<props>});` under the type/interface.
  4. Skip optionality/null/union/readonly/index signatures.

### Examples

#### Incorrect (no runtime schema)

```ts
type User = { name: string; age: number };
// consumed at IO boundary without runtime validation
```

#### Correct (import ensured, schema present)

```ts
import * as v from 'valibot';
const userSchema = v.object({ name: v.string(), age: v.number() });
type User = v.InferOutput<typeof userSchema>;
```

### Safety & limits

- Skip unions, intersections, mapped types, conditional types, template literal types.
- Skip indexed signatures and computed names.
- Only scaffold when property types map 1:1 to `v.string() | v.number() | v.boolean() | v.date() | v.array(simple)`.
- Do not modify existing runtime code; scaffolding is additive.
- Idempotent: do not re-insert existing schema constants; detect by name.
- Apply atomic edits (do not partially scaffold if any property is unsupported).

### Test plan (concise)

- Import ensure: adds `import * as v from 'valibot'` once; preserves formatting.
- Object literal: `type X = { a: string; b: number }` → scaffold `XSchema` with `v.object`.
- Primitive arrays: `tags: string[]` → `v.array(v.string())` in scaffold.
- Skip unions/intersections and complex types.
- Collision handling for `v` and schema names.

### Open questions

- Should we scaffold for `readonly` properties? Proposal: treat as normal.
- Should we infer nullable/optional to `v.optional(...)`? Proposal: not in v1, avoid false positives.
- Should we add a fixer suggestion instead of autofix for scaffolding by default? Proposal: yes, unless `scaffold: true`.

## Fix application strategy

- __Order__: Namespace ensure → Diagnostics → Scaffold suggestions.
- __Atomic chunks__: Apply per-declaration; skip scaffolding if any property is unsupported.
- __Multiple passes__: Allow re-run after user accepts scaffolds; should remain idempotent.
- __Idempotency__: Re-running the rule yields no diffs once imports and scaffolds exist.

## Scope and conflicts

- __Scope-aware__: Do not introduce `v` if already imported under a different name; select `v`/`v1` avoiding collisions.
- __Namespace target__: Prefer `import * as v from 'valibot'` at top; respect existing import groups.
- __Name collisions__: If `v` is taken, use `v1` (configurable later).
- __Mixed libs__: Coexistence with other validators is allowed; this rule only ensures Valibot presence and optional scaffolds.

## References

- Valibot docs: https://valibot.dev

