# Spec: zod-to-valibot

- __Rule name__: `valibot/zod-to-valibot`
- __Type__: suggestion, autofixable (code)
- __Docs__: `packages/eslint-plugin-valibot/docs/rules/zod-to-valibot.md`

## Summary

Encourages migration from Zod to Valibot. Detects `import 'zod'` and offers an autofix to `import 'valibot'`. Rewrites many common Zod APIs to Valibot equivalents when safe.

## Why

- Single validation library across the codebase reduces bundle size and cognitive load.
- Aligns with project standardization on Valibot.

## Autofix

- __Imports and identifiers__
  - `import { z } from 'zod'` → `import * as v from 'valibot'`
  - Replace `z.` prefixes with `v.`

- __Chained methods → Pipelines__ (Implemented)
  - `z.string().email().endsWith('@x.com')` → `v.pipe(v.string(), v.email(), v.endsWith('@x.com'))`

- __Chained parse APIs → functions__ (Implemented)
  - `.parse(x)` → `v.parse(schema, x)`
  - `.safeParse(x)` → `v.safeParse(schema, x)`

- __Top-level validators__ (Implemented)
  - `z.email()` / `z.url()` / `z.uuid()` / `z.cuid()` / `z.cuid2()` → `v.pipe(v.string(), v.email()|v.url()|v.uuid()|v.cuid2())`

- __Name changes (per official guide)__ (Partially implemented)
  - `and`/`intersection` → `intersect`
  - `catch` → `fallback`
  - `catchall` → `objectWithRest`
  - `coerce` → use `v.pipe(schema, v.transform(fn))`
  - `datetime` → `isoDate` or `isoDateTime`
  - `default` → `optional`
  - `discriminatedUnion` → `variant`
  - `element` → `item`
  - `enum` → `picklist` (for literal unions), `enum` (for native enum)
  - `extend` → object merging (see intersections guide)
  - `gt` → `gtValue`, `gte`/`min` → `minValue` / `minLength` / `minSize`
  - `int` → `integer`, `safe` → `safeInteger`
  - `input`/`output`/`infer` → `InferInput` / `InferOutput`
  - `instanceof` → `instance`
  - `lt` → `ltValue`, `lte`/`max` → `maxValue` / `maxLength` / `maxSize`
  - `nativeEnum` → `enum`
  - `or` → `union`
  - `passthrough` → `looseObject`, `strict` → `strictObject`, `strip` → `object`
  - `refine` → `check`, `superRefine` → `rawCheck` / `rawTransform`
  - `rest` (tuple) → `tuple`

- __Object and tuple modes__ (Implemented; safe patterns)
  - `.strict()` on `z.object(shape)` → `v.strictObject(shape)`
  - `.passthrough()` → `v.looseObject(shape)`
  - `.strip()` → `v.object(shape)`
  - `.catchall(schema)` → `v.objectWithRest(shape, schema)`
  - `z.tuple(items).rest(rest)` → `v.tupleWithRest(items, rest)`

- __Lazy and Custom__ (Implemented)
  - `z.lazy(fn)` → `v.lazy(fn)` (full callee highlight/fix)
  - `z.custom<T>(predicate)` → `v.custom<T>(predicate)` (full callee highlight/fix)

- __Object and tuple modes__ (Implemented; safe patterns)
  - `.strict()` → `v.strictObject({...})`
  - `.passthrough()` → `v.looseObject({...})`
  - `.strip()` → `v.object({...})`
  - `.catchall(schema)` → `v.objectWithRest({...}, schema)`
  - Tuple `.rest()` → `v.tuple([...])`

- __Error messages__ (Implemented)
  - Zod per-case objects → Valibot single string per step
  - Example: `z.string({ message: 'Not a string' }).min(5, { message: 'Too short' })`
    → `v.pipe(v.string('Not a string'), v.minLength(5, 'Too short'))`

- __Coerce__ (Implemented)
  - `z.coerce.number()` → `v.pipe(v.unknown(), v.transform(Number))`
  - Recommended: `v.pipe(v.string(), v.decimal(), v.transform(Number))` for safety
  - Implemented for: number, string, boolean, date.

- __Async validation__
  - Supported; API differs (see Valibot async guide)

### Transform stages (current behavior)

- __Stage 1: Import rewrite__
  - Selector: `ImportDeclaration[source.value='zod']`
  - Fix: replace source literal with `'valibot'`. If namespace/default local is `z`, do NOT rename in this stage.

- __Stage 2: Identifier namespace rewrite (safe)__
  - Precondition: file imports `'valibot'` AND has a namespace/default binding named `z` from `'zod'` or remaining after Stage 1.
  - Selector: `MemberExpression[object.name='z']` or `CallExpression[callee.object.name='z']`.
  - Fix: rename `z` identifier reference to `v` if `v` is bound to `import * as v from 'valibot'`. If not present, insert namespace import `import * as v from 'valibot'` once, then update references. Avoid shadowed `z` (respect scope).

- __Stage 3: Chain → pipeline__
  - Detect chains starting with a base schema: `z.<base>()(.modifier(...))*`.
  - Supported bases (implemented): `string, number, bigint, boolean, date, symbol, undefined, null, void, any, unknown, never, literal, array, object, tuple, enum (→ picklist), nativeEnum (→ enum)`.
  - Supported modifiers (implemented):
    - Size/length/value: `min, max, length` → `minLength|minSize|minValue`, `maxLength|maxSize|maxValue`, `length`.
    - String: `email, url, uuid, cuid, cuid2, regex, startsWith, endsWith, includes`.
    - Arrays: `nonempty` → `v.nonEmpty()`.
    - Numbers: `int → integer`, `positive, nonnegative, negative, nonpositive`, `multipleOf`.
    - Comparators: `gt, gte, lt, lte` → `gtValue|minValue|ltValue|maxValue`.
  - Fix: build `v.pipe(v.<base>(...), ...mappedActions)` preserving arguments.
  - Safety: only transform when every step in the chain has a known mapping; otherwise, skip.
  - Top-level validators like `z.email()` are transformed into a string base with an action.

- __Stage 4: `.parse` / `.safeParse` → function calls__
  - Pattern A (simple): `z.<base>(...).parse(arg)` → `v.parse(v.<base>(...), arg)`.
  - Pattern B (chained): `<chain>.parse(arg)` → `v.parse(v.pipe(...mappedChain), arg)` using Stage 3 mapping.
  - Same for `.safeParse` → `v.safeParse(...)`.

- __Stage 5: Object/tuple modes__ (Implemented)
  - `.strict()` on `z.object(shape)` → `v.strictObject(shape)`.
  - `.passthrough()` → `v.looseObject(shape)`.
  - `.strip()` → `v.object(shape)`.
  - `.catchall(rest)` → `v.objectWithRest(shape, rest)`.
  - `z.tuple(items).rest(rest)` → `v.tupleWithRest(items, rest)`. Only apply when safe (exact AST pattern).

- __Stage 6.1: Lazy and Custom__ (Implemented)
  - `z.lazy(fn)` → `v.lazy(fn)`
  - `z.custom<T>(predicate)` → `v.custom<T>(predicate)`

- __Stage 6: Name changes (direct replacements)__ (Implemented subset)
  - `and|intersection` → `intersect`.
  - `catch` → `fallback`.
  - `instanceof` → `instance`.
  - `discriminatedUnion` → `variant`.
  - `enum([...])` → `picklist([...])`; `nativeEnum(Enum)` → `enum(Enum)`.
  - `int` → `integer`, `safe` → `safeInteger`.
  - Comparators: `gt, gte, lt, lte, min, max` → mapped value/length/size variants based on base type.
  - Also: `or` → `union`, `default` → `optional`, `instanceof` → `instance`, `element` → `item`.

- __Stage 7: Coerce__ (Implemented)
  - `z.coerce.number()` → `v.pipe(v.unknown(), v.transform(Number))` or `v.pipe(v.string(), v.decimal(), v.transform(Number))`.
  - Similar for string/boolean/date using appropriate transformers.

- __Stage 8: Error messages normalization__ (Implemented)
  - Zod option objects `{ message: string }` → Valibot per-step string parameter.
  - Example: `z.string({ message: 'Not a string' }).min(5, { message: 'Too short' })` → `v.pipe(v.string('Not a string'), v.minLength(5, 'Too short'))`.

- __Safety & Limits__
  - Only transform when the callee object is the imported `z` from Zod (track via import graph and scope).
  - Skip when encountering unknown methods, computed properties, dynamic callee, or non-literal arguments that would change semantics.
  - Provide suggestions (not automatic fixes) for ambiguous mappings (e.g., `min` on non-obvious base).

### Fix application strategy

- __Order__: Import → Identifier namespace → Name changes → Chain→Pipeline → Parse/SafeParse → Coerce → (Object/tuple modes, Messages when enabled).
- __Atomic chunks__: Apply per-top-level statement to avoid partial chain rewrites if a mapping fails mid-chain.
- __Multiple passes__: Allow a second pass after name changes to enable chain mapping once names are normalized.
- __Idempotency__: Re-running the rule should yield no diffs.

### Scope and conflicts

- __Scope-aware__: Uses ESLint scope to ensure `z` refers to the Zod import (via `context.sourceCode.getScope` and declared variables); does not touch shadowed vars.
- __Namespace target__: Prefer `import * as v from 'valibot'`. If absent, insert once at file top (respect existing import groups).
- __Name collisions__: If `v` is taken, choose `v1` (or configurable) and update all introduced references consistently.
- __Mixed libs__: If both Zod and Valibot are present, proceed with transforms but do not remove remaining Zod imports in this rule.

### Test plan (concise)

- __Imports__
  - default, namespace, named, mixed, type-only, side-effect; preserves quotes/comments/formatting.
- __Chains__
  - string: `min/max/length/nonempty/email/url/uuid/cuid/cuid2/regex/startsWith/endsWith/includes`.
  - number: `min/max/gt/gte/lt/lte/int/safe/positive/negative/nonpositive/nonnegative/multipleOf`.
  - array: `min/max/length/nonempty` → Size mapping.
- __Objects & tuples__
  - `strict/passthrough/strip/catchall`; tuple `rest`.
- __Parse APIs__
  - `.parse/.safeParse` on base and chained schemas.
- __Errors & coerce__
  - `z.coerce.{number|string|boolean|date}()` variants.
- __Edge cases__
  - Shadowed `z`; unknown methods; dynamic callee; identifier collisions; already Valibot; mixed imports; top-level validators like `z.email()` not transformed.

## References

- Valibot migration guide: <https://valibot.dev/guides/migrate-from-zod/>
