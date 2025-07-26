import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, Scope } from '@typescript-eslint/utils/ts-eslint';
// import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
// import { createPerformanceTracker } from '../utils/performance';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/your-org/eslint-plugin-vibecoder-rasp/docs/rules/${name}`;
});

type Options = [
  {
    /**
     * Ignore state that's only used within custom hooks
     * @default true
     */
    ignoreInHooks?: boolean;

    /**
     * Ignore state that's passed down via context
     * @default true
     */
    ignoreContextState?: boolean;
    /**
     * Maximum allowed distance between state declaration and usage (in AST nodes)
     * @default 20
     */
    maxDistance?: number;

    /**
     * Performance tuning option
     */
    performance?: {
      /**
       * Skip checking files larger than this size (in KB)
       * @default 500
       */
      skipFilesLargerThanKB?: number;
    };
  },
];

type MessageIds = 'stateNotColocated' | 'stateNotColocatedSuggestion';

/**
 * ESLint rule: state-colocation
 *
 * Enforces that React state should be colocated as close as possible to where it's used.
 * This improves maintainability and makes components more self-contained.
 */
export const stateColocation = createRule<Options, MessageIds>({
  name: 'state-colocation',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Enforce state colocation - state should be as close as possible to where it's used",
      url: `https://github.com/your-org/eslint-plugin-vibecoder-rasp/docs/rules/state-colocation`,
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          maxDistance: { type: 'number', minimum: 1 },
          ignoreInHooks: { type: 'boolean' },
          ignoreContextState: { type: 'boolean' },
          performance: {
            type: 'object',
            properties: {
              skipFilesLargerThanKB: { type: 'number', minimum: 1 },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      stateNotColocated:
        'State "{{stateName}}" is used far from its declaration. Move it closer to where it\'s used.',
      stateNotColocatedSuggestion: 'Move state "{{stateName}}" closer to its usage',
    },
  },
  defaultOptions: [
    {
      maxDistance: 20,
      ignoreInHooks: true,
      ignoreContextState: true,
      performance: {
        skipFilesLargerThanKB: 500,
      },
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const { maxDistance = 20, ignoreInHooks = true, ignoreContextState = true } = option;

    // Track state declarations and their usages
    const stateDeclarations = new Map<
      string,
      {
        node: TSESTree.VariableDeclarator;
        name: string;
        scope: Scope.Scope; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    >();

    // Track component boundaries
    const componentBoundaries: TSESTree.FunctionDeclaration[] = [];

    return {
      // Track component boundaries
      'FunctionDeclaration, ArrowFunctionExpression, FunctionExpression'(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
      ) {
        // Check if this is a React component
        if (isReactComponent(node)) {
          componentBoundaries.push(node as TSESTree.FunctionDeclaration);
        }
      },

      // Track state declarations
      'VariableDeclarator[init.type="CallExpression"][init.callee.name="useState"],VariableDeclarator[init.type="CallExpression"][init.callee.name="useReducer"]'(
        node: TSESTree.VariableDeclarator
      ) {
        const variableName = node.id.type === 'Identifier' ? node.id.name : 'state';
        stateDeclarations.set(variableName, {
          node,
          name: variableName,
          scope: context.sourceCode.getScope(node),
        });
      },

      // Check state usages
      Identifier(node: TSESTree.Identifier) {
        const state = stateDeclarations.get(node.name);
        if (!state) return;

        // Check if this usage is too far from the declaration
        const distance = calculateNodeDistance(state.node, node);
        if (distance > maxDistance) {
          context.report({
            node,
            messageId: 'stateNotColocated',
            data: {
              stateName: node.name,
            },
            suggest: [
              {
                messageId: 'stateNotColocatedSuggestion',
                data: {
                  stateName: node.name,
                },
                fix(fixer) {
                  // In a real implementation, we would provide a fix that moves the state
                  // closer to its usage. This is a simplified example.
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});

// Helper functions
function isReactComponent(node: TSESTree.Node): boolean {
  // Simplified check - in a real implementation, this would be more robust
  return (
    node.type === 'FunctionDeclaration' &&
    node.id?.type === 'Identifier' &&
    /^[A-Z]/.test(node.id.name)
  );
}

function calculateNodeDistance(nodeA: TSESTree.Node, nodeB: TSESTree.Node): number {
  // Simplified implementation - in a real implementation, this would calculate
  // the actual distance in the AST between two nodes
  return Math.abs((nodeA.range?.[0] ?? 0) - (nodeB.range?.[0] ?? 0));
}
