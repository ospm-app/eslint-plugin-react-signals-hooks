import tsParser from "@typescript-eslint/parser";
import reactSignalsHooksPlugin from "../../dist/cjs/index.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ["*.tsx", "*.ts"],
		plugins: {
			"react-signals-hooks": reactSignalsHooksPlugin,
		},
		rules: {
			"react-signals-hooks/require-use-signals": [
				"warn",
				{
					// List of component names to ignore (e.g., ['MyComponent', 'AnotherComponent'])
					ignoreComponents: [],
					// Performance budget configuration
					performance: {
						// Enable performance metrics collection
						enableMetrics: false,
						// Maximum number of nodes to process before bailing out
						maxNodes: 5_000, // Higher for tests
						// Maximum time in milliseconds to spend on a single file
						maxTime: 1_000, // 1 second
						// Maximum number of operations before bailing out
						// maxOperations: {},
					},
				},
			],

			// Enable a few rules that would normally fire on signals
			"react-signals-hooks/prefer-signal-methods": "warn",
			"react-signals-hooks/prefer-signal-effect": "warn",
			"react-signals-hooks/forbid-signal-destructuring": "warn",
			"react-signals-hooks/forbid-signal-re-assignment": "warn",
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: { jsx: true },
			},
		},
	},
];
