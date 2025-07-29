/** biome-ignore-all assist/source/organizeImports: off */
import * as path from "node:path";

import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

import {
	endPhase,
	startPhase,
	stopTracking,
	recordMetric,
	startTracking,
	trackOperation,
	createPerformanceTracker,
	DEFAULT_PERFORMANCE_BUDGET,
} from "./utils/performance.js";
import { getRuleDocUrl } from "./utils/urls.js";
import type { PerformanceBudget } from "./utils/types.js";
import { PerformanceOperations } from "./utils/performance-constants.js";

type Option = {
	requirePerformanceTracking?: boolean;
	requireDocumentationUrl?: boolean;
	enforceNamingConvention?: boolean;
	exemptRules?: string[];
	/** Performance tuning option */
	performance?: PerformanceBudget;
};

// Types for rule option
type Options = [Option?];

// Types for rule messages
type MessageIds =
	| "missingRuleSuffix"
	| "inconsistentNaming"
	| "missingMetaProperty"
	| "invalidMetaType"
	| "missingDocsUrl"
	| "inconsistentHasSuggestions"
	| "invalidFixableValue"
	| "inconsistentMessageIdFormat"
	| "missingPerformanceTracking"
	| "inconsistentPerformanceLogging"
	| "invalidRecommendedProperty"
	| "missingExport"
	| "defaultExportNotAllowed"
	| "multipleExportsNotAllowed"
	| "useSourceCodeProperty"
	| "useFilenameProperty";

// Validate message ID format (must be camelCase)
function validateMessageId(
	messageId: unknown,
	node: TSESTree.Node,
	context: TSESLint.RuleContext<MessageIds, Options>,
): void {
	// Skip validation if messageId is not a string or is empty
	if (typeof messageId !== "string" || messageId.trim() === "") {
		return;
	}

	// Check if messageId follows camelCase format (first character lowercase, no special chars except letters and numbers)
	if (!/^[a-z][a-zA-Z0-9]*$/.test(messageId)) {
		context.report({
			node,
			messageId: "inconsistentMessageIdFormat",
			data: { messageId },
			fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
				try {
					// Convert to camelCase by:
					// 1. Replacing any non-alphanumeric sequences with uppercase next character
					// 2. Making first character lowercase
					const fixedId = messageId
						.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) =>
							chr ? chr.toUpperCase() : "",
						)
						.replace(/^[A-Z]/, (firstChar) => firstChar.toLowerCase())
						.replace(/[^a-zA-Z0-9_$]/g, ""); // Remove any remaining invalid characters

					// Only fix if the result is a valid identifier and not empty
					if (fixedId && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(fixedId)) {
						return fixer.replaceText(node, `'${fixedId}'`);
					}
				} catch (e) {
					// If there's an error during fixing, don't provide a fix
					console.warn(`Failed to fix message ID '${messageId}':`, e);
				}
				return null;
			},
		});
	}
}

// Check if a property exists in an object expression
function hasProperty(
	node: TSESTree.ObjectExpression,
	propertyName: string,
): boolean {
	return node.properties.some(
		(prop: TSESTree.ObjectLiteralElement): boolean => {
			return (
				prop.type === "Property" &&
				((prop.key.type === "Identifier" && prop.key.name === propertyName) ||
					(prop.key.type === "Literal" && prop.key.value === propertyName))
			);
		},
	);
}

// Get a property from an object expression
function getProperty(
	node: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.ObjectLiteralElement | null {
	return (
		node.properties.find((prop: TSESTree.ObjectLiteralElement): boolean => {
			if (prop.type !== "Property") {
				return false;
			}

			if (prop.key.type === "Identifier") {
				return prop.key.name === propertyName;
			}

			if (prop.key.type === "Literal") {
				return prop.key.value === propertyName;
			}

			return false;
		}) ?? null
	);
}

// Check rule naming convention
function checkRuleNaming(
	node: TSESTree.VariableDeclarator,
	context: TSESLint.RuleContext<MessageIds, Options>,
): void {
	if (!context.options[0].enforceNamingConvention) {
		return;
	}

	if (node.id.type !== "Identifier") {
		return;
	}

	// Check for Rule suffix
	if (!node.id.name.endsWith("Rule")) {
		context.report({
			node: node.id,
			messageId: "missingRuleSuffix",
			fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
				return fixer.insertTextAfter(node.id, "Rule");
			},
		});

		return;
	}

	const expectedCamelCase = path
		.basename(context.filename, ".ts")
		.replace(/-/g, "-")
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
		.replace(/^[A-Z]/, (firstChar) => firstChar.toLowerCase());

	if (node.id.name.replace(/Rule$/, "") !== expectedCamelCase) {
		context.report({
			node: node.id,
			messageId: "inconsistentNaming",
			data: {
				expected: `${expectedCamelCase}Rule`,
				actual: node.id.name,
			},
			suggest: [
				{
					messageId: "inconsistentNaming",
					data: {
						expected: `${expectedCamelCase}Rule`,
						actual: node.id.name,
					},
					fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
						return fixer.replaceText(node.id, `${expectedCamelCase}Rule`);
					},
				},
			],
		});
	}
}

// Check message IDs for consistency
function checkMessageIds(
	node: TSESTree.ObjectExpression,
	context: TSESLint.RuleContext<MessageIds, Options>,
): void {
	const prop = getProperty(node, "messages");

	const messages = prop !== null && "value" in prop ? prop.value : null;

	if (messages === null || messages.type !== "ObjectExpression") {
		return;
	}

	messages.properties.forEach((prop: TSESTree.ObjectLiteralElement): void => {
		if (prop.type !== "Property") {
			return;
		}

		let messageId: string | null = null;

		if (prop.key.type === "Identifier") {
			messageId = prop.key.name;
		} else if (
			prop.key.type === "Literal" &&
			typeof prop.key.value === "string"
		) {
			messageId = prop.key.value;
		}

		if (messageId && !/^[a-z][a-zA-Z0-9]*$/.test(messageId)) {
			context.report({
				node: prop.key,
				messageId: "inconsistentMessageIdFormat",
				data: { id: messageId },
				fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
					return prop.key.type === "Identifier" || prop.key.type === "Literal"
						? fixer.replaceText(
								prop.key,
								`'${messageId
									.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
									.replace(/^[A-Z]/, (firstChar) => firstChar.toLowerCase())}'`,
							)
						: null;
				},
			});
		}
	});
}

// Track rule definitions and exports
const ruleExports: { node: TSESTree.Node; name: string }[] = [];

let defaultExportNode: TSESTree.Node | null = null;
let currentRuleNode: TSESTree.Node | null = null;

// Track the current rule being processed
let inRuleDefinition = false;
let currentRuleName: string | null = null; // Tracks the name of the current rule being processed
let hasSuggestions = false; // Tracks if the current rule has suggestions enabled

const ruleName = "consistent-rule-structure";

export const consistentRuleStructureRule = ESLintUtils.RuleCreator(
	(name: string): string => {
		return getRuleDocUrl(name);
	},
)<Options, MessageIds>({
	name: ruleName,
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Enforce consistent structure and properties across all ESLint rules",
			url: getRuleDocUrl(ruleName),
		},
		fixable: "code",
		hasSuggestions: true,
		schema: [
			{
				type: "object",
				properties: {
					requirePerformanceTracking: { type: "boolean" },
					requireDocumentationUrl: { type: "boolean" },
					enforceNamingConvention: { type: "boolean" },
					exemptRules: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
					},
					performance: {
						type: "object",
						properties: {
							maxTime: { type: "number", minimum: 1 },
							maxMemory: { type: "number", minimum: 1 },
							maxNodes: { type: "number", minimum: 1 },
							enableMetrics: { type: "boolean" },
							logMetrics: { type: "boolean" },
							maxOperations: {
								type: "object",
								properties: Object.fromEntries(
									Object.entries(PerformanceOperations).map(([key]) => [
										key,
										{ type: "number", minimum: 1 },
									]),
								),
							},
						},
						additionalProperties: false,
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			missingRuleSuffix: "Rule export name must end with 'Rule'",
			inconsistentNaming:
				"Rule export name must match the rule name in camelCase",
			missingMetaProperty: "Missing required meta property: {{property}}",
			invalidMetaType:
				"Meta property '{{property}}' has invalid type. Expected {{expected}}, got {{actual}}",
			missingDocsUrl: "Rule documentation is missing a URL",
			inconsistentHasSuggestions:
				"hasSuggestions should be set to true for rules providing suggestions",
			invalidFixableValue:
				"fixable must be 'code' for rules that provide fixes",
			inconsistentMessageIdFormat: "Message ID '{{id}}' should be in camelCase",
			missingPerformanceTracking:
				"Performance tracking is missing for this rule",
			inconsistentPerformanceLogging:
				"Performance logging should be consistent with other rules",
			invalidRecommendedProperty:
				"The 'recommended' property should not be in the 'docs' object",
			missingExport: 'Rule must be exported using "export const"',
			defaultExportNotAllowed: "Default exports are not allowed for rules",
			multipleExportsNotAllowed: "Only one rule export is allowed per file",
			useSourceCodeProperty:
				"Use context.sourceCode instead of context.getSourceCode()",
			useFilenameProperty:
				"Use context.filename instead of context.getFilename()",
		},
	},
	defaultOptions: [
		{
			requirePerformanceTracking: true,
			requireDocumentationUrl: true,
			enforceNamingConvention: true,
			exemptRules: [],
			performance: DEFAULT_PERFORMANCE_BUDGET,
		},
	],
	create(
		context: TSESLint.RuleContext<MessageIds, Options>,
		[option],
	): TSESLint.RuleListener {
		const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

		startPhase(perfKey, "ruleInit");

		const perf = createPerformanceTracker<Options>(
			perfKey,
			option.performance,
			context,
		);

		if (option.performance?.enableMetrics === true) {
			startTracking(context, perfKey, option.performance, ruleName);
		}

		console.info(
			`${ruleName}: Initializing rule for file: ${context.filename}`,
		);
		console.info(`${ruleName}: Rule configuration:`, option);

		recordMetric(perfKey, "config", {
			performance: {
				enableMetrics: option.performance?.enableMetrics,
				logMetrics: option.performance?.logMetrics,
			},
		});

		trackOperation(perfKey, PerformanceOperations.ruleInit);

		endPhase(perfKey, "ruleInit");

		let nodeCount = 0;

		function shouldContinue(): boolean {
			nodeCount++;

			// Check if we've exceeded the node budget
			if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
				trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

				return false;
			}

			return true;
		}

		startPhase(perfKey, "fileAnalysis");

		if (option.exemptRules?.includes(path.basename(context.filename, ".ts"))) {
			trackOperation(perfKey, PerformanceOperations.fileAnalysis);

			endPhase(perfKey, "fileAnalysis");

			return {};
		}

		startPhase(perfKey, "ruleExecution");

		return {
			"*": (node: TSESTree.Node): void => {
				if (!shouldContinue()) {
					endPhase(perfKey, "recordMetrics");

					stopTracking(perfKey);

					return;
				}

				perf.trackNode(node);

				trackOperation(
					perfKey,
					PerformanceOperations[`${node.type}Processing`],
				);
			},

			// Track rule definitions
			CallExpression(node: TSESTree.CallExpression): void {
				if (
					node.type === "CallExpression" &&
					node.callee.type === "Identifier" &&
					node.callee.name === "createRule"
				) {
					if (inRuleDefinition) {
						// We're already processing a rule, so this is a nested rule which we don't support
						return;
					}

					inRuleDefinition = true;
					currentRuleNode = node;

					// Reset rule-specific state
					hasSuggestions = false;

					// Process the rule's options and metadata
					if (
						!(
							node.type === "CallExpression" &&
							node.arguments.length > 0 &&
							node.arguments[0]?.type === "ObjectExpression"
						)
					) {
						return;
					}

					const ruleOptions = node.arguments[0];

					// Check for name property
					const nameProperty = ruleOptions.properties.find(
						(prop: TSESTree.ObjectLiteralElement): boolean => {
							return (
								prop.type === "Property" &&
								prop.key.type === "Identifier" &&
								prop.key.name === "name"
							);
						},
					);

					if (
						nameProperty &&
						"value" in nameProperty &&
						nameProperty.value.type === "Literal" &&
						typeof nameProperty.value.value === "string"
					) {
						currentRuleName = nameProperty.value.value;

						// Ensure the rule name follows the correct naming convention
						if (
							context.options[0].enforceNamingConvention &&
							!/^[a-z][a-zA-Z0-9]*$/.test(currentRuleName)
						) {
							context.report({
								node: nameProperty.value,
								messageId: "inconsistentNaming",
								data: { name: currentRuleName },
								fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
									return fixer.replaceText(
										nameProperty.value,
										`'${currentRuleName
											?.replace(/[^a-zA-Z0-9]+/g, "-")
											.replace(/^-+|-+$/g, "")
											.toLowerCase()}'`,
									);
								},
							});
						}
					}

					// Process meta properties
					const metaProperty = ruleOptions.properties.find(
						(prop: TSESTree.ObjectLiteralElement): boolean => {
							return (
								prop.type === "Property" &&
								prop.key.type === "Identifier" &&
								prop.key.name === "meta"
							);
						},
					);

					if (
						typeof metaProperty !== "undefined" &&
						"value" in metaProperty &&
						metaProperty.value.type === "ObjectExpression"
					) {
						// Check for hasSuggestions
						const hasSuggestionsProp = metaProperty.value.properties.find(
							(prop: TSESTree.ObjectLiteralElement): boolean => {
								return (
									prop.type === "Property" &&
									prop.key.type === "Identifier" &&
									prop.key.name === "hasSuggestions"
								);
							},
						);

						if (hasSuggestionsProp) {
							// Track if the rule has suggestions enabled
							hasSuggestions =
								"value" in hasSuggestionsProp &&
								hasSuggestionsProp.value.type === "Literal" &&
								hasSuggestionsProp.value.value === true;

							// Ensure hasSuggestions is a boolean
							if (
								"value" in hasSuggestionsProp &&
								(hasSuggestionsProp.value.type !== "Literal" ||
									typeof hasSuggestionsProp.value.value !== "boolean")
							) {
								context.report({
									node: hasSuggestionsProp.value,
									messageId: "inconsistentHasSuggestions",
									fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
										return fixer.replaceText(hasSuggestionsProp.value, "true");
									},
								});
								// Update hasSuggestions after fixing
								hasSuggestions = true;
							}

							// If the rule has suggestions, ensure it has a proper URL in the docs
							if (hasSuggestions) {
								const metaProperty = ruleOptions.properties.find(
									(prop: TSESTree.ObjectLiteralElement): boolean => {
										return (
											prop.type === "Property" &&
											prop.key.type === "Identifier" &&
											prop.key.name === "meta"
										);
									},
								);

								if (
									typeof metaProperty !== "undefined" &&
									"value" in metaProperty &&
									metaProperty.value.type === "ObjectExpression"
								) {
									const docsProp = metaProperty.value.properties.find(
										(prop: TSESTree.ObjectLiteralElement): boolean => {
											return (
												prop.type === "Property" &&
												prop.key.type === "Identifier" &&
												prop.key.name === "docs"
											);
										},
									);

									if (
										typeof docsProp !== "undefined" &&
										"value" in docsProp &&
										docsProp.value.type === "ObjectExpression"
									) {
										if (
											!docsProp.value.properties.find(
												(prop: TSESTree.ObjectLiteralElement): boolean => {
													return (
														prop.type === "Property" &&
														prop.key.type === "Identifier" &&
														prop.key.name === "url"
													);
												},
											)
										) {
											context.report({
												node: docsProp,
												messageId: "missingDocsUrl",
												data: { ruleName: currentRuleName || "unknown" },
											});
										}
									}
								}
							}
						}

						// Check for fixable property
						const fixableProp = metaProperty.value.properties.find(
							(prop: TSESTree.ObjectLiteralElement): boolean => {
								return (
									prop.type === "Property" &&
									prop.key.type === "Identifier" &&
									prop.key.name === "fixable"
								);
							},
						);

						if (fixableProp) {
							// Ensure fixable is 'code' or 'whitespace'
							if (
								"value" in fixableProp &&
								fixableProp.value.type === "Literal" &&
								fixableProp.value.value !== "code" &&
								fixableProp.value.value !== "whitespace"
							) {
								context.report({
									node: fixableProp.value,
									messageId: "invalidFixableValue",
									fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
										return fixer.replaceText(fixableProp.value, "'code'");
									},
								});
							}
						}

						// Check for docs object
						const docsProp = metaProperty.value.properties.find(
							(prop: TSESTree.ObjectLiteralElement): boolean => {
								return (
									prop.type === "Property" &&
									prop.key.type === "Identifier" &&
									prop.key.name === "docs"
								);
							},
						);

						if (
							typeof docsProp !== "undefined" &&
							"value" in docsProp &&
							docsProp.value.type === "ObjectExpression"
						) {
							// Check for recommended property (should not be present)
							const recommendedProp = docsProp.value.properties.find(
								(prop: TSESTree.ObjectLiteralElement): boolean => {
									return (
										prop.type === "Property" &&
										prop.key.type === "Identifier" &&
										prop.key.name === "recommended"
									);
								},
							);

							if (typeof recommendedProp !== "undefined") {
								context.report({
									node: recommendedProp,
									messageId: "invalidRecommendedProperty",
									fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
										return fixer.remove(recommendedProp);
									},
								});
							}

							// Check for URL
							const urlProp = docsProp.value.properties.find(
								(prop: TSESTree.ObjectLiteralElement): boolean => {
									return (
										prop.type === "Property" &&
										prop.key.type === "Identifier" &&
										prop.key.name === "url"
									);
								},
							);

							if (
								typeof urlProp !== "undefined" &&
								context.options[0].requireDocumentationUrl
							) {
								context.report({
									node: docsProp,
									messageId: "missingDocsUrl",
								});
							}
						}

						// Check for messages object
						const messagesProp = metaProperty.value.properties.find(
							(prop: TSESTree.ObjectLiteralElement): boolean => {
								try {
									return (
										prop.type === "Property" &&
										prop.key.type === "Identifier" &&
										prop.key.name === "messages"
									);
								} catch (e) {
									console.warn("Error checking messages property:", e);
									return false;
								}
							},
						);

						if (
							typeof messagesProp !== "undefined" &&
							"value" in messagesProp &&
							messagesProp.value &&
							messagesProp.value.type === "ObjectExpression"
						) {
							// Validate all message IDs
							if (
								messagesProp.value.properties &&
								Array.isArray(messagesProp.value.properties)
							) {
								messagesProp.value.properties.forEach(
									(prop: TSESTree.ObjectLiteralElement): void => {
										try {
											if (
												prop &&
												prop.type === "Property" &&
												prop.key &&
												prop.key.type === "Literal" &&
												typeof prop.key.value === "string"
											) {
												validateMessageId(prop.key.value, prop.key, context);
											}
										} catch (e) {
											console.warn("Error validating message ID:", e);
										}
									},
								);
							}
						}
					}
				}
			},

			// Check for default exports
			ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration): void {
				defaultExportNode = node;
			},

			// Check for export declarations
			ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration): void {
				// Track named exports that are rules
				if (node.declaration?.type === "VariableDeclaration") {
					for (const decl of node.declaration.declarations) {
						if (
							decl.init &&
							decl.init.type === "CallExpression" &&
							decl.init.callee.type === "Identifier" &&
							decl.init.callee.name === "createRule"
						) {
							if (decl.id.type === "Identifier") {
								ruleExports.push({ node: decl, name: decl.id.name });
							}
						}
					}
				}
			},

			// Check variable declarations for rule definitions
			VariableDeclarator(node: TSESTree.VariableDeclarator): void {
				if (
					node.init === null ||
					!(
						node.init.type === "CallExpression" &&
						node.init.callee.type === "Identifier" &&
						node.init.callee.name === "createRule"
					)
				) {
					return;
				}

				inRuleDefinition = true;
				currentRuleNode = node;
				currentRuleName =
					node.id.type === "Identifier" &&
					node.init &&
					node.init.type === "CallExpression" &&
					node.init.callee.type === "Identifier" &&
					node.init.callee.name === "createRule"
						? node.id.name
						: null;

				// Check rule naming convention
				checkRuleNaming(node, context);

				// Check the rule's option object (first argument to createRule)
				const ruleOptions =
					node.init !== null && "arguments" in node.init
						? node.init?.arguments?.[0]
						: null;

				if (
					!(ruleOptions !== null && ruleOptions?.type === "ObjectExpression")
				) {
					return;
				}

				const prop = getProperty(ruleOptions, "meta");

				const meta = prop !== null && "value" in prop ? prop.value : null;

				if (!meta || meta.type !== "ObjectExpression") {
					context.report({
						node: ruleOptions,
						messageId: "missingMetaProperty",
						data: { property: "meta" },
					});

					return;
				}

				// Check required meta properties
				const requiredMetaProperties = ["type", "docs", "messages"];

				for (const prop of requiredMetaProperties) {
					if (!hasProperty(meta, prop)) {
						context.report({
							node: meta,
							messageId: "missingMetaProperty",
							data: { property: `meta.${prop}` },
						});
					}
				}

				const docsProp = getProperty(meta, "docs");

				// Check meta.docs
				const docs =
					docsProp !== null && "value" in docsProp ? docsProp.value : null;

				if (docs && docs.type === "ObjectExpression") {
					// Check for documentation URL
					if (option.requireDocumentationUrl && !hasProperty(docs, "url")) {
						context.report({
							node: docs,
							messageId: "missingDocsUrl",
						});
					}

					// Check for invalid 'recommended' property in docs
					const recommendedProp = getProperty(docs, "recommended");

					if (recommendedProp) {
						context.report({
							node: recommendedProp,
							messageId: "invalidRecommendedProperty",
							fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
								// Get the full range of the property including any trailing comma
								const tokenBefore =
									context.sourceCode.getTokenBefore(recommendedProp);
								const tokenAfter =
									context.sourceCode.getTokenAfter(recommendedProp);

								let start = recommendedProp.range[0];
								let end = recommendedProp.range[1];

								// Include leading whitespace and comma if it's not the first property
								if (tokenBefore && tokenBefore.value === ",") {
									start = tokenBefore.range[0];
								}

								// Include trailing comma if it exists
								else if (tokenAfter && tokenAfter.value === ",") {
									end = tokenAfter.range[1];
								}

								return fixer.removeRange([start, end]);
							},
						});
					}
				}

				// Check hasSuggestions
				const hasSuggestionsProp = getProperty(meta, "hasSuggestions");

				if (hasSuggestionsProp !== null) {
					hasSuggestions = true;
					if (
						"value" in hasSuggestionsProp &&
						hasSuggestionsProp.value.type === "Literal" &&
						hasSuggestionsProp.value.value !== true
					) {
						context.report({
							node: hasSuggestionsProp,
							messageId: "inconsistentHasSuggestions",
							fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
								return fixer.replaceText(hasSuggestionsProp.value, "true");
							},
						});
					}
				}

				// Check fixable
				const fixableProp = getProperty(meta, "fixable");

				if (
					fixableProp !== null &&
					"value" in fixableProp &&
					fixableProp.value.type === "Literal" &&
					fixableProp.value.value === true
				) {
					context.report({
						node: fixableProp,
						messageId: "invalidFixableValue",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
							return fixer.replaceText(fixableProp.value, "'code'");
						},
					});
				}

				// Check for performance tracking
				if (option.requirePerformanceTracking) {
					const prop = getProperty(ruleOptions, "create");

					const createFn = prop !== null && "value" in prop ? prop.value : null;

					if (
						createFn !== null &&
						createFn.type === "FunctionExpression" &&
						!/createPerformanceTracker|trackOperation/.test(
							context.sourceCode.getText(createFn),
						)
					) {
						context.report({
							node: createFn,
							messageId: "missingPerformanceTracking",
						});
					}
				}

				// Check message IDs
				checkMessageIds(meta, context);
			},

			// Check for context.getSourceCode() usage
			'CallExpression[callee.object.name="context"][callee.property.name="getSourceCode"]'(
				node: TSESTree.CallExpression,
			): void {
				// Only report if we're inside a rule definition
				if (inRuleDefinition) {
					context.report({
						node,
						messageId: "useSourceCodeProperty",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
							return fixer.replaceText(node, "context.sourceCode");
						},
					});
				}
			},

			// Check for context.getFilename() usage
			'CallExpression[callee.object.name="context"][callee.property.name="getFilename"]'(
				node: TSESTree.CallExpression,
			): void {
				// Only report if we're inside a rule definition
				if (inRuleDefinition) {
					context.report({
						node,
						messageId: "useFilenameProperty",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
							return fixer.replaceText(node, "context.filename");
						},
					});
				}
			},

			// Handle the end of rule definition by checking parent nodes
			"CallExpression > :not(CallExpression)"(node: TSESTree.Node): void {
				if (inRuleDefinition && node.parent === currentRuleNode) {
					// We've processed all children of the rule definition
					inRuleDefinition = false;

					// Log performance metrics if the rule has them and we have a name
					if (currentRuleName) {
						// Here you could add performance tracking logic if needed
						// For example: trackRulePerformance(currentRuleName, hasSuggestions);
					}

					// Reset state for the next rule
					currentRuleName = null;
					hasSuggestions = false;
					currentRuleNode = null;
				}
			},

			"VariableDeclarator > :not(VariableDeclarator)"(
				node: TSESTree.VariableDeclarator,
			): void {
				if (node !== currentRuleNode) {
					return;
				}

				inRuleDefinition = false;
				currentRuleNode = null;
				currentRuleName = null;
			},

			"Program:exit"(): void {
				startPhase(perfKey, "programExit");

				// Check for missing exports
				if (
					currentRuleNode &&
					!ruleExports.some(
						(exp: { node: TSESTree.Node; name: string }): boolean => {
							return exp.node === currentRuleNode;
						},
					)
				) {
					context.report({
						node: currentRuleNode,
						messageId: "missingExport",
						fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
							if (
								!currentRuleNode?.parent ||
								currentRuleNode?.parent.type !== "VariableDeclaration"
							) {
								return null;
							}

							// Insert 'export ' before 'const'
							const constToken = context.sourceCode.getFirstToken(
								currentRuleNode?.parent,
							);
							if (constToken === null) {
								return null;
							}

							return fixer.insertTextBefore(constToken, "export ");
						},
					});
				}
				try {
					startPhase(perfKey, "programExit");

					// Check for missing exports
					if (
						currentRuleNode &&
						!ruleExports.some(
							(exp: { node: TSESTree.Node; name: string }): boolean => {
								return exp.node === currentRuleNode;
							},
						)
					) {
						context.report({
							node: currentRuleNode,
							messageId: "missingExport",
							fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
								if (
									!currentRuleNode?.parent ||
									currentRuleNode?.parent.type !== "VariableDeclaration"
								) {
									return null;
								}

								// Insert 'export ' before 'const'
								const constToken = context.sourceCode.getFirstToken(
									currentRuleNode?.parent,
								);
								if (constToken === null) {
									return null;
								}

								return fixer.insertTextBefore(constToken, "export ");
							},
						});
					}

					// Check for default exports
					if (defaultExportNode !== null) {
						context.report({
							node: defaultExportNode,
							messageId: "defaultExportNotAllowed",
							fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
								if (defaultExportNode === null) {
									return null;
								}

								return fixer.remove(defaultExportNode);
							},
						});
					}

					// Check for multiple exports
					if (ruleExports.length > 1) {
						ruleExports
							.slice(1)
							.forEach((exp: { node: TSESTree.Node; name: string }): void => {
								context.report({
									node: exp.node,
									messageId: "multipleExportsNotAllowed",
								});
							});
					}

					try {
						startPhase(perfKey, "recordMetrics");

						const finalMetrics = stopTracking(perfKey);

						if (typeof finalMetrics !== "undefined") {
							console.info(
								`\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget ? "EXCEEDED" : "OK"}):`,
							);
							console.info(`  File: ${context.filename}`);
							console.info(
								`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`,
							);
							console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

							if (finalMetrics.exceededBudget) {
								console.warn("\n⚠️  Performance budget exceeded!");
							}
						}
					} catch (error: unknown) {
						console.error("Error recording metrics:", error);
					} finally {
						endPhase(perfKey, "recordMetrics");

						stopTracking(perfKey);
					}

					perf["Program:exit"]();
				} catch (error) {
					console.error("Error in Program:exit handler:", error);
				} finally {
					endPhase(perfKey, "programExit");
				}
			},
		};
	},
});
