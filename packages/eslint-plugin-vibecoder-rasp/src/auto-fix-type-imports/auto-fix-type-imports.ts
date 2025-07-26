import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/your-org/eslint-plugin-vibecoder-rasp/docs/rules/${name}`
);

type MessageIds = 'incorrectTypeImport' | 'missingTypeImport';

export const autoFixTypeImports = createRule<[], MessageIds>({
  name: 'auto-fix-type-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description: "Automatically fix type imports to use 'type' keyword when appropriate",
    },
    fixable: 'code',
    messages: {
      incorrectTypeImport: "This import should use the 'type' keyword",
      missingTypeImport: "This import should not use the 'type' keyword",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.getSourceCode();
    const program = sourceCode.ast as TSESTree.Program;
    const importNodes: TSESTree.ImportDeclaration[] = [];
    const typeReferences = new Set<string>();
    const valueReferences = new Set<string>();

    // Collect all import declarations
    program.body.forEach((node) => {
      if (node.type === 'ImportDeclaration') {
        importNodes.push(node);
      }
    });

    // Track how each imported name is used
    return {
      // Track type references
      TSTypeReference(node: TSESTree.Node) {
        if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
          typeReferences.add(node.typeName.name);
        }
      },

      // Track value references
      Identifier(node: TSESTree.Node) {
        if (node.type === 'Identifier' && !isTypeNode(node.parent as TSESTree.Node)) {
          valueReferences.add(node.name);
        }
      },

      // After the entire program is processed, check all imports
      'Program:exit'() {
        for (const importNode of importNodes) {
          if (!importNode.source || !importNode.specifiers.length) continue;

          const specifiers = importNode.specifiers.filter(
            (s): s is TSESTree.ImportSpecifier => s.type === 'ImportSpecifier'
          );

          for (const specifier of specifiers) {
            const localName = specifier.local.name;

            const isTypeImport =
              specifier.importKind === 'type' || importNode.importKind === 'type';

            const isUsedAsType = typeReferences.has(localName);
            const isUsedAsValue = valueReferences.has(localName);

            // Case 1: Imported as type but used as value
            if (isTypeImport && isUsedAsValue) {
              context.report({
                node: specifier,
                messageId: 'missingTypeImport',
                fix(fixer: TSESLint.RuleFixer) {
                  // Remove 'type' keyword from this import
                  if (specifier.importKind === 'type') {
                    return fixer.removeRange([
                      specifier.range[0],
                      specifier.range[0] + 5, // 'type '.length
                    ]);
                  }
                  return null;
                },
              });
            }
            // Case 2: Used only as type but not imported as type
            else if (isUsedAsType && !isUsedAsValue && !isTypeImport) {
              context.report({
                node: specifier,
                messageId: 'incorrectTypeImport',
                fix(fixer) {
                  // Add 'type' keyword to this import
                  return fixer.insertTextBefore(specifier, 'type ');
                },
              });
            }
          }
        }
      },
    };
  },
});

// Helper function to check if a node is part of a type annotation
function isTypeNode(node: TSESTree.Node): boolean {
  return (
    node.type.startsWith('TS') ||
    node.type === 'TSTypeAnnotation' ||
    node.type === 'TSTypeParameter' ||
    node.type === 'TSTypeParameterDeclaration' ||
    node.type === 'TSTypeParameterInstantiation' ||
    node.type === 'TSInterfaceDeclaration' ||
    node.type === 'TSTypeAliasDeclaration' ||
    node.type === 'TSTypeReference' ||
    (node.parent && isTypeNode(node.parent))
  );
}
