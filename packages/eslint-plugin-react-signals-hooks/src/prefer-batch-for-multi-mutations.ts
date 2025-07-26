import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import {
  endPhase,
  trackOperation,
  startPhase,
  stopTracking,
  recordMetric,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';

type MessageIds = 'useBatch' | 'suggestBatch' | 'addBatchImport' | 'perf';

type Option = {
  minMutations?: number | undefined;
  maxMutations?: number | undefined;
  performance?: PerformanceBudget | undefined;
};

type Options = [Option];

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

// Cache for signal property names to avoid repeated string operations
const SIGNAL_PROPERTY = 'value';
const SIGNAL_SUFFIXES = new Set(['Signal', 'signal']);

function isSignalMutation(
  node: TSESTree.Node
): node is TSESTree.AssignmentExpression | TSESTree.UpdateExpression {
  // Fast path: check node type first
  if (node.type !== 'AssignmentExpression' && node.type !== 'UpdateExpression') {
    return false;
  }

  // Common pattern for both node types
  const memberExpr = node.type === 'AssignmentExpression' ? node.left : node.argument;

  // Fast path: check member expression structure
  if (
    memberExpr?.type !== 'MemberExpression' ||
    memberExpr.property?.type !== 'Identifier' ||
    memberExpr.property.name !== SIGNAL_PROPERTY
  ) {
    return false;
  }

  // Check object identifier and its name
  const obj = memberExpr.object;
  if (obj.type !== 'Identifier') {
    return false;
  }

  // Check if the name ends with a signal suffix
  const name = obj.name;

  for (const suffix of SIGNAL_SUFFIXES) {
    if (name.endsWith(suffix)) return true;
  }
  return false;
}

export const preferBatchForMultiMutationsRule = createRule<Options, MessageIds>({
  name: 'prefer-batch-for-multi-mutations',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce using batch() for multiple signal mutations in the same scope',
      url: getRuleDocUrl('prefer-batch-for-multi-mutations'),
    },
    messages: {
      useBatch:
        'Multiple signal mutations detected. Use `batch()` to optimize performance by reducing renders.',
      suggestBatch: 'Wrap with `batch()`',
      addBatchImport: "Add `batch` import from '@preact/signals-react'",
      perf: '{{ message }}',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          minMutations: {
            type: 'number',
            minimum: 2,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minMutations: 2,
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option = {}]) {
    const perfKey = `prefer-batch-for-multi-mutations:${context.filename}:${Date.now()}`;

    // Track initialization phase
    startPhase(perfKey, 'perf-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    try {
      trackOperation(perfKey, 'rule-init');

      // End initialization phase
      endPhase(perfKey, 'perf-init');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Report error
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'perf',
        data: {
          message: `Perf init failed: ${errorMsg}`,
        },
      });

      endPhase(perfKey, 'perf-init');
    }

    const signalMutations: TSESTree.Node[] = [];
    const maxMutations = option.maxMutations ?? 100; // Default to 100 mutations max

    let mutationLimitExceeded = false;

    let currentFunction: TSESTree.FunctionLike | null = null;
    let hasBatchImport = false;

    const program = context.sourceCode.ast;

    // Start import analysis phase with detailed tracking
    startPhase(perfKey, 'import-analysis');

    const importCheckStart = performance.now();

    trackOperation(perfKey, 'import-check-start');

    // Track performance budget before starting import analysis
    trackOperation(perfKey, 'pre-import-analysis');

    // Check if batch is already imported with optimized traversal
    let importCheckCount = 0;

    hasBatchImport = program.body.some((node: TSESTree.ProgramStatement): boolean => {
      importCheckCount++;

      trackOperation(perfKey, `import-check-${node.type}`);

      return (
        node.type === 'ImportDeclaration' &&
        node.source.value === '@preact/signals-react' &&
        node.specifiers.some(
          (s) => s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'batch'
        )
      );
    });

    // Record import check metrics
    const importCheckDuration = performance.now() - importCheckStart;

    recordMetric(perfKey, 'importCheckDuration', importCheckDuration);
    recordMetric(perfKey, 'importCheckCount', importCheckCount);

    endPhase(perfKey, 'import-analysis');

    function checkAndReportMutations(): void {
      const checkStart = performance.now();

      trackOperation(perfKey, 'mutation-check-start');

      // Track check operation with a unique ID
      const currentCheckId = `check-${performance.now()}`;

      startPhase(perfKey, currentCheckId);

      // Record check duration
      const checkDuration = performance.now() - checkStart;

      recordMetric(perfKey, 'mutationCheckDuration', checkDuration);

      const minMutations = option.minMutations ?? 2;

      if (signalMutations.length >= minMutations) {
        // Track batch mutation detection with context
        trackOperation(perfKey, `batch-mutation-${signalMutations.length}`);
        recordMetric(perfKey, 'mutationCount', signalMutations.length);
        // Use array destructuring for better performance with large arrays
        const [firstNode] = signalMutations;
        const lastNode = signalMutations[signalMutations.length - 1];

        if (!firstNode || !lastNode) {
          endPhase(perfKey, currentCheckId);
          return;
        }

        context.report({
          node: firstNode,
          messageId: 'useBatch',
          suggest: [
            {
              messageId: 'suggestBatch',
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes = [];

                const firstToken = context.sourceCode.getFirstToken(firstNode);
                const lastToken = context.sourceCode.getLastToken(lastNode);

                if (!firstToken || !lastToken) {
                  return null;
                }

                // Add batch() wrapper
                fixes.push(
                  fixer.insertTextBefore(firstToken, 'batch(() => {\n'),
                  fixer.insertTextAfter(lastToken, '\n})')
                );

                // Add import if needed
                if (!hasBatchImport) {
                  const importNode: TSESTree.ImportDeclaration | undefined = program.body.find(
                    (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                      return (
                        node.type === 'ImportDeclaration' &&
                        node.source.value === '@preact/signals-react'
                      );
                    }
                  );

                  if (typeof importNode === 'undefined') {
                    fixes.push(
                      fixer.insertTextBefore(
                        program.body[0],
                        "import { batch } from '@preact/signals-react';\n"
                      )
                    );
                  } else {
                    fixes.push(
                      fixer.insertTextAfter(
                        importNode.specifiers[importNode.specifiers.length - 1],
                        ', batch'
                      )
                    );
                  }
                }

                return fixes;
              },
            },
          ],
        });
      }
    }

    // End import analysis phase
    endPhase(perfKey, 'import-analysis');

    // Track performance after import analysis
    trackOperation(perfKey, 'post-import-analysis');

    return {
      // Track all nodes for performance monitoring
      '*': (node: TSESTree.Node): void => {
        perf.trackNode(node);
      },
      'FunctionDeclaration:exit': checkAndReportMutations,
      'FunctionExpression:exit': checkAndReportMutations,
      'ArrowFunctionExpression:exit': checkAndReportMutations,
      'ClassMethod:exit': checkAndReportMutations,
      'ClassProperty:exit': checkAndReportMutations,
      'MethodDefinition:exit': checkAndReportMutations,
      'PropertyDefinition:exit': checkAndReportMutations,
      'TSDeclareFunction:exit': checkAndReportMutations,
      'TSMethodSignature:exit': checkAndReportMutations,
      'TSPropertySignature:exit': checkAndReportMutations,
      'TSEmptyBodyFunctionExpression:exit': checkAndReportMutations,
      'TSTypeLiteral:exit': checkAndReportMutations,
      'TSInterfaceBody:exit': checkAndReportMutations,
      'TSInterfaceDeclaration:exit': checkAndReportMutations,
      'TSTypeAliasDeclaration:exit': checkAndReportMutations,
      'TSEnumDeclaration:exit': checkAndReportMutations,
      'TSModuleBlock:exit': checkAndReportMutations,
      'TSModuleDeclaration:exit': checkAndReportMutations,
      ':function'(node: TSESTree.Node): void {
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          currentFunction = node;
          signalMutations.length = 0; // Reset mutations for new function
          mutationLimitExceeded = false; // Reset the limit flag for new function
          // Track function analysis
          trackOperation(perfKey, 'typeCheck');
        }
      },

      // Track function exit for nested functions
      ':function:exit'(node: TSESTree.Node): void {
        if (
          (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') &&
          node === currentFunction
        ) {
          // Track function exit
          trackOperation(perfKey, 'functionExit');

          // Don't check if we're already inside a batch
          if (
            !node.body ||
            !('body' in node.body) ||
            !Array.isArray(node.body.body) ||
            !node.body.body.some((stmt: TSESTree.Statement): boolean => {
              return (
                stmt.type === 'ExpressionStatement' &&
                stmt.expression.type === 'CallExpression' &&
                stmt.expression.callee.type === 'Identifier' &&
                stmt.expression.callee.name === 'batch'
              );
            })
          ) {
            checkAndReportMutations();
          }
          currentFunction = null;
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        trackOperation(perfKey, 'check-assignment');

        // Skip if we've already exceeded the mutation limit
        if (mutationLimitExceeded) {
          return;
        }

        if (currentFunction && isSignalMutation(node)) {
          trackOperation(perfKey, 'signal-assignment-found');

          // Check if we're about to exceed the limit
          if (signalMutations.length >= maxMutations) {
            mutationLimitExceeded = true;
            context.report({
              node,
              messageId: 'perf',
              data: {
                message: `Maximum number of signal mutations (${maxMutations}) exceeded. Consider using batch() for better performance.`,
              },
            });
            return;
          }

          signalMutations.push(node);
        }
      },

      UpdateExpression(node: TSESTree.UpdateExpression): void {
        trackOperation(perfKey, 'check-update');

        // Skip if we've already exceeded the mutation limit
        if (mutationLimitExceeded) {
          return;
        }

        if (currentFunction && isSignalMutation(node)) {
          trackOperation(perfKey, 'signal-update-found');

          // Check if we're about to exceed the limit
          if (signalMutations.length >= maxMutations) {
            mutationLimitExceeded = true;
            context.report({
              node,
              messageId: 'perf',
              data: {
                message: `Maximum number of signal mutations (${maxMutations}) exceeded. Consider using batch() for better performance.`,
              },
            });
            return;
          }

          signalMutations.push(node);
        }
      },

      // Handle program exit with comprehensive cleanup
      'Program:exit'(): void {
        if (!perf) {
          throw new Error('Performance tracker not initialized');
        }

        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

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
        } catch (error: unknown) {
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
