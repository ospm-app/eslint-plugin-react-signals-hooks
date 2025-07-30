module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: ['@typescript-eslint', '@ospm/eslint-plugin-react-signals-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Enable all rules from our plugin
    '@ospm/eslint-plugin-react-signals-hooks/require-use-signals': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/no-mutation-in-render': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/no-signal-assignment-in-effect': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/no-non-signal-with-signal-suffix': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-signal-in-jsx': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-show-over-ternary': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-for-over-map': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-signal-effect': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-computed': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-batch-updates': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/signal-variable-name': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/no-signal-creation-in-component': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/warn-on-unnecessary-untracked': 'warn',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-signal-reads': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-signal-methods': 'error',
    '@ospm/eslint-plugin-react-signals-hooks/prefer-use-signal-over-use-state': 'warn',
  },
};
