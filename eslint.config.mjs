/* eslint-disable n/no-unpublished-import */
import babelParser from '@babel/eslint-parser';
import babelPresetEnv from '@babel/preset-env';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginESx from 'eslint-plugin-es-x';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import json from 'eslint-plugin-json';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nodePlugin from 'eslint-plugin-n';
import optimizeRegexPlugin from 'eslint-plugin-optimize-regex';
import oxlintPlugin from 'eslint-plugin-oxlint';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

import eslintRulePlugin from './packages/eslint-plugin-eslint-rule/dist/esm/index.mjs';
import reactSignalsHooksPlugin from './packages/eslint-plugin-react-signals-hooks/dist/esm/index.mjs';

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
  // 'import/no-unused-modules': ['error', { unusedExports: true }],

  // Enabled rules
  'no-console': ['error', { allow: ['warn', 'error', 'info', 'table', 'debug', 'clear'] }],
  'optimize-regex/optimize-regex': 'warn',
  'es-x/no-async-iteration': 'error',
  'es-x/no-malformed-template-literals': 'error',

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
  'es-x/no-regexp-lookbehind-assertions': 'error',
  'es-x/no-regexp-named-capture-groups': 'error',
  'es-x/no-regexp-s-flag': 'error',
  'es-x/no-regexp-unicode-property-escapes': 'error',
};

const jsConfig = {
  files: ['**/*.{js,jsx,mjs}'],
  plugins: {
    'es-x': pluginESx,
    import: importPlugin,
    // 'jsx-a11y': jsxA11y,
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
    'es-x': pluginESx,
    '@typescript-eslint': typescriptPlugin,
    import: importPlugin,
    'react-signals-hooks': reactSignalsHooksPlugin,
    'eslint-rule': eslintRulePlugin,
    // 'jsx-a11y': jsxA11y,
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
    ...typescriptPlugin.configs.recommended.rules,

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
    'react-signals-hooks/forbid-signal-update-in-computed': 'warn',

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

    'eslint-rule/consistent-rule-structure': 'warn',

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

const jsonConfig = {
  files: ['**/*.json'],
  ...json.configs['recommended'],
  processor: 'json/json',
  languageOptions: {
    ecmaVersion: 2024,
  },
  rules: {
    'json/*': ['error', { allowComments: true }],
  },
};

// const vitestConfig = {
//   files: ['**/vitest.config.js', 'vitest.workspace.js'],
//   plugins: {
//     'es-x': pluginESx,
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
  // Note: We import plugin bundles from packages/*/dist for ESLint to load the plugin code.
  // Those files are imported by this config, not linted. The ignores below prevent traversing dist.
  {
    ignores: [
      './node_modules',
      './test-packages',
      '**/ios/**',
      '**/android/**',
      '**/node_modules/**',
      '**/.cache/**',
      '**/bundled/**',
      '**/build/**',
      '**/dist/**',
      '**/tests/**',
      '**/.wrangler/**',
      'test-packages/**',
      'packages/package-json-bot/**',
      'packages/eslint-config-validation-schemas/**',
      'packages/eslint-plugin-zod/**',
      'packages/eslint-plugin-valibot/**',
      'packages/eslint-plugin-arktype/**',
      'packages/eslint-plugin-joi/**',
      'packages/eslint-plugin-react-three-fiber/**',
      'packages/eslint-plugin-threejs/**',
      'packages/eslint-plugin-vibecoder-rasp/**',
    ],
  },
  // Global settings to keep eslint-plugin-import from parsing external modules like react-native
  {
    settings: {
      // Use RegExp to avoid invalid glob -> RegExp conversion inside eslint-plugin-import
      'import/ignore': ['react-native', 'node_modules', /(^|\/)dist(\/|$)/],
    },
  },
  jsxA11y.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  {
    files: ['lib/rules/*.{js,ts}'],
    ...eslintPlugin.configs['flat/recommended'],
    rules: {
      'n/no-missing-import': 'off',
    },
  },
  {
    files: ['**/eslint.config.{js,cjs,mjs}'],
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
    rules: {
      // Avoid eslint-plugin-import inspecting external deps from within config files
      'import/no-cycle': 'off',
      'import/no-unused-modules': 'off',
    },
  },

  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,mts}'],
    plugins: {
      'optimize-regex': optimizeRegexPlugin,
      promise: promisePlugin,
      oxlint: oxlintPlugin,
    },
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      ecmaVersion: 2024,
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {},
  },
  // vitestConfig,
  jsConfig,
  tsConfig,
  jsonConfig,
  nodePlugin.configs['flat/recommended-script'],
  {
    rules: {
      'n/no-missing-import': 'off',
    },
  },
];
