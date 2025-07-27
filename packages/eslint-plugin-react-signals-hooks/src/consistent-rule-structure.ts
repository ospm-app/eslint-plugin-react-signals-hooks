import * as path from 'node:path';

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

import { getRuleDocUrl } from './utils/urls.js';

type Option = {
  requirePerformanceTracking: boolean;
  requireDocumentationUrl: boolean;
  enforceNamingConvention: boolean;
  exemptRules: string[];
};

// Types for rule option
type Options = [Option];

// Types for rule messages
type MessageIds =
  | 'missingRuleSuffix'
  | 'inconsistentNaming'
  | 'missingMetaProperty'
  | 'invalidMetaType'
  | 'missingDocsUrl'
  | 'inconsistentHasSuggestions'
  | 'invalidFixableValue'
  | 'inconsistentMessageIdFormat'
  | 'missingPerformanceTracking'
  | 'inconsistentPerformanceLogging'
  | 'invalidRecommendedProperty'
  | 'missingExport'
  | 'defaultExportNotAllowed'
  | 'multipleExportsNotAllowed'
  | 'useSourceCodeProperty'
  | 'useFilenameProperty';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'consistent-rule-structure';

export const consistentRuleStructureRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce consistent structure and properties across all ESLint rules',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          requirePerformanceTracking: { type: 'boolean' },
          requireDocumentationUrl: { type: 'boolean' },
          enforceNamingConvention: { type: 'boolean' },
          exemptRules: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingRuleSuffix: "Rule export name must end with 'Rule'",
      inconsistentNaming: 'Rule export name must match the rule name in camelCase',
      missingMetaProperty: 'Missing required meta property: {{property}}',
      invalidMetaType:
        "Meta property '{{property}}' has invalid type. Expected {{expected}}, got {{actual}}",
      missingDocsUrl: 'Rule documentation is missing a URL',
      inconsistentHasSuggestions:
        'hasSuggestions should be set to true for rules providing suggestions',
      invalidFixableValue: "fixable must be 'code' for rules that provide fixes",
      inconsistentMessageIdFormat: "Message ID '{{id}}' should be in camelCase",
      missingPerformanceTracking: 'Performance tracking is missing for this rule',
      inconsistentPerformanceLogging: 'Performance logging should be consistent with other rules',
      invalidRecommendedProperty: "The 'recommended' property should not be in the 'docs' object",
      missingExport: 'Rule must be exported using "export const"',
      defaultExportNotAllowed: 'Default exports are not allowed for rules',
      multipleExportsNotAllowed: 'Only one rule export is allowed per file',
      useSourceCodeProperty: 'Use context.sourceCode instead of context.getSourceCode()',
      useFilenameProperty: 'Use context.filename instead of context.getFilename()',
    },
  },
  defaultOptions: [
    {
      requirePerformanceTracking: true,
      requireDocumentationUrl: true,
      enforceNamingConvention: true,
      exemptRules: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, Options>, [option]): TSESLint.RuleListener {
    const isExempt = option.exemptRules?.includes(path.basename(context.filename, '.ts'));

    if (isExempt) {
      return {};
    }

    // Track rule definitions and exports
    const ruleExports: { node: TSESTree.Node; name: string }[] = [];

    let defaultExportNode: TSESTree.Node | null = null;
    let currentRuleNode: TSESTree.Node | null = null;

    // Track the current rule being processed
    let inRuleDefinition = false;
    let currentRuleName: string | null = null;
    let hasSuggestions = false;

    // Helper to check if a string is in camelCase
    const isCamelCase = (str: string): boolean => {
      return /^[a-z][a-zA-Z0-9]*$/.test(str);
    };

    // Helper to convert string to camelCase
    const toCamelCase = (str: string): string => {
      return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, (firstChar) => firstChar.toLowerCase());
    };

    // Check if a node is a call to createRule
    const isCreateRuleCall = (node: TSESTree.Node): boolean => {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'createRule'
      );
    };

    // Validate message ID format (must be camelCase)
    const validateMessageId = (messageId: string, node: TSESTree.Node) => {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(messageId)) {
        context.report({
          node,
          messageId: 'inconsistentMessageIdFormat',
          data: { messageId },
          fix(fixer) {
            const fixedId = toCamelCase(messageId);
            return fixer.replaceText(node, `'${fixedId}'`);
          },
        });
      }
    };

    // Process a rule definition node
    const processRuleDefinition = (node: TSESTree.Node) => {
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
        node.type === 'CallExpression' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'ObjectExpression'
      ) {
        const ruleOptions = node.arguments[0];

        // Check for name property
        const nameProperty = ruleOptions.properties.find(
          (prop: TSESTree.ObjectLiteralElement): boolean => {
            return (
              prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'name'
            );
          }
        );

        if (
          nameProperty &&
          'value' in nameProperty &&
          nameProperty.value.type === 'Literal' &&
          typeof nameProperty.value.value === 'string'
        ) {
          currentRuleName = nameProperty.value.value;
        }

        // Process meta properties
        const metaProperty = ruleOptions.properties.find((prop) => {
          return (
            prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'meta'
          );
        });

        if (
          typeof metaProperty !== 'undefined' &&
          'value' in metaProperty &&
          metaProperty.value.type === 'ObjectExpression'
        ) {
          // Check for hasSuggestions
          const hasSuggestionsProp = metaProperty.value.properties.find(
            (prop: TSESTree.ObjectLiteralElement): boolean => {
              return (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'hasSuggestions'
              );
            }
          );

          if (hasSuggestionsProp) {
            hasSuggestions = true;

            // Ensure hasSuggestions is a boolean
            if (
              'value' in hasSuggestionsProp &&
              (hasSuggestionsProp.value.type !== 'Literal' ||
                typeof hasSuggestionsProp.value.value !== 'boolean')
            ) {
              context.report({
                node: hasSuggestionsProp.value,
                messageId: 'inconsistentHasSuggestions',
                fix(fixer) {
                  return fixer.replaceText(hasSuggestionsProp.value, 'true');
                },
              });
            }
          }

          // Check for fixable property
          const fixableProp = metaProperty.value.properties.find((prop) => {
            return (
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'fixable'
            );
          });

          if (fixableProp) {
            // Ensure fixable is 'code' or 'whitespace'
            if (
              'value' in fixableProp &&
              fixableProp.value.type === 'Literal' &&
              fixableProp.value.value !== 'code' &&
              fixableProp.value.value !== 'whitespace'
            ) {
              context.report({
                node: fixableProp.value,
                messageId: 'invalidFixableValue',
                fix(fixer) {
                  return fixer.replaceText(fixableProp.value, "'code'");
                },
              });
            }
          }

          // Check for docs object
          const docsProp = metaProperty.value.properties.find((prop) => {
            return (
              prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'docs'
            );
          });

          if (
            typeof docsProp !== 'undefined' &&
            'value' in docsProp &&
            docsProp.value.type === 'ObjectExpression'
          ) {
            // Check for recommended property (should not be present)
            const recommendedProp = docsProp.value.properties.find((prop) => {
              return (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'recommended'
              );
            });

            if (recommendedProp) {
              context.report({
                node: recommendedProp,
                messageId: 'invalidRecommendedProperty',
                fix(fixer) {
                  return fixer.remove(recommendedProp);
                },
              });
            }

            // Check for URL
            const urlProp = docsProp.value.properties.find((prop) => {
              return (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'url'
              );
            });

            if (!urlProp && option.requireDocumentationUrl) {
              context.report({
                node: docsProp,
                messageId: 'missingDocsUrl',
              });
            }
          }

          // Check for messages object
          const messagesProp = metaProperty.value.properties.find(
            (prop) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'messages'
          );

          if (
            typeof messagesProp !== 'undefined' &&
            'value' in messagesProp &&
            messagesProp.value.type === 'ObjectExpression'
          ) {
            // Validate all message IDs
            messagesProp.value.properties.forEach((prop) => {
              if (
                prop.type === 'Property' &&
                prop.key.type === 'Literal' &&
                typeof prop.key.value === 'string'
              ) {
                validateMessageId(prop.key.value, prop.key);
              }
            });
          }
        }
      }
    };

    // Get the rule name from a variable declarator
    function getRuleNameFromDeclarator(node: TSESTree.VariableDeclarator): string | null {
      return node.id.type === 'Identifier' && node.init && isCreateRuleCall(node.init)
        ? node.id.name
        : null;
    }

    // Check if a property exists in an object expression
    function hasProperty(node: TSESTree.ObjectExpression, propertyName: string): boolean {
      return node.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          ((prop.key.type === 'Identifier' && prop.key.name === propertyName) ||
            (prop.key.type === 'Literal' && prop.key.value === propertyName))
      );
    }

    // Get a property from an object expression
    function getProperty(
      node: TSESTree.ObjectExpression,
      propertyName: string
    ): TSESTree.Property | null {
      const prop = node.properties.find((prop) => {
        if (prop.type !== 'Property') return false;

        if (prop.key.type === 'Identifier') {
          return prop.key.name === propertyName;
        }
        if (prop.key.type === 'Literal') {
          return prop.key.value === propertyName;
        }
        return false;
      });

      return (prop as TSESTree.Property) || null;
    }

    // Get the value of a property
    function getPropertyValue(
      node: TSESTree.ObjectExpression,
      propertyName: string
    ): TSESTree.Node | null {
      return getProperty(node, propertyName)?.value ?? null;
    }

    // Check message IDs for consistency
    function checkMessageIds(node: TSESTree.ObjectExpression): void {
      const messages = getPropertyValue(node, 'messages');

      if (messages === null || messages.type !== 'ObjectExpression') {
        return;
      }

      messages.properties.forEach((prop: TSESTree.ObjectLiteralElement): void => {
        if (prop.type !== 'Property') {
          return;
        }

        let messageId: string | null = null;
        if (prop.key.type === 'Identifier') {
          messageId = prop.key.name;
        } else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
          messageId = prop.key.value;
        }

        if (messageId && !isCamelCase(messageId)) {
          context.report({
            node: prop.key,
            messageId: 'inconsistentMessageIdFormat',
            data: { id: messageId },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              if (prop.key.type === 'Identifier' || prop.key.type === 'Literal') {
                const fixedId = toCamelCase(messageId);
                return fixer.replaceText(prop.key, `'${fixedId}'`);
              }
              return null;
            },
          });
        }
      });
    }

    // Check meta properties
    function checkMetaProperties(node: TSESTree.ObjectExpression): void {
      const meta = getPropertyValue(node, 'meta');

      if (!meta || meta.type !== 'ObjectExpression') {
        context.report({
          node,
          messageId: 'missingMetaProperty',
          data: { property: 'meta' },
        });

        return;
      }

      // Check required meta properties
      const requiredMetaProperties = ['type', 'docs', 'messages'];

      for (const prop of requiredMetaProperties) {
        if (!hasProperty(meta, prop)) {
          context.report({
            node: meta,
            messageId: 'missingMetaProperty',
            data: { property: `meta.${prop}` },
          });
        }
      }

      // Check meta.docs
      const docs = getPropertyValue(meta, 'docs');
      if (docs && docs.type === 'ObjectExpression') {
        // Check for documentation URL
        if (option.requireDocumentationUrl && !hasProperty(docs, 'url')) {
          context.report({
            node: docs,
            messageId: 'missingDocsUrl',
          });
        }

        // Check for invalid 'recommended' property in docs
        const recommendedProp = getProperty(docs, 'recommended');
        if (recommendedProp) {
          context.report({
            node: recommendedProp,
            messageId: 'invalidRecommendedProperty',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              // Get the full range of the property including any trailing comma
              const tokenBefore = context.sourceCode.getTokenBefore(recommendedProp);
              const tokenAfter = context.sourceCode.getTokenAfter(recommendedProp);

              let start = recommendedProp.range[0];
              let end = recommendedProp.range[1];

              // Include leading whitespace and comma if it's not the first property
              if (tokenBefore && tokenBefore.value === ',') {
                start = tokenBefore.range[0];
              }

              // Include trailing comma if it exists
              else if (tokenAfter && tokenAfter.value === ',') {
                end = tokenAfter.range[1];
              }

              return fixer.removeRange([start, end]);
            },
          });
        }
      }

      // Check hasSuggestions
      const hasSuggestionsProp = getProperty(meta, 'hasSuggestions');
      if (hasSuggestionsProp) {
        hasSuggestions = true;
        if (
          hasSuggestionsProp.value.type === 'Literal' &&
          hasSuggestionsProp.value.value !== true
        ) {
          context.report({
            node: hasSuggestionsProp,
            messageId: 'inconsistentHasSuggestions',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              return fixer.replaceText(hasSuggestionsProp.value, 'true');
            },
          });
        }
      }

      // Check fixable
      const fixableProp = getProperty(meta, 'fixable');
      if (fixableProp) {
        if (fixableProp.value.type === 'Literal' && fixableProp.value.value === true) {
          context.report({
            node: fixableProp,
            messageId: 'invalidFixableValue',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              return fixer.replaceText(fixableProp.value, "'code'");
            },
          });
        }
      }

      // Check for performance tracking
      if (option.requirePerformanceTracking) {
        const createFn = getPropertyValue(node, 'create');
        if (createFn && createFn.type === 'FunctionExpression') {
          const sourceText = context.sourceCode.getText(createFn);
          const hasPerformanceTracking = /createPerformanceTracker|trackOperation/.test(sourceText);

          if (!hasPerformanceTracking) {
            context.report({
              node: createFn,
              messageId: 'missingPerformanceTracking',
            });
          }
        }
      }

      // Check message IDs
      checkMessageIds(meta);
    }

    // Check rule naming convention
    const checkRuleNaming = (node: TSESTree.VariableDeclarator): void => {
      if (!option.enforceNamingConvention) {
        return;
      }

      if (node.id.type !== 'Identifier') {
        return;
      }

      const ruleName = node.id.name;

      // Check for Rule suffix
      if (!ruleName.endsWith('Rule')) {
        context.report({
          node: node.id,
          messageId: 'missingRuleSuffix',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.insertTextAfter(node.id, 'Rule');
          },
        });
        return;
      }

      // Check if the rule name matches the file name
      const expectedName = ruleName.replace(/Rule$/, '');
      const expectedCamelCase = toCamelCase(
        path.basename(context.filename, '.ts').replace(/-/g, '-')
      );

      if (expectedName !== expectedCamelCase) {
        context.report({
          node: node.id,
          messageId: 'inconsistentNaming',
          data: {
            expected: `${expectedCamelCase}Rule`,
            actual: ruleName,
          },
          suggest: [
            {
              messageId: 'inconsistentNaming',
              data: {
                expected: `${expectedCamelCase}Rule`,
                actual: ruleName,
              },
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.replaceText(node.id, `${expectedCamelCase}Rule`);
              },
            },
          ],
        });
      }
    };

    return {
      // Track rule definitions
      CallExpression(node) {
        if (isCreateRuleCall(node)) {
          processRuleDefinition(node);
        }
      },

      'CallExpression:exit'(node) {
        if (currentRuleNode === node) {
          // We're exiting the current rule definition
          inRuleDefinition = false;
          currentRuleNode = null;
          currentRuleName = null;
          hasSuggestions = false;
        }
      },

      // Check for context.getSourceCode() usage
      'CallExpression[callee.object.name="context"][callee.property.name="getSourceCode"]'(
        node: TSESTree.CallExpression
      ) {
        // Only report if we're inside a rule definition
        if (inRuleDefinition) {
          context.report({
            node,
            messageId: 'useSourceCodeProperty',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              return fixer.replaceText(node, 'context.sourceCode');
            },
          });
        }
      },

      // Check for context.getFilename() usage
      'CallExpression[callee.object.name="context"][callee.property.name="getFilename"]'(
        node: TSESTree.CallExpression
      ) {
        // Only report if we're inside a rule definition
        if (inRuleDefinition) {
          context.report({
            node,
            messageId: 'useFilenameProperty',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              return fixer.replaceText(node, 'context.filename');
            },
          });
        }
      },

      // Check for default exports
      ExportDefaultDeclaration(node) {
        defaultExportNode = node;
      },

      // Check for export declarations
      ExportNamedDeclaration(node) {
        // Track named exports that are rules
        if (node.declaration?.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            if (decl.init && isCreateRuleCall(decl.init)) {
              if (decl.id.type === 'Identifier') {
                ruleExports.push({ node: decl, name: decl.id.name });
              }
            }
          }
        }
      },

      // Check variable declarations for rule definitions
      VariableDeclarator(node) {
        if (node.init === null || !isCreateRuleCall(node.init)) {
          return;
        }

        inRuleDefinition = true;
        currentRuleNode = node;
        currentRuleName = getRuleNameFromDeclarator(node);

        // Check rule naming convention
        checkRuleNaming(node);

        // Check the rule's option object (first argument to createRule)
        const ruleOptions =
          node.init !== null && 'arguments' in node.init ? node.init?.arguments?.[0] : null;

        if (ruleOptions !== null && ruleOptions.type === 'ObjectExpression') {
          checkMetaProperties(ruleOptions);
        }
      },

      'VariableDeclarator:exit'(node) {
        if (node === currentRuleNode) {
          inRuleDefinition = false;
          currentRuleNode = null;
          currentRuleName = null;
        }
      },

      'Program:exit'() {
        // Check for missing exports
        if (currentRuleNode && !ruleExports.some((exp) => exp.node === currentRuleNode)) {
          context.report({
            node: currentRuleNode,
            messageId: 'missingExport',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              if (
                !currentRuleNode?.parent ||
                currentRuleNode?.parent.type !== 'VariableDeclaration'
              ) {
                return null;
              }

              // Insert 'export ' before 'const'
              const constToken = context.sourceCode.getFirstToken(currentRuleNode?.parent);
              if (constToken === null) {
                return null;
              }

              return fixer.insertTextBefore(constToken, 'export ');
            },
          });
        }

        // Check for default exports
        if (defaultExportNode !== null) {
          context.report({
            node: defaultExportNode,
            messageId: 'defaultExportNotAllowed',
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
          ruleExports.slice(1).forEach((exp) => {
            context.report({
              node: exp.node,
              messageId: 'multipleExportsNotAllowed',
            });
          });
        }
      },
    };
  },
});
