# Zod to Valibot Conversion

This rule automatically converts Zod schemas to their Valibot equivalents.

## API Mappings

### Primitives

| Zod | Valibot |
|-----|---------|
| `z.string()` | `string()` |
| `z.number()` | `number()` |
| `z.boolean()` | `boolean()` |
| `z.date()` | `date()` |
| `z.any()` | `any()` |
| `z.unknown()` | `unknown()` |
| `z.never()` | `never()` |
| `z.void()` | `void()` |
| `z.null()` | `null_()` |
| `z.undefined()` | `undefined_()` |

### Objects

```typescript
// Zod
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Valibot
const UserSchema = object({
  name: string(),
  age: number(),
});
```

### Arrays

```typescript
// Zod
const StringArray = z.array(z.string());

// Valibot
const StringArray = array(string());
```

### Unions

```typescript
// Zod
const StringOrNumber = z.union([z.string(), z.number()]);
// or
const StringOrNumber = z.string().or(z.number());

// Valibot
const StringOrNumber = union([string(), number()]);
```

### Optionals and Nullables

```typescript
// Zod
const Schema = z.object({
  name: z.string().optional(),
  age: z.number().nullable(),
});

// Valibot
const Schema = object({
  name: optional(string()),
  age: nullable(number()),
});
```

### Validation

```typescript
// Zod
const PasswordSchema = z.string().min(8).max(100).regex(/[A-Z]/);

// Valibot
const PasswordSchema = string([
  minLength(8),
  maxLength(100),
  pattern(/[A-Z]/),
]);
```

### Default Values

```typescript
// Zod
const Schema = z.object({
  name: z.string().default('John'),
  age: z.number().default(30),
});

// Valibot
const Schema = object({
  name: string([defaultValue('John')]),
  age: number([defaultValue(30)]),
});
```

## Installation

```bash
npm install --save-dev @ospm/eslint-plugin-valibot
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['@ospm/valibot'],
  rules: {
    '@ospm/valibot/zod-to-valibot': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert Zod schemas to Valibot.

---

## `valibot/zod-to-valibot`

Encourages migration from Zod to Valibot with safe, autofixable transformations. It rewrites imports, identifiers, common chains into Valibot pipelines, and selected APIs with matching semantics.

### ❌ Incorrect

```ts
import { z } from 'zod';

const s1 = z.string().min(5).email();
const s2 = z.object({ a: z.string() }).strict();
const s3 = z.object({ a: z.string() }).catchall(z.number());
const s4 = z.tuple([z.string()]).rest(z.number());
const s5 = z.email();
const s6 = z.lazy(() => z.string());
const s7 = z.custom<`${string}@${string}.${string}`>((v): v is string => typeof v === 'string');
const parsed = s1.parse('abc');
```

### ✅ Correct

```ts
import * as v from 'valibot';

const s1 = v.pipe(v.string(), v.minLength(5), v.email());
const s2 = v.strictObject({ a: v.string() });
const s3 = v.objectWithRest({ a: v.string() }, v.number());
const s4 = v.tupleWithRest([v.string()], v.number());
const s5 = v.pipe(v.string(), v.email());
const s6 = v.lazy(() => v.string());
const s7 = v.custom<`${string}@${string}.${string}`>((v): v is string => typeof v === 'string');
const parsed = v.parse(s1, 'abc');
```

### What this rule converts (implemented)

- __Imports/identifiers__
  - `import { z } from 'zod'` → `import * as v from 'valibot'` and rename `z.` usages to `v.` where safe.

- __Chains → Pipelines__
  - `z.string().min(5).email()` → `v.pipe(v.string(), v.minLength(5), v.email())`.
  - Bases: string, number, bigint, boolean, date, symbol, undefined, null, void, any, unknown, never, literal, array, object, tuple, enum→picklist, nativeEnum→enum.
  - Modifiers: min/max/length, email/url/uuid/cuid/cuid2, regex, startsWith/endsWith/includes, nonempty, int/integer, positive/nonnegative/negative/nonpositive, multipleOf, gt/gte/lt/lte.

- __Top-level validators__
  - `z.email()`/`z.uuid()`/`z.cuid()`/`z.cuid2()`/`z.url()` → `v.pipe(v.string(), v.email()|v.uuid()|...)`.

- __`.parse` / `.safeParse`__
  - `<schema>.parse(x)` → `v.parse(<schemaMapped>, x)`
  - `<schema>.safeParse(x)` → `v.safeParse(<schemaMapped>, x)`

- __Object/tuple modes__
  - `.strict()` → `v.strictObject(shape)`
  - `.passthrough()` → `v.looseObject(shape)`
  - `.strip()` → `v.object(shape)`
  - `.catchall(rest)` → `v.objectWithRest(shape, rest)`
  - `z.tuple(items).rest(rest)` → `v.tupleWithRest(items, rest)`

- __Refinements__
  - `.refine(handler, message?)` → `v.check(handler, message?)` or `v.checkAsync(...)` if `handler` is async.
  - `.superRefine(handler)` → converts simple sync forms to one or more `v.check(...)`; skips complex/async forms.

- __`z.lazy` and `z.custom`__
  - `z.lazy(fn)` → `v.lazy(fn)` with full-callee highlighting.
  - `z.custom<T>(predicate)` → `v.custom<T>(predicate)` with full-callee highlighting.

### Notes

- Fixes insert `import * as v from 'valibot'` once if missing, then rewrite occurrences.
- The rule avoids changes when it cannot confidently map all steps in a chain.
- Re-running the rule is idempotent.
