import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils';
import type { SuggestionReportDescriptor, RuleContext } from '@typescript-eslint/utils/ts-eslint';
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
  DEFAULT_PERFORMANCE_BUDGET,
  startTracking,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import type { Definition } from '@typescript-eslint/scope-manager';

type Option = {
  /** Minimum complexity score to trigger the rule */
  minComplexity: number;
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames: string[];
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'preferShowOverTernary'
  | 'suggestShowComponent'
  | 'addShowImport'
  | 'performanceLimitExceeded';

const childProperties = [
  'body',
  'consequent',
  'alternate',
  'test',
  'left',
  'right',
  'argument',
  'callee',
  'arguments',
  'elements',
  'properties',
] as const;

function isJSXNode(node: TSESTree.Node): boolean {
  return (
    node.type === 'JSXElement' ||
    node.type === 'JSXFragment' ||
    (node.type === 'ExpressionStatement' &&
      'expression' in node &&
      node.expression &&
      'type' in node.expression &&
      (node.expression.type === 'JSXElement' || node.expression.type === 'JSXFragment'))
  );
}

function getComplexity(
  node: TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier,
  visited = new Set<TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier>()
): number {
  if (visited.has(node)) {
    return 0;
  }

  visited.add(node);

  let complexity = 0;

  if (isJSXNode(node)) {
    complexity++;
  } else if ('type' in node && node.type === 'CallExpression') {
    complexity++;
  } else if ('type' in node && node.type === 'ConditionalExpression') {
    complexity += 2;
  }

  for (const key of childProperties) {
    const value = node[key as keyof typeof node];

    if (typeof value !== 'undefined') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            complexity += getComplexity(item, visited);
          }
        }
      } else if (typeof value === 'object' && value !== null && 'type' in value) {
        complexity += getComplexity(value, visited);
      }
    }
  }

  visited.delete(node);

  return complexity;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'prefer-show-over-ternary';

export const preferShowOverTernaryRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer Show component over ternary for conditional rendering with signals',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      preferShowOverTernary:
        'Prefer using the `<Show>` component instead of ternary for better performance with signal conditions.',
      suggestShowComponent: 'Replace ternary with `<Show>` component',
      addShowImport: 'Add `Show` import from @preact/signals-react',
      performanceLimitExceeded: 'Performance limit exceeded ',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minComplexity: {
            type: 'number',
            minimum: 1,
            default: 2,
          },
          signalNames: {
            type: 'array',
            items: { type: 'string' },
            default: ['signal', 'useSignal', 'createSignal'],
          },
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
    {
      minComplexity: 2,
      signalNames: ['signal', 'useSignal', 'createSignal'],
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}${Date.now()}`;

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`Initializing rule for file: ${context.filename}`);
    console.info('Rule configuration:', option);

    let nodeCount = 0;
    const signalNames = option.signalNames ?? ['signal', 'useSignal', 'createSignal'];
    const signalNameSet = new Set(signalNames);

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    let hasShowImport = false;

    const signalVariables = new Set<string>();

    hasShowImport = context.sourceCode.ast.body.some(
      (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
        if (node.type !== 'ImportDeclaration' || !node.source) {
          return false;
        }

        if (
          typeof node.source.value !== 'string' ||
          node.source.value !== '@preact/signals-react'
        ) {
          return false;
        }

        return node.specifiers.some((s: TSESTree.ImportClause): boolean => {
          return s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'Show';
        });
      }
    );

    return {
      '*': (node: TSESTree.Node): void => {
        if (!perf) {
          throw new Error('Performance tracker not initialized');
        }

        // Check if we should continue processing
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        // Track specific node types that are more expensive to process
        if (
          node.type === 'CallExpression' ||
          node.type === 'MemberExpression' ||
          node.type === 'Identifier'
        ) {
          trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
        }

        // Handle function declarations and variables
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.FunctionExpression ||
          node.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          try {
            const scope = context.getScope();

            for (const variable of scope.variables) {
              if (
                variable.defs.some((def: Definition) => {
                  trackOperation(perfKey, PerformanceOperations.signalCheck);
                  return (
                    'init' in def.node &&
                    def.node.init?.type === AST_NODE_TYPES.CallExpression &&
                    def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
                    signalNameSet.has(def.node.init.callee.name)
                  );
                })
              ) {
                signalVariables.add(variable.name);
              }
            }
          } catch (error: unknown) {
            if (error instanceof PerformanceLimitExceededError) {
              context.report({
                node,
                messageId: 'performanceLimitExceeded',
                data: { message: error.message, ruleName },
              });
            } else {
              throw error;
            }
          }
        }
      },

      Program(node: TSESTree.Program): void {
        // Track node processing
        perf.trackNode(node);

        // Start analysis phase
        startPhase(perfKey, 'importAnalysis');

        const hasJSX = node.body.some((n: TSESTree.ProgramStatement): boolean => {
          return isJSXNode(n);
        });

        if (!hasJSX) {
          endPhase(perfKey, 'importAnalysis');
          return;
        }

        // Check if Show is already imported
        hasShowImport = node.body.some(
          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
            return (
              n.type === 'ImportDeclaration' &&
              n.source.value === '@preact/signals-react' &&
              n.specifiers.some(
                (s) =>
                  s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'Show'
              )
            );
          }
        );

        endPhase(perfKey, 'importAnalysis');
      },

      ConditionalExpression(node: TSESTree.ConditionalExpression): void {
        perf.trackNode(node);

        if (!node.parent || !('type' in node.parent) || !isJSXNode(node.parent as TSESTree.Node)) {
          return;
        }

        // Check if the condition contains any signal variables
        const testText = context.sourceCode.getText(node.test);

        const containsSignal = [...signalVariables].some((signal) => {
          return new RegExp(`\\b${signal}\\b`).test(testText);
        });

        // Skip if no signal variables are found in the condition
        if (!containsSignal) {
          return;
        }

        // Track conditional analysis
        trackOperation(perfKey, PerformanceOperations.conditionalAnalysis);

        const complexity = getComplexity(node);
        trackOperation(perfKey, PerformanceOperations.complexityAnalysis);

        if (complexity >= (option?.minComplexity ?? 2)) {
          context.report({
            node,
            messageId: 'preferShowOverTernary',
            suggest: [
              {
                messageId: 'suggestShowComponent',
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                  const consequentText = context.sourceCode.getText(node.consequent);

                  const alternateText = node.alternate
                    ? context.sourceCode.getText(node.alternate)
                    : null;

                  const fixText = alternateText
                    ? `{/* @ts-expect-error Server Component */}
                    <Show when={${context.sourceCode.getText(node.test)}} fallback={${alternateText}}>
                    {${consequentText}}
                    </Show>`
                    : `{/* @ts-expect-error Server Component */}
                    <Show when={${context.sourceCode.getText(node.test)}}>
                    {${consequentText}}
                    </Show>
                  `;

                  yield fixer.replaceText(node, fixText);

                  if (hasShowImport) {
                    return;
                  }
                },
              },
              ...(hasShowImport
                ? ([] satisfies Array<SuggestionReportDescriptor<MessageIds>>)
                : ([
                    {
                      messageId: 'addShowImport',
                      fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                        if (!context.sourceCode.ast) {
                          return null;
                        }

                        const signalsImport = context.sourceCode.ast.body.find(
                          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                            return (
                              n.type === 'ImportDeclaration' &&
                              n.source.value === '@preact/signals-react'
                            );
                          }
                        );

                        return signalsImport
                          ? [
                              fixer.insertTextAfter(
                                signalsImport.specifiers[signalsImport.specifiers.length - 1],
                                ', Show'
                              ),
                            ]
                          : [
                              fixer.insertTextBefore(
                                context.sourceCode.ast.body[0],
                                "import { Show } from '@preact/signals-react';\n"
                              ),
                            ];
                      },
                    } satisfies SuggestionReportDescriptor<MessageIds>,
                  ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
            ],
          });
        }
      },

      'Program:exit'(_node: TSESTree.Program): void {
        endPhase(perfKey, 'ruleExecution');

        perf['Program:exit']();
      },
    };
  },
});

export default preferShowOverTernaryRule;
