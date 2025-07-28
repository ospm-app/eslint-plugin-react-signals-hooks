# ESLint Plugin Valibot

ESLint plugin providing rules for working with Valibot schemas, including automatic conversion from other validation libraries.

## Installation

```bash
npm install --save-dev eslint-plugin-valibot @eslint-config-validation-schemas
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['valibot'],
  extends: ['@eslint-config-validation-schemas/valibot'],
  rules: {
    'valibot/zod-to-valibot': 'error',
    'valibot/joi-to-valibot': 'error',
    'valibot/arktype-to-valibot': 'error',
    'valibot/type-to-valibot': 'error',
  },
};
```

## Rules

- `zod-to-valibot`: Convert Zod schemas to Valibot
- `joi-to-valibot`: Convert Joi schemas to Valibot
- `arktype-to-valibot`: Convert Arktype schemas to Valibot
- `type-to-valibot`: Convert TypeScript types to Valibot schemas

## Autofix

All rules support autofix. Run ESLint with `--fix` to automatically convert schemas.

## License

MIT
