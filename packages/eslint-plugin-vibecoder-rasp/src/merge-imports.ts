import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name: string): string =>
    `https://github.com/your-org/eslint-plugin-vibecoder-rasp/docs/rules/${name}`
);

type Options = [];
type MessageIds = 'mergeImports';

export const mergeImports = createRule<Options, MessageIds>({
  name: 'merge-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Merge multiple imports from the same source into a single import statement',
    },
    fixable: 'code',
    schema: [],
    messages: {
      mergeImports: "Merge these imports from '{{source}}' into a single import statement",
    },
  },
  defaultOptions: [],
  create(context) {
    const imports = new Map<
      string,
      {
        nodes: TSESTree.ImportDeclaration[];
        specifiers: Set<string>;
        typeSpecifiers: Set<string>;
      }
    >();

    return {
      Program() {
        imports.clear();
      },
      ImportDeclaration(node) {
        if (!node.source || !node.specifiers.length) {
          return;
        }

        const source = node.source.value as string;
        const isTypeImport = node.importKind === 'type';

        if (!imports.has(source)) {
          imports.set(source, {
            nodes: [],
            specifiers: new Set(),
            typeSpecifiers: new Set(),
          });
        }

        const sourceImports = imports.get(source)!;
        sourceImports.nodes.push(node);

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier') {
            const name =
              'name' in specifier.imported ? specifier.imported.name : specifier.imported.value;

            if (isTypeImport || specifier.importKind === 'type') {
              sourceImports.typeSpecifiers.add(name);
            } else {
              sourceImports.specifiers.add(name);
            }
          }
        }
      },
      'Program:exit'() {
        for (const [source, { nodes, specifiers, typeSpecifiers }] of imports) {
          if (nodes.length <= 1) continue;

          const allSpecifiers = [
            ...Array.from(specifiers).map((name) => ({ name, type: false })),
            ...Array.from(typeSpecifiers).map((name) => ({ name, type: true })),
          ].sort((a, b) => a.name.localeCompare(b.name));

          context.report({
            node: nodes[0],
            messageId: 'mergeImports',
            data: { source },
            *fix(fixer) {
              // Remove all import statements except the first one
              for (let i = 1; i < nodes.length; i++) {
                yield fixer.remove(nodes[i]);
              }

              // Generate the new import specifiers
              const specifierText = allSpecifiers
                .map(({ name, type }) => (type ? `type ${name}` : name))
                .join(', ');

              // Replace the first import with the merged one
              yield fixer.replaceText(nodes[0], `import { ${specifierText} } from '${source}';`);
            },
          });
        }
      },
    };
  },
});
