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
      'react-signals-hooks/no-mutation-in-render': [
        'error',
        {
          signalNames: ['signal', 'useSignal', 'createSignal'],
          allowedPatterns: ['.test.tsx?$'],
          severity: {
            signalValueAssignment: 'error',
            signalPropertyAssignment: 'error',
            signalArrayIndexAssignment: 'error',
            signalNestedPropertyAssignment: 'error',
          },
          performance: {
            enableMetrics: false,
            maxNodes: 5_000,
            maxTime: 1_000,
            maxOperations: 10_000,
            trackOperations: false,
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
