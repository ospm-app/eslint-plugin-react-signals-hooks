/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { isInJSXContext, isInJSXAttribute } from './utils/jsx.js';
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
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'useValueInNonJSX';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'useValueInNonJSX': {
      return options.severity.useValueInNonJSX ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function isBindingOrWritePosition(node: TSESTree.Identifier): boolean {
  const p = node.parent;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
  if (!p) {
    return false;
  }

  // Direct writes like: fooSignal = ..., ++fooSignal, --fooSignal
  if (
    (p.type === AST_NODE_TYPES.AssignmentExpression && p.left === node) ||
    (p.type === AST_NODE_TYPES.UpdateExpression && p.argument === node)
  ) {
    return true;
  }

  // Function parameters: function f(fooSignal) {}
  if (
    (p.type === AST_NODE_TYPES.FunctionDeclaration ||
      p.type === AST_NODE_TYPES.FunctionExpression ||
      p.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
    p.params.includes(node)
  ) {
    return true;
  }

  // Catch clause parameter
  if (p.type === AST_NODE_TYPES.CatchClause && p.param === node) {
    return true;
  }

  // Destructuring/binding patterns: const { fooSignal } = obj; const [fooSignal] = arr;
  // Identifier as value of Property within ObjectPattern
  if (
    p.type === AST_NODE_TYPES.Property &&
    p.value === node &&
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
    p.parent &&
    p.parent.type === AST_NODE_TYPES.ObjectPattern
  ) {
    return true;
  }

  // Array pattern element
  if (p.type === AST_NODE_TYPES.ArrayPattern) {
    return true;
  }

  // Rest element within patterns
  if (p.type === AST_NODE_TYPES.RestElement) {
    return true;
  }

  // AssignmentPattern on the left side (default param or destructuring default)
  if (p.type === AST_NODE_TYPES.AssignmentPattern && p.left === node) {
    return true;
  }

  // VariableDeclarator with simple id
  if (p.type === AST_NODE_TYPES.VariableDeclarator && p.id === node) {
    return true;
  }

  // Declaration identifiers (names) are bindings too
  // e.g. function Foo() {}, const Foo = () => {}, class Bar {}
  if (
    (p.type === AST_NODE_TYPES.FunctionDeclaration && p.id === node) ||
    (p.type === AST_NODE_TYPES.FunctionExpression && p.id === node) ||
    (p.type === AST_NODE_TYPES.ClassDeclaration && p.id === node)
  ) {
    return true;
  }

  return false;
}

const ruleName = 'prefer-signal-reads';

export const preferSignalReadsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: false,
    docs: {
      description:
        'Enforces using `.value` when reading signal values in non-JSX contexts. In JSX, signals are automatically unwrapped, but in regular JavaScript/TypeScript code, you must explicitly access the `.value` property to read the current value of a signal. This rule helps catch cases where you might have forgotten to use `.value` when needed.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      useValueInNonJSX: 'Use .value to read the current value of the signal in non-JSX context',
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
          suffix: { type: 'string', minLength: 1 },
          severity: {
            type: 'object',
            properties: {
              useValueInNonJSX: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
    } satisfies Option,
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
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

    const suffix =
      typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal';
    const suffixRegex = buildSuffixRegex(suffix);

    startPhase(perfKey, 'ruleExecution');
    // Track local names and namespaces for signal/computed creators
    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();

    // Track variables initialized from signal/computed creators
    const signalVariables = new Set<string>();

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        const dynamicOp =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, dynamicOp);
      },

      [AST_NODE_TYPES.Identifier](node: TSESTree.Node): void {
        if (node.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        const isSignalIdent =
          hasSignalSuffix(node.name, suffixRegex) || signalVariables.has(node.name);
        if (!isSignalIdent) {
          return;
        }

        // Skip inside JSX elements/attributes
        if (isInJSXContext(node) || isInJSXAttribute(node)) {
          return;
        }

        if (
          node.parent.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.object === node &&
          'property' in node.parent &&
          node.parent.property.type === AST_NODE_TYPES.Identifier &&
          (node.parent.property.name === 'value' || node.parent.property.name === 'peek')
        ) {
          return;
        }

        // Skip if identifier is being written to or bound (not a read context)
        if (isBindingOrWritePosition(node)) {
          return;
        }

        const p = node.parent;

        if (
          (p.type === AST_NODE_TYPES.CallExpression && p.callee === node) ||
          (p.type === AST_NODE_TYPES.NewExpression && p.callee === node) ||
          (p.type === AST_NODE_TYPES.Property && p.key === node) ||
          (p.type === AST_NODE_TYPES.MemberExpression && p.property === node && !p.computed) ||
          p.type === AST_NODE_TYPES.ImportSpecifier ||
          p.type === AST_NODE_TYPES.ExportSpecifier ||
          p.type === AST_NODE_TYPES.LabeledStatement ||
          p.type === AST_NODE_TYPES.TSTypeReference ||
          p.type === AST_NODE_TYPES.TSQualifiedName ||
          p.type === AST_NODE_TYPES.TSTypeQuery ||
          p.type === AST_NODE_TYPES.TSTypeOperator
        ) {
          return;
        }

        if (getSeverity('useValueInNonJSX', option) === 'off') {
          return;
        }

        context.report({
          node,
          messageId: 'useValueInNonJSX',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.insertTextAfter(node, '.value');
          },
        });
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        if (!node.init || node.init.type !== AST_NODE_TYPES.CallExpression) {
          return;
        }

        const callee = node.init.callee;
        let isCreator = false;
        if (callee.type === AST_NODE_TYPES.Identifier) {
          if (signalCreatorLocals.has(callee.name) || computedCreatorLocals.has(callee.name)) {
            isCreator = true;
          }
        } else if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          creatorNamespaces.has(callee.object.name) &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'signal' || callee.property.name === 'computed')
        ) {
          isCreator = true;
        }

        if (isCreator) {
          signalVariables.add(node.id.name);
        }
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) {
            continue;
          }
          if (
            typeof stmt.source.value === 'string' &&
            stmt.source.value === '@preact/signals-react'
          ) {
            for (const spec of stmt.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
                if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'signal'
                ) {
                  signalCreatorLocals.add(spec.local.name);
                } else if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'computed'
                ) {
                  computedCreatorLocals.add(spec.local.name);
                }
              } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                creatorNamespaces.add(spec.local.name);
              }
            }
          }
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
