# TypeScript to Zod Conversion

This rule automatically converts TypeScript types to Zod schemas.

## Type Mappings

### Primitives

| TypeScript | Zod |
|------------|-----|
| `string` | `z.string()` |
| `number` | `z.number()` |
| `boolean` | `z.boolean()` |
| `Date` | `z.date()` |
| `any` | `z.any()` |
| `unknown` | `z.unknown()` |
| `never` | `z.never()` |
| `null` | `z.null()` |
| `undefined` | `z.undefined()` |
| `void` | `z.void()` |
| `bigint` | `z.bigint()` |
| `symbol` | `z.symbol()` |

### Objects

```typescript
// TypeScript
type User = {
  name: string;
  age: number;
  email?: string;
};

// Zod
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
});
```

### Arrays

```typescript
// TypeScript
type StringArray = string[];

// Zod
import { z } from 'zod';

const StringArray = z.array(z.string());
```

### Tuples

```typescript
// TypeScript
type Point = [number, number];

// Zod
import { z } from 'zod';

const Point = z.tuple([z.number(), z.number()]);
```

### Unions

```typescript
// TypeScript
type StringOrNumber = string | number;

// Zod
import { z } from 'zod';

const StringOrNumber = z.union([z.string(), z.number()]);
// or
const StringOrNumber = z.string().or(z.number());
```

### Literal Types

```typescript
// TypeScript
type Status = 'active' | 'inactive' | 'pending';

// Zod
import { z } from 'zod';

const Status = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('pending'),
]);
```

### Record Types

```typescript
// TypeScript
type StringRecord = Record<string, number>;

// Zod
import { z } from 'zod';

const StringRecord = z.record(z.number());
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
    '@ospm/zod/type-to-zod': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert TypeScript types to Zod schemas.
