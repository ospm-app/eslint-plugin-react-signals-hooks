/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition, Variable } from '@typescript-eslint/scope-manager';
import { ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import ts from 'typescript';

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

// Recursively check if a node subtree contains any signal update
function containsSignalUpdate(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  // If this node itself is an update, return true
  if (isSignalUpdate(node, context)) {
    return true;
  }

  // For block statements, explicitly iterate children
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    for (const s of node.body) {
      if (containsSignalUpdate(s, context)) return true;
    }
    return false;
  }

  // Generic shallow walk similar to containsSignalRead
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }

    const value = node[key as keyof typeof node];

    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (
          item &&
          typeof item === 'object' &&
          containsSignalUpdate(item as TSESTree.Node, context)
        ) {
          return true;
        }
      }
    } else if (typeof value === 'object' && containsSignalUpdate(value as TSESTree.Node, context)) {
      return true;
    }
  }

  return false;
}

function isSafeAutofixRange(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
  start: number,
  end: number
): boolean {
  if (end <= start) {
    return true;
  }

  const text = context.sourceCode.text.slice(start, end);
  // Strip block comments
  // eslint-disable-next-line optimize-regex/optimize-regex
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip line comments
  const noComments = noBlock.replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '\n');
  // Remove whitespace and semicolons
  const stripped = noComments.replace(/[\s;]+/g, '');
  return stripped.length === 0;
}

type MessageIds =
  | 'useBatch'
  | 'suggestUseBatch'
  | 'addBatchImport'
  | 'wrapWithBatch'
  | 'useBatchSuggestion'
  | 'removeUnnecessaryBatch'
  | 'nonUpdateSignalInBatch'
  | 'updatesSeparatedByCode';

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

    case 'updatesSeparatedByCode': {
      return options.severity.updatesSeparatedByCode ?? 'warn';
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
        allUpdates.push(...processBlock(stmt.body, context, perfKey, scopeDepth + 1, inBatch));
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

    if (isSignalUpdate(stmt.expression, context)) {
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

  if (updatesInScope.length >= minUpdates && !isInsideBatchCall(firstNode, context)) {
    // If there is any non-update code between first and last updates in this scope, warn separately
    const firstUpdateNode = updatesInScope[0]?.node;

    const lastUpdateNode = updatesInScope[updatesInScope.length - 1]?.node;

    const unsafeSeparation =
      !!firstUpdateNode &&
      !!lastUpdateNode &&
      !isSafeAutofixRange(context, firstUpdateNode.range[1], lastUpdateNode.range[0]);

    if (unsafeSeparation) {
      if (getSeverity('updatesSeparatedByCode', context.options[0]) !== 'off') {
        context.report({
          node: firstNode,
          messageId: 'updatesSeparatedByCode',
          data: { count: updatesInScope.length },
        });
      }
    } else if (getSeverity(messageId, context.options[0]) !== 'off') {
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
              const firstUpdate = updatesInScope[0]?.node;

              const lastUpdate = updatesInScope[updatesInScope.length - 1]?.node;

              if (!firstUpdate || !lastUpdate) {
                return null;
              }

              // Guard: ensure no non-update code exists between updates
              if (!isSafeAutofixRange(context, firstUpdate.range[1], lastUpdate.range[0])) {
                return null;
              }

              const b = context.sourceCode.ast.body[0];

              if (!b) {
                return null;
              }

              if (!hasBatchImport) {
                // Try to merge into an existing import from '@preact/signals-react'
                const existingSignalsImport = context.sourceCode.ast.body.find(
                  (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration =>
                    n.type === AST_NODE_TYPES.ImportDeclaration &&
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    n.source.type === AST_NODE_TYPES.Literal &&
                    n.source.value === '@preact/signals-react'
                );

                if (
                  existingSignalsImport &&
                  Array.isArray(existingSignalsImport.specifiers) &&
                  existingSignalsImport.specifiers.some(
                    (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return s.type === AST_NODE_TYPES.ImportSpecifier;
                    }
                  )
                ) {
                  // If 'batch' already present, nothing to do
                  if (
                    existingSignalsImport.specifiers.some((s: TSESTree.ImportClause): boolean => {
                      return (
                        s.type === AST_NODE_TYPES.ImportSpecifier &&
                        s.imported.type === AST_NODE_TYPES.Identifier &&
                        s.imported.name === 'batch'
                      );
                    })
                  ) {
                    // no-op
                  } else {
                    // Append ", batch" after the last ImportSpecifier
                    const lastSpec = [...existingSignalsImport.specifiers]
                      .reverse()
                      .find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                        return s.type === AST_NODE_TYPES.ImportSpecifier;
                      });

                    if (lastSpec) {
                      yield fixer.insertTextAfter(lastSpec, ', batch');
                    } else {
                      // Fallback: insert a new import line
                      yield fixer.insertTextBefore(
                        b,
                        "import { batch } from '@preact/signals-react';\n\n"
                      );
                    }
                  }
                } else {
                  // No existing signals-react import with named specifiers: insert a new one
                  yield fixer.insertTextBefore(
                    b,
                    "import { batch } from '@preact/signals-react';\n\n"
                  );
                }
              }

              yield fixer.replaceTextRange(
                [firstUpdate.range[0], lastUpdate.range[1]],
                `batch(() => {\n  ${updatesInScope
                  .map(({ node }: SignalUpdate): string => {
                    return context.sourceCode.getText(node);
                  })
                  .join('; ')}\n});`
              );

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
                // Merge with existing '@preact/signals-react' import if possible
                const existingSignalsImport = context.sourceCode.ast.body.find(
                  (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                    return (
                      n.type === AST_NODE_TYPES.ImportDeclaration &&
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      n.source.type === AST_NODE_TYPES.Literal &&
                      n.source.value === '@preact/signals-react'
                    );
                  }
                );

                if (
                  existingSignalsImport &&
                  Array.isArray(existingSignalsImport.specifiers) &&
                  existingSignalsImport.specifiers.some(
                    (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return s.type === AST_NODE_TYPES.ImportSpecifier;
                    }
                  )
                ) {
                  const already = existingSignalsImport.specifiers.some(
                    (s: TSESTree.ImportClause): boolean => {
                      return (
                        s.type === AST_NODE_TYPES.ImportSpecifier &&
                        s.imported.type === AST_NODE_TYPES.Identifier &&
                        s.imported.name === 'batch'
                      );
                    }
                  );

                  if (!already) {
                    const lastSpec = [...existingSignalsImport.specifiers]
                      .reverse()
                      .find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                        return s.type === AST_NODE_TYPES.ImportSpecifier;
                      });
                    if (lastSpec) {
                      yield fixer.insertTextAfter(lastSpec, ', batch');
                    }
                  }
                } else {
                  const firstImport = context.sourceCode.ast.body.find(
                    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration =>
                      n.type === AST_NODE_TYPES.ImportDeclaration
                  );

                  const b = context.sourceCode.ast.body[0];

                  if (!b) {
                    return null;
                  }

                  const batchImport = "import { batch } from '@preact/signals-react';\n";

                  if (typeof firstImport === 'undefined') {
                    yield fixer.insertTextBefore(b, batchImport);
                  } else {
                    yield fixer.insertTextBefore(firstImport, batchImport);
                  }
                }
              }

              const lastNode = allUpdates[allUpdates.length - 1]?.node;

              if (!lastNode) {
                return null;
              }

              // Guard: ensure no non-update code exists between updates
              if (!isSafeAutofixRange(context, firstNode.range[1], lastNode.range[0])) {
                return null;
              }

              yield fixer.replaceTextRange(
                [firstNode.range[0], lastNode.range[1]],
                `batch(() => { ${allUpdates
                  .map(({ node }: SignalUpdate): string => {
                    return `\n${context.sourceCode.getText(node)}\n`;
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

              // Merge with existing '@preact/signals-react' import if possible
              const existingSignalsImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return (
                    n.type === AST_NODE_TYPES.ImportDeclaration &&
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    n.source.type === AST_NODE_TYPES.Literal &&
                    n.source.value === '@preact/signals-react'
                  );
                }
              );

              if (
                existingSignalsImport &&
                Array.isArray(existingSignalsImport.specifiers) &&
                existingSignalsImport.specifiers.some((s: TSESTree.ImportClause): boolean => {
                  return s.type === AST_NODE_TYPES.ImportSpecifier;
                })
              ) {
                const already = existingSignalsImport.specifiers.some(
                  (s: TSESTree.ImportClause): boolean => {
                    return (
                      s.type === AST_NODE_TYPES.ImportSpecifier &&
                      s.imported.type === AST_NODE_TYPES.Identifier &&
                      s.imported.name === 'batch'
                    );
                  }
                );

                if (!already) {
                  const lastSpec = [...existingSignalsImport.specifiers]
                    .reverse()
                    .find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return s.type === AST_NODE_TYPES.ImportSpecifier;
                    });

                  if (lastSpec) {
                    yield fixer.insertTextAfter(lastSpec, ', batch');
                  }
                }
              } else {
                const firstImport = context.sourceCode.ast.body.find(
                  (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                    return n.type === AST_NODE_TYPES.ImportDeclaration;
                  }
                );

                const b = context.sourceCode.ast.body[0];

                if (!b) {
                  return;
                }

                const batchImport = "import { batch } from '@preact/signals-react';\n";

                if (typeof firstImport === 'undefined') {
                  yield fixer.insertTextBefore(b, batchImport);
                } else {
                  yield fixer.insertTextBefore(firstImport, batchImport);
                }
              }
            },
          },
        ],
      });
    }
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
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
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
      isSignalReference(node.left.object, context)
    ) {
      return true;
    }

    if (
      node.operator !== '=' &&
      node.left.type === AST_NODE_TYPES.MemberExpression &&
      node.left.property.type === AST_NODE_TYPES.Identifier &&
      node.left.property.name === 'value' &&
      isSignalReference(node.left.object, context)
    ) {
      return true;
    }
  }

  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    ['set', 'update'].includes(node.callee.property.name) &&
    isSignalReference(node.callee.object, context)
  ) {
    return true;
  }

  if (
    node.type === AST_NODE_TYPES.UpdateExpression &&
    node.argument.type === AST_NODE_TYPES.MemberExpression &&
    node.argument.property.type === AST_NODE_TYPES.Identifier &&
    node.argument.property.name === 'value' &&
    isSignalReference(node.argument.object, context)
  ) {
    return true;
  }

  return false;
}

type SignalOriginKind = 'useSignal' | 'computed';
type SignalOrigin = { kind: SignalOriginKind; sourceModule: string };

type Cache = {
  symbolOrigin: WeakMap<ts.Symbol, SignalOrigin | null>;
};

const cacheByProgram = new WeakMap<ts.Program, Cache>();

function getCache(program: ts.Program): Cache {
  let c = cacheByProgram.get(program);

  if (!c) {
    c = { symbolOrigin: new WeakMap() };
    cacheByProgram.set(program, c);
  }
  return c;
}

function getProgram(
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): ts.Program | null {
  const services = context.sourceCode.parserServices;

  if (
    typeof services === 'undefined' ||
    typeof services.program === 'undefined' ||
    services.program === null ||
    typeof services.esTreeNodeToTSNodeMap === 'undefined'
  ) {
    return null;
  }

  return services.program;
}

function resolveTsNode(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): ts.Node | null {
  const services = context.sourceCode.parserServices;

  if (typeof services === 'undefined' || typeof services.esTreeNodeToTSNodeMap === 'undefined') {
    return null;
  }

  try {
    return services.esTreeNodeToTSNodeMap.get(node);
  } catch {
    return null;
  }
}

function resolveSymbolAt(
  id: TSESTree.Identifier,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): ts.Symbol | null {
  const program = getProgram(context);
  const tsNode = resolveTsNode(id, context);
  if (!program || !tsNode) return null;
  const checker = program.getTypeChecker();
  try {
    const symbol = checker.getSymbolAtLocation(tsNode);
    return symbol ?? null;
  } catch {
    return null;
  }
}

function isFromSignalsReact(decls: ReadonlyArray<ts.Declaration> | undefined): boolean {
  if (!decls) {
    return false;
  }

  for (const d of decls) {
    const sf = d.getSourceFile();

    const fileName = sf.fileName;

    if (fileName.includes('@preact/signals-react')) {
      return true;
    }
  }

  return false;
}

function isSignalType(symbol: ts.Symbol, checker: ts.TypeChecker): boolean {
  const decl = symbol.valueDeclaration ?? symbol.getDeclarations()?.[0];

  if (typeof decl === 'undefined') {
    return false;
  }

  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);

  // Some types (e.g., unions/intersections/anonymous types) may not have a symbol.
  // Guard all symbol dereferences to avoid runtime crashes.
  if (
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
    type.symbol &&
    ['Signal', 'ReadableSignal', 'WritableSignal'].includes(String(type.symbol.escapedName)) &&
    typeof type.symbol.getDeclarations === 'function' &&
    isFromSignalsReact(type.symbol.getDeclarations())
  ) {
    return true;
  }

  // Structural fallback: has a readonly `.value` and methods `set`/`update` on the instance type
  const valueProp = type.getProperty('value');

  if (typeof valueProp === 'undefined') {
    return false;
  }

  const vpDecl = valueProp.valueDeclaration ?? valueProp.declarations?.[0];

  if (vpDecl && isFromSignalsReact(valueProp.getDeclarations())) {
    return true;
  }

  return false;
}

function getImportedNameAndModuleFromCall(
  call: ts.CallExpression,
  checker: ts.TypeChecker
): { name: string; module: string } | null {
  const expr = call.expression;
  // handle direct identifier: useSignal()/computed()
  if (ts.isIdentifier(expr)) {
    const sym = checker.getSymbolAtLocation(expr);

    if (typeof sym === 'undefined') {
      return null;
    }

    const aliased = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

    const decl = aliased.declarations?.[0];

    const name = aliased.getName();

    const module = decl?.getSourceFile().fileName ?? '';

    return { name, module };
  }

  if (ts.isPropertyAccessExpression(expr)) {
    const leftSym = checker.getSymbolAtLocation(expr.expression);

    return {
      name: expr.name.getText(),
      module:
        (typeof leftSym !== 'undefined' && leftSym.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(leftSym)
          : leftSym
        )?.declarations?.[0]?.getSourceFile().fileName ?? '',
    };
  }

  return null;
}

function traceSignalOrigin(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
  program: ts.Program
): SignalOrigin | null {
  const cache = getCache(program);

  const cached = cache.symbolOrigin.get(symbol);

  if (cached !== undefined) {
    return cached;
  }

  // Direct declarations
  const decls = symbol.getDeclarations() ?? [];

  for (const d of decls) {
    if (ts.isVariableDeclaration(d)) {
      const init = d.initializer;

      if (typeof init !== 'undefined' && ts.isCallExpression(init)) {
        const info = getImportedNameAndModuleFromCall(init, checker);

        if (info !== null && info.module.includes('@preact/signals-react') === true) {
          if (info.name === 'useSignal') {
            const res: SignalOrigin = {
              kind: 'useSignal',
              sourceModule: info.module,
            };

            cache.symbolOrigin.set(symbol, res);

            return res;
          }

          if (info.name === 'computed') {
            const res: SignalOrigin = {
              kind: 'computed',
              sourceModule: info.module,
            };

            cache.symbolOrigin.set(symbol, res);

            return res;
          }
        }
      }
      // Aliasing: const a = b; follow b
      if (init && ts.isIdentifier(init)) {
        const s = checker.getSymbolAtLocation(init);

        if (typeof s !== 'undefined') {
          const aliased = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;

          const traced = traceSignalOrigin(aliased, checker, program);

          if (traced !== null) {
            cache.symbolOrigin.set(symbol, traced);

            return traced;
          }
        }
      }
    }

    if (symbol.flags & ts.SymbolFlags.Alias) {
      const aliased = checker.getAliasedSymbol(symbol);

      const traced = traceSignalOrigin(aliased, checker, program);

      if (traced !== null) {
        cache.symbolOrigin.set(symbol, traced);

        return traced;
      }
    }
  }

  cache.symbolOrigin.set(symbol, null);

  return null;
}

function isSignalIdentifier(
  id: TSESTree.Identifier,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  const program = getProgram(context);

  if (!program || !resolveTsNode(id, context)) {
    return false;
  }

  const checker = program.getTypeChecker();

  const symbol = resolveSymbolAt(id, context);

  if (symbol === null) {
    return false;
  }

  if (isSignalType(symbol, checker)) {
    return true;
  }

  const origin = traceSignalOrigin(symbol, checker, program);
  return origin !== null;
}

function isSignalReference(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return isSignalIdentifier(node, context);
  }

  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'value'
  ) {
    return isSignalReference(node.object, context);
  }

  return false;
}

function containsSignalRead(
  node: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
  // Direct identifier like `countSignal`
  if (node.type === AST_NODE_TYPES.Identifier) {
    return isSignalReference(node, context);
  }

  // Member expression like `countSignal.value` or deeper
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    if (isSignalReference(node.object, context)) {
      return true;
    }

    return (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      (node.object && containsSignalRead(node.object, context)) ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      (node.property &&
        node.property.type !== AST_NODE_TYPES.PrivateIdentifier &&
        containsSignalRead(node.property, context))
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          if (item && typeof item.type === 'string') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (containsSignalRead(item, context)) {
              return true;
            }
          }
        }
      } else if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        value !== null &&
        'type' in value &&
        containsSignalRead(value, context)
      ) {
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
      updatesSeparatedByCode:
        'Multiple signal updates detected but separated by other code; cannot safely batch automatically.',
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
              updatesSeparatedByCode: {
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
        updatesSeparatedByCode: 'warn',
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
            location: context.sourceCode.getLocFromIndex(node.range[0]),
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

              if (Array.isArray(node.arguments[0].body.body)) {
                const bodyStatements = node.arguments[0].body.body;

                // Report non-update signal reads inside batch body only if there are no updates anywhere in the body
                if (!containsSignalUpdate(node.arguments[0].body, context)) {
                  for (const stmt of bodyStatements) {
                    if (
                      stmt.type === AST_NODE_TYPES.ExpressionStatement &&
                      !isSignalUpdate(stmt.expression, context) &&
                      containsSignalRead(stmt.expression, context) &&
                      getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
                    ) {
                      context.report({
                        node: stmt.expression,
                        messageId: 'nonUpdateSignalInBatch',
                      });
                    }
                  }
                }

                // Count signal updates within the batch body
                const updateStmts: Array<TSESTree.ExpressionStatement> = bodyStatements
                  .filter((s: TSESTree.Statement): s is TSESTree.ExpressionStatement => {
                    return s.type === AST_NODE_TYPES.ExpressionStatement;
                  })
                  .filter((s: TSESTree.ExpressionStatement): boolean => {
                    return isSignalUpdate(s.expression, context);
                  });

                if (
                  updateStmts.length === 1 &&
                  getSeverity('removeUnnecessaryBatch', context.options[0]) !== 'off'
                ) {
                  if (
                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                    node.parent &&
                    node.parent.type === AST_NODE_TYPES.ExpressionStatement
                  ) {
                    if (bodyStatements.length === 1) {
                      // Safe case: single update statement inside batch -> replace whole statement
                      context.report({
                        node,
                        messageId: 'removeUnnecessaryBatch',
                        fix(fixer) {
                          return fixer.replaceText(
                            node.parent,
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
                          return fixer.replaceText(node.parent, innerText);
                        },
                      });
                    }
                  } else {
                    // Fallback: report without fix if parent is unexpected
                    context.report({
                      node,
                      messageId: 'removeUnnecessaryBatch',
                    });
                  }
                }
              }
            } else if (node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression) {
              // Concise arrow body case: body is an expression
              if (
                node.arguments[0].body.type !== AST_NODE_TYPES.BlockStatement &&
                !isSignalUpdate(node.arguments[0].body, context) &&
                containsSignalRead(node.arguments[0].body, context) &&
                getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
              ) {
                context.report({
                  node: node.arguments[0].body,
                  messageId: 'nonUpdateSignalInBatch',
                });
              }
            } else if (
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              node.arguments[0].type === AST_NODE_TYPES.FunctionExpression
            ) {
              recordMetric(perfKey, 'skipFunctionBatchBody', {
                location: context.sourceCode.getLocFromIndex(node.arguments[0].body.range[0]),
              });

              const bodyStatements = node.arguments[0].body.body;

              // Report non-update signal reads inside batch body only if there are no updates anywhere in the body
              if (Array.isArray(bodyStatements)) {
                if (!containsSignalUpdate(node.arguments[0].body, context)) {
                  for (const stmt of bodyStatements) {
                    if (
                      stmt.type === AST_NODE_TYPES.ExpressionStatement &&
                      !isSignalUpdate(stmt.expression, context) &&
                      containsSignalRead(stmt.expression, context) &&
                      getSeverity('nonUpdateSignalInBatch', context.options[0]) !== 'off'
                    ) {
                      context.report({
                        node: stmt.expression,
                        messageId: 'nonUpdateSignalInBatch',
                      });
                    }
                  }
                }

                // Count signal updates within the batch body
                const updateStmts: Array<TSESTree.ExpressionStatement> = bodyStatements
                  .filter(
                    (s): s is TSESTree.ExpressionStatement =>
                      s.type === AST_NODE_TYPES.ExpressionStatement
                  )
                  .filter((s: TSESTree.ExpressionStatement): boolean => {
                    return isSignalUpdate(s.expression, context);
                  });

                if (
                  updateStmts.length === 1 &&
                  getSeverity('removeUnnecessaryBatch', context.options[0]) !== 'off'
                ) {
                  const onlyUpdateStmt = updateStmts[0];

                  if (
                    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                    node.parent &&
                    node.parent.type === AST_NODE_TYPES.ExpressionStatement
                  ) {
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
                    context.report({
                      node,
                      messageId: 'removeUnnecessaryBatch',
                    });
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
            isSignalUpdate(node, context) &&
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
            isSignalUpdate(node, context) &&
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
            isSignalUpdate(node, context) &&
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
