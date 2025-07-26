import parser from '@typescript-eslint/parser';
import vibecoderRaspPlugin from '../../dist/cjs/index.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['*.tsx', '*.ts'],
    plugins: {
      'vibecoder-rasp': vibecoderRaspPlugin,
    },
    rules: {
      'vibecoder-rasp/state-colocation': 'error',

      'vibecoder-rasp/button-type': 'warn',
      'vibecoder-rasp/derived-state-memo': 'warn',
      'vibecoder-rasp/effect-cleanup': 'warn',
      'vibecoder-rasp/explicit-void-return': 'warn',

      'vibecoder-rasp/no-any': 'warn',
      'vibecoder-rasp/no-prop-drilling': 'warn',
      'vibecoder-rasp/no-state-mutation': 'warn',
      'vibecoder-rasp/no-react-namespace': 'warn',
      'vibecoder-rasp/no-unnecessary-else': 'warn',
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
