import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`
);

type MessageIds = 'preferGpuAnimation' | 'inefficientTransformation';

export default createRule<[], MessageIds>({
  name: 'prefer-gpu-animation',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Encourage the use of GPU-accelerated animation techniques in Three.js',
      recommended: 'recommended',
    },
    fixable: 'code',
    messages: {
      preferGpuAnimation:
        'CPU-based animation detected. Consider using {{suggestion}} for better performance.',
      inefficientTransformation: 'Inefficient transformation detected. {{suggestion}}.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track animation-related patterns
    const animationPatterns: Array<{
      node: TSESTree.Node;
      type: 'position' | 'rotation' | 'scale' | 'morph' | 'particle' | 'matrix';
      objectName: string | null;
    }> = [];

    // Helper to check if node is inside an animation loop
    function isInAnimationLoop(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;

      while (current) {
        // Check for common animation loop patterns
        if (current.type === AST_NODE_TYPES.CallExpression) {
          // Handle direct function calls like requestAnimationFrame()
          if (
            current.callee.type === AST_NODE_TYPES.Identifier &&
            (current.callee.name === 'requestAnimationFrame' ||
              current.callee.name === 'setInterval')
          ) {
            return true;
          }

          // Handle method calls like window.requestAnimationFrame()
          if (
            current.callee.type === AST_NODE_TYPES.MemberExpression &&
            current.callee.property.type === AST_NODE_TYPES.Identifier &&
            (current.callee.property.name === 'requestAnimationFrame' ||
              current.callee.property.name === 'setInterval')
          ) {
            return true;
          }
        }
        // Check for while(true) loops
        else if (
          current.type === AST_NODE_TYPES.WhileStatement &&
          current.test.type === AST_NODE_TYPES.Literal &&
          current.test.value === true
        ) {
          return true;
        }

        current = current.parent;
      }
      return false;
    }

    // Helper to get the object name from a member expression
    function getObjectName(node: TSESTree.MemberExpression): string | null {
      if (node.object.type === AST_NODE_TYPES.Identifier) {
        return node.object.name;
      }
      if (node.object.type === AST_NODE_TYPES.MemberExpression) {
        return getObjectName(node.object);
      }
      return null;
    }

    // Check for direct property updates in animation loops
    function checkPropertyUpdate(node: TSESTree.AssignmentExpression): void {
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        ['x', 'y', 'z', 'w'].includes(node.left.property.name) &&
        node.left.object.type === AST_NODE_TYPES.MemberExpression &&
        node.left.object.property.type === AST_NODE_TYPES.Identifier &&
        ['position', 'rotation', 'quaternion', 'scale'].includes(node.left.object.property.name)
      ) {
        const objectName = getObjectName(node.left.object);
        const property = node.left.object.property.name;

        if (isInAnimationLoop(node)) {
          animationPatterns.push({
            node,
            type: property as 'position' | 'rotation' | 'scale',
            objectName,
          });
        }
      }
    }

    // Check for morph target animations
    function checkMorphTargetUpdate(node: TSESTree.CallExpression): void {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'morphTargetInfluences' &&
        node.arguments.length > 0 &&
        isInAnimationLoop(node)
      ) {
        const objectName = getObjectName(node.callee);
        animationPatterns.push({
          node,
          type: 'morph',
          objectName,
        });
      }
    }

    // Check for particle system updates
    function checkParticleUpdate(node: TSESTree.ForStatement): void {
      if (
        node.body.type === AST_NODE_TYPES.BlockStatement &&
        node.body.body.some(
          (stmt) =>
            stmt.type === AST_NODE_TYPES.ExpressionStatement &&
            stmt.expression.type === AST_NODE_TYPES.CallExpression &&
            stmt.expression.callee.type === AST_NODE_TYPES.MemberExpression &&
            stmt.expression.callee.property.type === AST_NODE_TYPES.Identifier &&
            stmt.expression.callee.property.name === 'set' &&
            isInAnimationLoop(node)
        )
      ) {
        animationPatterns.push({
          node,
          type: 'particle',
          objectName: null,
        });
      }
    }

    // Check for matrix updates
    function checkMatrixUpdate(node: TSESTree.CallExpression): void {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        [
          'makeTranslation',
          'makeRotationX',
          'makeRotationY',
          'makeRotationZ',
          'makeScale',
        ].includes(node.callee.property.name) &&
        isInAnimationLoop(node)
      ) {
        const objectName = getObjectName(node.callee);
        animationPatterns.push({
          node,
          type: 'matrix',
          objectName,
        });
      }
    }

    return {
      // Check for direct property updates
      AssignmentExpression: (node: TSESTree.AssignmentExpression): void => {
        checkPropertyUpdate(node);
      },

      // Check for morph target updates
      CallExpression: (node: TSESTree.CallExpression): void => {
        checkMorphTargetUpdate(node);
        checkMatrixUpdate(node);
      },

      // Check for particle system updates
      ForStatement: (node: TSESTree.ForStatement): void => {
        checkParticleUpdate(node);
      },

      // Report issues at the end of the program
      'Program:exit'() {
        animationPatterns.forEach(({ node, type, objectName }): void => {
          let suggestion = '';
          let fix: ((fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null) | null = null;

          switch (type) {
            case 'position':
            case 'rotation':
            case 'scale':
              suggestion = `Use shader-based animation or instanced meshes for ${type} updates`;
              fix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                return fixer.insertTextBefore(
                  node,
                  `// Consider using GPU-accelerated animation for ${objectName || 'object'}.${type}\n`
                );
              };
              break;

            case 'morph':
              suggestion = 'Use morph target shader attributes for better performance';
              fix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                return fixer.insertTextBefore(
                  node,
                  `// Consider using morph target shader attributes for ${objectName || 'morph target'}\n`
                );
              };
              break;

            case 'particle':
              suggestion =
                'Use THREE.InstancedMesh or THREE.Points with custom shaders for particle systems';
              fix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                return fixer.insertTextBefore(
                  node,
                  '// Consider using THREE.InstancedMesh or THREE.Points for better particle performance\n'
                );
              };
              break;

            case 'matrix':
              suggestion = 'Pre-compute matrices or use matrix composition outside the render loop';
              fix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                return fixer.insertTextBefore(
                  node,
                  `// Consider pre-computing ${objectName || 'matrix'} updates outside the render loop\n`
                );
              };
              break;
          }

          context.report({
            node,
            messageId: type === 'matrix' ? 'inefficientTransformation' : 'preferGpuAnimation',
            data: { suggestion },
            fix,
          });
        });
      },
    };
  },
});
