import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint';

import {
  endPhase,
  startPhase,
  recordMetric,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type MessageIds =
  | 'preferComputedWithSignal'
  | 'preferComputedWithSignals'
  | 'suggestComputed'
  | 'addComputedImport'
  | 'suggestAddComputedImport'
  | 'perf';

type Options = [
  {
    performance?: PerformanceBudget | undefined;
  },
];

type SignalDependencyInfo = {
  signalName: string;
  isDirectAccess: boolean;
  node: TSESTree.Node;
};

function getOrCreateComputedImport(
  sourceCode: SourceCode,
  program: TSESTree.Program | null
): TSESTree.ImportDeclaration | undefined {
  if (!program) {
    program = sourceCode.ast;
  }

  return program.body.find((n): n is TSESTree.ImportDeclaration => {
    return n.type === 'ImportDeclaration' && n.source.value === '@preact/signals-react';
  });
}

function getSignalDependencyInfo(dep: TSESTree.Node | null): SignalDependencyInfo | null {
  if (!dep) {
    return null;
  }

  // Check for signal.value
  if (
    dep.type === 'MemberExpression' &&
    dep.property.type === 'Identifier' &&
    dep.property.name === 'value' &&
    dep.object.type === 'Identifier' &&
    (dep.object.name.endsWith('Signal') || dep.object.name.endsWith('signal'))
  ) {
    return {
      signalName: dep.object.name,
      isDirectAccess: false,
      node: dep,
    };
  }

  // Check for direct signal usage
  if (dep.type === 'Identifier' && (dep.name.endsWith('Signal') || dep.name.endsWith('signal'))) {
    return {
      signalName: dep.name,
      isDirectAccess: true,
      node: dep,
    };
  }

  return null;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

/**
 * ESLint rule: prefer-computed
 *
 * Prefers computed() over useMemo for signal-derived values.
 * This provides better performance and automatic dependency tracking for signal computations.
 */
export const preferComputedRule = createRule<Options, MessageIds>({
  name: 'prefer-computed',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer computed() over useMemo for signal-derived values',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-computed',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferComputedWithSignal:
        'Prefer `computed()` over `useMemo` when using signal "{{ signalName }}" for better performance and automatic reactivity.',
      preferComputedWithSignals:
        'Prefer `computed()` over `useMemo` when using signals ({{ signalNames }}) for better performance and automatic reactivity.',
      suggestComputed: 'Replace `useMemo` with `computed()`',
      addComputedImport: 'Add `computed` import from @preact/signals-react',
      suggestAddComputedImport: 'Add missing import for `computed`',
      perf: 'Performance limit exceeded',
    },
    schema: [
      {
        type: 'object',
        properties: {
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
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    // Set up performance tracking with a unique key
    const filePath = context.filename;
    const perfKey = `prefer-computed:${filePath}:${Date.now()}`;

    // Initialize performance tracking
    const perf = createPerformanceTracker(
      PerformanceOperations.signalAccess,
      option.performance,
      context
    );

    // Track rule initialization metrics
    const metrics = {
      totalSignalChecks: 0,
      useMemoCalls: 0,
      signalDependenciesFound: 0,
      importChecks: 0,
      fixOperations: 0,
      lastSignalCheckTime: 0,
      signalCheckIntervals: [] as number[],
    };

    let hasComputedImport = false;
    let program: TSESTree.Program | null = null;
    let performanceBudgetExceeded = false;

    return {
      Program(node: TSESTree.Program): void {
        perf.trackNode(node);

        startPhase(perfKey, 'program-analysis');

        try {
          program = node;
          metrics.importChecks++;

          hasComputedImport = program.body.some(
            (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
              trackOperation(perfKey, 'importCheck');

              return (
                n.type === 'ImportDeclaration' &&
                n.source.value === '@preact/signals-react' &&
                n.specifiers.some(
                  (s) =>
                    s.type === 'ImportSpecifier' &&
                    'name' in s.imported &&
                    s.imported.name === 'computed'
                )
              );
            }
          );

          recordMetric(perfKey, 'importChecks', metrics.importChecks);

          endPhase(perfKey, 'program-analysis');
        } catch (error) {
          // Handle performance-related errors
          if (error instanceof PerformanceLimitExceededError) {
            performanceBudgetExceeded = true;
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'perf',
              data: {
                message: `Performance limit exceeded during program analysis: ${error.message}`,
              },
            });
          } else {
            throw error; // Re-throw unexpected errors
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression): void {
        perf.trackNode(node);

        if (performanceBudgetExceeded) {
          return;
        }

        metrics.useMemoCalls++;
        trackOperation(perfKey, 'callExpressionCheck');

        // Basic validation
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'useMemo' ||
          node.arguments.length < 2 ||
          node.arguments[1]?.type !== 'ArrayExpression'
        ) {
          return;
        }

        startPhase(perfKey, 'signal-analysis');

        try {
          const signalDeps = [];

          // Process dependencies with performance tracking
          for (const dep of node.arguments[1].elements) {
            trackOperation(perfKey, 'dependencyCheck');
            metrics.totalSignalChecks++;

            const depInfo = getSignalDependencyInfo(dep);
            if (depInfo) {
              signalDeps.push(depInfo);
              metrics.signalDependenciesFound++;

              // Track timing between signal checks
              const now = performance.now();
              if (metrics.lastSignalCheckTime > 0) {
                metrics.signalCheckIntervals.push(now - metrics.lastSignalCheckTime);
              }
              metrics.lastSignalCheckTime = now;
            }

            // Check performance budget periodically
            if (metrics.totalSignalChecks % 10 === 0) {
              trackOperation(perfKey, 'batch-dependency-check');
            }
          }

          recordMetric(perfKey, 'totalSignalChecks', metrics.totalSignalChecks);
          recordMetric(perfKey, 'signalDependenciesFound', metrics.signalDependenciesFound);

          if (signalDeps.length === 0) {
            endPhase(perfKey, 'signal-analysis');
            return;
          }

          // Get unique signal names for the message
          const uniqueSignals = [
            ...new Set(signalDeps.map((d: SignalDependencyInfo): string => d.signalName)),
          ];

          trackOperation(perfKey, 'report-generation');

          context.report({
            node,
            messageId:
              uniqueSignals.length === 1 ? 'preferComputedWithSignal' : 'preferComputedWithSignals',
            data: {
              signalName: uniqueSignals[0],
              signalNames: uniqueSignals.join(', '),
              count: uniqueSignals.length,
            },
            suggest: [
              {
                messageId: 'suggestComputed',
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
                  const callback = node.arguments[0];

                  if (!callback) {
                    return;
                  }

                  // Replace useMemo with computed
                  yield fixer.replaceText(
                    node,
                    `computed(${context.sourceCode.getText(callback)})`
                  );

                  // Don't add import if it already exists
                  if (hasComputedImport) {
                    return;
                  }

                  // Add suggestion to add import if not already present
                  context.report({
                    node,
                    messageId: 'suggestAddComputedImport',
                    fix: (fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null => {
                      const signalsImport = getOrCreateComputedImport(context.sourceCode, program);

                      if (signalsImport) {
                        // Check if 'computed' is already imported
                        const hasComputed = signalsImport.specifiers.some(
                          (s: TSESTree.ImportClause): boolean => {
                            return (
                              s.type === 'ImportSpecifier' &&
                              'name' in s.imported &&
                              s.imported.name === 'computed'
                            );
                          }
                        );

                        if (hasComputed) {
                          return null;
                        }

                        // Add 'computed' to existing import
                        const lastSpecifier =
                          signalsImport.specifiers[signalsImport.specifiers.length - 1];

                        return [fixer.insertTextAfter(lastSpecifier, ', computed')];
                      }

                      const before = program?.body[0];

                      if (typeof before === 'undefined') {
                        return null;
                      }
                      // No existing import, add a new one at the top
                      return [
                        fixer.insertTextBefore(
                          before,
                          "import { computed } from '@preact/signals-react';\n"
                        ),
                      ];
                    },
                  });
                },
              },
            ],
          });
        } catch (error) {
          // Handle performance-related errors
          if (error instanceof PerformanceLimitExceededError) {
            performanceBudgetExceeded = true;
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'perf',
              data: {
                message: `Performance limit exceeded during program analysis: ${error.message}`,
              },
            });
          } else {
            throw error; // Re-throw unexpected errors
          }
        }
      },

      // Handle program exit with metrics collection
      'Program:exit'(node: TSESTree.Node): void {
        perf.trackNode(node);

        // Record final metrics
        recordMetric(perfKey, 'useMemoCalls', metrics.useMemoCalls);
        recordMetric(perfKey, 'totalSignalChecks', metrics.totalSignalChecks);

        if (metrics.signalCheckIntervals.length > 0) {
          const avgInterval =
            metrics.signalCheckIntervals.reduce((sum, interval) => sum + interval, 0) /
            metrics.signalCheckIntervals.length;
          recordMetric(perfKey, 'avgSignalCheckInterval', avgInterval);
        }

        // Delegate to the perf instance's Program:exit handler
        perf['Program:exit']();
      },
    };
  },
});
