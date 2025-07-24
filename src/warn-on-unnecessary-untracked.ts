import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'unnecessaryUntracked';

type Options = [
  // biome-ignore lint/complexity/noBannedTypes: todo
  {
    // Future configuration options can be added here
  },
];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

function containsSignalAccess(node: TSESTree.Node): boolean {
  if (
    [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
      'ClassMethod',
      'ClassPrivateMethod',
      'ObjectMethod',
    ].includes(node.type)
  ) {
    return false;
  }

  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    (node.object.name.endsWith('Signal') || node.object.name.endsWith('signal'))
  ) {
    return true;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.some(
      (child) =>
        child && typeof child === 'object' && 'type' in child && containsSignalAccess(child)
    );
  }

  if ('properties' in node && Array.isArray(node.properties)) {
    return node.properties.some(
      (
        prop:
          | TSESTree.PropertyComputedName
          | TSESTree.PropertyNonComputedName
          | TSESTree.RestElement
          | TSESTree.SpreadElement
      ) => {
        return containsSignalAccess(prop);
      }
    );
  }

  if ('elements' in node && Array.isArray(node.elements)) {
    return node.elements.some(
      (element) =>
        element && typeof element === 'object' && 'type' in element && containsSignalAccess(element)
    );
  }

  for (const key of Object.keys(node)) {
    if (['parent', 'loc', 'range', 'type'].includes(key)) {
      continue;
    }

    const value = node[key as keyof typeof node];

    if (Array.isArray(value)) {
      if (
        value.some(
          (item) => item && typeof item === 'object' && 'type' in item && containsSignalAccess(item)
        )
      ) {
        return true;
      }
    } else if (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      containsSignalAccess(value)
    ) {
      return true;
    }
  }

  return false;
}

function isUnnecessaryUntrackedCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'untracked' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ArrowFunctionExpression' &&
    node.arguments[0].params.length === 0
  ) {
    const body = node.arguments[0].body;

    // Check for direct .value access
    if (
      body.type === 'MemberExpression' &&
      body.property.type === 'Identifier' &&
      body.property.name === 'value' &&
      body.object.type === 'MemberExpression' &&
      body.object.property.type === 'Identifier' &&
      body.object.property.name === 'value'
    ) {
      return true;
    }

    return containsSignalAccess(body);
  }

  return false;
}

function isInComponentOrHook(node: TSESTree.Node): boolean {
  let currentNode: TSESTree.Node | null = node;

  while (currentNode) {
    if (
      ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(
        currentNode.type
      )
    ) {
      let functionName = 'anonymous';

      if (currentNode.type === 'FunctionDeclaration' && currentNode.id) {
        functionName = currentNode.id.name;
      } else if (
        currentNode.parent?.type === 'VariableDeclarator' &&
        currentNode.parent.id.type === 'Identifier'
      ) {
        functionName = currentNode.parent.id.name;
      }

      return /^[A-Z]/.test(functionName) || functionName.startsWith('use');
    }

    currentNode = currentNode.parent || null;
  }

  return false;
}

export const warnOnUnnecessaryUntrackedRule = createRule<Options, MessageIds>({
  name: 'warn-on-unnecessary-untracked',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about unnecessary untracked() calls',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/warn-on-unnecessary-untracked',
    },
    messages: {
      unnecessaryUntracked: 'Unnecessary untracked() call',
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
    hasSuggestions: true,
  },
  defaultOptions: [{}],
  create(context: Readonly<RuleContext<MessageIds, Options>>) {
    return {
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'untracked' &&
          isUnnecessaryUntrackedCall(node) &&
          isInComponentOrHook(node)
        ) {
          context.report({
            node,
            messageId: 'unnecessaryUntracked',
            suggest: [
              {
                messageId: 'unnecessaryUntracked',
                fix(fixer) {
                  return fixer.replaceText(
                    node,
                    context.sourceCode.getText(node).replace(/^untracked\(([\s\S]*)\)$/, '$1')
                  );
                },
              },
            ],
          });
        }
      },
    };
  },
});
