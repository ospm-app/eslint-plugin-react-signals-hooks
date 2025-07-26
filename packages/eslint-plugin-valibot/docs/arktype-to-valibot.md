# Arktype to Valibot Conversion

This rule automatically converts Arktype schemas to their Valibot equivalents.

## API Mappings

### Primitives

| Arktype | Valibot |
|---------|---------|
| `'string'` | `string()` |
| `'number'` | `number()` |
| `'boolean'` | `boolean()` |
| `'Date'` | `date()` |
| `'any'` | `any()` |
| `'unknown'` | `unknown()` |
| `'never'` | `never()` |
| `'null'` | `null_()` |
| `'undefined'` | `undefined_()` |

### Objects

```typescript
// Arktype
const UserSchema = type({
  name: 'string',
  age: 'number',
});

// Valibot
const UserSchema = object({
  name: string(),
  age: number(),
});
```

### Arrays

```typescript
// Arktype
const StringArray = type('string[]');
// or
const StringArray = type(['string']);

// Valibot
const StringArray = array(string());
```

### Unions

```typescript
// Arktype
const StringOrNumber = type('string | number');
// or
const StringOrNumber = type(['string', 'number']);

// Valibot
const StringOrNumber = union([
  string(),
  number(),
]);
```

### Validation

```typescript
// Arktype
const PasswordSchema = type('string>8&<100&/[A-Z]/');

// Valibot
const PasswordSchema = string([
  minLength(8),
  maxLength(100),
  pattern(/[A-Z]/),
]);
```

### Optional Fields

```typescript
// Arktype
const Schema = type({
  name: 'string?',
  age: 'number',
});

// Valibot
const Schema = object({
  name: optional(string()),
  age: number(),
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
    '@ospm/valibot/arktype-to-valibot': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert Arktype schemas to Valibot.
