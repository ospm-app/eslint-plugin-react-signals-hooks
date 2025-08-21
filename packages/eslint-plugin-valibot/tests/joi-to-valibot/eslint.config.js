import parser from "@typescript-eslint/parser";

import valibotPlugin from "../../dist/esm/index.mjs";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ["*.tsx", "*.ts"],
		plugins: {
			valibot: valibotPlugin,
		},
		rules: {
			"valibot/joi-to-valibot": "warn",
		},
		languageOptions: {
			parser,
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
