import type { Rule } from "eslint";

/**
 * ESLint rule: no-mutation-in-render
 *
 * Disallows direct signal mutation during render.
 * Signal mutations should occur in effects, event handlers, or other side-effect contexts.
 */
export const noMutationInRenderRule = {
	meta: {
		type: "problem",
		docs: {
			description: "disallow direct signal mutation during render",
			recommended: true,
		},
		fixable: "code",
		schema: [],
	},
	create(context: Rule.RuleContext) {
		let inRenderContext = false;
		let renderDepth = 0;
		let hookDepth = 0;
		let functionDepth = 0; // Track nested functions

		return {
			FunctionDeclaration(node) {
				if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
					inRenderContext = true;
					renderDepth++;
				}
			},
			ArrowFunctionExpression(node) {
				// Check if this is the main component arrow function
				if (
					node.parent?.type === "VariableDeclarator" &&
					node.parent.id?.type === "Identifier" &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					// This is a main component - enter render context
					inRenderContext = true;
					renderDepth++;
				} else {
					// This is a nested arrow function (like event handler) - exit render context
					functionDepth++;
					if (functionDepth === 1 && renderDepth >= 1) {
						inRenderContext = false;
					}
				}
			},
			// Track function declarations and expressions (including event handlers)
			FunctionExpression() {
				functionDepth++;
				if (functionDepth === 1 && renderDepth >= 1) {
					inRenderContext = false; // Inside a nested function, not in render context
				}
			},
			CallExpression(node) {
				// Check for React hooks and signal effects - these create non-render context
				if (
					node.callee.type === "Identifier" &&
					[
						"useEffect",
						"useLayoutEffect",
						"useCallback",
						"useMemo",
						"useImperativeHandle",
						"effect", // @preact/signals-core effect
						"computed", // @preact/signals-core computed
					].includes(node.callee.name)
				) {
					hookDepth++;
					if (hookDepth === 1) {
						inRenderContext = false;
					}
				}
			},
			AssignmentExpression(node) {
				if (
					inRenderContext &&
					renderDepth >= 1 &&
					hookDepth === 0 &&
					functionDepth === 0
				) {
					// Check for signal.value assignment
					if (
						node.left.type === "MemberExpression" &&
						node.left.property.type === "Identifier" &&
						node.left.property.name === "value" &&
						node.left.object.type === "Identifier" &&
						node.left.object.name.endsWith("Signal")
					) {
						context.report({
							node,
							message: `Direct signal mutation '${node.left.object.name}.value' should not occur during render. Use useEffect or event handlers instead.`,
							fix(fixer) {
								const sourceCode = context.getSourceCode();
								const assignmentText = sourceCode.getText(node);

								// Wrap the assignment in useEffect
								return fixer.replaceText(
									node,
									`useEffect(() => { ${assignmentText}; }, [])`,
								);
							},
						});
					}

					// Check for signal[key] assignment
					if (
						node.left.type === "MemberExpression" &&
						node.left.computed &&
						node.left.object.type === "MemberExpression" &&
						node.left.object.property.type === "Identifier" &&
						node.left.object.property.name === "value" &&
						node.left.object.object.type === "Identifier" &&
						node.left.object.object.name.endsWith("Signal")
					) {
						context.report({
							node,
							message: `Direct signal mutation '${node.left.object.object.name}.value[...]' should not occur during render. Use useEffect or event handlers instead.`,
							fix(fixer) {
								const sourceCode = context.getSourceCode();
								const assignmentText = sourceCode.getText(node);

								// Wrap the assignment in useEffect
								return fixer.replaceText(
									node,
									`useEffect(() => { ${assignmentText}; }, [])`,
								);
							},
						});
					}
				}
			},
			UpdateExpression(node) {
				if (
					inRenderContext &&
					renderDepth >= 1 &&
					hookDepth === 0 &&
					functionDepth === 0
				) {
					// Check for signal.value++ or ++signal.value
					if (
						node.argument.type === "MemberExpression" &&
						node.argument.property.type === "Identifier" &&
						node.argument.property.name === "value" &&
						node.argument.object.type === "Identifier" &&
						node.argument.object.name.endsWith("Signal")
					) {
						context.report({
							node,
							message: `Direct signal mutation '${node.argument.object.name}.value${node.operator}' should not occur during render. Use useEffect or event handlers instead.`,
							fix(fixer) {
								const sourceCode = context.getSourceCode();
								const updateText = sourceCode.getText(node);

								// Wrap the update expression in useEffect
								return fixer.replaceText(
									node,
									`useEffect(() => { ${updateText}; }, [])`,
								);
							},
						});
					}
				}
			},
			"FunctionDeclaration:exit"(node) {
				if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
					renderDepth--;
					if (renderDepth === 0) inRenderContext = false;
				}
			},
			"ArrowFunctionExpression:exit"(node) {
				// Check if this is the main component arrow function
				if (
					node.parent?.type === "VariableDeclarator" &&
					node.parent.id?.type === "Identifier" &&
					/^[A-Z]/.test(node.parent.id.name)
				) {
					// This is a main component - exit render context
					renderDepth--;
					if (renderDepth === 0) inRenderContext = false;
				} else {
					// This is a nested arrow function - back to render context if appropriate
					functionDepth--;
					if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
						inRenderContext = true;
					}
				}
			},
			"FunctionExpression:exit"() {
				functionDepth--;
				if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
					inRenderContext = true; // Back in render context
				}
			},
			"CallExpression:exit"(node) {
				if (
					node.callee.type === "Identifier" &&
					[
						"useEffect",
						"useLayoutEffect",
						"useCallback",
						"useMemo",
						"useImperativeHandle",
						"effect", // @preact/signals-core effect
						"computed", // @preact/signals-core computed
					].includes(node.callee.name)
				) {
					hookDepth--;
					if (hookDepth === 0 && renderDepth >= 1 && functionDepth === 0) {
						inRenderContext = true;
					}
				}
			},
		};
	},
} satisfies Rule.RuleModule;
