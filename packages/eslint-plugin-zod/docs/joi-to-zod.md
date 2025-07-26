# Joi to Zod Conversion

This rule automatically converts Joi schemas to their Zod equivalents.

## API Mappings

### Primitives

| Joi | Zod |
|-----|-----|
| `Joi.string()` | `z.string()` |
| `Joi.number()` | `z.number()` |
| `Joi.boolean()` | `z.boolean()` |
| `Joi.date()` | `z.date()` |
| `Joi.any()` | `z.any()` |
| `Joi.alternatives()` | `z.union()` |

### Objects

```typescript
// Joi
const UserSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().required(),
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
// Joi
const StringArray = Joi.array().items(Joi.string());

// Zod
import { z } from 'zod';

const StringArray = z.array(z.string());
```

### Validation

```typescript
// Joi
const PasswordSchema = Joi.string()
  .min(8)
  .max(100)
  .pattern(new RegExp('[A-Z]'));

// Zod
import { z } from 'zod';

const PasswordSchema = z.string()
  .min(8)
  .max(100)
  .regex(/[A-Z]/);
```

### Default Values

```typescript
// Joi
const Schema = Joi.object({
  name: Joi.string().default('John'),
  age: Joi.number().default(30),
});

// Zod
import { z } from 'zod';

const Schema = z.object({
  name: z.string().default('John'),
  age: z.number().default(30),
});
```

### Alternatives (Unions)

```typescript
// Joi
const StringOrNumber = Joi.alternatives().try(
  Joi.string(),
  Joi.number()
);

// Zod
import { z } from 'zod';

const StringOrNumber = z.union([
  z.string(),
  z.number(),
]);
// or
const StringOrNumber = z.string().or(z.number());
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
    '@ospm/zod/joi-to-zod': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert Joi schemas to Zod.
