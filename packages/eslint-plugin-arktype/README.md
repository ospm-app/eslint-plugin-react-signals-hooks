# ESLint Plugin Arktype

ESLint plugin providing rules for working with Arktype schemas, including automatic conversion from other validation libraries.

## Installation

```bash
npm install --save-dev eslint-plugin-arktype @eslint-config-validation-schemas
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['arktype'],
  extends: ['@eslint-config-validation-schemas/arktype'],
  rules: {
    'arktype/valibot-to-arktype': 'error',
    'arktype/zod-to-arktype': 'error',
    'arktype/joi-to-arktype': 'error',
    'arktype/type-to-arktype': 'error',
  },
};
```

## Rules

- `valibot-to-arktype`: Convert Valibot schemas to Arktype
- `zod-to-arktype`: Convert Zod schemas to Arktype
- `joi-to-arktype`: Convert Joi schemas to Arktype
- `type-to-arktype`: Convert TypeScript types to Arktype schemas

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
import { type } from 'arktype';

const userSchema = type({
  name: 'string',
  age: 'number',
});
```

## License

MIT

```

After autofix:

```typescript
import { type } from 'arktype';

const userSchema = type({
  name: 'string',
  age: 'number',
});
```

## License

MIT
