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

      // Common rules used across test suites
      'react-signals-hooks/exhaustive-deps': [
        'warn',
        {
          requireExplicitEffectDeps: true,
          enableAutoFixForMemoAndCallback: true,
          performance: {
            enableMetrics: false,
            maxNodes: 5_000,
            maxTime: 1_000,
            maxOperations: {},
          },
        },
      ],
      'react-signals-hooks/require-use-signals': [
        'warn',
        {
          ignoreComponents: [],
          performance: {
            enableMetrics: false,
            maxNodes: 5_000,
            maxTime: 1_000,
          },
        },
      ],

      // Helpful additional rules
      'react-signals-hooks/signal-variable-name': 'warn',
      'react-signals-hooks/forbid-signal-destructuring': 'warn',
      'react-signals-hooks/forbid-signal-re-assignment': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',

      // Performance optimization rules
      'react-signals-hooks/prefer-computed': 'warn',
      'react-signals-hooks/prefer-signal-reads': 'warn',
      'react-signals-hooks/prefer-for-over-map': 'warn',
      'react-signals-hooks/prefer-signal-in-jsx': 'warn',
      'react-signals-hooks/prefer-signal-effect': 'warn',
      'react-signals-hooks/prefer-batch-updates': 'warn',
      'react-signals-hooks/prefer-signal-methods': 'warn',
      'react-signals-hooks/prefer-show-over-ternary': 'warn',
      'react-signals-hooks/prefer-use-signal-over-use-state': 'warn',
      'react-signals-hooks/prefer-use-signal-ref-over-use-ref': 'warn',

      // Error prevention rules
      'react-signals-hooks/no-mutation-in-render': 'warn',
      'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
      'react-signals-hooks/no-signal-creation-in-component': 'warn',
      'react-signals-hooks/no-non-signal-with-signal-suffix': 'warn',
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
