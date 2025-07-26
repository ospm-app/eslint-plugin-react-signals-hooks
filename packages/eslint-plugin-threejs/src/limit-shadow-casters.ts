import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`
);

type MessageIds =
  | 'tooManyShadowCasters'
  | 'unnecessaryShadowCasting'
  | 'suboptimalShadowMapSize'
  | 'missingShadowCameraConfig';

const MAX_RECOMMENDED_CASTERS = 4;
const MIN_SHADOW_MAP_SIZE = 512;
const MAX_SHADOW_MAP_SIZE = 2048;

export default createRule<[], MessageIds>({
  name: 'limit-shadow-casters',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce best practices for shadow casting in Three.js applications',
      recommended: 'recommended',
    },
    fixable: 'code',
    messages: {
      tooManyShadowCasters:
        '{{count}} objects are set to cast shadows, which may impact performance. Consider reducing the number of shadow casters.',
      unnecessaryShadowCasting:
        'This object is unlikely to cast visible shadows. Consider disabling shadow casting for better performance.',
      suboptimalShadowMapSize:
        'Shadow map size of {{width}}x{{height}} may be {{issue}}. Recommended size is between 512x512 and 2048x2048 for most use cases.',
      missingShadowCameraConfig: 'Shadow camera is not properly configured. {{suggestion}}.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const shadowCasters: Array<{
      node: TSESTree.Node;
      name: string | null;
    }> = [];

    const shadowMaps: Array<{
      node: TSESTree.Node;
      width: number | null;
      height: number | null;
      name: string | null;
    }> = [];

    const shadowCameras: Array<{
      node: TSESTree.Node;
      name: string | null;
      hasNearFar: boolean;
      hasPosition: boolean;
      hasTarget: boolean;
    }> = [];

    // Helper to get the identifier name from a node
    function getIdentifierName(node: TSESTree.Node): string | null {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return node.name;
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        return getIdentifierName(node.object);
      }
      return null;
    }

    return {
      // Track shadow camera configuration
      'AssignmentExpression:matches([left.type="MemberExpression"])'(
        node: TSESTree.AssignmentExpression & {
          left: TSESTree.MemberExpression;
          right: TSESTree.Node;
        }
      ) {
        if (
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'shadow' &&
          node.left.object.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.property.type === AST_NODE_TYPES.Identifier &&
          node.left.object.property.name === 'camera' &&
          node.right.type === AST_NODE_TYPES.ObjectExpression
        ) {
          const name = getIdentifierName(node.left.object.object);
          let hasNearFar = false;
          let hasPosition = false;
          let hasTarget = false;

          for (const prop of node.right.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.key.type === AST_NODE_TYPES.Identifier
            ) {
              if (['near', 'far'].includes(prop.key.name)) {
                hasNearFar = true;
              } else if (prop.key.name === 'position') {
                hasPosition = true;
              } else if (prop.key.name === 'target') {
                hasTarget = true;
              }
            }
          }

          shadowCameras.push({
            node: node.right,
            name,
            hasNearFar,
            hasPosition,
            hasTarget,
          });
        }
      },

      // Report issues at the end of the program
      'Program:exit'() {
        // Check for too many shadow casters
        if (shadowCasters.length > MAX_RECOMMENDED_CASTERS) {
          shadowCasters.forEach(({ node, name }) => {
            context.report({
              node,
              messageId: 'tooManyShadowCasters',
              data: {
                count: shadowCasters.length.toString(),
              },
              suggest: [
                {
                  messageId: 'unnecessaryShadowCasting',
                  fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                    return fixer.replaceText(node, `${name ? `${name}.` : ''}castShadow = false`);
                  },
                },
              ],
            });
          });
        }

        // Check shadow map sizes
        shadowMaps.forEach(({ node, width, height }): void => {
          if (width !== null && height !== null) {
            let issue = null;

            if (width < MIN_SHADOW_MAP_SIZE || height < MIN_SHADOW_MAP_SIZE) {
              issue = 'too small';
            } else if (width > MAX_SHADOW_MAP_SIZE || height > MAX_SHADOW_MAP_SIZE) {
              issue = 'too large';
            }

            if (issue) {
              context.report({
                node,
                messageId: 'suboptimalShadowMapSize',
                data: {
                  width: width.toString(),
                  height: height.toString(),
                  issue,
                },
                fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                  const newWidth = Math.min(
                    Math.max(width, MIN_SHADOW_MAP_SIZE),
                    MAX_SHADOW_MAP_SIZE
                  );

                  const newHeight = Math.min(
                    Math.max(height, MIN_SHADOW_MAP_SIZE),
                    MAX_SHADOW_MAP_SIZE
                  );

                  return fixer.replaceText(node, `{ width: ${newWidth}, height: ${newHeight} }`);
                },
              });
            }
          }
        });

        // Check shadow camera configuration
        shadowCameras.forEach(({ node, hasNearFar, hasPosition, hasTarget }): void => {
          const missingConfigs = [];

          if (!hasNearFar) {
            missingConfigs.push('near/far planes');
          }

          if (!hasPosition) {
            missingConfigs.push('position');
          }

          if (!hasTarget) {
            missingConfigs.push('target');
          }

          if (missingConfigs.length > 0) {
            context.report({
              node,
              messageId: 'missingShadowCameraConfig',
              data: {
                suggestion: `Configure ${missingConfigs.join(', ')} for optimal shadow quality`,
              },
              fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                const newProperties: string[] = [];

                if (!hasNearFar) {
                  newProperties.push('near: 0.5, far: 500');
                }

                if (!hasPosition) {
                  newProperties.push('position: { x: 0, y: 0, z: 0 }');
                }

                if (!hasTarget) {
                  newProperties.push('target: new THREE.Object3D()');
                }

                const insertPos = node.range[0] + context.sourceCode.getText(node).lastIndexOf('}');

                return fixer.insertTextBeforeRange(
                  [insertPos, insertPos],
                  `, ${newProperties.join(', ')}`
                );
              },
            });
          }
        });
      },
    };
  },
});
