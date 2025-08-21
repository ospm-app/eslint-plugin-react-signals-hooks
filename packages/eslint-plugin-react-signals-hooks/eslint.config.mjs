/* eslint import/no-unused-modules: off */
/* eslint import/no-cycle: off */
import babelParser from '@babel/eslint-parser';
import babelPresetEnv from '@babel/preset-env';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import esxPlugin from 'eslint-plugin-es-x';
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

import reactSignalsHooksPlugin from './dist/esm/index.mjs';

import eslintRulePlugin from '@ospm/eslint-plugin-eslint-rule';

const eslintRuleConfig = {
  files: ['**/*.ts'],
  plugins: {
    'eslint-rule': eslintRulePlugin,
  },
  rules: {
    'eslint-rule/consistent-rule-structure': 'error',
  },
};

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
  'import/no-unused-modules': ['error', { unusedExports: true }],

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
    'es-x': esxPlugin,
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
  },
};

const tsConfig = {
  files: ['**/*.{ts,tsx,mts}'],
  plugins: {
    'es-x': esxPlugin,
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
        enableAutoFixForMemoAndCallback: true,
      },
    ],
    'react-signals-hooks/require-use-signals': 'error',

    'react-signals-hooks/prefer-computed': 'warn',
    'react-signals-hooks/prefer-for-over-map': 'warn',
    'react-signals-hooks/prefer-signal-in-jsx': 'warn',
    'react-signals-hooks/prefer-signal-effect': 'warn',
    'react-signals-hooks/no-mutation-in-render': 'warn',
    'react-signals-hooks/prefer-show-over-ternary': 'warn',
    'react-signals-hooks/warn-on-unnecessary-untracked': 'warn',
    'react-signals-hooks/no-signal-creation-in-component': 'warn',
    'react-signals-hooks/forbid-signal-update-in-computed': 'warn',
    'react-signals-hooks/prefer-use-computed-in-react-component': 'warn',
    'react-signals-hooks/prefer-use-signal-effect-in-react-component': 'warn',

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
  plugins: { json },
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
//     'es-x': esxPlugin,
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
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
  // Global settings to keep eslint-plugin-import from parsing external modules like react-native
  {
    settings: {
      // Use regex here; eslint-plugin-import matches against the raw import string
      'import/ignore': [/react-native/, /node_modules/, /\bdist\//],
    },
  },
  jsxA11y.flatConfigs.recommended,
  securityPlugin.configs.recommended,
  eslintRuleConfig,
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
  jsonConfig,
  nodePlugin.configs['flat/recommended-script'],
  {
    rules: {
      'n/no-missing-import': 'off',
    },
  },
];
