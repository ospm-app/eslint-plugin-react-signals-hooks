import tsParser from '@typescript-eslint/parser';
import reactSignalsHooksPlugin from '../../dist/cjs/index.js';

// Debug: Log the loaded plugin
console.log('Loaded plugin:', Object.keys(reactSignalsHooksPlugin.rules || {}));

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'react-signals-hooks': reactSignalsHooksPlugin,
    },
    rules: {
      // Core rules
      'react-signals-hooks/no-non-signal-with-signal-suffix': [
        'error',
        {
          // Debug: Log the options being passed to the rule
          onConfigured(options) {
            console.info('Rule options:', JSON.stringify(options, null, 2));
            return options;
          },
          performance: {
            maxTime: 5000,
            maxNodes: 2000,
            maxMemory: 50 * 1024 * 1024, // 50MB
            enableMetrics: true,
            logMetrics: true,
            maxOperations: {
              signalCheck: 400,
              scopeLookup: 250,
              typeCheck: 200,
              identifierCheck: 300,
            },
          },
        },
      ],

      'react-signals-hooks/exhaustive-deps': 'warn',
      'react-signals-hooks/require-use-signals': 'warn',
      'react-signals-hooks/signal-variable-name': 'warn',
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
      'react-signals-hooks/prefer-batch-for-multi-mutations': 'warn',
      'react-signals-hooks/prefer-use-signal-over-use-state': 'warn',

      // Error prevention rules
      'react-signals-hooks/no-mutation-in-render': 'warn',
      'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
      'react-signals-hooks/no-signal-creation-in-component': 'warn',
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
