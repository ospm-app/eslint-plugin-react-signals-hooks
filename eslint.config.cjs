const reactSignalsHooksPlugin = require("./dist/index.cjs");

module.exports = [
	{
		files: ["test-deep-property-chains.tsx"],
		languageOptions: {
			parser: require("@typescript-eslint/parser"),
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			"react-signals-hooks": reactSignalsHooksPlugin,
		},
		rules: {
			"react-signals-hooks/exhaustive-deps": "error",
		},
	},
];
