/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  AST_NODE_TYPES,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  endPhase,
  recordMetric,
  startPhase,
  startTracking,
  trackOperation,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

const ruleName = 'forbid-signal-update-in-computed';

// Track identifiers/namespaces for imports from @preact/signals-react
type ImportsState = {
  computedIds: Set<string>;
  batchIds: Set<string>;
  namespaces: Set<string>;
};

function createImportsState(): ImportsState {
  return { computedIds: new Set(), batchIds: new Set(), namespaces: new Set() };
}

function isIdentifier(node: TSESTree.Node | null | undefined, nameSet: Set<string>): boolean {
  return !!(node && node.type === AST_NODE_TYPES.Identifier && nameSet.has(node.name));
}

function isMemberOfNamespace(
  node: TSESTree.Node | null | undefined,
  nsSet: Set<string>,
  prop: string
): boolean {
  if (!node || node.type !== AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  if (node.computed) {
    return false;
  }

  if (
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    nsSet.has(node.object.name) &&
    node.property.name === prop
  ) {
    return true;
  }

  return false;
}

function isComputedCall(node: TSESTree.CallExpression, imp: ImportsState): boolean {
  return (
    isIdentifier(node.callee, imp.computedIds) ||
    isMemberOfNamespace(node.callee, imp.namespaces, 'computed')
  );
}

function isBatchCall(node: TSESTree.CallExpression, imp: ImportsState): boolean {
  return (
    isIdentifier(node.callee, imp.batchIds) ||
    isMemberOfNamespace(node.callee, imp.namespaces, 'batch')
  );
}

type MessageIds = 'noSignalWriteInComputed' | 'noBatchedWritesInComputed';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  /** Naming suffix heuristic, e.g. "Signal". Currently not required for detection but kept for consistency */
  suffix?: string;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'noSignalWriteInComputed': {
      return options.severity.noSignalWriteInComputed ?? 'error';
    }

    case 'noBatchedWritesInComputed': {
      return options.severity.noBatchedWritesInComputed ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

export const forbidSignalUpdateInComputedRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid updating signals inside computed(...) callbacks. Computed must be pure and read-only.',
      url: getRuleDocUrl(ruleName),
    },
    hasSuggestions: false,
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
                  Object.entries(PerformanceOperations).map(([k]) => [
                    k,
                    { type: 'number', minimum: 1 },
                  ])
                ),
              },
            },
            additionalProperties: false,
          },
          severity: {
            type: 'object',
            properties: {
              noSignalWriteInComputed: { type: 'string', enum: ['error', 'warn', 'off'] },
              noBatchedWritesInComputed: { type: 'string', enum: ['error', 'warn', 'off'] },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noSignalWriteInComputed:
        "Do not update signal '{{name}}' inside computed(). Computed functions must be pure and read-only.",
      noBatchedWritesInComputed:
        'Do not batch updates inside computed(). Computed functions must be pure and read-only.',
    },
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): TSESLint.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');
    const perf = createPerformanceTracker(perfKey, option?.performance);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    if (option?.performance?.enableMetrics === true && option.performance.logMetrics === true) {
      console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
      console.info(`${ruleName}: Rule configuration:`, option);
    }

    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option?.performance?.enableMetrics,
        logMetrics: option?.performance?.logMetrics,
      },
    });

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

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

    startPhase(perfKey, 'ruleExecution');

    const imports = createImportsState();

    const computedBodies = new WeakSet<TSESTree.Node>();

    function isInsideComputed(node: TSESTree.Node): boolean {
      const ancestors = context.sourceCode.getAncestors(node);

      for (const a of ancestors) {
        if (computedBodies.has(a)) {
          return true;
        }
      }

      return false;
    }

    function reportWrite(node: TSESTree.Node, name: string): void {
      if (getSeverity('noSignalWriteInComputed', option) === 'off') {
        return;
      }

      context.report({ node, messageId: 'noSignalWriteInComputed', data: { name } });
    }

    function reportBatch(node: TSESTree.Node): void {
      if (getSeverity('noBatchedWritesInComputed', option) === 'off') {
        return;
      }

      context.report({ node, messageId: 'noBatchedWritesInComputed' });
    }

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations.nodeProcessing);
      },

      [AST_NODE_TYPES.ImportDeclaration](node: TSESTree.ImportDeclaration): void {
        // Only consider @preact/signals-react
        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          node.source.type !== AST_NODE_TYPES.Literal ||
          node.source.value !== '@preact/signals-react'
        ) {
          return;
        }
        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            const imported =
              spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : '';

            if (imported === 'computed') {
              imports.computedIds.add(spec.local.name);
            }

            if (imported === 'batch') {
              imports.batchIds.add(spec.local.name);
            }
          } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            imports.namespaces.add(spec.local.name);
          }
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        // Track computed bodies
        if (isComputedCall(node, imports) && node.arguments.length >= 1) {
          const arg = node.arguments[0];

          if (
            arg &&
            (arg.type === AST_NODE_TYPES.ArrowFunctionExpression ||
              arg.type === AST_NODE_TYPES.FunctionExpression)
          ) {
            computedBodies.add(arg);
          }
        }

        // Report batch usage inside computed
        if (isInsideComputed(node) && isBatchCall(node, imports)) {
          reportBatch(node);
        }

        // Method-based updates: X.set(...), X.update(...)
        if (!isInsideComputed(node)) {
          return;
        }

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          !node.callee.computed &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'set' || node.callee.property.name === 'update')
        ) {
          const objText = context.sourceCode.getText(node.callee.object);
          reportWrite(node, objText);
        }
      },

      [AST_NODE_TYPES.AssignmentExpression](node: TSESTree.AssignmentExpression): void {
        if (!isInsideComputed(node)) {
          return;
        }

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          !node.left.computed &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'value'
        ) {
          reportWrite(node, context.sourceCode.getText(node.left.object));
        }
      },

      [AST_NODE_TYPES.UpdateExpression](node: TSESTree.UpdateExpression): void {
        if (!isInsideComputed(node)) {
          return;
        }

        if (
          node.argument.type === AST_NODE_TYPES.MemberExpression &&
          !node.argument.computed &&
          node.argument.property.type === AST_NODE_TYPES.Identifier &&
          node.argument.property.name === 'value'
        ) {
          const name = context.sourceCode.getText(node.argument.object);
          reportWrite(node, name);
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
