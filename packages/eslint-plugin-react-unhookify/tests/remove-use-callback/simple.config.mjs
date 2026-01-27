import tsParser from '@typescript-eslint/parser';

// Import from built dist for testing
import reactUnhookifyPlugin from '../../dist/esm/index.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
  {
    files: ['*.tsx'],
    plugins: {
      'react-unhookify': reactUnhookifyPlugin,
    },
    rules: {
      'react-unhookify/remove-use-memo': 'error',
      'react-unhookify/remove-use-callback': 'error',
      'react-unhookify/remove-memo': 'error',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
