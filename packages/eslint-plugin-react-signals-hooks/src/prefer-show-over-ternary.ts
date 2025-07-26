import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { SuggestionReportDescriptor, RuleContext } from '@typescript-eslint/utils/ts-eslint';
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';

type MessageIds = 'preferShowOverTernary' | 'suggestShowComponent' | 'addShowImport';

type Options = [
  {
    /** Minimum complexity score to trigger the rule */
    minComplexity?: number | undefined;
    /** Performance budget configuration */
    performance?: PerformanceBudget | undefined;
  },
];

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

/**
 * ESLint rule: prefer-show-over-ternary
 *
 * Prefers Show component over ternary for conditional rendering with signals.
 * This provides better performance and readability for signal-based conditions.
 */
export const preferShowOverTernaryRule = createRule<Options, MessageIds>({
  name: 'prefer-show-over-ternary',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer Show component over ternary for conditional rendering with signals',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-show-over-ternary',
    },
    messages: {
      preferShowOverTernary:
        'Prefer using the `<Show>` component instead of ternary for better performance with signal conditions.',
      suggestShowComponent: 'Replace ternary with `<Show>` component',
      addShowImport: 'Add `Show` import from @preact/signals-react',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minComplexity: 2,
      performance: {
        maxTime: 35,
        maxNodes: 1200,
        maxMemory: 40 * 1024 * 1024, // 40MB
        maxOperations: {
          [PerformanceOperations.signalAccess]: 500,
          [PerformanceOperations.nodeProcessing]: 5000,
          [PerformanceOperations.typeCheck]: 300,
          [PerformanceOperations.identifierResolution]: 1000,
          [PerformanceOperations.scopeLookup]: 1000,
        },
        enableMetrics: false,
        logMetrics: false,
      },
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [options = {}]) {
    // Set up performance tracking for this rule
    const perfKey = `prefer-show-over-ternary:${context.filename}`;

    const perfBudget: PerformanceBudget = {
      // Time and resource limits
      maxTime: options.performance?.maxTime ?? 35, // ms
      maxNodes: options.performance?.maxNodes ?? 1200,
      maxMemory: options.performance?.maxMemory ?? 40 * 1024 * 1024, // 40MB

      // Operation-specific limits
      maxOperations: {
        [PerformanceOperations.signalAccess]:
          options.performance?.maxOperations?.signalAccess ?? 500,
        [PerformanceOperations.nodeProcessing]:
          options.performance?.maxOperations?.nodeProcessing ?? 5000,
        [PerformanceOperations.typeCheck]: options.performance?.maxOperations?.typeCheck ?? 300,
        [PerformanceOperations.identifierResolution]:
          options.performance?.maxOperations?.identifierResolution ?? 1000,
        [PerformanceOperations.scopeLookup]:
          options.performance?.maxOperations?.scopeLookup ?? 1000,
      },

      // Metrics and logging
      enableMetrics: options.performance?.enableMetrics ?? false,
      logMetrics: options.performance?.logMetrics ?? false,
    };

    // Initialize performance tracking
    const perf = createPerformanceTracker(perfKey, perfBudget, context);

    // Track rule initialization
    trackOperation(perfKey, 'ruleInit');

    let hasShowImport = false;

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

        // Track conditional analysis
        trackOperation(perfKey, 'conditionalAnalysis');

        const complexity = getComplexity(node);
        trackOperation(perfKey, 'complexityAnalysis');

        if (complexity >= (options?.minComplexity ?? 2)) {
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

      'Program:exit'(node: TSESTree.Program): void {
        perf.trackNode(node);

        // End all performance tracking
        endPhase(perfKey, 'ruleExecution');

        perf['Program:exit']();
      },
    };
  },
});

export default preferShowOverTernaryRule;
