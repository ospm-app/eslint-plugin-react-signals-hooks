import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
  stopTracking,
  // recordMetric,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';

type MessageIds =
  | 'useBatch'
  | 'suggestUseBatch'
  | 'addBatchImport'
  | 'wrapWithBatch'
  | 'useBatchSuggestion'
  | 'performanceLimitExceeded';

type SignalUpdate = {
  node: TSESTree.AssignmentExpression | TSESTree.CallExpression;
  isTopLevel: boolean;
  signalName: string;
  updateType: 'assignment' | 'method';
};

type Option = {
  /** Minimum number of signal updates to trigger the rule */
  minUpdates: number;
  /** Performance tuning option */
  performance: PerformanceBudget;
};

type Options = [Option];

// Process a block of statements for signal updates
function processBlock(
  statements: Array<TSESTree.ExpressionStatement | TSESTree.VariableDeclaration>,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
  option: Option
) {
  // Check if batch is already imported
  const program = context.sourceCode.ast;

  const hasBatchImport = program.body.some((node: TSESTree.ProgramStatement) => {
    return (
      node.type === 'ImportDeclaration' &&
      node.source.value === '@preact/signals-react' &&
      node.specifiers.some((specifier: TSESTree.ImportClause): boolean => {
        return (
          'imported' in specifier &&
          'name' in specifier.imported &&
          specifier.imported.name === 'batch'
        );
      })
    );
  });

  const updatesInBlock: SignalUpdate[] = [];

  for (const stmt of statements) {
    // Skip non-expression statements and variable declarations
    if (stmt.type !== 'ExpressionStatement' && stmt.type !== 'VariableDeclaration') {
      continue;
    }

    // Handle expression statements (direct assignments or function calls)
    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      if (isSignalUpdate(stmt.expression)) {
        updatesInBlock.push({
          node: stmt.expression,
          isTopLevel: true,
          signalName:
            stmt.expression.type === 'AssignmentExpression'
              ? 'object' in stmt.expression.left &&
                stmt.expression.left.object.type === 'Identifier'
                ? stmt.expression.left.object.name
                : 'signal'
              : 'object' in stmt.expression.callee &&
                  stmt.expression.callee.object.type === 'Identifier'
                ? stmt.expression.callee.object.name
                : 'signal',
          updateType: stmt.expression.type === 'AssignmentExpression' ? 'assignment' : 'method',
        });
      }
      // Handle variable declarations with potential signal updates in the initializer
    } else if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        const init = decl.init;

        if (init !== null && isSignalUpdate(init)) {
          updatesInBlock.push({
            node: init,
            isTopLevel: true,
            signalName:
              init.type === 'AssignmentExpression'
                ? 'object' in init.left && init.left.object.type === 'Identifier'
                  ? init.left.object.name
                  : 'signal'
                : 'object' in init.callee && init.callee.object.type === 'Identifier'
                  ? init.callee.object.name
                  : 'signal',
            updateType: init.type === 'AssignmentExpression' ? 'assignment' : 'method',
          });
        }
      }
    }
  }

  // Only suggest batching if we have enough updates
  if (updatesInBlock.length >= option.minUpdates) {
    const firstNode = updatesInBlock[0].node;

    const signalCount = updatesInBlock.length;

    context.report({
      node: firstNode,
      messageId: 'useBatch',
      data: {
        count: signalCount,
        signals: Array.from(
          new Set(
            updatesInBlock.map((update: SignalUpdate): string => {
              return update.signalName;
            })
          )
        ).join(', '),
      },
      suggest: [
        {
          messageId: 'useBatchSuggestion',
          data: { count: signalCount },
          *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
            const updatesText = updatesInBlock
              .map(({ node }: SignalUpdate): string => {
                return context.sourceCode.getText(node);
              })
              .join('; ');

            if (!hasBatchImport) {
              const batchImport = "import { batch } from '@preact/signals-react';\n";

              const firstImport = program.body.find(
                (n): n is TSESTree.ImportDeclaration => n.type === 'ImportDeclaration'
              );

              if (typeof firstImport === 'undefined') {
                yield fixer.insertTextBefore(program.body[0], batchImport);
              } else {
                yield fixer.insertTextBefore(firstImport, batchImport);
              }
            }

            yield fixer.replaceTextRange(
              [
                firstNode.range?.[0] ?? 0,
                updatesInBlock[updatesInBlock.length - 1].node.range?.[1] ?? 0,
              ],
              `batch(() => { ${updatesText} })`
            );
          },
        },
        {
          messageId: 'addBatchImport',
          *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
            if (hasBatchImport) {
              return;
            }

            const batchImport = "import { batch } from '@preact/signals-react';\n";

            const firstImport = program.body.find(
              (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                return n.type === 'ImportDeclaration';
              }
            );

            if (typeof firstImport === 'undefined') {
              yield fixer.insertTextBefore(program.body[0], batchImport);
            } else {
              yield fixer.insertTextBefore(firstImport, batchImport);
            }
          },
        },
      ],
    });
  }
}

function isSignalUpdate(
  node: TSESTree.Node
): node is TSESTree.AssignmentExpression | TSESTree.CallExpression {
  // Handle direct assignments (signal.value = x)
  if (
    node.type === 'AssignmentExpression' &&
    node.left.type === 'MemberExpression' &&
    node.left.property.type === 'Identifier' &&
    node.left.property.name === 'value' &&
    node.left.object.type === 'Identifier' &&
    (node.left.object.name.endsWith('Signal') || node.left.object.name.endsWith('signal'))
  ) {
    return true;
  }

  // Handle method calls (signal.set(x) or signal.update())
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    ['set', 'update'].includes(node.callee.property.name) &&
    node.callee.object.type === 'Identifier' &&
    (node.callee.object.name.endsWith('Signal') || node.callee.object.name.endsWith('signal'))
  ) {
    return true;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

/**
 * ESLint rule: prefer-batch-updates
 *
 * Suggests batching multiple signal updates to optimize performance
 * by reducing the number of renders.
 */
export const preferBatchUpdatesRule = createRule<Options, MessageIds>({
  name: 'prefer-batch-updates',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Suggest batching multiple signal updates to optimize performance',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-batch-updates',
    },
    messages: {
      useBatch:
        '{{count}} signal updates detected in the same scope. Use `batch` to optimize performance by reducing renders.',
      performanceLimitExceeded: 'Performance limit exceeded: {{message}}',
      suggestUseBatch: 'Use `batch` to group {{count}} signal updates',
      addBatchImport: "Add `batch` import from '@preact/signals-react'",
      wrapWithBatch: 'Wrap with `batch` to optimize signal updates',
      useBatchSuggestion: 'Use `batch` to group {{count}} signal updates',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minUpdates: {
            type: 'number',
            minimum: 2,
            default: 2,
            description: 'Minimum number of signal updates to trigger the rule',
          },
          performance: {
            type: 'object',
            properties: {
              maxTime: {
                type: 'number',
                minimum: 1,
                default: 35,
                description: 'Maximum time in milliseconds the rule should take to process a file',
              },
              maxNodes: {
                type: 'number',
                minimum: 100,
                default: 1800,
                description: 'Maximum number of AST nodes the rule should process',
              },
              maxMemory: {
                type: 'number',
                minimum: 1024 * 1024, // 1MB
                default: 45 * 1024 * 1024, // 45MB
                description: 'Maximum memory in bytes the rule should use',
              },
              maxOperations: {
                type: 'object',
                properties: {
                  [PerformanceOperations.signalAccess]: {
                    type: 'number',
                    minimum: 1,
                    default: 1000,
                    description: 'Maximum number of signal access checks',
                  },
                  [PerformanceOperations.signalCheck]: {
                    type: 'number',
                    minimum: 1,
                    default: 500,
                    description: 'Maximum number of signal checks',
                  },
                  [PerformanceOperations.identifierResolution]: {
                    type: 'number',
                    minimum: 1,
                    default: 1000,
                    description: 'Maximum number of identifier resolutions',
                  },
                  [PerformanceOperations.scopeLookup]: {
                    type: 'number',
                    minimum: 1,
                    default: 1000,
                    description: 'Maximum number of scope lookups',
                  },
                  [PerformanceOperations.typeCheck]: {
                    type: 'number',
                    minimum: 1,
                    default: 500,
                    description: 'Maximum number of type checks',
                  },
                  [PerformanceOperations.batchAnalysis]: {
                    type: 'number',
                    minimum: 1,
                    default: 100,
                    description: 'Maximum number of batch operations to analyze',
                  },
                },
                additionalProperties: false,
              },
              enableMetrics: {
                type: 'boolean',
                default: false,
                description: 'Whether to enable detailed performance metrics',
              },
              logMetrics: {
                type: 'boolean',
                default: false,
                description: 'Whether to log performance metrics to console',
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
      minUpdates: 2,
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],

  create(context, [option]): TSESLint.RuleListener {
    // Set up performance tracking with a unique key
    const perfKey = `prefer-batch-updates:${context.filename}`;

    // Initialize performance budget with defaults
    const perfBudget: PerformanceBudget = {
      ...DEFAULT_PERFORMANCE_BUDGET,
      ...option.performance,
    };

    // Create performance tracker
    const perf = createPerformanceTracker(perfKey, perfBudget, context);

    // Track node processing
    let nodeCount = 0;

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, 'nodeBudgetExceeded');

        return false;
      }

      return true;
    }

    // Track all nodes for performance monitoring
    const nodeVisitors: TSESLint.RuleFunction<TSESTree.Node> = (node: TSESTree.Node): void => {
      startPhase(perfKey, 'nodeProcessing');

      perf.trackNode(node);

      if (!shouldContinue()) {
        return;
      }

      // Track specific node types
      if (node.type === 'CallExpression' || node.type === 'AssignmentExpression') {
        trackOperation(perfKey, 'nodeProcessing.expression');
      }

      endPhase(perfKey, 'nodeProcessing');
    };

    // Track signal updates in the current scope
    const signalUpdates: Array<SignalUpdate> = [];

    // Helper function to get signal name from member expression
    function getSignalName(expr: TSESTree.MemberExpression): string {
      if (expr.object.type === 'Identifier') {
        return expr.object.name;
      }
      return 'signal';
    }

    return {
      '*': nodeVisitors,

      // Process blocks of code (function bodies, if blocks, etc.)
      'BlockStatement:exit'(node: TSESTree.BlockStatement): void {
        startPhase(perfKey, 'blockStatement');

        processBlock(
          node.body.filter(
            (n): n is TSESTree.ExpressionStatement | TSESTree.VariableDeclaration => {
              return n.type === 'ExpressionStatement' || n.type === 'VariableDeclaration';
            }
          ),
          context,
          option
        );

        endPhase(perfKey, 'blockStatement');
      },

      // Track signal updates in the current scope
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        startPhase(perfKey, 'assignmentExpression');

        perf.trackNode(node);

        if (isSignalUpdate(node)) {
          signalUpdates.push({
            node,
            isTopLevel: true,
            signalName:
              'left' in node && node.left.type === 'MemberExpression'
                ? getSignalName(node.left)
                : node.left.type,
            updateType: 'assignment',
          });
        }

        endPhase(perfKey, 'assignmentExpression');
      },

      CallExpression(node: TSESTree.CallExpression): void {
        startPhase(perfKey, 'callExpression');

        perf.trackNode(node);

        if (isSignalUpdate(node)) {
          signalUpdates.push({
            node,
            isTopLevel: true,
            signalName:
              'callee' in node && node.callee.type === 'MemberExpression'
                ? getSignalName(node.callee)
                : node.callee.type,
            updateType: 'method',
          });
        }

        endPhase(perfKey, 'callExpression');
      },

      // Process program top level
      'Program:exit'(node: TSESTree.Program): void {
        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        processBlock(
          node.body.filter(
            (
              n: TSESTree.ProgramStatement
            ): n is TSESTree.ExpressionStatement | TSESTree.VariableDeclaration =>
              n.type === 'ExpressionStatement' || n.type === 'VariableDeclaration'
          ),
          context,
          option
        );

        try {
          startPhase(perfKey, 'recordMetrics');

          if (perfBudget.logMetrics) {
            const finalMetrics = stopTracking(perfKey);

            if (finalMetrics) {
              const { exceededBudget, nodeCount, duration } = finalMetrics;
              const status = exceededBudget ? 'EXCEEDED' : 'OK';

              console.info(`\n[prefer-batch-updates] Performance Metrics (${status}):`);
              console.info(`  File: ${context.filename}`);
              console.info(`  Duration: ${duration?.toFixed(2)}ms`);
              console.info(`  Nodes Processed: ${nodeCount}`);

              if (exceededBudget) {
                console.warn('\n⚠️  Performance budget exceeded!');
              }
            }
          }
        } catch (error) {
          console.error('Error recording metrics:', error);
        } finally {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);
        }

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
