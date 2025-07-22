import type { Rule } from "eslint";

/**
 * ESLint rule: require-use-signals
 *
 * Requires useSignals() hook when signals are used in component.
 * This ensures proper signal subscription and reactivity in React components.
 */
export const requireUseSignalsRule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"require useSignals() hook when signals are used in component",
			recommended: true,
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					ignoreComponents: {
						type: "array",
						items: { type: "string" },
					},
				},
			},
		],
	},
	create(context: Rule.RuleContext) {
		const options = context.options[0] || {};
		const ignoreComponents = new Set(options.ignoreComponents || []);

		let hasUseSignals = false;
		let hasSignalUsage = false;
		let componentName = "";
		let componentNode: any = null;

		return {
			FunctionDeclaration(node) {
				if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
					componentName = node.id.name;
					componentNode = node;
					hasUseSignals = false;
					hasSignalUsage = false;
				}
			},
			ArrowFunctionExpression(node) {
				if (
					node.parent?.type === "VariableDeclarator" &&
					node.parent.id?.type === "Identifier" &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					componentName = node.parent.id.name;
					componentNode = node;
					hasUseSignals = false;
					hasSignalUsage = false;
				}
			},
			CallExpression(node) {
				if (
					node.callee.type === "Identifier" &&
					node.callee.name === "useSignals"
				) {
					hasUseSignals = true;
				}
			},
			MemberExpression(node) {
				if (
					node.property.type === "Identifier" &&
					node.property.name === "value" &&
					node.object.type === "Identifier" &&
					node.object.name.endsWith("Signal")
				) {
					hasSignalUsage = true;
				}
			},
			Identifier(node) {
				// Check for direct signal usage (not just .value access)
				if (
					node.name.endsWith("Signal") &&
					node.parent?.type !== "MemberExpression"
				) {
					hasSignalUsage = true;
				}
			},
			"Program:exit"() {
				if (
					hasSignalUsage &&
					!hasUseSignals &&
					componentName &&
					!ignoreComponents.has(componentName)
				) {
					context.report({
						node: componentNode || context.getSourceCode().ast,
						message: `Component '${componentName}' uses signals but is missing useSignals() hook`,
						fix(fixer) {
							const sourceCode = context.getSourceCode();

							// Find the first statement in the component body
							let insertionPoint = null;
							if (
								componentNode?.type === "FunctionDeclaration" &&
								componentNode.body?.type === "BlockStatement"
							) {
								insertionPoint = componentNode.body.body[0];
							} else if (
								componentNode?.type === "ArrowFunctionExpression" &&
								componentNode.body?.type === "BlockStatement"
							) {
								insertionPoint = componentNode.body.body[0];
							}

							if (insertionPoint) {
								return fixer.insertTextBefore(
									insertionPoint,
									"\tuseSignals();\n",
								);
							}

							// Fallback: add import at top of file
							const program = sourceCode.ast;
							const firstStatement = program.body[0];
							if (firstStatement) {
								return fixer.insertTextBefore(
									firstStatement,
									"import { useSignals } from '@preact/signals-react';\n",
								);
							}
							return null;
						},
					});
				}
			},
		};
	},
} satisfies Rule.RuleModule;
