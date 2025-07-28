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
      'react-signals-hooks/exhaustive-deps': [
        'error',
        {
          // Enable unsafe autofixes (use with caution, may produce incorrect results)
          unsafeAutofix: false,
          // Additional hooks that should be treated as effect hooks (regex pattern as string)
          additionalHooks: undefined,
          // Experimental: Auto-detect effect hooks with specific patterns
          experimental_autoDependenciesHooks: [],
          // Require explicit dependencies for all effects
          requireExplicitEffectDeps: true, // More strict in tests
          // Enable autofix for useMemo and useCallback
          enableAutoFixForMemoAndCallback: true, // Enable for test cases
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

      'react-signals-hooks/require-use-signals': 'warn',
      'react-signals-hooks/signal-variable-name': 'warn',
      'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',

      'react-signals-hooks/prefer-computed': 'warn',
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

      'react-signals-hooks/no-mutation-in-render': 'warn',
      'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
      'react-signals-hooks/no-signal-creation-in-component': 'warn',
      'react-signals-hooks/no-non-signal-with-signal-suffix': 'warn',

      'react-signals-hooks/consistent-rule-structure': 'warn',
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
