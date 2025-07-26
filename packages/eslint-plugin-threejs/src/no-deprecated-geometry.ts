import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
});

type MessageIds = 'deprecatedGeometry';

export default createRule<[], MessageIds>({
  name: 'no-deprecated-geometry',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the use of THREE.BufferGeometry instead of the deprecated THREE.Geometry class',
      recommended: 'recommended',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      deprecatedGeometry:
        'THREE.Geometry is deprecated. Use THREE.BufferGeometry instead for better performance and WebGL compatibility.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track if we've already imported THREE
    let hasThreeImport = false;
    let hasBufferGeometryImport = false;

    // Check if a node is a THREE.Geometry constructor call
    function isGeometryConstructor(node: TSESTree.NewExpression): boolean {
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'THREE' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'Geometry'
      ) {
        return true;
      }

      // Check for destructured Geometry import
      if (node.callee.type === 'Identifier' && node.callee.name === 'Geometry') {
        // Check if it's from a THREE import
        const variable = context
          .getScope()
          .variables.find((v) => v.name === 'Geometry' && v.defs.length > 0);

        if (variable) {
          return variable.defs.some((def) => {
            return (
              def.type === 'ImportBinding' &&
              def.parent?.type === 'ImportDeclaration' &&
              (def.parent.source.value === 'three' || def.parent.source.value.startsWith('three/'))
            );
          });
        }
      }

      return false;
    }

    // Handle new THREE.Geometry() calls
    return {
      // Check for new THREE.Geometry()
      NewExpression(node: TSESTree.NewExpression): void {
        if (isGeometryConstructor(node)) {
          context.report({
            node,
            messageId: 'deprecatedGeometry',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              const sourceCode = context.sourceCode || context.getSourceCode();
              const text = sourceCode.getText(node);

              // Replace new THREE.Geometry() with new THREE.BufferGeometry()
              const fixedText = text.replace(
                /new\s+(?:THREE\.)?Geometry\s*\(\s*\)/g,
                'new THREE.BufferGeometry()'
              );

              return fixer.replaceText(node, fixedText);
            },
          });
        }
      },

      // Check for imports of Geometry
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        if (node.source.value === 'three' || node.source.value.startsWith('three/')) {
          hasThreeImport = true;

          // Check if BufferGeometry is imported
          if (
            node.specifiers.some(
              (specifier) =>
                specifier.type === 'ImportSpecifier' && specifier.imported.name === 'BufferGeometry'
            )
          ) {
            hasBufferGeometryImport = true;
          }

          // Check for Geometry import to suggest removal
          const geometryImport = node.specifiers.find(
            (specifier) =>
              specifier.type === 'ImportSpecifier' && specifier.imported.name === 'Geometry'
          );

          if (geometryImport) {
            context.report({
              node: geometryImport,
              messageId: 'deprecatedGeometry',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                // Remove the Geometry import
                const sourceCode = context.sourceCode || context.getSourceCode();
                const text = sourceCode.getText(node);

                // If this is the only import, remove the entire import statement
                if (node.specifiers.length === 1) {
                  return fixer.remove(node);
                }

                // Otherwise, just remove this specific import
                const importText = sourceCode.getText(geometryImport);
                let newText = text.replace(importText, '');

                // Clean up any trailing commas or whitespace
                newText = newText.replace(/,\s*,/g, ',');
                newText = newText.replace(/{\s*,/g, '{');
                newText = newText.replace(/,\s*}/g, '}');
                newText = newText.replace(/\s+/g, ' ').trim();

                return fixer.replaceText(node, newText);
              },
            });
          }
        }
      },

      // Add BufferGeometry import if needed
      'Program:exit'(): void {
        if (hasThreeImport && !hasBufferGeometryImport) {
          const sourceCode = context.sourceCode || context.getSourceCode();
          const program = sourceCode.ast;

          // Check if there are any Geometry usages that would need BufferGeometry
          const hasGeometryUsage = sourceCode.ast.body.some((node) => {
            if (node.type === 'ImportDeclaration') {
              const importNode = node as TSESTree.ImportDeclaration;
              if (
                importNode.source.value === 'three' ||
                importNode.source.value.startsWith('three/')
              ) {
                return importNode.specifiers.some(
                  (specifier) =>
                    specifier.type === 'ImportSpecifier' && specifier.imported.name === 'Geometry'
                );
              }
            }

            // @ts-expect-error
            if (node.type === 'NewExpression') {
              const newNode = node as TSESTree.NewExpression;
              return isGeometryConstructor(newNode);
            }

            return false;
          });

          if (hasGeometryUsage) {
            // Find the THREE import to add BufferGeometry to it
            const threeImport = program.body.find(
              (node): node is TSESTree.ImportDeclaration =>
                node.type === 'ImportDeclaration' &&
                (node.source.value === 'three' || node.source.value.startsWith('three/'))
            );

            if (threeImport) {
              context.report({
                node: threeImport,
                messageId: 'deprecatedGeometry',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const text = sourceCode.getText(threeImport);
                  const newSpecifiers = [...threeImport.specifiers];

                  // Add BufferGeometry to the import if it's not already there
                  if (
                    !newSpecifiers.some(
                      (s) => s.type === 'ImportSpecifier' && s.imported.name === 'BufferGeometry'
                    )
                  ) {
                    const lastSpecifier = newSpecifiers[newSpecifiers.length - 1];
                    const insertPos = lastSpecifier
                      ? lastSpecifier.range?.[1] || 0
                      : text.indexOf('}') > -1
                        ? text.indexOf('{')
                        : text.length;

                    const newSpecifier = ', BufferGeometry';

                    return fixer.insertTextAfterRange([insertPos, insertPos], newSpecifier);
                  }

                  return null;
                },
              });
            }
          }
        }
      },
    };
  },
});
