# ESLint 8 Test Package for @ospm/eslint-plugin-react-signals-hooks

This package is used to test the compatibility of `@ospm/eslint-plugin-react-signals-hooks` with ESLint 8.x.

## Setup

1. Build the main package:

   ```bash
   cd ../..
   npm run build
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Running Tests

To run the ESLint tests against the sample files:

```bash
npm test
```

## Purpose

This test package ensures that the plugin works correctly with:

- ESLint 8.x
- TypeScript
- React
- The legacy `.eslintrc.js` configuration format

## Files

- `tests/signals-test.tsx` - Sample file containing various patterns that should trigger different rules
- `.eslintrc.js` - ESLint configuration using the legacy format
- `tsconfig.json` - TypeScript configuration for the test files
