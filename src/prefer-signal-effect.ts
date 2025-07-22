import type { Rule } from "eslint";

/**
 * ESLint rule: prefer-signal-effect
 *
 * Prefers effect() over useEffect for signal-only dependencies.
 * This provides better performance and automatic dependency tracking for signals.
 */
export const preferSignalEffectRule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"prefer effect() over useEffect for signal-only dependencies",
			recommended: false,
		},
		fixable: "code",
		schema: [],
	},
	create(context: Rule.RuleContext) {
		return {
			CallExpression(node) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "useEffect" &&
					node.arguments.length >= 2 &&
					node.arguments[1]?.type === "ArrayExpression"
				) {
					const deps = node.arguments[1].elements;

					// Check if all dependencies are signals
					const allSignalDeps =
						deps.length > 0 &&
						deps.every((dep) => {
							if (!dep) return false;

							// Check for signal.value
							if (
								dep.type === "MemberExpression" &&
								dep.property.type === "Identifier" &&
								dep.property.name === "value" &&
								dep.object.type === "Identifier" &&
								dep.object.name.endsWith("Signal")
							) {
								return true;
							}

							// Check for direct signal usage
							if (dep.type === "Identifier" && dep.name.endsWith("Signal")) {
								return true;
							}

							return false;
						});

					if (allSignalDeps) {
						context.report({
							node,
							message:
								"Consider using effect() instead of useEffect for signal-only dependencies",
							fix(fixer) {
								const sourceCode = context.getSourceCode();
								const callback = node.arguments[0];

								if (callback) {
									const callbackText = sourceCode.getText(callback);
									return fixer.replaceText(node, `effect(${callbackText})`);
								}
								return null;
							},
						});
					}
				}
			},
		};
	},
} satisfies Rule.RuleModule;
