import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
});

type MessageIds = 'missingCleanup' | 'tooManyPlanes' | 'inefficientUpdate' | 'enableLocalClipping';

export const enforceClippingPlanes = createRule<[], MessageIds>({
  name: 'enforce-clipping-planes',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce best practices for using clipping planes in Three.js',
      recommended: 'recommended',
    },
    fixable: 'code',
    messages: {
      missingCleanup:
        'Clipping planes should be properly removed when no longer needed to prevent memory leaks.',
      tooManyPlanes:
        'Using {{count}} clipping planes may exceed device limits. Consider reducing the number of active planes.',
      inefficientUpdate: 'Avoid updating clipping planes in the render loop. {{suggestion}}',
      enableLocalClipping:
        'Material.localClipping should be true when using local clipping planes.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track renderers and their clipping planes
    const rendererClippingPlanes = new Map<
      string,
      {
        node: TSESTree.Node;
        count: number;
        inLoop: boolean;
        hasCleanup: boolean;
      }
    >();

    // Track materials that need local clipping
    const materialsNeedingClipping = new Map<
      string,
      {
        node: TSESTree.Node;
        hasLocalClipping: boolean;
      }
    >();

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
      // Track material assignments
      'AssignmentExpression:matches([left.type="MemberExpression"])'(
        node: TSESTree.AssignmentExpression & {
          left: TSESTree.MemberExpression;
          right: TSESTree.Node;
        }
      ) {
        if (
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'clippingPlanes' &&
          node.right.type === AST_NODE_TYPES.ArrayExpression &&
          node.right.elements.length > 0
        ) {
          const materialName = getIdentifierName(node.left.object);
          if (materialName) {
            materialsNeedingClipping.set(materialName, {
              node: node.left,
              hasLocalClipping: false,
            });
          }
        } else if (
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'localClipping' &&
          node.right.type === AST_NODE_TYPES.Literal &&
          node.right.value === true
        ) {
          const materialName = getIdentifierName(node.left.object);

          if (materialName && materialsNeedingClipping.has(materialName)) {
            const clipping = materialsNeedingClipping.get(materialName);

            if (clipping) {
              clipping.hasLocalClipping = true;
            }
          }
        }
      },

      // Check for missing local clipping at the end of the program
      'Program:exit'() {
        // Check for missing cleanup on renderers
        for (const [name, { node, hasCleanup }] of rendererClippingPlanes) {
          if (!hasCleanup) {
            context.report({
              node,
              messageId: 'missingCleanup',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextAfter(
                  node,
                  `\n// TODO: Add cleanup for ${name}.clippingPlanes when no longer needed`
                );
              },
            });
          }
        }

        // Check for materials needing local clipping
        for (const [name, { node, hasLocalClipping }] of materialsNeedingClipping) {
          if (!hasLocalClipping) {
            context.report({
              node,
              messageId: 'enableLocalClipping',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                return fixer.insertTextBefore(node, `${name}.localClipping = true;\n`);
              },
            });
          }
        }
      },
    };
  },
});
