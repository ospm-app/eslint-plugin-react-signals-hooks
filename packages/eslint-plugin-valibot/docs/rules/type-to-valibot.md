# TypeScript to Valibot Conversion

This rule automatically converts TypeScript types to Valibot schemas.

## Type Mappings

### Primitives

| TypeScript | Valibot |
|------------|---------|
| `string` | `string()` |
| `number` | `number()` |
| `boolean` | `boolean()` |
| `Date` | `date()` |
| `any` | `any()` |
| `unknown` | `unknown()` |
| `never` | `never()` |
| `null` | `null_()` |
| `undefined` | `undefined_()` |

### Objects

```typescript
// TypeScript
type User = {
  name: string;
  age: number;
  email?: string;
};

// Valibot
const UserSchema = object({
  name: string(),
  age: number(),
  email: optional(string()),
});
```

### Arrays

```typescript
// TypeScript
type StringArray = string[];

// Valibot
const StringArray = array(string());
```

### Unions

```typescript
// TypeScript
type StringOrNumber = string | number;

// Valibot
const StringOrNumber = union([
  string(),
  number(),
]);
```

### Tuples

```typescript
// TypeScript
type Point = [number, number];

// Valibot
const Point = tuple([
  number(),
  number(),
]);
```

### Literal Types

```typescript
// TypeScript
type Status = 'active' | 'inactive' | 'pending';

// Valibot
const Status = union([
  literal('active'),
  literal('inactive'),
  literal('pending'),
]);
```

### Record Types

```typescript
// TypeScript
type StringRecord = Record<string, number>;

// Valibot
const StringRecord = record(number());
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
    '@ospm/valibot/type-to-valibot': 'error',
  },
};
```

## Auto-fixable

This rule is auto-fixable. Run ESLint with `--fix` to automatically convert TypeScript types to Valibot schemas.
