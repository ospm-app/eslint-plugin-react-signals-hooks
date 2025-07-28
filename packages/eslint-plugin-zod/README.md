# ESLint Plugin Zod

ESLint plugin providing rules for working with Zod schemas, including automatic conversion from other validation libraries.

## Installation

```bash
npm install --save-dev eslint-plugin-zod @eslint-config-validation-schemas
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['zod'],
  extends: ['@eslint-config-validation-schemas/zod'],
  rules: {
    'zod/valibot-to-zod': 'error',
    'zod/joi-to-zod': 'error',
    'zod/arktype-to-zod': 'error',
    'zod/type-to-zod': 'error',
  },
};
```

## Rules

- `valibot-to-zod`: Convert Valibot schemas to Zod
- `joi-to-zod`: Convert Joi schemas to Zod
- `arktype-to-zod`: Convert Arktype schemas to Zod
- `type-to-zod`: Convert TypeScript types to Zod schemas

## Autofix

All rules support autofix. Run ESLint with `--fix` to automatically convert schemas.

## Example

Before:

```typescript
import { object, string, number } from 'valibot';

const userSchema = object({
  name: string(),
  age: number(),
});
```

After autofix:

```typescript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
});
```

## License

MIT
