import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'useValueInNonJSX';

type Options = [
  // biome-ignore lint/complexity/noBannedTypes: todo
  {
    // Future configuration options can be added here
  },
];

function isInJSXContext(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

function isInJSXAttribute(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === 'JSXAttribute') {
      return true;
    }

    parent = parent.parent;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

export const preferSignalReadsRule = createRule<Options, MessageIds>({
  name: 'prefer-signal-reads',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce using .value when reading signal values in non-JSX contexts',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-signal-reads',
    },
    messages: {
      useValueInNonJSX: 'Use .value to read the current value of the signal in non-JSX context',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Future configuration options can be added here
        },
        additionalProperties: false,
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [{}],
  create(context: Readonly<RuleContext<MessageIds, Options>>): ESLintUtils.RuleListener {
    let isInJSX = false;

    return {
      JSXElement(): void {
        isInJSX = true;
      },
      'JSXElement:exit'(): void {
        isInJSX = false;
      },
      JSXFragment(): void {
        isInJSX = true;
      },
      'JSXFragment:exit'(): void {
        isInJSX = false;
      },

      'Identifier:matches([name$="Signal"], [name$="signal"])'(node: TSESTree.Node): void {
        if (
          !(
            node.type === 'Identifier' &&
            (node.name.endsWith('Signal') || node.name.endsWith('signal'))
          )
        ) {
          return;
        }

        // Skip if in JSX context
        if (isInJSX || isInJSXContext(node) || isInJSXAttribute(node)) {
          return;
        }

        // Skip if already using .value
        if (
          node.parent?.type === 'MemberExpression' &&
          node.parent.object === node &&
          'property' in node.parent &&
          node.parent.property.type === 'Identifier' &&
          node.parent.property.name === 'value'
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'useValueInNonJSX',
          fix(fixer) {
            return fixer.insertTextAfter(node, '.value');
          },
        });
      },
    };
  },
});
