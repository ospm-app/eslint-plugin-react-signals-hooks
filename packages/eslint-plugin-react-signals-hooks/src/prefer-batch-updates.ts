import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  createPerformanceTracker,
  type PerformanceBudget,
  startTracking,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'useBatch'
  | 'suggestUseBatch'
  | 'addBatchImport'
  | 'wrapWithBatch'
  | 'useBatchSuggestion';

type SignalUpdate = {
  node: TSESTree.AssignmentExpression | TSESTree.CallExpression;
  isTopLevel: boolean;
  signalName: string;
  updateType: 'assignment' | 'method';
};

type Options = [
  {
    /** Minimum number of signal updates to trigger the rule */
    minUpdates?: number | undefined;
    /** Performance tuning options */
    performance?: PerformanceBudget | undefined;
  },
];

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
      performance: {
        // Time and resource limits
        maxTime: 35, // ms
        maxNodes: 1800, // Maximum AST nodes to process
        maxMemory: 45 * 1024 * 1024, // 45MB

        // Operation limits using standardized operation names
        maxOperations: {
          [PerformanceOperations.signalAccess]: 1000, // Maximum number of signal access checks
          [PerformanceOperations.signalCheck]: 500, // Maximum number of signal checks
          [PerformanceOperations.identifierResolution]: 1000, // Maximum number of identifier resolutions
          [PerformanceOperations.scopeLookup]: 1000, // Maximum number of scope lookups
          [PerformanceOperations.typeCheck]: 500, // Maximum number of type checks
          [PerformanceOperations.batchAnalysis]: 100, // Maximum number of batch operations to analyze
        },

        // Metrics and logging
        enableMetrics: false, // Whether to enable detailed performance metrics
        logMetrics: false, // Whether to log performance metrics to console
      },
    },
  ],

  create(context, [options = {}]) {
    const { minUpdates = 2, performance: performanceOptions = {} } = options;

    const key = startTracking<Options>(context, 'prefer-batch-updates');

    // Set performance budget for this rule
    const perf = createPerformanceTracker<Options>(
      key,
      {
        maxTime: performanceOptions.maxTime ?? 35, // ms
        maxNodes: performanceOptions.maxNodes ?? 1800, // Maximum AST nodes to process
        maxMemory: performanceOptions.maxMemory ?? 45 * 1024 * 1024, // 45MB

        // Operation limits using standardized operation names
        maxOperations: {
          [PerformanceOperations.signalAccess]:
            performanceOptions.maxOperations?.[PerformanceOperations.signalAccess] ?? 1000,
          [PerformanceOperations.signalCheck]:
            performanceOptions.maxOperations?.[PerformanceOperations.signalCheck] ?? 500,
          [PerformanceOperations.identifierResolution]:
            performanceOptions.maxOperations?.[PerformanceOperations.identifierResolution] ?? 1000,
          [PerformanceOperations.scopeLookup]:
            performanceOptions.maxOperations?.[PerformanceOperations.scopeLookup] ?? 1000,
          [PerformanceOperations.typeCheck]:
            performanceOptions.maxOperations?.[PerformanceOperations.typeCheck] ?? 500,
          [PerformanceOperations.batchAnalysis]:
            performanceOptions.maxOperations?.[PerformanceOperations.batchAnalysis] ?? 100,
        },

        // Metrics and logging
        enableMetrics: performanceOptions.enableMetrics ?? false,
        logMetrics: performanceOptions.logMetrics ?? false,
      },
      context
    );

    // Enable performance metrics if configured
    if (performanceOptions.enableMetrics) {
      startTracking(context, key, {
        maxTime: performanceOptions.maxTime,
        maxNodes: performanceOptions.maxNodes,
        maxMemory: performanceOptions.maxMemory,
        maxOperations: performanceOptions.maxOperations,
        enableMetrics: performanceOptions.enableMetrics,
        logMetrics: performanceOptions.logMetrics,
      });
    }

    const sourceCode = context.sourceCode;

    // Track signal updates in the current scope
    const signalUpdates: Array<SignalUpdate> = [];

    let hasBatchImport = false;

    // Check if batch is already imported
    const program = sourceCode.ast;
    hasBatchImport = program.body.some((node) => {
      return (
        node.type === 'ImportDeclaration' &&
        node.source.value === '@preact/signals-react' &&
        node.specifiers.some((s) => {
          return (
            s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'batch'
          );
        })
      );
    });

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

    // Process a block of statements for signal updates
    function processBlock(
      statements: Array<TSESTree.ExpressionStatement | TSESTree.VariableDeclaration>
    ) {
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
        }

        // Handle variable declarations with potential signal updates in the initializer
        else if (stmt.type === 'VariableDeclaration') {
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
      if (updatesInBlock.length >= minUpdates) {
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
                  .map(({ node }) => {
                    return sourceCode.getText(node);
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

    return {
      // Track all nodes for performance monitoring
      '*': (node: TSESTree.Node): void => {
        perf.trackNode(node);
      },
      // Process blocks of code (function bodies, if blocks, etc.)
      'BlockStatement:exit'(node: TSESTree.BlockStatement): void {
        processBlock(
          node.body.filter(
            (n): n is TSESTree.ExpressionStatement | TSESTree.VariableDeclaration =>
              n.type === 'ExpressionStatement' || n.type === 'VariableDeclaration'
          )
        );
      },

      // Process program top level
      'Program:exit'(node: TSESTree.Program): void {
        perf.trackNode(node);

        processBlock(
          node.body.filter(
            (
              n: TSESTree.ProgramStatement
            ): n is TSESTree.ExpressionStatement | TSESTree.VariableDeclaration =>
              n.type === 'ExpressionStatement' || n.type === 'VariableDeclaration'
          )
        );

        perf['Program:exit']();
      },
      // Track signal updates in the current scope
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        perf.trackNode(node);

        if (isSignalUpdate(node)) {
          const signalName =
            'object' in node.left && node.left.object.type === 'Identifier'
              ? node.left.object.name
              : 'signal';

          signalUpdates.push({
            node,
            isTopLevel: node.parent?.type === 'ExpressionStatement',
            signalName,
            updateType: 'assignment',
          });
        }
      },

      CallExpression(node: TSESTree.CallExpression): void {
        perf.trackNode(node);

        if (isSignalUpdate(node)) {
          const signalName =
            'object' in node.callee && node.callee.object.type === 'Identifier'
              ? node.callee.object.name
              : 'signal';

          signalUpdates.push({
            node,
            isTopLevel: node.parent?.type === 'ExpressionStatement',
            signalName,
            updateType: 'method',
          });
        }
      },
    };
  },
});
