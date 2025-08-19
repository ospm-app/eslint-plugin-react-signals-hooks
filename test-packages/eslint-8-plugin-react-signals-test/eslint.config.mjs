/** biome-ignore-all assist/source/organizeImports: off */
import babelParser from '@babel/eslint-parser';
import babelPresetEnv from '@babel/preset-env';
import reactSignalsHooksPlugin from '@ospm/eslint-plugin-react-signals-hooks';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nodePlugin from 'eslint-plugin-n';
import optimizeRegexPlugin from 'eslint-plugin-optimize-regex';
import oxlintPlugin from 'eslint-plugin-oxlint';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

const commonRules = {
  // Disabled rules
  'n/no-missing-import': 'off',
  'n/no-extraneous-import': 'off',
  indent: 'off',
  'multiline-ternary': 'off',
  'func-call-spacing': 'off',
  'operator-linebreak': 'off',
  'space-before-function-paren': 'off',
  semi: ['error', 'always'],
  'comma-dangle': 'off',
  'dot-notation': 'off',
  'default-case-last': 'off',
  'no-undef': 'off',
  'no-use-before-define': 'off',
  'sort-imports': 'off',
  camelcase: 'off',
  'no-useless-return': 'off',
  'sort-requires/sort-requires': 'off',
  'no-unused-vars': 'off',

  // Import rules
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    },
  ],
  'import/no-cycle': 'error',
  'import/no-unused-modules': 'off',

  // Enabled rules
  'no-console': ['error', { allow: ['warn', 'error', 'info', 'table', 'debug', 'clear'] }],
  'optimize-regex/optimize-regex': 'warn',

  // JSX Accessibility rules
  'jsx-a11y/no-static-element-interactions': [
    'error',
    {
      handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
    },
  ],
  'jsx-a11y/click-events-have-key-events': 'error',
  'jsx-a11y/label-has-associated-control': 'error',

  // Promise rules
  'promise/no-return-wrap': 'error',
  'promise/prefer-await-to-then': 'error',
  'promise/no-nesting': 'warn',
  'promise/always-return': 'error',
  'promise/catch-or-return': 'error',
  'promise/param-names': 'error',

  // Security
  'security/detect-object-injection': 'error',

  'no-restricted-globals': [
    'error',
    {
      name: 'name',
      message: 'Use local parameter instead.',
    },
    {
      name: 'event',
      message: 'Use local parameter instead.',
    },
    {
      name: 'fdescribe',
      message: 'Do not commit fdescribe. Use describe instead.',
    },
  ],
};

const jsConfig = {
  files: ['**/*.{js,jsx,mjs}'],
  plugins: {
    import: importPlugin,
  },
  languageOptions: {
    ecmaVersion: 2024,
    parser: babelParser,
    parserOptions: {
      sourceType: 'module',
      requireConfigFile: false,
      babelOptions: {
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-syntax-import-assertions'],
        presets: [[babelPresetEnv]],
      },
    },
  },
  rules: {
    ...commonRules,
    semi: ['error', 'always'],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};

const tsConfig = {
  files: ['**/*.{ts,tsx,mts}'],
  plugins: {
    '@typescript-eslint': typescript,
    import: importPlugin,
    'react-signals-hooks': reactSignalsHooksPlugin,
  },
  languageOptions: {
    ecmaVersion: 2024,
    parser: tsParser,
    parserOptions: {
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: './tsconfig.json',
      createDefaultProgram: true,
    },
  },
  rules: {
    ...commonRules,
    ...typescript.configs['recommended'].rules,

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
      },
    ],

    'react-signals-hooks/require-use-signals': [
      'error',
      {
        // List of component names to ignore (e.g., ['MyComponent', 'AnotherComponent'])
        ignoreComponents: [],
      },
    ],

    'react-signals-hooks/signal-variable-name': 'warn',
    'react-signals-hooks/forbid-signal-destructuring': 'warn',
    'react-signals-hooks/forbid-signal-re-assignment': 'warn',
    'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',

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

    'react-signals-hooks/no-mutation-in-render': 'warn',
    'react-signals-hooks/no-signal-assignment-in-effect': 'warn',
    'react-signals-hooks/no-signal-creation-in-component': 'warn',
    'react-signals-hooks/no-non-signal-with-signal-suffix': 'warn',

    // TypeScript specific
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',

    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    'no-shadow': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: false, typedefs: false },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
    ],
    'no-restricted-imports': 'off',
    '@typescript-eslint/no-restricted-imports': [
      'warn',
      {
        name: 'react-redux',
        importNames: ['useSelector', 'useDispatch'],
        message: 'Use typed hooks `useAppDispatch` and `useAppSelector` instead.',
      },
    ],
  },
};

// const vitestConfig = {
//   files: ['**/vitest.config.js', 'vitest.workspace.js'],
//   plugins: {
//     import: importPlugin,
//   },
//   languageOptions: {
//     ecmaVersion: 2024,
//     parser: babelParser,
//     parserOptions: {
//       sourceType: 'module',
//       requireConfigFile: false,
//       babelOptions: {
//         babelrc: false,
//         configFile: false,
//         plugins: ['@babel/plugin-syntax-import-assertions'],
//         presets: [[babelPresetEnv]],
//       },
//     },
//     globals: {
//       ...globals.node,
//     },
//   },
//   rules: {
//     ...commonRules,
//   },
// };

/** @type {import('eslint').Linter.Config[]} */
export default [
  jsxA11y.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  {
    files: ['lib/rules/*.{js,ts}'],
    rules: {
      'n/no-missing-import': 'off',
    },
  },
  {
    files: ['**/eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      parser: babelParser,
      parserOptions: {
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: [[babelPresetEnv]],
        },
      },
    },
  },
  {
    ignores: [
      './node_modules',
      './dist/**',
      '**/ios/**',
      '**/android/**',
      '**/node_modules/**',
      '**/.cache/**',
      '**/bundled/**',
      '**/build/**',
      '**/.wrangler/**',
      '**/test/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,mts}'],
    plugins: {
      'optimize-regex': optimizeRegexPlugin,
      promise: promisePlugin,
      oxlint: oxlintPlugin,
    },
    languageOptions: {
      ecmaVersion: 2024,
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {},
  },
  // vitestConfig,
  jsConfig,
  tsConfig,
  nodePlugin.configs['flat/recommended-script'],
  {
    rules: {
      'n/no-missing-import': 'off',
    },
  },
];
