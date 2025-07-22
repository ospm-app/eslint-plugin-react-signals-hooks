import type { Rule } from "eslint";

/**
 * ESLint rule: prefer-signal-in-jsx
 *
 * Prefers direct signal usage in JSX over .value access.
 * In JSX contexts, signals can be used directly without .value for better readability.
 */
export const preferSignalInJsxRule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "prefer direct signal usage in JSX over .value access",
			recommended: true,
		},
		fixable: "code",
		schema: [],
	},
	create(context: Rule.RuleContext) {
		let inJSX = false;
		let jsxDepth = 0;

		return {
			JSXElement() {
				inJSX = true;
				jsxDepth++;
			},
			JSXFragment() {
				inJSX = true;
				jsxDepth++;
			},
			"JSXElement:exit"() {
				jsxDepth--;
				if (jsxDepth === 0) inJSX = false;
			},
			"JSXFragment:exit"() {
				jsxDepth--;
				if (jsxDepth === 0) inJSX = false;
			},

			MemberExpression(node) {
				if (
					inJSX &&
					node.property.type === "Identifier" &&
					node.property.name === "value" &&
					node.object.type === "Identifier" &&
					node.object.name.endsWith("Signal")
				) {
					// Check if this signal.value is being used in ways that should be excluded
					let parent = node.parent;
					let shouldSkip = false;
					let inJSXExpression = false;

					// Check if this is part of a method chain or property access that should be excluded
					if (parent && parent.type === "MemberExpression") {
						// Always skip any property access after .value
						shouldSkip = true;
					}

					// Check if this is part of optional chaining
					if (parent && parent.type === "ChainExpression") {
						shouldSkip = true;
					}

					// Check if this is used in className prop by traversing up the AST
					let currentNode: any = node;
					while (currentNode && currentNode.parent && !shouldSkip) {
						currentNode = currentNode.parent;
						if (
							currentNode.type === "JSXAttribute" &&
							currentNode.name &&
							currentNode.name.type === "JSXIdentifier" &&
							(currentNode.name.name === "className" ||
								currentNode.name.name === "class")
						) {
							shouldSkip = true;
							break;
						}
					}

					// Check if this is part of a binary expression (math operations)
					if (
						parent &&
						(parent.type === "BinaryExpression" ||
							parent.type === "UnaryExpression" ||
							parent.type === "LogicalExpression")
					) {
						shouldSkip = true;
					}

					// Check if this is inside a JSX expression container
					while (parent && !shouldSkip) {
						// @ts-ignore
						if (parent.type === "JSXExpressionContainer") {
							inJSXExpression = true;
							break;
						}

						// @ts-ignore
						if (parent.type === "JSXElement" || parent.type === "JSXFragment") {
							break;
						}
						parent = parent.parent;
					}

					if (inJSXExpression && !shouldSkip) {
						context.report({
							node,
							message: `Use '${node.object.name}' directly in JSX instead of '${node.object.name}.value'`,
							fix(fixer) {
								// @ts-ignore
								return fixer.replaceText(node, node.object.name);
							},
						});
					}
				}
			},
		};
	},
} satisfies Rule.RuleModule;
