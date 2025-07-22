// ESLint config for prefer-signal-effect rule testing
const reactSignalsHooksPlugin = require("../../dist/cjs/index.js");

module.exports = [
	{
		files: ["*.tsx", "*.ts"],
		plugins: {
			"react-signals-hooks": reactSignalsHooksPlugin,
		},
		rules: {
			// Primary rule being tested
			"react-signals-hooks/prefer-signal-effect": "error",

			// Enable all other rules for comprehensive testing
			"react-signals-hooks/exhaustive-deps": "warn",
			"react-signals-hooks/require-use-signals": "warn",
			"react-signals-hooks/no-mutation-in-render": "error",
			"react-signals-hooks/prefer-signal-in-jsx": "warn",
			"react-signals-hooks/prefer-show-over-ternary": "warn",
			"react-signals-hooks/prefer-for-over-map": "warn",
			"react-signals-hooks/prefer-computed": "warn",
		},
		languageOptions: {
			parser: require("@typescript-eslint/parser"),
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
];
