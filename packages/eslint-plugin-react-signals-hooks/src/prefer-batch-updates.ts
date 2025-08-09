/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition, Variable } from '@typescript-eslint/scope-manager';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type SignalUpdate = {
  node: TSESTree.Node;
  isTopLevel: boolean;
  signalName: string;
  updateType: 'assignment' | 'method' | 'update';
  scopeDepth: number;
};

type MessageIds =
  | 'useBatch'
  | 'suggestUseBatch'
  | 'addBatchImport'
  | 'wrapWithBatch'
  | 'useBatchSuggestion'
  | 'removeUnnecessaryBatch'
  | 'nonUpdateSignalInBatch';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  minUpdates?: number;
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (typeof options?.severity === 'undefined') {
    return 'error';
  }

  switch (messageId) {
    case 'useBatch': {
      return options.severity.useBatch ?? 'error';
    }

    case 'suggestUseBatch': {
      return options.severity.suggestUseBatch ?? 'warn';
    }

    case 'addBatchImport': {
      return options.severity.addBatchImport ?? 'error';
    }

    case 'wrapWithBatch': {
      return options.severity.wrapWithBatch ?? 'error';
    }

    case 'useBatchSuggestion': {
      return options.severity.useBatchSuggestion ?? 'warn';
    }

    case 'removeUnnecessaryBatch': {
      return options.severity.removeUnnecessaryBatch ?? 'error';
    }

    case 'nonUpdateSignalInBatch': {
      return options.severity.nonUpdateSignalInBatch ?? 'warn';
    }

    default: {
      return 'error';
    }
  }
}

let isProcessedByHandlers = false;

const DEFAULT_MIN_UPDATES = 2;

const updatesInScope: Array<SignalUpdate> = [];

const allUpdates: Array<SignalUpdate> = [];

let trackedSignalVars: Set<string> = new Set();

function processBlock(
  statements: Array<TSESTree.Statement>,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
  perfKey: string,
  scopeDepth = 0,
  inBatch: boolean = false
): Array<SignalUpdate> {
  if (isProcessedByHandlers) {
    return [];
  }

  // Reset accumulators for a fresh analysis pass at the top-level invocation
  if (scopeDepth === 0) {
    updatesInScope.length = 0;
    allUpdates.length = 0;
  }

  const minUpdates = context.options[0]?.minUpdates ?? DEFAULT_MIN_UPDATES;

  if (inBatch) {
    recordMetric(perfKey, PerformanceOperations.skipProcessing, {
      scopeDepth,
      statementCount: statements.length,
    });

    return [];
  }

  recordMetric(perfKey, 'processBlockStart', {
    scopeDepth,
    inBatch,
    statementCount: statements.length,
  });

  const hasBatchImport = context.sourceCode.ast.body.some(
    (node: TSESTree.ProgramStatement): boolean => {
      return (
        node.type === AST_NODE_TYPES.ImportDeclaration &&
        node.source.value === '@preact/signals-react' &&
        node.specifiers.some((specifier: TSESTree.ImportClause): boolean => {
          return (
            'imported' in specifier &&
            'name' in specifier.imported &&
            specifier.imported.name === 'batch'
          );
        })
      );
    }
  );

  for (const stmt of statements) {
    if (stmt.type !== AST_NODE_TYPES.ExpressionStatement) {
      if (stmt.type === AST_NODE_TYPES.BlockStatement) {
        const nestedUpdates = processBlock(stmt.body, context, perfKey, scopeDepth + 1, inBatch);

        allUpdates.push(...nestedUpdates);
      }

      continue;
    }

    if (isBatchCall(stmt.expression, context)) {
      if (
        stmt.expression.type === AST_NODE_TYPES.CallExpression &&
        stmt.expression.arguments.length > 0 &&
        (stmt.expression.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          stmt.expression.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression) &&
        stmt.expression.arguments[0].body.type === AST_NODE_TYPES.BlockStatement
      ) {
        recordMetric(perfKey, 'skipBatchBody', { scopeDepth });
      }

      continue;
    }

    if (isSignalUpdate(stmt.expression, trackedSignalVars)) {
      const updateType = getUpdateType(stmt.expression);

      const signalName = getSignalName(stmt.expression);

      recordMetric(perfKey, 'signalUpdateFound', {
        type: updateType,
        location: scopeDepth === 0 ? 'top-level' : `nested-${scopeDepth}`,
        signalName,
        hasBatchImport,
        inBatchScope: inBatch,
      });

      updatesInScope.push({
        node: stmt.expression,
        isTopLevel: scopeDepth === 0,
        signalName,
        updateType,
        scopeDepth,
      });
    }
  }

  recordMetric(perfKey, 'processBlockEnd', {
    scopeDepth,
    totalUpdates: updatesInScope.length,
    uniqueSignals: new Set(
      updatesInScope.map((u: SignalUpdate): string => {
        return u.signalName;
      })
    ).size,
    hasBatchImport,
    minUpdatesRequired: context.options[0]?.minUpdates,
  });

  allUpdates.push(...updatesInScope);

  if (typeof minUpdates === 'number' && updatesInScope.length < minUpdates) {
    recordMetric(perfKey, 'batchUpdateNotNeeded', {
      scopeDepth,
      updateCount: updatesInScope.length,
      minUpdates,
    });

    return allUpdates;
  }

  const firstNode = updatesInScope[0]?.node;

  recordMetric(perfKey, 'batchUpdateSuggested', {
    updateCount: updatesInScope.length,
    uniqueSignals: new Set(
      updatesInScope.map((u: SignalUpdate): string => {
        return u.signalName;
      })
    ).size,
  });

  if (!firstNode) {
    return allUpdates;
  }

  const messageId = 'useBatch';

  if (
    getSeverity(messageId, context.options[0]) !== 'off' &&
    updatesInScope.length >= minUpdates &&
    !isInsideBatchCall(firstNode, context)
  ) {
    context.report({
      node: firstNode,
      messageId,
      data: {
        count: updatesInScope.length,
        signals: Array.from(
          new Set(
            allUpdates.map((update: SignalUpdate): string => {
              return update.signalName;
            })
          )
        ).join(', '),
      },
      suggest: [
        {
          messageId: 'useBatchSuggestion',
          data: { count: updatesInScope.length },
          *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
            const updatesText = allUpdates
              .map(({ node }: SignalUpdate): string => {
                return context.sourceCode.getText(node);
              })
              .join('; ');

            const firstUpdate = updatesInScope[0]?.node;

            const lastUpdate = updatesInScope[updatesInScope.length - 1]?.node;

            if (!firstUpdate || !lastUpdate) {
              return null;
            }

            const range: TSESTree.Range = [firstUpdate.range[0], lastUpdate.range[1]];

            const b = context.sourceCode.ast.body[0];

            if (!b) {
              return null;
            }

            if (!hasBatchImport) {
              yield fixer.insertTextBefore(b, "import { batch } from '@preact/signals-react';\n\n");
            }

            yield fixer.replaceTextRange(range, `batch(() => {\n  ${updatesText}\n});`);

            recordMetric(perfKey, 'batchFixApplied', {
              updateCount: updatesInScope.length,
            });

            return null;
          },
        },
        {
          messageId: 'useBatchSuggestion',
          data: { count: updatesInScope.length },
          *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
            if (!hasBatchImport) {
              const batchImport = "import { batch } from '@preact/signals-react';\n";

              const firstImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration =>
                  n.type === AST_NODE_TYPES.ImportDeclaration
              );

              if (typeof firstImport === 'undefined') {
                const b = context.sourceCode.ast.body[0];

                if (!b) {
                  return null;
                }

                yield fixer.insertTextBefore(b, batchImport);
              } else {
                yield fixer.insertTextBefore(firstImport, batchImport);
              }
            }

            yield fixer.replaceTextRange(
              [firstNode.range[0], allUpdates[allUpdates.length - 1]?.node.range[1] ?? 0],
              `batch(() => { ${allUpdates
                .map(({ node }: SignalUpdate): string => {
                  return context.sourceCode.getText(node);
                })
                .join('; ')} })`
            );

            recordMetric(perfKey, 'batchFixApplied', {
              updateCount: allUpdates.length,
            });

            return null;
          },
        },
        {
          messageId: 'addBatchImport',
          data: {
            count: updatesInScope.length,
          },
          *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
            if (hasBatchImport) {
              return;
            }

            const batchImport = "import { batch } from '@preact/signals-react';\n";

            const firstImport = context.sourceCode.ast.body.find(
              (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                return n.type === AST_NODE_TYPES.ImportDeclaration;
              }
            );

            if (typeof firstImport === 'undefined') {
              const b = context.sourceCode.ast.body[0];

              if (!b) {
                return;
              }

              yield fixer.insertTextBefore(b, batchImport);
            } else {
              yield fixer.insertTextBefore(firstImport, batchImport);
            }
          },
        },
      ],
    });
  }

  return allUpdates;
}

const batchScopeStack: Array<boolean> = [false];

function pushBatchScope(inBatch: boolean): void {
  batchScopeStack.push(inBatch);
}

function popBatchScope(): boolean {
  const popped = batchScopeStack.pop();

  if (batchScopeStack.length === 0) {
    batchScopeStack.push(false);
  }

  return popped ?? false;
}

function isInsideBatchCall(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  if (batchScopeStack.length > 0 && batchScopeStack[batchScopeStack.length - 1] === true) {
    return true;
  }

  for (const ancestor of context.sourceCode.getAncestors(node)) {
    if (
      ancestor.type === AST_NODE_TYPES.CallExpression &&
      isBatchCall(ancestor, context) &&
      ancestor.arguments.length > 0 &&
      typeof ancestor.arguments[0] !== 'undefined' &&
      'body' in ancestor.arguments[0] &&
      'range' in ancestor.arguments[0].body
    ) {
      return (
        node.range[0] >= ancestor.arguments[0].body.range[0] &&
        node.range[1] <= ancestor.arguments[0].body.range[1]
      );
    }
  }

  return false;
}

function isBatchCall(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) {
    return false;
  }

  if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'batch') {
    return true;
  }

  if (node.callee.type === AST_NODE_TYPES.Identifier) {
    const variable = context.sourceCode.getScope(node).variables.find((v: Variable): boolean => {
      return 'name' in node.callee && v.name === node.callee.name;
    });

    if (typeof variable !== 'undefined') {
      return variable.defs.some((def: Definition): boolean => {
        if (def.type === 'ImportBinding') {
          return (
            'imported' in def.node &&
            'name' in def.node.imported &&
            def.node.imported.name === 'batch'
          );
        }

        return false;
      });
    }
  }

  return false;
}

function getUpdateType(node: TSESTree.Node): 'assignment' | 'method' | 'update' {
  if (node.type === AST_NODE_TYPES.AssignmentExpression) {
    return 'assignment';
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    return 'method';
  }

  return 'update';
}

function getSignalName(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.AssignmentExpression) {
    if (
      node.left.type === AST_NODE_TYPES.MemberExpression &&
      !node.left.computed &&
      node.left.property.type === AST_NODE_TYPES.Identifier &&
      node.left.property.name === 'value' &&
      node.left.object.type === AST_NODE_TYPES.Identifier
    ) {
      return node.left.object.name;
    }
  } else if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    !node.callee.computed &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    (node.callee.property.name === 'set' || node.callee.property.name === 'update') &&
    node.callee.object.type === AST_NODE_TYPES.Identifier
  ) {
    return node.callee.object.name;
  }

  return 'signal';
}

function isSignalUpdate(
  node: TSESTree.Node,
  trackedSignalVars: Set<string>
): node is
  | TSESTree.AssignmentExpression
  | TSESTree.CallExpression
  | TSESTree.UpdateExpression
  | TSESTree.UnaryExpression {
  if (node.type === AST_NODE_TYPES.AssignmentExpression) {
    if (
      node.left.type === AST_NODE_TYPES.MemberExpression &&
      node.left.property.type === AST_NODE_TYPES.Identifier &&
      node.left.property.name === 'value' &&
      isSignalReference(node.left.object, trackedSignalVars)
    ) {
      return true;
    }

    if (
      node.operator !== '=' &&
      node.left.type === AST_NODE_TYPES.MemberExpression &&
      node.left.property.type === AST_NODE_TYPES.Identifier &&
      node.left.property.name === 'value' &&
      isSignalReference(node.left.object, trackedSignalVars)
    ) {
      return true;
    }
  }

  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    ['set', 'update'].includes(node.callee.property.name) &&
    isSignalReference(node.callee.object, trackedSignalVars)
  ) {
    return true;
  }

  if (
    node.type === AST_NODE_TYPES.UpdateExpression &&
    node.argument.type === AST_NODE_TYPES.MemberExpression &&
    node.argument.property.type === AST_NODE_TYPES.Identifier &&
    node.argument.property.name === 'value' &&
    isSignalReference(node.argument.object, trackedSignalVars)
  ) {
    return true;
  }

  return false;
}

function isSignalReference(node: TSESTree.Node, trackedSignalVars: Set<string>): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return trackedSignalVars.has(node.name);
  }

  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'value'
  ) {
    return isSignalReference(node.object, trackedSignalVars);
  }

  return false;
}

function containsSignalRead(node: TSESTree.Node, trackedSignalVars: Set<string>): boolean {
  // Direct identifier like `countSignal`
  if (node.type === AST_NODE_TYPES.Identifier) {
    return isSignalReference(node, trackedSignalVars);
  }

  // Member expression like `countSignal.value` or deeper
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    if (isSignalReference(node.object, trackedSignalVars)) {
      return true;
    }

    return (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      (node.object && containsSignalRead(node.object, trackedSignalVars)) ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      (node.property &&
        node.property.type !== AST_NODE_TYPES.PrivateIdentifier &&
        containsSignalRead(node.property, trackedSignalVars))
    );
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }

    const value = node[key as keyof typeof node];

    if (typeof value === 'undefined') {
      continue;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          if (item && typeof item.type === 'string') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (containsSignalRead(item, trackedSignalVars)) {
              return true;
            }
          }
        }
      } else if ('type' in value && containsSignalRead(value, trackedSignalVars)) {
        return true;
      }
    }
  }

  return false;
}

let signalUpdates: Array<SignalUpdate> = [];
let trackedSignalCreators: Set<string> = new Set();
let trackedSignalNamespaces: Set<string> = new Set();

const ruleName = 'prefer-batch-updates';

export const preferBatchUpdatesRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Suggest batching multiple signal updates to optimize performance',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      useBatch:
        '{{count}} signal updates detected in the same scope. Use `batch` to optimize performance by reducing renders.',
      suggestUseBatch: 'Use `batch` to group {{count}} signal updates',
      addBatchImport: "Add `batch` import from '@preact/signals-react'",
      wrapWithBatch: 'Wrap with `batch` to optimize signal updates',
      useBatchSuggestion: 'Use `batch` to group {{count}} signal updates',
      removeUnnecessaryBatch:
        'Unnecessary batch around a single signal update. Remove the batch wrapper',
      nonUpdateSignalInBatch:
        'Signal read inside `batch()` without an update. Batch is intended for grouping updates.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minUpdates: {
            type: 'number',
            minimum: 2,
            default: DEFAULT_MIN_UPDATES,
            description: 'Minimum number of signal updates to trigger the rule',
          },
          performance: {
            type: 'object',
            properties: {
              maxTime: {
                type: 'number',
                minimum: 1,
                description: 'Maximum time in milliseconds to spend analyzing a file',
              },
              maxMemory: {
                type: 'number',
                minimum: 1,
                description: 'Maximum memory in MB to use for analysis',
              },
              maxNodes: {
                type: 'number',
                minimum: 1,
                description: 'Maximum number of AST nodes to process',
              },
              enableMetrics: {
                type: 'boolean',
                description: 'Whether to enable performance metrics collection',
              },
              logMetrics: {
                type: 'boolean',
                description: 'Whether to log performance metrics',
              },
              maxUpdates: {
                type: 'number',
                minimum: 1,
                description: 'Maximum number of signal updates to process',
              },
              maxDepth: {
                type: 'number',
                minimum: 1,
                description: 'Maximum depth of nested scopes to analyze',
              },
              maxOperations: {
                type: 'object',
                description: 'Limits for specific operations',
                properties: Object.fromEntries(
                  Object.entries(PerformanceOperations).map(([key]) => [
                    key,
                    {
                      type: 'number',
                      minimum: 1,
                      description: `Maximum number of ${key} operations`,
                    },
                  ])
                ),
              },
            },
            additionalProperties: false,
          },
          severity: {
            type: 'object',
            properties: {
              arrayUpdateInLoop: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                description: 'Severity for array updates in loops',
              },
              suggestBatchArrayUpdate: {
                type: 'string',
                description: 'Severity for suggesting batch for array updates',
              },
              // Add other severity options from the spec
              useBatch: { type: 'string', enum: ['error', 'warn', 'off'] },
              suggestUseBatch: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addBatchImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              wrapWithBatch: { type: 'string', enum: ['error', 'warn', 'off'] },
              useBatchSuggestion: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeUnnecessaryBatch: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              nonUpdateSignalInBatch: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
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
      severity: {
        useBatch: 'error',
        suggestUseBatch: 'error',
        addBatchImport: 'error',
        wrapWithBatch: 'error',
        useBatchSuggestion: 'error',
        removeUnnecessaryBatch: 'error',
        nonUpdateSignalInBatch: 'warn',
      },
    },
  ],
  create(
    context: Readonly<RuleContext<MessageIds, Options>>,
    [option]: readonly [Option?]
  ): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    const perf = createPerformanceTracker(perfKey, option?.performance);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    if (option?.performance?.enableMetrics === true && option.performance.logMetrics === true) {
      console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
      console.info(`${ruleName}: Rule configuration:`, option);
    }

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (
        typeof option?.performance?.maxNodes === 'number' &&
        nodeCount > option.performance.maxNodes
      ) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);
        return false;
      }
      return true;
    }

    return {
      [AST_NODE_TYPES.Program]: (): void => {
        // reset tracking for this file
        trackedSignalVars = new Set();
        trackedSignalCreators = new Set();
        trackedSignalNamespaces = new Set();
      },

      [`${AST_NODE_TYPES.ImportDeclaration}`](node: TSESTree.ImportDeclaration): void {
        if (node.source.value !== '@preact/signals-react') {
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            // Track known creators
            if (
              spec.imported.type === AST_NODE_TYPES.Identifier &&
              (spec.imported.name === 'signal' || spec.imported.name === 'computed')
            ) {
              trackedSignalCreators.add(spec.local.name);
            }
          } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            trackedSignalNamespaces.add(spec.local.name);
          }
        }
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier || !node.init) {
          return;
        }

        // signal creator call: signal(...)
        if (
          node.init.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          trackedSignalCreators.has(node.init.callee.name)
        ) {
          trackedSignalVars.add(node.id.name);
          return;
        }

        // namespaced call: ns.signal(...) or ns.computed(...)
        if (
          node.init.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
          !node.init.callee.computed &&
          node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
          trackedSignalNamespaces.has(node.init.callee.object.name) &&
          node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.init.callee.property.name === 'signal' ||
            node.init.callee.property.name === 'computed')
        ) {
          trackedSignalVars.add(node.id.name);
        }
      },
      '*': (node: TSESTree.Node): void => {
        perf.trackNode(node);
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (!shouldContinue()) {
          return;
        }

        if (isBatchCall(node, context)) {
          recordMetric(perfKey, 'batchCallDetected', {
            location: context.getSourceCode().getLocFromIndex(node.range[0]),
            hasCallback:
              node.arguments.length > 0 &&
              (node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression),
          });

          if (
            node.arguments.length > 0 &&
            (node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
              node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression)
          ) {
            pushBatchScope(true);

            if (
              node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression &&
              node.arguments[0].body.type === AST_NODE_TYPES.BlockStatement
            ) {
              recordMetric(perfKey, 'skipArrowBatchBody', {
                location: context.sourceCode.getLocFromIndex(node.arguments[0].body.range[0]),
              });

              // Report non-update signal reads inside batch body
              if (Array.isArray(node.arguments[0].body.body)) {
                for (const stmt of node.arguments[0].body.body) {
                  if (
                    stmt.type === AST_NODE_TYPES.ExpressionStatement &&
                    !isSignalUpdate(stmt.expression, trackedSignalVars) &&
                    containsSignalRead(stmt.expression, trackedSignalVars) &&
                    getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
                  ) {
                    context.report({ node: stmt.expression, messageId: 'nonUpdateSignalInBatch' });
                  }
                }
              }

              if (Array.isArray(node.arguments[0].body.body)) {
                const bodyStatements = node.arguments[0].body.body;

                // Count signal updates within the batch body
                const updateStmts: Array<TSESTree.ExpressionStatement> = bodyStatements
                  .filter((s: TSESTree.Statement): s is TSESTree.ExpressionStatement => {
                    return s.type === AST_NODE_TYPES.ExpressionStatement;
                  })
                  .filter((s: TSESTree.ExpressionStatement): boolean => {
                    return isSignalUpdate(s.expression, trackedSignalVars);
                  });

                if (
                  updateStmts.length === 1 &&
                  getSeverity('removeUnnecessaryBatch', context.options[0]) !== 'off'
                ) {
                  const parent = node.parent;

                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                  if (parent && parent.type === AST_NODE_TYPES.ExpressionStatement) {
                    if (bodyStatements.length === 1) {
                      // Safe case: single update statement inside batch -> replace whole statement
                      context.report({
                        node,
                        messageId: 'removeUnnecessaryBatch',
                        fix(fixer) {
                          return fixer.replaceText(
                            parent,
                            context.sourceCode.getText(updateStmts[0])
                          );
                        },
                      });
                    } else {
                      // Unwrap batch while preserving all inner statements
                      context.report({
                        node,
                        messageId: 'removeUnnecessaryBatch',
                        fix(fixer) {
                          const innerText = bodyStatements
                            .map((s): string => context.sourceCode.getText(s))
                            .join('\n');
                          return fixer.replaceText(parent, innerText);
                        },
                      });
                    }
                  } else {
                    // Fallback: report without fix if parent is unexpected
                    context.report({ node, messageId: 'removeUnnecessaryBatch' });
                  }
                }
              }
            } else if (node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression) {
              // Concise arrow body case: body is an expression
              if (
                node.arguments[0].body.type !== AST_NODE_TYPES.BlockStatement &&
                !isSignalUpdate(node.arguments[0].body, trackedSignalVars) &&
                containsSignalRead(node.arguments[0].body, trackedSignalVars) &&
                getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
              ) {
                context.report({
                  node: node.arguments[0].body,
                  messageId: 'nonUpdateSignalInBatch',
                });
              }
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (node.arguments[0].type === AST_NODE_TYPES.FunctionExpression) {
              recordMetric(perfKey, 'skipFunctionBatchBody', {
                location: context.sourceCode.getLocFromIndex(node.arguments[0].body.range[0]),
              });

              const bodyStatements = node.arguments[0].body.body;

              // Report non-update signal reads inside batch body
              if (Array.isArray(bodyStatements)) {
                for (const stmt of bodyStatements) {
                  if (
                    stmt.type === AST_NODE_TYPES.ExpressionStatement &&
                    !isSignalUpdate(stmt.expression, trackedSignalVars) &&
                    containsSignalRead(stmt.expression, trackedSignalVars) &&
                    getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
                  ) {
                    context.report({ node: stmt.expression, messageId: 'nonUpdateSignalInBatch' });
                  }
                }
              }

              if (Array.isArray(bodyStatements)) {
                // Count signal updates within the batch body
                const updateStmts: Array<TSESTree.ExpressionStatement> = bodyStatements
                  .filter(
                    (s): s is TSESTree.ExpressionStatement =>
                      s.type === AST_NODE_TYPES.ExpressionStatement
                  )
                  .filter((s: TSESTree.ExpressionStatement): boolean => {
                    return isSignalUpdate(s.expression, trackedSignalVars);
                  });

                if (
                  updateStmts.length === 1 &&
                  getSeverity('removeUnnecessaryBatch', context.options[0]) !== 'off'
                ) {
                  const onlyUpdateStmt = updateStmts[0];

                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                  if (node.parent && node.parent.type === AST_NODE_TYPES.ExpressionStatement) {
                    if (bodyStatements.length === 1) {
                      // Safe case: single update statement inside batch -> replace whole statement
                      context.report({
                        node,
                        messageId: 'removeUnnecessaryBatch',
                        fix(fixer: TSESLint.RuleFixer) {
                          if (typeof onlyUpdateStmt === 'undefined') {
                            return null;
                          }

                          return fixer.replaceText(
                            node.parent,
                            context.sourceCode.getText(onlyUpdateStmt)
                          );
                        },
                      });
                    } else {
                      // Unwrap batch while preserving all inner statements
                      context.report({
                        node,
                        messageId: 'removeUnnecessaryBatch',
                        fix(fixer: TSESLint.RuleFixer) {
                          const innerText = bodyStatements
                            .map((s: TSESTree.Statement): string => {
                              return context.sourceCode.getText(s);
                            })
                            .join('\n');
                          return fixer.replaceText(node.parent, innerText);
                        },
                      });
                    }
                  } else {
                    // Fallback: report without fix if parent is unexpected
                    context.report({ node, messageId: 'removeUnnecessaryBatch' });
                  }
                }
              }
            }
          }
        }
      },

      [`${AST_NODE_TYPES.CallExpression}:exit`](node: TSESTree.CallExpression): void {
        if (!shouldContinue()) {
          return;
        }

        if (
          !(
            isBatchCall(node, context) &&
            node.arguments.length > 0 &&
            (node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
              node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression)
          )
        ) {
          return;
        }

        const callbackBodyRange = node.arguments[0].body.range;

        signalUpdates = signalUpdates.filter((update: SignalUpdate): boolean => {
          return !(
            update.node.range[0] >= callbackBodyRange[0] &&
            update.node.range[1] <= callbackBodyRange[1]
          );
        });

        const removedCount = signalUpdates.length - signalUpdates.length;

        if (removedCount > 0) {
          recordMetric(perfKey, 'batchUpdatesRemoved', {
            removedCount,
            location: context.sourceCode.getLocFromIndex(node.range[1]),
          });
        }

        popBatchScope();
      },

      [AST_NODE_TYPES.BlockStatement]: (node: TSESTree.BlockStatement): void => {
        pushBatchScope(batchScopeStack[batchScopeStack.length - 1] === true);

        processBlock(node.body, context, perfKey);
      },

      [`${AST_NODE_TYPES.ArrowFunctionExpression}[body.type="${AST_NODE_TYPES.BlockStatement}"]`]: (
        node: TSESTree.ArrowFunctionExpression
      ): void => {
        if (!shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'callExpression');

        try {
          if (
            isBatchCall(node, context) &&
            'arguments' in node &&
            Array.isArray(node.arguments) &&
            node.arguments.length > 0 &&
            typeof node.arguments[0] === 'object' &&
            node.arguments[0] !== null &&
            'type' in node.arguments[0] &&
            (node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression ||
              node.arguments[0].type === AST_NODE_TYPES.FunctionExpression)
          ) {
            popBatchScope();
          }

          if (
            isSignalUpdate(node, trackedSignalVars) &&
            batchScopeStack[batchScopeStack.length - 1] !== true
          ) {
            signalUpdates.push({
              node,
              isTopLevel: true,
              signalName: getSignalName(node),
              updateType: getUpdateType(node),
              scopeDepth: 0,
            });
          }
        } catch (error: unknown) {
          recordMetric(perfKey, 'callExpressionError', {
            error: String(error),
          });
        } finally {
          endPhase(perfKey, 'callExpression');
        }
      },

      [`${AST_NODE_TYPES.AssignmentExpression}:exit`](node: TSESTree.AssignmentExpression): void {
        if (!shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'assignmentExpression');

        try {
          if (
            isSignalUpdate(node, trackedSignalVars) &&
            batchScopeStack[batchScopeStack.length - 1] !== true
          ) {
            signalUpdates.push({
              node,
              isTopLevel: false,
              signalName: getSignalName(node),
              updateType: 'assignment',
              scopeDepth: 0,
            });
          }
        } catch (error: unknown) {
          recordMetric(perfKey, 'assignmentExpressionError', {
            error: String(error),
          });
        } finally {
          endPhase(perfKey, 'assignmentExpression');
        }
      },

      [`${AST_NODE_TYPES.UpdateExpression}:exit`](node: TSESTree.UpdateExpression): void {
        if (!shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'updateExpression');

        try {
          if (
            isSignalUpdate(node, trackedSignalVars) &&
            batchScopeStack[batchScopeStack.length - 1] !== true
          ) {
            signalUpdates.push({
              node,
              isTopLevel: false,
              signalName: getSignalName(node),
              updateType: 'update',
              scopeDepth: 0,
            });
          }
        } catch (error: unknown) {
          recordMetric(perfKey, 'updateExpressionError', {
            error: JSON.stringify(error),
          });
        } finally {
          endPhase(perfKey, 'updateExpression');
        }
      },

      [`${AST_NODE_TYPES.BlockStatement}:exit`](node: TSESTree.BlockStatement): void {
        if (isProcessedByHandlers || !shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'blockStatement');

        try {
          isProcessedByHandlers = true;

          processBlock(
            node.body,
            context,
            perfKey,
            1,
            batchScopeStack[batchScopeStack.length - 1] === true
          );
        } catch (error: unknown) {
          recordMetric(perfKey, 'processBlockError', { error: String(error) });
        } finally {
          isProcessedByHandlers = false;

          popBatchScope();

          endPhase(perfKey, 'blockStatement');
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](node: TSESTree.Program): void {
        // clear tracking after file processed
        trackedSignalVars.clear();
        trackedSignalCreators.clear();
        trackedSignalNamespaces.clear();

        startPhase(perfKey, 'programExit');

        processBlock(
          node.body.filter(
            (
              n: TSESTree.ProgramStatement
            ): n is TSESTree.ExpressionStatement | TSESTree.VariableDeclaration =>
              n.type === AST_NODE_TYPES.ExpressionStatement ||
              n.type === AST_NODE_TYPES.VariableDeclaration
          ),
          context,
          perfKey
        );

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    } satisfies ESLintUtils.RuleListener;
  },
});
