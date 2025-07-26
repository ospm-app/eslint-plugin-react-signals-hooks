import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

// Map of deprecated blending constants to their modern equivalents and metadata
const DEPRECATED_BLENDING = {
  // Blending modes
  AdditiveBlending: {
    replacement: 'AdditiveBlending',
    message: 'Consider using CustomBlending with appropriate blend equations for more control',
    isDeprecated: false, // Not actually deprecated but we want to suggest alternatives
  },
  SubtractiveBlending: {
    replacement: 'CustomBlending',
    message: 'Use CustomBlending with appropriate blend equations instead',
    isDeprecated: true,
  },
  MultiplyBlending: {
    replacement: 'CustomBlending',
    message: 'Use CustomBlending with appropriate blend equations instead',
    isDeprecated: true,
  },

  // Blend factors
  SrcAlphaFactor: {
    replacement: 'SRC_ALPHA',
    message: 'Use SRC_ALPHA instead',
    isDeprecated: true,
  },
  OneMinusSrcAlphaFactor: {
    replacement: 'ONE_MINUS_SRC_ALPHA',
    message: 'Use ONE_MINUS_SRC_ALPHA instead',
    isDeprecated: true,
  },

  // Additional deprecated blend factors
  SrcColorFactor: {
    replacement: 'SRC_COLOR',
    message: 'Use SRC_COLOR instead',
    isDeprecated: true,
  },
  OneMinusSrcColorFactor: {
    replacement: 'ONE_MINUS_SRC_COLOR',
    message: 'Use ONE_MINUS_SRC_COLOR instead',
    isDeprecated: true,
  },
  DstColorFactor: {
    replacement: 'DST_COLOR',
    message: 'Use DST_COLOR instead',
    isDeprecated: true,
  },
  OneMinusDstColorFactor: {
    replacement: 'ONE_MINUS_DST_COLOR',
    message: 'Use ONE_MINUS_DST_COLOR instead',
    isDeprecated: true,
  },
  DstAlphaFactor: {
    replacement: 'DST_ALPHA',
    message: 'Use DST_ALPHA instead',
    isDeprecated: true,
  },
  OneMinusDstAlphaFactor: {
    replacement: 'ONE_MINUS_DST_ALPHA',
    message: 'Use ONE_MINUS_DST_ALPHA instead',
    isDeprecated: true,
  },
} as const;

// Check if a property is a deprecated or suggested blending property
function isDeprecatedBlendingProperty(
  propertyName: string
): propertyName is keyof typeof DEPRECATED_BLENDING {
  return propertyName in DEPRECATED_BLENDING;
}

// Get the replacement information for a blending property
function getBlendingInfo(propertyName: string) {
  const info = DEPRECATED_BLENDING[propertyName as keyof typeof DEPRECATED_BLENDING];
  return info || { replacement: propertyName, message: '', isDeprecated: false };
}

// Check if a node is a THREE member expression with a blending property
function isThreeMemberExpression(
  node: TSESTree.MemberExpressionComputedName | TSESTree.MemberExpressionNonComputedName,
  context: Readonly<RuleContext<'deprecatedBlendingFunction', []>>
): boolean {
  if (node.type !== 'MemberExpression') return false;

  // Handle THREE.Something
  if (
    node.object.type === 'Identifier' &&
    node.object.name === 'THREE' &&
    node.property.type === 'Identifier' &&
    isDeprecatedBlendingProperty(node.property.name)
  ) {
    return true;
  }

  // Handle nested namespace imports like import * as THREE from 'three'
  if (
    node.object.type === 'Identifier' &&
    node.property.type === 'Identifier' &&
    isDeprecatedBlendingProperty(node.property.name)
  ) {
    // Check if the object is an import of THREE
    const scope = context.sourceCode.getScope?.(node) || context.getScope();
    const variable = scope.variables.find((v): boolean => {
      return 'name' in node.object && v.name === node.object.name;
    });

    if (
      variable?.defs.some((def) => {
        // Check if it's an import declaration
        if (def.type === 'ImportBinding' && def.parent?.type === 'ImportDeclaration') {
          // For namespace imports: import * as THREE from 'three'
          if (def.node.type === 'ImportNamespaceSpecifier') {
            return true;
          }
          // For default imports: import THREE from 'three'
          if (def.node.type === 'ImportDefaultSpecifier' && def.parent.source.value === 'three') {
            return true;
          }
        }
        return false;
      })
    ) {
      return true;
    }
  }

  return false;
}

// Get the property name from a member expression
function getPropertyName(node: TSESTree.MemberExpression): string | null {
  if (node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

// Handle assignments to material.blending and related properties
function checkMemberAssignment(
  node: TSESTree.AssignmentExpression,
  context: Readonly<RuleContext<'deprecatedBlendingFunction', []>>
) {
  if (node.left.type !== 'MemberExpression' || !node.left.property) {
    return;
  }

  const propertyName = getPropertyName(node.left);
  if (!propertyName) return;

  // Check for material.blending = THREE.DeprecatedBlending
  // or material.blendSrc/blendDst = THREE.DeprecatedFactor
  if (
    (propertyName === 'blending' ||
      propertyName === 'blendSrc' ||
      propertyName === 'blendDst' ||
      propertyName === 'blendEquation') &&
    node.right.type === 'MemberExpression' &&
    isThreeMemberExpression(node.right, context)
  ) {
    const deprecatedName = getPropertyName(node.right);
    if (!deprecatedName || !isDeprecatedBlendingProperty(deprecatedName)) {
      return;
    }

    const { replacement, message, isDeprecated } = getBlendingInfo(deprecatedName);
    const replacementText = `THREE.${replacement}`;

    context.report({
      node: node.right,
      messageId: 'deprecatedBlendingFunction',
      data: {
        name: deprecatedName,
        replacement: replacementText + (message ? ` (${message})` : ''),
      },
      suggest: isDeprecated
        ? [
            {
              messageId: 'deprecatedBlendingFunction',
              data: {
                name: deprecatedName,
                replacement: replacementText,
              },
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
                return fixer.replaceText(node.right, replacementText);
              },
            },
          ]
        : undefined,
      fix: isDeprecated
        ? (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => {
            return fixer.replaceText(node.right, replacementText);
          }
        : undefined,
    });
  }
}

// Handle object expressions (e.g., new THREE.Material({ blending: THREE.DeprecatedBlending }))
function checkObjectExpression(
  node: TSESTree.ObjectExpression | TSESTree.NewExpression,
  context: Readonly<RuleContext<'deprecatedBlendingFunction', []>>
): void {
  if (!('properties' in node)) {
    return;
  }

  for (const property of node.properties) {
    if (property.type !== 'Property') continue;

    const propertyName =
      property.key.type === 'Identifier'
        ? property.key.name
        : property.key.type === 'Literal' && typeof property.key.value === 'string'
          ? property.key.value
          : null;

    if (!propertyName) continue;

    // Check if this is a blending-related property
    if (
      ![
        'blending',
        'blendSrc',
        'blendDst',
        'blendEquation',
        'blendSrcAlpha',
        'blendDstAlpha',
      ].includes(propertyName)
    ) {
      continue;
    }

    // Handle MemberExpression values like THREE.AdditiveBlending
    if (
      property.value.type === 'MemberExpression' &&
      isThreeMemberExpression(property.value, context)
    ) {
      const deprecatedName = getPropertyName(property.value);
      if (!deprecatedName || !isDeprecatedBlendingProperty(deprecatedName)) {
        continue;
      }

      const { replacement, message, isDeprecated } = getBlendingInfo(deprecatedName);
      const replacementText = `THREE.${replacement}`;

      context.report({
        node: property.value,
        messageId: 'deprecatedBlendingFunction',
        data: {
          name: deprecatedName,
          replacement: replacementText + (message ? ` (${message})` : ''),
        },
        suggest: isDeprecated
          ? [
              {
                messageId: 'deprecatedBlendingFunction',
                data: {
                  name: deprecatedName,
                  replacement: replacementText,
                },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
                  return fixer.replaceText(property.value, replacementText);
                },
              },
            ]
          : undefined,
        fix: isDeprecated
          ? (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => {
              return fixer.replaceText(property.value, replacementText);
            }
          : undefined,
      });
    }
    // Handle Identifier values that might reference THREE constants
    else if (property.value.type === 'Identifier') {
      const scope = context.sourceCode.getScope(property.value);

      const variable = scope.variables.find((v): boolean => {
        return 'name' in property.value && v.name === property.value.name;
      });

      if (variable) {
        // Check if this is a reference to a THREE constant
        for (const def of variable.defs) {
          if (
            def.type === 'Variable' &&
            def.node.init?.type === 'MemberExpression' &&
            isThreeMemberExpression(def.node.init, context)
          ) {
            const deprecatedName = getPropertyName(def.node.init);
            if (!deprecatedName || !isDeprecatedBlendingProperty(deprecatedName)) {
              continue;
            }

            const { replacement, message, isDeprecated } = getBlendingInfo(deprecatedName);

            const replacementText = `THREE.${replacement}`;

            context.report({
              node: property.value,
              messageId: 'deprecatedBlendingFunction',
              data: {
                name: deprecatedName,
                replacement:
                  `${property.value.name} (references ${deprecatedName}) - use ${replacementText} directly` +
                  (message ? ` (${message})` : ''),
              },
              suggest: isDeprecated
                ? [
                    {
                      messageId: 'deprecatedBlendingFunction',
                      data: {
                        name: deprecatedName,
                        replacement: replacementText,
                      },
                      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
                        return fixer.replaceText(property.value, replacementText);
                      },
                    },
                  ]
                : undefined,
            });
          }
        }
      }
    }
  }
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
});

type MessageIds = 'deprecatedBlendingFunction' | 'deprecatedBlendingType';

export default createRule<[], MessageIds>({
  name: 'no-deprecated-tsl-blending-functions',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce the use of modern Three.js shader material blending functions instead of deprecated ones',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      deprecatedBlendingFunction: 'THREE.{{name}} is {{notDeprecated}}deprecated. {{replacement}}',
      deprecatedBlendingType: 'Type reference to THREE.{{name}} is deprecated. {{replacement}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreNonDeprecated: {
            type: 'boolean',
            default: false,
            description: 'If true, only report actually deprecated blending modes',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<MessageIds, []>>) {
    // const sourceCode = context.sourceCode || context.sourceCode;

    return {
      // Handle direct assignments: material.blending = THREE.DeprecatedBlending
      'AssignmentExpression:matches([left.type="MemberExpression"])'(
        node: TSESTree.AssignmentExpression
      ) {
        if (node.left.type === 'MemberExpression') {
          checkMemberAssignment(node, context);
        }
      },

      // Handle object expressions in new THREE.Material()
      'NewExpression > ObjectExpression': (node: TSESTree.NewExpression): void => {
        checkObjectExpression(node, context);
      },

      // Handle object spread patterns
      'ObjectExpression > SpreadElement > ObjectExpression'(node: TSESTree.ObjectExpression): void {
        checkObjectExpression(node, context);
      },

      // Handle TypeScript type references
      TSTypeReference(node: TSESTree.TSTypeReference): void {
        if (
          node.typeName.type === 'TSQualifiedName' &&
          node.typeName.left.type === 'Identifier' &&
          node.typeName.left.name === 'THREE' &&
          node.typeName.right.type === 'Identifier' &&
          isDeprecatedBlendingProperty(node.typeName.right.name)
        ) {
          const { replacement, message } = getBlendingInfo(node.typeName.right.name);
          const replacementText = `THREE.${replacement}`;

          context.report({
            node: node.typeName.right,
            messageId: 'deprecatedBlendingType',
            data: {
              name: node.typeName.right.name,
              replacement: `Use ${replacementText} instead${message ? ` (${message})` : ''}`,
            },
          });
        }
      },

      // Handle TypeScript type aliases
      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration): void {
        if (node.typeAnnotation.type === 'TSTypeReference') {
          // Let the TSTypeReference handler handle it
          return;
        }
      },

      // Handle TypeScript interface properties
      TSPropertySignature(node: TSESTree.TSPropertySignature): void {
        if (
          node.typeAnnotation?.typeAnnotation.type === 'TSTypeReference' &&
          node.typeAnnotation.typeAnnotation.typeName.type === 'TSQualifiedName' &&
          node.typeAnnotation.typeAnnotation.typeName.left.type === 'Identifier' &&
          node.typeAnnotation.typeAnnotation.typeName.left.name === 'THREE' &&
          node.typeAnnotation.typeAnnotation.typeName.right.type === 'Identifier' &&
          isDeprecatedBlendingProperty(node.typeAnnotation.typeAnnotation.typeName.right.name)
        ) {
          const { replacement, message } = getBlendingInfo(
            node.typeAnnotation.typeAnnotation.typeName.right.name
          );

          context.report({
            node: node.typeAnnotation.typeAnnotation.typeName.right,
            messageId: 'deprecatedBlendingType',
            data: {
              name: node.typeAnnotation.typeAnnotation.typeName.right.name,
              replacement: `Use ${`THREE.${replacement}`} instead${message ? ` (${message})` : ''}`,
            },
          });
        }
      },
    };
  },
});
