# Arktype to Zod Conversion

This rule automatically converts Arktype schemas to their Zod equivalents.

## API Mappings

### Primitives

| Arktype | Zod |
|---------|-----|
| `'string'` | `z.string()` |
| `'number'` | `z.number()` |
| `'boolean'` | `z.boolean()` |
| `'Date'` | `z.date()` |
| `'any'` | `z.any()` |
| `'unknown'` | `z.unknown()` |
| `'never'` | `z.never()` |
| `'null'` | `z.null()` |
| `'undefined'` | `z.undefined()` |

### Objects

```typescript
// Arktype
import { type } from 'arktype';

const UserSchema = type({
  name: 'string',
  age: 'number',
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
// Arktype
import { type } from 'arktype';

const StringArray = type('string[]');
// or
const StringArray = type(['string']);

// Zod
import { z } from 'zod';

const StringArray = z.array(z.string());
```

### Unions

```typescript
// Arktype
import { type } from 'arktype';

const StringOrNumber = type('string | number');
// or
const StringOrNumber = type(['string', 'number']);

// Zod
import { z } from 'zod';

const StringOrNumber = z.union([
  z.string(),
  z.number(),
]);
// or
const StringOrNumber = z.string().or(z.number());
```

### Validation

```typescript
// Arktype
import { type } from 'arktype';

const PasswordSchema = type('string>8&<100&/[A-Z]/');

// Zod
import { z } from 'zod';

const PasswordSchema = z.string()
  .min(8)
  .max(100)
  .regex(/[A-Z]/);
```

### Optional Fields

```typescript
// Arktype
import { type } from 'arktype';

const Schema = type({
  name: 'string?',
  age: 'number',
});

// Zod
import { z } from 'zod';

const Schema = z.object({
  name: z.string().optional(),
  age: z.number(),
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
    '@ospm/zod/arktype-to-zod': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert Arktype schemas to Zod.
