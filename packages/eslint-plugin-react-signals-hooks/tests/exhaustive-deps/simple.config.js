import tsParser from '@typescript-eslint/parser';
import reactSignalsHooksPlugin from '../../dist/cjs/index.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      // Only enable the rule we want to test
      'react-signals-hooks/exhaustive-deps': 'error',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: '../../tsconfig.tests.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
