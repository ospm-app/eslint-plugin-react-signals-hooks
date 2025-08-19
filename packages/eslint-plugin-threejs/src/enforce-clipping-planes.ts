import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

import { PerformanceOperations } from './utils/performance-constants';

type MessageIds = 'missingCleanup' | 'tooManyPlanes' | 'inefficientUpdate' | 'enableLocalClipping';

export const enforceClippingPlanes = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
})<[], MessageIds>({
  name: 'enforce-clipping-planes',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce best practices for using clipping planes in Three.js',
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
    schema: [
      {
        type: 'object',
        properties: {
          performance: {
            type: 'object',
            properties: {
              maxTime: { type: 'number', minimum: 1 },
              maxMemory: { type: 'number', minimum: 1 },
              maxNodes: { type: 'number', minimum: 1 },
              enableMetrics: { type: 'boolean' },
              logMetrics: { type: 'boolean' },
              maxOperations: {
                type: 'object',
                properties: Object.fromEntries(
                  Object.entries(PerformanceOperations).map(([key]) => [
                    key,
                    { type: 'number', minimum: 1 },
                  ])
                ),
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    // {
    //   // performance: DEFAULT_PERFORMANCE_BUDGET,
    // },
  ],
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

    function isInLoop(node: TSESTree.Node): boolean {
      const ancestors = context.sourceCode.getAncestors(node);

      for (let i = ancestors.length - 1; i >= 0; i--) {
        const a = ancestors[i];

        if (typeof a === 'undefined') {
          continue;
        }

        if (
          a.type === AST_NODE_TYPES.ForStatement ||
          a.type === AST_NODE_TYPES.ForInStatement ||
          a.type === AST_NODE_TYPES.ForOfStatement ||
          a.type === AST_NODE_TYPES.WhileStatement ||
          a.type === AST_NODE_TYPES.DoWhileStatement
        ) {
          return true;
        }
      }

      return false;
    }

    return {
      '*': (_node: TSESTree.Node): void => {},
      // Track material assignments
      [`${AST_NODE_TYPES.AssignmentExpression}:matches([left.type="MemberExpression"])`](
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

          const rendererName = getIdentifierName(node.left.object);

          if (rendererName !== null) {
            const count = node.right.elements.length;
            const prev = rendererClippingPlanes.get(rendererName);

            rendererClippingPlanes.set(rendererName, {
              node: node.left,
              count,
              inLoop: isInLoop(node) || prev?.inLoop === true,
              hasCleanup: prev?.hasCleanup === true,
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
        } else if (
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'clippingPlanes' &&
          ((node.right.type === AST_NODE_TYPES.Literal && node.right.value === null) ||
            (node.right.type === AST_NODE_TYPES.ArrayExpression &&
              node.right.elements.length === 0))
        ) {
          const rendererName = getIdentifierName(node.left.object);

          if (rendererName !== null) {
            const prev = rendererClippingPlanes.get(rendererName);

            rendererClippingPlanes.set(rendererName, {
              node: node.left,
              count: prev?.count ?? 0,
              inLoop: prev?.inLoop ?? false,
              hasCleanup: true,
            });
          }
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`]() {
        // Check for missing cleanup on renderers
        for (const [name, { node, hasCleanup, count, inLoop }] of rendererClippingPlanes) {
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

          // Warn if too many clipping planes are used
          if (typeof count === 'number' && count > 6) {
            context.report({
              node,
              messageId: 'tooManyPlanes',
              data: { count: String(count) },
            });
          }

          // Warn if clipping planes are updated inside a loop (render loop)
          if (inLoop === true) {
            context.report({
              node,
              messageId: 'inefficientUpdate',
              data: {
                suggestion: 'Move clipping planes updates outside of tight loops or cache planes',
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
