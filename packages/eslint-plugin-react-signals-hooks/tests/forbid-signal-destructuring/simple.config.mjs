import tsParser from '@typescript-eslint/parser';

import reactSignalsHooksPlugin from '../../dist/esm/index.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      'react-signals-hooks/forbid-signal-destructuring': [
        'warn',
        {
          suffix: 'Signal',
          severity: {
            destructureSignal: 'warn',
          },
          performance: {
            // Keep metrics off and sensible limits for tests
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
