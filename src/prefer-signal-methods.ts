import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds =
  | 'usePeekInEffect'
  | 'useValueInJSX'
  | 'preferDirectSignalUsage'
  | 'preferPeekInNonReactiveContext';

type Options = [
  // biome-ignore lint/complexity/noBannedTypes: todo
  {
    // Future configuration options can be added here
  },
];

function isInDependencyArray(node: TSESTree.Node): boolean {
  let current = node;

  while (current.parent) {
    current = current.parent;
    if (
      current.type === 'ArrayExpression' &&
      current.parent?.type === 'CallExpression' &&
      current.parent.callee.type === 'Identifier' &&
      current.parent.callee.name === 'useEffect'
    ) {
      return true;
    }
  }

  return false;
}

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

const createRule = ESLintUtils.RuleCreator((name: string) => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

export const preferSignalMethodsRule = createRule<Options, MessageIds>({
  name: 'prefer-signal-methods',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce proper usage of signal methods (.value, .peek()) in different contexts',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-signal-methods',
    },
    messages: {
      usePeekInEffect:
        'Use signal.peek() to read the current value without subscribing to changes in this effect',
      useValueInJSX: 'Use the signal directly in JSX instead of accessing .value',
      preferDirectSignalUsage: 'Use the signal directly in JSX instead of .peek()',
      preferPeekInNonReactiveContext:
        'Prefer .peek() when reading signal value without using its reactive value',
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
    let isInEffect = false;
    let isInJSX = false;

    return {
      'CallExpression[callee.name="useEffect"]'(): void {
        isInEffect = true;
      },
      'CallExpression[callee.name="useEffect"]:exit'(): void {
        isInEffect = false;
      },

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

        // Handle direct signal usage (not a member expression)
        if (node.parent?.type !== 'MemberExpression' || node.parent.object !== node) {
          if (isInEffect && !isInDependencyArray(node)) {
            context.report({
              node,
              messageId: 'usePeekInEffect',
              fix(fixer) {
                return fixer.insertTextAfter(node, '.peek()');
              },
            });
          } else if (isInJSX || isInJSXContext(node)) {
            context.report({
              node,
              messageId: 'useValueInJSX',
              fix(fixer) {
                return fixer.insertTextAfter(node, '.value');
              },
            });
          }

          return;
        }

        if (!('name' in node.parent.property)) {
          return;
        }

        // Handle .value usage in JSX
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'value') {
          context.report({
            node: node.parent.property,
            messageId: 'useValueInJSX',
            fix(fixer) {
              if ('property' in node.parent) {
                return fixer.remove(node.parent.property);
              }

              return null;
            },
          });

          return;
        }

        // Handle .peek() usage in JSX
        if ((isInJSX || isInJSXContext(node)) && node.parent.property.name === 'peek') {
          context.report({
            node: node.parent.property,
            messageId: 'preferDirectSignalUsage',
            fix(fixer) {
              return fixer.remove(node.parent);
            },
          });
          return;
        }

        // Handle .value usage in effects outside of dependency arrays
        if (isInEffect && !isInDependencyArray(node) && node.parent.property.name === 'value') {
          context.report({
            node: node.parent.property,
            messageId: 'preferPeekInNonReactiveContext',
            fix(fixer) {
              if ('property' in node.parent) {
                return fixer.replaceText(node.parent.property, 'peek()');
              }

              return null;
            },
          });
        }
      },
    };
  },
});
