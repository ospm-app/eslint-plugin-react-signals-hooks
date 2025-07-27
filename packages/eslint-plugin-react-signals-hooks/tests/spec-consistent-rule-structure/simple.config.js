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
      'react-signals-hooks/consistent-rule-structure': [
        'error',
        {
          requirePerformanceTracking: true,
          requireDocumentationUrl: true,
          enforceNamingConvention: true,
          exemptRules: [],
          performance: {
            enableMetrics: false,
            maxTime: 1_000,
            maxNodes: 5_000,
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
