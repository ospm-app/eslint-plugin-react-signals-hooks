/**
 * Prefer using `batch()` for multiple signal mutations
 *
 * This rule identifies multiple signal mutations that could be batched together for better performance.
 * Batching signal updates reduces the number of renders and improves application performance.
 *
 * ## Performance Characteristics
 *
 * - **Time Complexity**: O(n) where n is the number of nodes in the AST
 * - **Memory Usage**: O(m) where m is the number of signal mutations (capped at `maxMutations`)
 * - **Best Case**: Files with no signal mutations have minimal overhead
 * - **Worst Case**: Files with many signal mutations may require more memory and processing
 *
 * ## Performance Tuning
 *
 * The rule includes several performance optimizations and can be tuned using the `performance` option:
 *
 * ```js
 * {
 *   "rules": {
 *     "@react-signals-hooks/prefer-batch-for-multi-mutations": [
 *       "error",
 *       {
 *         "minMutations": 2,      // Minimum mutations to trigger the rule (default: 2)
 *         "maxMutations": 100,    // Maximum mutations to track (default: 100)
 *         "performance": {
 *           "maxTime": 35,        // Max execution time in ms (default: 35ms)
 *           "maxNodes": 1000,     // Max AST nodes to process (default: 1000)
 *           "maxMemory": 40 * 1024 * 1024, // Max memory in bytes (default: 40MB)
 *           "enableMetrics": true, // Enable detailed metrics collection
 *           "logMetrics": false,  // Whether to log metrics to console
 *           "maxOperations": {    // Operation-specific limits
 *             "signalAccess": 500,
 *             "nodeProcessing": 5000,
 *             "typeCheck": 300,
 *             "identifierResolution": 1000,
 *             "scopeLookup": 1000
 *           }
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * ## Collected Metrics
 *
 * When `enableMetrics` is true, the rule collects detailed performance metrics:
 * - Total number of signal mutations
 * - Breakdown of assignment vs. update mutations
 * - Number of nested mutations
 * - Average time between mutations
 * - Top functions by mutation count
 * - Mutation density (mutations per line of code)
 *
 * These metrics can help identify performance bottlenecks and optimize your code.
 */

import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import {
  createPerformanceTracker,
  type PerformanceBudget,
  trackOperation,
  startPhase,
  endPhase,
  stopTracking,
  logMetrics,
  type PerformanceMetrics,
  PerformanceLimitExceededError,
  recordMetric,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'useBatch' | 'suggestBatch' | 'addBatchImport' | 'perf';

type Options = [
  {
    minMutations?: number | undefined;
    maxMutations?: number | undefined;
    performance?: PerformanceBudget | undefined;
  },
];

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
      performance: {
        maxTime: 35,
        maxNodes: 1000,
        maxMemory: 40 * 1024 * 1024, // 40MB
        maxOperations: {
          signalAccess: 500,
          nodeProcessing: 5000,
          typeCheck: 300,
        },
        enableMetrics: false,
        logMetrics: false,
      },
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [options = {}]) {
    // Set up performance tracking for this rule with a unique key
    const filePath = context.filename;
    const perfKey = `batch-mutations:${filePath}:${Date.now()}`;
    const startTime = performance.now();

    // Track rule initialization metrics
    const initMetrics = {
      startTime,
      nodeCount: 0,
      phaseDurations: new Map<string, number>(),
      operationCounts: new Map<string, number>(),
    };

    // Initialize performance budget with defaults
    const perfBudget: PerformanceBudget = {
      // Time and resource limits
      maxTime: options.performance?.maxTime ?? 35, // ms
      maxNodes: options.performance?.maxNodes ?? 1000,
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

    // Initialize performance tracking with proper error boundaries and metrics
    let trackNode: ((node: TSESTree.Node) => void) | undefined;
    let onProgramExit: ((node: TSESTree.Node) => void) | undefined;
    let perfInitStart = performance.now();

    try {
      // Track initialization phase
      startPhase(perfKey, 'perf-init');

      const perf = createPerformanceTracker(perfKey, perfBudget, context);

      trackNode = perf.trackNode;

      onProgramExit = perf['Program:exit'];

      // Track initialization metrics
      const initDuration = performance.now() - perfInitStart;
      recordMetric(perfKey, 'initDuration', initDuration);
      trackOperation(perfKey, 'rule-init');

      // End initialization phase
      endPhase(perfKey, 'perf-init');
    } catch (error: unknown) {
      const errorTime = performance.now();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Track error metrics
      recordMetric(perfKey, 'initError', {
        time: errorTime - perfInitStart,
        message: errorMsg,
        timestamp: new Date().toISOString(),
      });

      // Report error
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'perf',
        data: {
          message: `Perf init failed: ${errorMsg}`,
        },
      });

      // Fallback to no-op functions
      trackNode = () => {};
      onProgramExit = () => {};

      // End phase if it wasn't properly closed
      try {
        endPhase(perfKey, 'perf-init');
      } catch {}
    } finally {
      perfInitStart = 0; // Clear start time
    }

    const signalMutations: TSESTree.Node[] = [];
    const maxMutations = options.maxMutations ?? 100; // Default to 100 mutations max
    let mutationLimitExceeded = false;

    // Enhanced metrics tracking
    const mutationMetrics = {
      totalMutations: 0,
      assignmentMutations: 0,
      updateMutations: 0,
      nestedMutations: 0,
      functionMutationCounts: new Map<string, number>(),
      lastMutationTime: 0,
      mutationIntervals: [] as number[],
    };

    let currentFunction: TSESTree.FunctionLike | null = null;
    let hasBatchImport = false;
    let metrics: PerformanceMetrics | undefined;

    const program = context.sourceCode.ast;

    // Track initial node processing with performance guard
    try {
      trackNode(program);
    } catch (error: unknown) {
      if (error instanceof PerformanceLimitExceededError) {
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'perf',
          data: { message: `Performance limit exceeded during initialization: ${error.message}` },
        });

        return {}; // Exit early if we hit performance limits
      }

      throw error; // Re-throw unexpected errors
    }

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

    function checkAndReportMutations(node: TSESTree.Node): void {
      trackNode?.(node);

      const checkStart = performance.now();

      trackOperation(perfKey, 'mutation-check-start');

      // Track check operation with a unique ID
      const currentCheckId = `check-${performance.now()}`;
      startPhase(perfKey, currentCheckId);

      // Track the check operation
      initMetrics.operationCounts.set(
        'mutationChecks',
        (initMetrics.operationCounts.get('mutationChecks') || 0) + 1
      );

      // Record check duration
      const checkDuration = performance.now() - checkStart;
      recordMetric(perfKey, 'mutationCheckDuration', checkDuration);

      const minMutations = options.minMutations ?? 2;
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

    // Check if we've exceeded performance budget during import analysis
    if (typeof metrics?.exceededBudget !== 'undefined') {
      return {}; // Exit early if budget exceeded
    }

    return {
      trackNode,
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
        trackNode(node);

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
        trackNode(node);

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
            checkAndReportMutations(node);
          }
          currentFunction = null;
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        trackNode(node);

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

          // Track mutation metrics
          const now = performance.now();
          if (mutationMetrics.lastMutationTime > 0) {
            mutationMetrics.mutationIntervals.push(now - mutationMetrics.lastMutationTime);
          }
          mutationMetrics.lastMutationTime = now;
          mutationMetrics.totalMutations++;
          mutationMetrics.assignmentMutations++;

          // Track function-level mutation counts
          const functionName = currentFunction.id?.name || 'anonymous';
          mutationMetrics.functionMutationCounts.set(
            functionName,
            (mutationMetrics.functionMutationCounts.get(functionName) || 0) + 1
          );

          // Check for nested mutations
          if (
            node.parent?.type === 'ExpressionStatement' &&
            node.parent.parent?.type === 'BlockStatement' &&
            node.parent.parent.body.length > 1
          ) {
            mutationMetrics.nestedMutations++;
          }

          signalMutations.push(node);
        }
      },

      UpdateExpression(node: TSESTree.UpdateExpression): void {
        trackNode(node);

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

          // Track mutation metrics
          const now = performance.now();
          if (mutationMetrics.lastMutationTime > 0) {
            mutationMetrics.mutationIntervals.push(now - mutationMetrics.lastMutationTime);
          }
          mutationMetrics.lastMutationTime = now;
          mutationMetrics.totalMutations++;
          mutationMetrics.updateMutations++;

          // Track function-level mutation counts
          const functionName = currentFunction.id?.name || 'anonymous';
          mutationMetrics.functionMutationCounts.set(
            functionName,
            (mutationMetrics.functionMutationCounts.get(functionName) || 0) + 1
          );

          signalMutations.push(node);
        }
      },

      // Handle program exit with comprehensive cleanup
      'Program:exit'(node: TSESTree.Node): void {
        trackNode(node);

        const exitStart = performance.now();

        trackOperation(perfKey, 'program-exit-start');

        // Record final mutation metrics
        if (mutationMetrics.totalMutations > 0) {
          recordMetric(perfKey, 'totalMutations', mutationMetrics.totalMutations);
          recordMetric(perfKey, 'assignmentMutations', mutationMetrics.assignmentMutations);
          recordMetric(perfKey, 'updateMutations', mutationMetrics.updateMutations);
          recordMetric(perfKey, 'nestedMutations', mutationMetrics.nestedMutations);

          // Calculate average time between mutations if we have enough data
          if (mutationMetrics.mutationIntervals.length > 1) {
            const avgInterval =
              mutationMetrics.mutationIntervals.reduce((sum, interval) => sum + interval, 0) /
              mutationMetrics.mutationIntervals.length;
            recordMetric(perfKey, 'avgMutationIntervalMs', avgInterval);
          }

          // Record top functions by mutation count
          const topFunctions = Array.from(mutationMetrics.functionMutationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 functions by mutation count

          recordMetric(perfKey, 'topFunctionsByMutations', topFunctions);

          // Calculate mutation density (mutations per line of code)
          const sourceCode = context.sourceCode.getText();
          const loc = sourceCode.split('\n').length;
          const mutationDensity = mutationMetrics.totalMutations / loc;
          recordMetric(perfKey, 'mutationDensity', mutationDensity);
        }

        try {
          // Call the original Program:exit handler from performance perf
          if (onProgramExit) {
            const perfTrackerStart = performance.now();
            onProgramExit.call(this, node);
            recordMetric(perfKey, 'perfTrackerExitTime', performance.now() - perfTrackerStart);
          }

          checkAndReportMutations(node);

          // Final check for any remaining mutations
          const checkStart = performance.now();

          recordMetric(perfKey, 'finalCheckTime', performance.now() - checkStart);

          // Log metrics if enabled
          if (perfBudget?.enableMetrics) {
            const metricsStart = performance.now();
            metrics = stopTracking(perfKey);
            if (metrics) {
              // Add custom metrics
              metrics.customMetrics = {
                ...metrics.customMetrics,
                totalDuration: performance.now() - startTime,
                exitPhaseDuration: performance.now() - exitStart,
                fileSize: context.sourceCode.getText().length,
                signalMutationCount: signalMutations.length,
              };

              if (perfBudget.logMetrics) {
                logMetrics(metrics, context);
              }
            }
            recordMetric(perfKey, 'metricsProcessingTime', performance.now() - metricsStart);
          }
        } catch (error) {
          const errorTime = performance.now();
          if (error instanceof PerformanceLimitExceededError) {
            const message = `[${error.metric}] Limit: ${error.limit}, Actual: ${error.actual}`;
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'perf',
              data: { message: `Performance limit exceeded: ${message}` },
            });
          } else {
            // Log unexpected errors with timing information
            recordMetric(perfKey, 'errorTime', errorTime - exitStart);
            throw error;
          }
        } finally {
          // Ensure we always end the phase, even if there was an error
          endPhase(perfKey, 'program-exit');
        }
      },
    };
  },
});
