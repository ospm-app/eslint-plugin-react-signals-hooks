# Valibot to Zod Conversion

This rule automatically converts Valibot schemas to their Zod equivalents.

## API Mappings

### Primitives

| Valibot | Zod |
|---------|-----|
| `string()` | `z.string()` |
| `number()` | `z.number()` |
| `boolean()` | `z.boolean()` |
| `date()` | `z.date()` |
| `any()` | `z.any()` |
| `unknown()` | `z.unknown()` |
| `never()` | `z.never()` |
| `null_()` | `z.null()` |
| `undefined_()` | `z.undefined()` |

### Objects

```typescript
// Valibot
import { object, string, number } from 'valibot';

const UserSchema = object({
  name: string(),
  age: number(),
});

// Zod
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});
```

### Arrays

```typescript
// Valibot
import { array, string } from 'valibot';

const StringArray = array(string());

// Zod
import { z } from 'zod';

const StringArray = z.array(z.string());
```

### Unions

```typescript
// Valibot
import { union, string, number } from 'valibot';

const StringOrNumber = union([string(), number()]);

// Zod
import { z } from 'zod';

const StringOrNumber = z.union([z.string(), z.number()]);
// or
const StringOrNumber = z.string().or(z.number());
```

### Optionals and Nullables

```typescript
// Valibot
import { object, string, number, optional, nullable } from 'valibot';

const Schema = object({
  name: optional(string()),
  age: nullable(number()),
});

// Zod
import { z } from 'zod';

const Schema = z.object({
  name: z.string().optional(),
  age: z.number().nullable(),
});
```

### Validation

```typescript
// Valibot
import { string, minLength, maxLength, pattern } from 'valibot';

const PasswordSchema = string([
  minLength(8),
  maxLength(100),
  pattern(/[A-Z]/),
]);

// Zod
import { z } from 'zod';

const PasswordSchema = z.string()
  .min(8)
  .max(100)
  .regex(/[A-Z]/);
```

### Default Values

```typescript
// Valibot
import { object, string, number, defaultValue } from 'valibot';

const Schema = object({
  name: string([defaultValue('John')]),
  age: number([defaultValue(30)]),
});

// Zod
import { z } from 'zod';

const Schema = z.object({
  name: z.string().default('John'),
  age: z.number().default(30),
});
```

## Installation

```bash
npm install --save-dev @ospm/eslint-plugin-zod
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['@ospm/zod'],
  rules: {
    '@ospm/zod/valibot-to-zod': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert Valibot schemas to Zod.
