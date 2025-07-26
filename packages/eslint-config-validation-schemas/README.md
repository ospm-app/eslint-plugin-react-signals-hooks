# ESLint Config Validation Schemas

Shared ESLint configuration for schema validation libraries, providing consistent rules and settings across all validation schema ESLint plugins.

## Supported Validation Libraries

### 1. Valibot

- **Website**: [valibot.dev](https://valibot.dev/)
- **GitHub**: [fabian-hiller/valibot](https://github.com/fabian-hiller/valibot)
- **Author**: Fabian Hiller ([@fabianhiller_](https://twitter.com/fabianhiller_))
- **Description**: A modular and type-safe schema validation library with a focus on bundle size and developer experience.
- **Key Features**:
  - Tree-shakable (only include what you use)
  - TypeScript-first with full type inference
  - Small bundle size (1.5KB minzipped)
  - Functional API with method chaining

### 2. Zod

- **Website**: [zod.dev](https://zod.dev/)
- **GitHub**: [colinhacks/zod](https://github.com/colinhacks/zod)
- **Author**: Colin McDonnell ([@colinhacks](https://twitter.com/colinhacks))
- **Description**: TypeScript-first schema validation with static type inference.
- **Key Features**:
  - Zero dependencies
  - Works in Node.js and browsers
  - Immutable and chainable API
  - Powerful type inference

### 3. Joi

- **Website**: [joi.dev](https://joi.dev/)
- **GitHub**: [hapijs/joi](https://github.com/hapijs/joi)
- **Author**: Hapi.js team
- **Description**: The most powerful schema description language and data validator for JavaScript.
- **Key Features**:
  - Object schema description language
  - Works in Node.js and browsers
  - Powerful validation capabilities
  - Long-standing, battle-tested library

### 4. ArkType

- **Website**: [arktype.io](https://arktype.io/)
- **GitHub**: [arktypeio/arktype](https://github.com/arktypeio/arktype)
- **Author**: David Sherret ([@david-sherret](https://github.com/david-sherret))
- **Description**: TypeScript's 1:1 validator, optimized from editor to runtime.
- **Key Features**:
  - TypeScript-first with full type inference
  - Editor autocompletion
  - Runtime type checking
  - Small bundle size

## API Comparison

| Feature | Valibot | Zod | Joi | Arktype |
|---------|---------|-----|-----|---------|
| Type Safety | ✅ | ✅ | ❌ | ✅ |
| Type Inference | ✅ | ✅ | ❌ | ✅ |
| Bundle Size | ⭐ (1.5KB) | ⭐⭐ (8KB) | ⭐⭐⭐ (12KB) | ⭐ (2KB) |
| Tree-shaking | ✅ | ❌ | ❌ | ✅ |
| Browser Support | ✅ | ✅ | ✅ | ✅ |
| Node.js Support | ✅ | ✅ | ✅ | ✅ |
| Custom Validators | ✅ | ✅ | ✅ | ✅ |
| Async Validation | ✅ | ✅ | ✅ | ✅ |
| Transformations | ✅ | ✅ | ✅ | ✅ |
| Default Values | ✅ | ✅ | ✅ | ✅ |
| Custom Errors | ✅ | ✅ | ✅ | ✅ |
| Coercion | ✅ | ✅ | ✅ | ✅ |
| Immutable API | ✅ | ✅ | ✅ | ✅ |

## Installation

```bash
npm install --save-dev @ospm/eslint-config-validation-schemas
```

## Usage

In your `.eslintrc.js`:

```javascript
module.exports = {
  extends: [
    '@ospm/eslint-plugin-valibot', // or any other validation library you're using
  ],
};
```

## Features

- Consistent code style for schema definitions
- Autofix support for schema migrations between validation libraries
- TypeScript support out of the box
- Customizable rules for different project needs
- Automatic import management for validation libraries
- Schema validation rules specific to each library's best practices

## Migrating Between Validation Libraries

This package provides rules to help migrate between different validation libraries. The rules can automatically convert schemas from one format to another, making it easier to switch between different validation libraries as your needs change.

## License

MIT
