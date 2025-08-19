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
      // Default configuration
      'react-signals-hooks/restrict-signal-locations': [
        'warn',
        {
          // List of directory prefixes where signals are allowed (prefix match on normalized paths)
          // Example: path.normalize('/repo/packages/app/src/state/')
          allowedDirs: [],
          // Whether to allow computed signals in components
          allowComputedInComponents: false,
          // Pattern to identify custom hooks
          customHookPattern: '^use[A-Z][a-zA-Z0-9]*$',
          // Performance budget configuration
          performance: {
            // Enable performance metrics collection
            enableMetrics: false,
            // Maximum number of nodes to process before bailing out
            maxNodes: 5_000, // Higher for tests
            // Maximum time in milliseconds to spend on a single file
            maxTime: 1_000, // 1 second
            // Maximum number of operations before bailing out
            // maxOperations: {},
          },
        },
      ],
      'react-signals-hooks/require-use-signals': [
        'warn',
        {
          // List of component names to ignore (e.g., ['MyComponent', 'AnotherComponent'])
          ignoreComponents: [],
          // Performance budget configuration
          performance: {
            // Enable performance metrics collection
            enableMetrics: false,
            // Maximum number of nodes to process before bailing out
            maxNodes: 5_000, // Higher for tests
            // Maximum time in milliseconds to spend on a single file
            maxTime: 1_000, // 1 second
            // Maximum number of operations before bailing out
            // maxOperations: {},
          },
        },
      ],

      // Other rules with minimal configuration
      'react-signals-hooks/signal-variable-name': 'warn',
      'react-signals-hooks/forbid-signal-destructuring': 'warn',
      'react-signals-hooks/forbid-signal-re-assignment': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',
      'react-signals-hooks/forbid-signal-update-in-computed': 'warn',

      'react-signals-hooks/prefer-computed': 'warn',
      'react-signals-hooks/prefer-signal-reads': 'warn',
      'react-signals-hooks/prefer-for-over-map': 'warn',
      'react-signals-hooks/prefer-signal-in-jsx': 'warn',
      'react-signals-hooks/prefer-batch-updates': 'warn',
      'react-signals-hooks/prefer-signal-effect': 'warn',
      'react-signals-hooks/prefer-show-over-ternary': 'warn',
      'react-signals-hooks/prefer-use-signal-over-use-state': 'warn',
      'react-signals-hooks/prefer-use-signal-ref-over-use-ref': 'warn',

      'react-signals-hooks/no-mutation-in-render': 'warn',
      'react-signals-hooks/prefer-signal-methods': 'warn',
      'react-signals-hooks/no-signal-creation-in-component': 'warn',
      'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
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
