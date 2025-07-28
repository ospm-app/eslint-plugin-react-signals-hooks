import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import {
  endPhase,
  startPhase,
  stopTracking,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type MessageIds = 'useBatch' | 'suggestBatch' | 'addBatchImport' | 'performanceLimitExceeded';

type Option = {
  minMutations: number;
  maxMutations: number;
  performance: PerformanceBudget;
};

type Options = [Option];

function isSignalMutation(
  node: TSESTree.Node
): node is TSESTree.AssignmentExpression | TSESTree.UpdateExpression {
  if (node.type !== 'AssignmentExpression' && node.type !== 'UpdateExpression') {
    return false;
  }

  const memberExpr = node.type === 'AssignmentExpression' ? node.left : node.argument;

  if (
    memberExpr.type !== 'MemberExpression' ||
    memberExpr.property?.type !== 'Identifier' ||
    memberExpr.property.name !== 'value'
  ) {
    return false;
  }

  if (memberExpr.object.type !== 'Identifier') {
    return false;
  }

  for (const suffix of new Set(['Signal', 'signal'])) {
    if (memberExpr.object.name.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

function checkAndReportMutations(
  perfKey: string,
  context: Readonly<RuleContext<MessageIds, Options>>
): void {
  const checkStart = performance.now();

  trackOperation(perfKey, PerformanceOperations.mutationCheckStart);

  const currentCheckId = `check-${performance.now()}`;

  startPhase(perfKey, currentCheckId);

  const checkDuration = performance.now() - checkStart;

  recordMetric(perfKey, 'mutationCheckDuration', checkDuration);

  if (signalMutations.length >= context.options[0].minMutations) {
    trackOperation(perfKey, PerformanceOperations.batchMutation);

    recordMetric(perfKey, 'mutationCount', signalMutations.length);

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
              const importNode: TSESTree.ImportDeclaration | undefined =
                context.sourceCode.ast.body.find(
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
                    context.sourceCode.ast.body[0],
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

let hasBatchImport = false;
let mutationLimitExceeded = false;

let currentFunction: TSESTree.FunctionLike | null = null;

const signalMutations: TSESTree.Node[] = [];

const importCheckStart = performance.now();

let importCheckCount = 0;

const ruleName = 'prefer-batch-for-multi-mutations';

export const preferBatchForMultiMutationsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce using batch() for multiple signal mutations in the same scope',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      useBatch:
        'Multiple signal mutations detected. Use `batch()` to optimize performance by reducing renders.',
      suggestBatch: 'Wrap with `batch()`',
      addBatchImport: "Add `batch` import from '@preact/signals-react'",
      performanceLimitExceeded:
        '`Maximum number of signal mutations ({{ maxMutations }}) exceeded. Consider using batch() for better performance.`',
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
          maxMutations: {
            type: 'number',
            minimum: 2,
            default: 10,
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
      minMutations: 2,
      maxMutations: 1000,
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'perf-init');

    const perf = createPerformanceTracker<Options>(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option.performance.enableMetrics,
        logMetrics: option.performance.logMetrics,
      },
    });

    endPhase(perfKey, 'perf-init');

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    startPhase(perfKey, 'import-analysis');

    trackOperation(perfKey, PerformanceOperations.preImportAnalysis);

    hasBatchImport = context.sourceCode.ast.body.some(
      (node: TSESTree.ProgramStatement): boolean => {
        importCheckCount++;

        trackOperation(perfKey, PerformanceOperations[`importCheck${node.type}`]);

        return (
          node.type === 'ImportDeclaration' &&
          node.source.value === '@preact/signals-react' &&
          node.specifiers.some(
            (s) =>
              s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'batch'
          )
        );
      }
    );

    recordMetric(perfKey, 'importCheckCount', importCheckCount);

    trackOperation(perfKey, PerformanceOperations.importCheckStart);

    recordMetric(perfKey, 'importCheckDuration', performance.now() - importCheckStart);

    endPhase(perfKey, 'import-analysis');

    startPhase(perfKey, 'ruleExecution');

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        // Use a safe default key if the specific node type processing key doesn't exist
        const operationKey = `${node.type}Processing` as keyof typeof PerformanceOperations;

        const safeOperationKey =
          operationKey in PerformanceOperations
            ? PerformanceOperations[operationKey]
            : PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, safeOperationKey);
      },
      'FunctionDeclaration:exit': (_node: TSESTree.FunctionDeclaration): void => {
        checkAndReportMutations(perfKey, context);
      },
      'FunctionExpression:exit': (_node: TSESTree.FunctionExpression): void => {
        checkAndReportMutations(perfKey, context);
      },
      'ArrowFunctionExpression:exit': (_node: TSESTree.ArrowFunctionExpression): void => {
        checkAndReportMutations(perfKey, context);
      },
      'ClassMethod:exit': (): void => {
        checkAndReportMutations(perfKey, context);
      },
      'ClassProperty:exit': (): void => {
        checkAndReportMutations(perfKey, context);
      },
      'MethodDefinition:exit': (_node: TSESTree.MethodDefinition): void => {
        checkAndReportMutations(perfKey, context);
      },
      'PropertyDefinition:exit': (_node: TSESTree.PropertyDefinition): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSDeclareFunction:exit': (_node: TSESTree.TSDeclareFunction): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSMethodSignature:exit': (_node: TSESTree.TSMethodSignature): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSPropertySignature:exit': (_node: TSESTree.TSPropertySignature): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSEmptyBodyFunctionExpression:exit': (
        _node: TSESTree.TSEmptyBodyFunctionExpression
      ): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSTypeLiteral:exit': (_node: TSESTree.TSTypeLiteral): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSInterfaceBody:exit': (_node: TSESTree.TSInterfaceBody): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSInterfaceDeclaration:exit': (_node: TSESTree.TSInterfaceDeclaration): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSTypeAliasDeclaration:exit': (_node: TSESTree.TSTypeAliasDeclaration): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSEnumDeclaration:exit': (_node: TSESTree.TSEnumDeclaration): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSModuleBlock:exit': (_node: TSESTree.TSModuleBlock): void => {
        checkAndReportMutations(perfKey, context);
      },
      'TSModuleDeclaration:exit': (_node: TSESTree.TSModuleDeclaration): void => {
        checkAndReportMutations(perfKey, context);
      },
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
          trackOperation(perfKey, PerformanceOperations.typeCheck);
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
          trackOperation(perfKey, PerformanceOperations.functionExit);

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
            checkAndReportMutations(perfKey, context);
          }
          currentFunction = null;
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        trackOperation(perfKey, PerformanceOperations.checkAssignment);

        // Skip if we've already exceeded the mutation limit
        if (mutationLimitExceeded) {
          return;
        }

        if (currentFunction && isSignalMutation(node)) {
          trackOperation(perfKey, PerformanceOperations.signalAssignmentFound);

          // Check if we're about to exceed the limit
          if (signalMutations.length >= (option.maxMutations ?? 100)) {
            mutationLimitExceeded = true;

            context.report({
              node,
              messageId: 'performanceLimitExceeded',
              data: {
                ruleName,
                maxMutations: option.maxMutations,
              },
            });

            return;
          }

          signalMutations.push(node);
        }
      },

      UpdateExpression(node: TSESTree.UpdateExpression): void {
        trackOperation(perfKey, PerformanceOperations.checkUpdate);

        // Skip if we've already exceeded the mutation limit
        if (mutationLimitExceeded) {
          return;
        }

        if (currentFunction && isSignalMutation(node)) {
          trackOperation(perfKey, PerformanceOperations.signalUpdateFound);

          // Check if we're about to exceed the limit
          if (signalMutations.length >= option.maxMutations) {
            mutationLimitExceeded = true;

            context.report({
              node,
              messageId: 'performanceLimitExceeded',
              data: {
                maxMutations: option.maxMutations,
                ruleName,
              },
            });
            return;
          }

          signalMutations.push(node);
        }
      },

      // Handle program exit with comprehensive cleanup
      'Program:exit'(): void {
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
