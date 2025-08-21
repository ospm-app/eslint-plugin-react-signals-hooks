# ESLint Plugin Valibot

ESLint plugin providing rules for working with Valibot schemas, including automatic conversion from other validation libraries.

At this moment only one rule is ready. Please send me your use cases not covered by this plugin in github issues.

## Installation

```bash
npm install --save-dev @ospm/eslint-plugin-valibot
```

## Usage

in your `eslint.config.mjs`

```mjs
import parser from "@typescript-eslint/parser";

import valibotPlugin from "@ospm/eslint-plugin-valibot";

/** @type {import('eslint').Linter.Config[]} */
export default [
 {
  files: ["**/*.tsx", "**/*.ts"],
  plugins: {
   valibot: valibotPlugin,
  },
  rules: {
   "valibot/zod-to-valibot": "warn",
  },
  languageOptions: {
   parser,
   parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
     jsx: true,
    },
   },
  },
 },
];
```

## Rules

- `zod-to-valibot`: Done. Convert Zod schemas to Valibot
- `joi-to-valibot`: TODO: Convert Joi schemas to Valibot
- `arktype-to-valibot`: TODO: Convert Arktype schemas to Valibot
- `type-to-valibot`: TODO: Convert TypeScript types to Valibot schemas

## Autofix

Currently, only `zod-to-valibot` supports autofix. Run ESLint with `--fix` to automatically convert Zod schemas to Valibot.
Other rules will gain autofix support when implemented.

## Other eslint plugins you want to check

@ospm/eslint-plugin-react-signals-hooks <https://www.npmjs.com/package/@ospm/eslint-plugin-react-signals-hooks>

## License

MIT
