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
			// Only enable the rule we want to test with minimal configuration
			"react-signals-hooks/exhaustive-deps": [
				"error",
				{
					unsafeAutofix: false,
					additionalHooks: undefined,
					experimental_autoDependenciesHooks: [],
					requireExplicitEffectDeps: true,
					enableAutoFixForMemoAndCallback: true,
					performance: {
						enableMetrics: false,
						maxNodes: 5_000,
						maxTime: 1_000,
						maxOperations: 10_000,
						trackOperations: false,
					},
				},
			],
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				tsconfigRootDir: process.cwd(),
				project: "../../tsconfig.tests.json",
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
];
