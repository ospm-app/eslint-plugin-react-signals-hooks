import type { Rule } from "eslint";
import type { TSESTree } from "@typescript-eslint/utils";

/**
 * ESLint rule: signal-variable-name
 *
 * Enforces naming conventions for signal and computed variables.
 * Variables should end with 'Signal', start with lowercase, and not start with 'use'.
 */
export const signalVariableNameRule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"enforce naming conventions for signal and computed variables",
			recommended: false,
		},
		fixable: "code",
		schema: [],
		messages: {
			invalidSignalName:
				"Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
			invalidComputedName:
				"Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
		},
	},
	create(context: Rule.RuleContext) {
		function isSignalCall(node: TSESTree.CallExpression): boolean {
			return (
				node.callee.type === "Identifier" &&
				(node.callee.name === "signal" || node.callee.name === "computed")
			);
		}

		function isValidSignalName(name: string): boolean {
			// Must end with 'Signal'
			if (!name.endsWith("Signal")) {
				return false;
			}

			// Must start with lowercase letter
			if (!/^[a-z]/.test(name)) {
				return false;
			}

			// Must not start with 'use'
			if (name.startsWith("use")) {
				return false;
			}

			return true;
		}

		function getFixedName(originalName: string): string {
			let fixedName = originalName;

			// Remove 'use' prefix if present
			if (fixedName.startsWith("use")) {
				fixedName = fixedName.slice(3);
			}

			// Ensure first letter is lowercase
			if (fixedName.length > 0) {
				fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
			}

			// Add 'Signal' suffix if not present
			if (!fixedName.endsWith("Signal")) {
				fixedName += "Signal";
			}

			return fixedName;
		}

		function checkVariableDeclarator(node: TSESTree.VariableDeclarator) {
			if (
				node.id.type === "Identifier" &&
				node.init &&
				node.init.type === "CallExpression" &&
				isSignalCall(node.init)
			) {
				const variableName = node.id.name;

				// @ts-ignore
				const callName = node.init.callee.name;

				if (!isValidSignalName(variableName)) {
					const fixedName = getFixedName(variableName);

					context.report({
						node: node.id,
						message:
							callName === "signal"
								? "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'"
								: "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
						data: {
							name: variableName,
						},
						fix(fixer) {
							return fixer.replaceText(node.id, fixedName);
						},
					});
				}
			}
		}

		return {
			VariableDeclarator(node: any) {
				checkVariableDeclarator(node);
			},
		};
	},
} satisfies Rule.RuleModule;

export default signalVariableNameRule;
