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
      'react-signals-hooks/prefer-computed': [
        'error',
        {
          // Performance budget configuration
          performance: {
            // Enable performance metrics collection
            enableMetrics: false,
            // Maximum number of nodes to process before bailing out
            maxNodes: 5_000, // Higher for tests
            // Maximum time in milliseconds to spend on a single file
            maxTime: 1_000, // 1 second
            // Maximum number of operations before bailing out
            maxOperations: {},
          },
        },
      ],

      'react-signals-hooks/exhaustive-deps': 'warn',
      'react-signals-hooks/require-use-signals': 'warn',
      'react-signals-hooks/signal-variable-name': 'warn',
      'react-signals-hooks/restrict-signal-locations': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',

      // Performance optimization rules
      'react-signals-hooks/prefer-signal-reads': 'warn',
      'react-signals-hooks/prefer-for-over-map': 'warn',
      'react-signals-hooks/prefer-signal-in-jsx': 'warn',
      'react-signals-hooks/prefer-signal-effect': 'warn',
      'react-signals-hooks/prefer-batch-updates': 'warn',
      'react-signals-hooks/prefer-signal-methods': 'warn',
      'react-signals-hooks/prefer-show-over-ternary': 'warn',
      'react-signals-hooks/prefer-batch-for-multi-mutations': [
        'warn',
        { minMutations: 2, maxMutations: 10 },
      ],
      'react-signals-hooks/prefer-use-signal-over-use-state': 'warn',

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
