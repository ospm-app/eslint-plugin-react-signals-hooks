import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-threejs/docs/rules/${name}.md`;
});

type MessageIds = 'legacyImport' | 'legacyImportWithReplacement';

export default createRule<[], MessageIds>({
  name: 'no-legacy-examples-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prevent imports from the Three.js examples directory, which are considered legacy and can cause compatibility issues',
      recommended: 'recommended',
    },
    hasSuggestions: true,
    fixable: 'code',
    messages: {
      legacyImport: "Importing from 'three/examples' is not recommended. {{suggestion}}",
      legacyImportWithReplacement:
        "Importing '{{imported}}' from 'three/examples' is not recommended. Use '{{replacement}}' instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Common replacements for known example imports
    const commonReplacements: Record<string, string> = {
      OrbitControls: 'three/addons/controls/OrbitControls.js',
      EffectComposer: 'three/addons/postprocessing/EffectComposer.js',
      GLTFLoader: 'three/addons/loaders/GLTFLoader.js',
      DRACOLoader: 'three/addons/loaders/DRACOLoader.js',
      MapControls: 'three/addons/controls/MapControls.js',
    };

    const isThreeExamplesImport = (source: string): boolean => {
      return (
        source.startsWith('three/examples/') ||
        source.includes('/three/examples/') ||
        source.includes('\\three\\examples\\')
      );
    };

    function reportLegacyImport(
      node: TSESTree.Literal | TSESTree.TemplateLiteral,
      importedName?: string | undefined,
      isTypeOnly = false
    ) {
      if (node.type === 'TemplateLiteral') {
        // Skip dynamic imports with template literals as we can't determine the exact value
        if (node.expressions.length > 0) {
          context.report({
            node,
            messageId: 'legacyImport',
            data: {
              suggestion:
                'Avoid using dynamic imports from the three/examples directory as they may cause compatibility issues.',
            },
          });

          return;
        }
      }

      if (typeof importedName !== 'undefined') {
        const replacement = commonReplacements[importedName];

        if (replacement) {
          const importKeyword = isTypeOnly ? 'import type' : 'import';

          context.report({
            node,
            messageId: 'legacyImportWithReplacement',
            data: {
              imported: importedName,
              replacement: `${importKeyword} { ${importedName} } from '${replacement}'`,
            },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
              return fixer.replaceText(node, `'${replacement}'`);
            },
          });

          return;
        }
      }

      context.report({
        node,
        messageId: 'legacyImport',
        data: {
          suggestion: 'Use official, supported APIs from the main Three.js library instead.',
        },
      });
    }

    return {
      // Handle static imports
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        if (isThreeExamplesImport(node.source.value)) {
          if (node.specifiers.length > 0) {
            // Handle named imports
            for (const specifier of node.specifiers) {
              if (specifier.type === 'ImportSpecifier') {
                reportLegacyImport(
                  node.source,
                  specifier.imported.name,
                  node.importKind === 'type'
                );

                return; // Report once per import declaration
              }
            }
          } else {
            // Handle side-effect imports
            reportLegacyImport(node.source, undefined, node.importKind === 'type');
          }
        }
      },

      // Handle dynamic imports
      ImportExpression(node: TSESTree.ImportExpression): void {
        if (
          node.source &&
          node.source.type === 'Literal' &&
          isThreeExamplesImport(String(node.source.value))
        ) {
          reportLegacyImport(node.source);
        } else if (
          node.source &&
          node.source.type === 'TemplateLiteral' &&
          node.source.quasis.some((quasi: TSESTree.TemplateElement): boolean => {
            return isThreeExamplesImport(quasi.value.raw);
          })
        ) {
          reportLegacyImport(node.source);
        }
      },

      // Handle require() calls
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          isThreeExamplesImport(String(node.arguments[0].value))
        ) {
          reportLegacyImport(node.arguments[0]);
        }
      },
    };
  },
});
