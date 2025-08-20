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
