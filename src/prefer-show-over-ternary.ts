import type { Rule } from "eslint";
import type { Node } from "estree";

/**
 * ESLint rule: prefer-show-over-ternary
 *
 * Prefers Show component over ternary for conditional rendering with signals.
 * This provides better performance and readability for signal-based conditions.
 */
export const preferShowOverTernaryRule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"prefer Show component over ternary for conditional rendering with signals",
			recommended: false,
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				additionalProperties: false,
				properties: {
					minComplexity: {
						type: "number",
						default: 2,
					},
				},
			},
		],
	},
	create(context: Rule.RuleContext) {
		const options = context.options[0] || {};
		const minComplexity = options.minComplexity || 2;

		function getComplexity(node: Node, visited = new Set()): number {
			// Prevent infinite recursion by tracking visited nodes
			if (visited.has(node)) {
				return 0;
			}
			visited.add(node);

			let complexity = 0;

			// Count JSX elements and fragments
			// @ts-ignore
			if (node.type === "JSXElement" || node.type === "JSXFragment") {
				complexity++;
			}

			// Count function calls
			if (node.type === "CallExpression") {
				complexity++;
			}

			// Count nested conditional expressions
			if (node.type === "ConditionalExpression") {
				complexity += 2;
			}

			// Recursively count complexity in child nodes
			// Only traverse specific known properties to avoid circular references
			const childProperties = [
				"body",
				"consequent",
				"alternate",
				"test",
				"left",
				"right",
				"argument",
				"callee",
				"arguments",
				"elements",
				"properties",
			];

			for (const key of childProperties) {
				const value = (node as any)[key];
				if (value && typeof value === "object") {
					if (Array.isArray(value)) {
						for (const item of value) {
							if (item && typeof item === "object" && item.type) {
								complexity += getComplexity(item, visited);
							}
						}
					} else if (value.type) {
						complexity += getComplexity(value, visited);
					}
				}
			}

			visited.delete(node);
			return complexity;
		}

		function hasSignalInTest(node: Node): boolean {
			// Check for signal.value in test
			if (
				node.type === "MemberExpression" &&
				node.property.type === "Identifier" &&
				node.property.name === "value" &&
				node.object.type === "Identifier" &&
				node.object.name.endsWith("Signal")
			) {
				return true;
			}

			// Check for direct signal usage
			if (node.type === "Identifier" && node.name.endsWith("Signal")) {
				return true;
			}

			// Check for binary expressions (like signal.value === "something")
			if (node.type === "BinaryExpression") {
				return hasSignalInTest(node.left) || hasSignalInTest(node.right);
			}

			// Check for logical expressions with signals
			if (node.type === "LogicalExpression") {
				return hasSignalInTest(node.left) || hasSignalInTest(node.right);
			}

			// Check for unary expressions (like !signal)
			if (node.type === "UnaryExpression") {
				return hasSignalInTest(node.argument);
			}

			// Check for optional chaining (signal.value?.property)
			if (node.type === "ChainExpression") {
				return hasSignalInTest(node.expression);
			}

			return false;
		}

		function checkConditionalExpression(node: any) {
			const hasSignalTest = hasSignalInTest(node.test);

			if (hasSignalTest) {
				const consequentComplexity = getComplexity(node.consequent);
				const alternateComplexity = getComplexity(node.alternate);

				if (
					consequentComplexity >= minComplexity ||
					alternateComplexity >= minComplexity
				) {
					context.report({
						node,
						message:
							"Consider using Show component for complex conditional rendering with signals",
						fix(fixer) {
							const sourceCode = context.getSourceCode();
							const testText = sourceCode.getText(node.test);
							const consequentText = sourceCode.getText(node.consequent);
							const alternateText = sourceCode.getText(node.alternate);

							// Check if alternate is null/undefined
							if (
								node.alternate.type === "Literal" &&
								(node.alternate.value === null ||
									node.alternate.value === undefined)
							) {
								return fixer.replaceText(
									node,
									`<Show when={${testText}}>{${consequentText}}</Show>`,
								);
							} else {
								return fixer.replaceText(
									node,
									`<Show when={${testText}} fallback={${alternateText}}>{${consequentText}}</Show>`,
								);
							}
						},
					});
				}
			}
		}

		return {
			ConditionalExpression: checkConditionalExpression,
			// Also check ternary expressions inside JSX expression containers
			JSXExpressionContainer(node: any) {
				if (
					node.expression &&
					node.expression.type === "ConditionalExpression"
				) {
					checkConditionalExpression(node.expression);
				}
			},
		};
	},
} satisfies Rule.RuleModule;
