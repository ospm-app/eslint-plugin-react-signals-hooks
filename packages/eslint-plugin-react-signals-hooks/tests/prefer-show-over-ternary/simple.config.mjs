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
      'react-signals-hooks/prefer-show-over-ternary': [
        'warn',
        {
          minComplexity: 3,
          signalNames: ['signal', 'useSignal', 'createSignal'],
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
