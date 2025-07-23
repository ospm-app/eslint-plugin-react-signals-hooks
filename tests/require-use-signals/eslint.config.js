import parser from '@typescript-eslint/parser';
import reactSignalsHooksPlugin from '../../dist/cjs/index.js';

export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      'react-signals-hooks/require-use-signals': 'warn',

      'react-signals-hooks/exhaustive-deps': 'warn',
      'react-signals-hooks/signal-variable-name': 'warn',
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
      'react-signals-hooks/no-signal-assignment-in-effect': 'error',
      'react-signals-hooks/no-non-signal-with-signal-suffix': 'error',
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
