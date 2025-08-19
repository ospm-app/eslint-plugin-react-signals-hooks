import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
// Using a type guard instead of isNodeOfType to avoid version conflicts

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
});

// Map of deprecated properties to their modern equivalents and metadata
const DEPRECATED_PROPERTIES = {
  gammaFactor: {
    suggestion: 'color space management',
    typeSuggestion: 'Use proper color space management instead of gammaFactor',
    needsColorManagement: true,
  },
  gammaInput: {
    suggestion: 'renderer.outputColorSpace = THREE.SRGBColorSpace',
    typeSuggestion: 'Use outputColorSpace instead of gammaInput',
    needsColorManagement: true,
  },
  gammaOutput: {
    suggestion: 'renderer.outputColorSpace = THREE.SRGBColorSpace',
    typeSuggestion: 'Use outputColorSpace instead of gammaOutput',
    needsColorManagement: true,
  },
  gamma: {
    suggestion: 'color space management',
    typeSuggestion: 'Use proper color space management instead of gamma',
    needsColorManagement: true,
  },
} as const;

// Check if a property is a deprecated gamma property
function isDeprecatedGammaProperty(
  propertyName: string
): propertyName is keyof typeof DEPRECATED_PROPERTIES {
  return propertyName in DEPRECATED_PROPERTIES;
}

// Report a deprecated gamma property with proper fix suggestions
function reportDeprecatedGamma({
  context,
  node,
  propertyName,
  isTypeReference = false,
}: GammaDeprecationContext) {
  const propertyInfo = DEPRECATED_PROPERTIES[propertyName as keyof typeof DEPRECATED_PROPERTIES];

  const messageId = isTypeReference ? 'deprecatedGammaType' : 'deprecatedGammaProperty';

  context.report({
    node,
    messageId,
    data: isTypeReference
      ? {
          property: propertyName,
          suggested: propertyInfo.typeSuggestion,
        }
      : {
          property: propertyName,
          suggested: propertyInfo.suggestion,
        },
    fix: isTypeReference
      ? null
      : (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null => {
          if (propertyName === 'gammaFactor' || propertyName === 'gamma') {
            const fixes: Array<TSESLint.RuleFix> = [];

            if (propertyInfo.needsColorManagement) {
              fixes.push(
                fixer.insertTextBefore(
                  context.sourceCode.ast,
                  'THREE.ColorManagement.enabled = true;\n\n'
                )
              );
            }

            if (node.parent?.type === 'Property' && node.parent.value === node) {
              // Handle object property case
              fixes.push(fixer.remove(node.parent));
            }

            fixes.push(
              fixer.replaceText(
                node,
                `// ${propertyName} is no longer needed with proper color management`
              )
            );

            return fixes;
          } else if (propertyName === 'gammaInput' || propertyName === 'gammaOutput') {
            // For renderer.gammaInput/Output, set outputColorSpace
            return fixer.replaceText(
              node,
              `${'object' in node ? ('name' in node.object ? node.object.name : node.object.type) : node.type}.outputColorSpace = THREE.SRGBColorSpace`
            );
          }

          return null;
        },
  });
}

// Handle assignments to material/renderer properties
function checkMemberAssignment(
  node: TSESTree.AssignmentExpression & { left: TSESTree.MemberExpression },
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): void {
  if (
    node.left.type === 'MemberExpression' &&
    node.left.property.type === 'Identifier' &&
    isDeprecatedGammaProperty(node.left.property.name)
  ) {
    reportDeprecatedGamma({
      context,
      node: node.left.property,
      propertyName: node.left.property.name,
    });
  }
}

// Handle object expressions (e.g., new THREE.Material({ gammaFactor: 2.2 }))
function checkObjectExpression(
  node: TSESTree.ObjectExpression | TSESTree.NewExpression,
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
): void {
  if (!('properties' in node)) {
    return;
  }

  for (const property of node.properties) {
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      isDeprecatedGammaProperty(property.key.name)
    ) {
      reportDeprecatedGamma({
        context,
        node: property.key,
        propertyName: property.key.name,
      });
    }
  }
}

// Handle TypeScript type references
function checkTypeReference(
  node: TSESTree.TSTypeReference,
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
) {
  if (
    node.typeName.type === 'TSQualifiedName' &&
    node.typeName.left.type === 'Identifier' &&
    node.typeName.left.name === 'THREE' &&
    node.typeName.right.type === 'Identifier' &&
    isDeprecatedGammaProperty(node.typeName.right.name)
  ) {
    reportDeprecatedGamma({
      context,
      node: node.typeName.right,
      propertyName: node.typeName.right.name,
      isTypeReference: true,
    });
  }
}

// Handle THREE.ColorManagement.legacyMode = true
function checkLegacyModeAssignment(
  node: TSESTree.AssignmentExpression,
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>
) {
  if (
    node.left.type === 'MemberExpression' &&
    node.left.object.type === 'MemberExpression' &&
    node.left.object.object.type === 'Identifier' &&
    node.left.object.object.name === 'THREE' &&
    node.left.object.property.type === 'Identifier' &&
    node.left.object.property.name === 'ColorManagement' &&
    node.left.property.type === 'Identifier' &&
    node.left.property.name === 'legacyMode'
  ) {
    context.report({
      node: node.left.property,
      messageId: 'deprecatedGammaMethod',
      data: {
        method: 'THREE.ColorManagement.legacyMode',
        suggested: 'Use the current color management system with THREE.ColorManagement.enabled',
      },
      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
        if ('property' in node.left) {
          return fixer.replaceText(node.left.property, 'enabled');
        }

        return null;
      },
    });
  }
}

type MessageIds = 'deprecatedGammaProperty' | 'deprecatedGammaMethod' | 'deprecatedGammaType';

type GammaDeprecationContext = {
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>;
  node: TSESTree.Node;
  propertyName: string;
  isTypeReference?: boolean;
};

export const noDeprecatedGammaFactor = createRule<[], MessageIds>({
  name: 'no-deprecated-gamma-factor',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the use of modern color management practices in Three.js by flagging deprecated gamma-related properties and methods',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      deprecatedGammaProperty:
        '{{property}} is deprecated. Use the current color management system with {{suggested}} instead.',
      deprecatedGammaMethod:
        '{{method}} is deprecated. Use the current color management system with {{suggested}} instead.',
      deprecatedGammaType: 'Type reference to {{property}} is deprecated. {{suggested}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // Handle direct assignments: material.gammaFactor = 2.2
      'AssignmentExpression:matches([left.type="MemberExpression"])'(
        node: TSESTree.AssignmentExpression
      ): void {
        if (node.left.type === 'MemberExpression') {
          checkMemberAssignment(
            node as TSESTree.AssignmentExpression & { left: TSESTree.MemberExpression },
            context
          );
        }

        checkLegacyModeAssignment(node, context);
      },

      // Handle object expressions in new THREE.Material() or new THREE.WebGLRenderer()
      'NewExpression > ObjectExpression': (node: TSESTree.NewExpression): void => {
        checkObjectExpression(node, context);
      },

      // Handle object spread patterns
      'ObjectExpression > SpreadElement > ObjectExpression'(node: TSESTree.ObjectExpression) {
        checkObjectExpression(node, context);
      },

      // Handle TypeScript type references
      TSTypeReference(node: TSESTree.TSTypeReference) {
        checkTypeReference(node, context);
      },

      // Handle TypeScript type aliases
      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration) {
        if (node.typeAnnotation.type === 'TSTypeReference') {
          checkTypeReference(node.typeAnnotation, context);
        }
      },

      // Handle TypeScript interface properties
      TSPropertySignature(node: TSESTree.TSPropertySignature) {
        if (
          node.typeAnnotation?.typeAnnotation.type === 'TSTypeReference' &&
          'name' in node.key &&
          node.key.type === AST_NODE_TYPES.Identifier &&
          'name' in node.key &&
          isDeprecatedGammaProperty(node.key.name)
        ) {
          reportDeprecatedGamma({
            context,
            node: node.key,
            propertyName: node.key.name,
            isTypeReference: true,
          });
        }
      },
    };
  },
});
