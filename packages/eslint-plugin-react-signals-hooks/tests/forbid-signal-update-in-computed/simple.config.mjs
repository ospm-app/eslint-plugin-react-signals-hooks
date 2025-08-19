import tsParser from '@typescript-eslint/parser';

import reactSignalsHooksPlugin from '../../dist/esm/index.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      'react-signals-hooks/forbid-signal-update-in-computed': [
        'warn',
        {
          suffix: 'Signal',
          severity: {
            noSignalWriteInComputed: 'warn',
            noBatchedWritesInComputed: 'warn',
          },
          performance: {
            enableMetrics: false,
            maxNodes: 5_000,
            maxTime: 1_000,
            maxOperations: {},
          },
        },
      ],
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
