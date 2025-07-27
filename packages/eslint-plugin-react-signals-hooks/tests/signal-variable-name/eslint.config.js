import parser from '@typescript-eslint/parser';
import reactSignalsHooksPlugin from '../../dist/cjs/index.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      'react-signals-hooks/signal-variable-name': [
        'error',
        {
          // Performance budget configuration
          performance: {
            enableMetrics: false,
            maxTime: 1_000,
            maxNodes: 5_000,
            maxOperations: 10_000,
            trackOperations: false,
          },
        },
      ],

      'react-signals-hooks/exhaustive-deps': 'warn',
      'react-signals-hooks/require-use-signals': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',

      'react-signals-hooks/prefer-computed': 'warn',
      'react-signals-hooks/prefer-signal-reads': 'warn',
      'react-signals-hooks/prefer-for-over-map': 'warn',
      'react-signals-hooks/prefer-signal-in-jsx': 'warn',
      'react-signals-hooks/prefer-batch-updates': 'warn',
      'react-signals-hooks/prefer-signal-effect': 'warn',
      'react-signals-hooks/prefer-show-over-ternary': 'warn',
      'react-signals-hooks/prefer-batch-for-multi-mutations': 'warn',
      'react-signals-hooks/prefer-use-signal-over-use-state': 'warn',

      'react-signals-hooks/no-mutation-in-render': 'warn',
      'react-signals-hooks/prefer-signal-methods': 'warn',
      'react-signals-hooks/no-signal-creation-in-component': 'warn',
      'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
      'react-signals-hooks/no-non-signal-with-signal-suffix': 'warn',

      'react-signals-hooks/consistent-rule-structure': 'warn',
    },
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
