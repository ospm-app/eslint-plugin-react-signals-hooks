import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import nodePlugin from 'eslint-plugin-node';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compatibility with legacy configs
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.eslintrc.*',
      '**/.prettierrc.*',
      '**/tsconfig.*.json',
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,
  ...compat.extends('plugin:import/recommended'),
  ...compat.extends('plugin:node/recommended'),

  // TypeScript configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'eslint-plugin': eslintPlugin,
      import: importPlugin,
      node: nodePlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-var-requires': 'error',

      // Import rules
      'import/no-unresolved': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ESLint plugin rules
      'eslint-plugin/report-message-format': ['error', "^[A-Z`'{].*[.}]$"],
      'eslint-plugin/require-meta-docs-url': [
        'error',
        {
          pattern:
            'https://github.com/ospm-app/eslint-plugin-threejs/blob/main/docs/rules/{{name}}.md',
        },
      ],

      // Node rules
      'node/no-missing-import': 'off', // Handled by TypeScript
      'node/no-unsupported-features/es-syntax': 'off', // Handled by TypeScript
    },
  },

  // Test configuration
  {
    files: ['tests/**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      // Allow test files to use dev dependencies
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],

      // Allow test files to use any and non-null assertions
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow test files to use require
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'node/global-require': 'off',
    },
  },

  // Configuration for this config file
  {
    files: ['eslint.config.js'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'node/no-unpublished-import': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
    },
  },
];
