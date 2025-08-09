/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { isInJSXAttribute } from './utils/jsx.js';
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

type MessageIds = 'preferDirectSignalUsage';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

function isInFunctionProp(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (
      current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      current.type === AST_NODE_TYPES.FunctionExpression
    ) {
      if (
        current.parent.type === AST_NODE_TYPES.JSXExpressionContainer &&
        current.parent.parent.type === AST_NODE_TYPES.JSXAttribute
      ) {
        return true;
      }

      if (
        current.parent.type === AST_NODE_TYPES.Property &&
        current.parent.parent.type === AST_NODE_TYPES.ObjectExpression &&
        current.parent.parent.parent.type === AST_NODE_TYPES.JSXExpressionContainer &&
        current.parent.parent.parent.parent.type === AST_NODE_TYPES.JSXAttribute
      ) {
        return true;
      }

      return false;
    }

    if (current.type === AST_NODE_TYPES.JSXElement || current.type === AST_NODE_TYPES.JSXFragment) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function isInJSONStringify(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (
      current.type === AST_NODE_TYPES.CallExpression &&
      current.callee.type === AST_NODE_TYPES.MemberExpression &&
      current.callee.object.type === AST_NODE_TYPES.Identifier &&
      current.callee.object.name === 'JSON' &&
      current.callee.property.type === AST_NODE_TYPES.Identifier &&
      current.callee.property.name === 'stringify'
    ) {
      return true;
    }

    if (current.type === AST_NODE_TYPES.JSXElement || current.type === AST_NODE_TYPES.JSXFragment) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

let jsxDepth = 0;

const ruleName = 'prefer-signal-in-jsx';

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  // eslint-disable-next-line security/detect-object-injection
  const severity = options.severity[messageId];

  return severity ?? 'error';
}

export const preferSignalInJsxRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Enforces direct signal usage in JSX by preferring the signal itself over explicit `.value` access. In JSX, signals are automatically unwrapped, so there's no need to access the `.value` property. This rule helps maintain cleaner JSX code by removing unnecessary property access.",
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    messages: {
      preferDirectSignalUsage: 'Use the signal directly in JSX instead of accessing .value',
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
                  Object.entries(PerformanceOperations).map(([key]) => [
                    key,
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
              preferDirectSignalUsage: { type: 'string', enum: ['error', 'warn', 'off'] },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
      severity: {
        preferDirectSignalUsage: 'error',
      },
    },
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

    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();
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

      [AST_NODE_TYPES.JSXElement](): void {
        jsxDepth++;
      },
      [`${AST_NODE_TYPES.JSXElement}:exit`](): void {
        jsxDepth--;
      },
      [`${AST_NODE_TYPES.JSXFragment}`](): void {
        jsxDepth++;
      },
      [`${AST_NODE_TYPES.JSXFragment}:exit`](): void {
        jsxDepth--;
      },

      [AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
        if (jsxDepth === 0) {
          return;
        }

        if (node.property.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        if (node.property.name !== 'value' && node.property.name !== 'peek') {
          return;
        }

        if (node.object.type !== AST_NODE_TYPES.Identifier) {
          if (node.object.type === AST_NODE_TYPES.MemberExpression) {
            return;
          }

          if (node.parent.type === AST_NODE_TYPES.CallExpression) {
            return;
          }

          return;
        }

        if (
          !hasSignalSuffix(node.object.name, suffixRegex) &&
          !signalVariables.has(node.object.name)
        ) {
          return;
        }

        if (
          (
            [
              AST_NODE_TYPES.MemberExpression,
              AST_NODE_TYPES.ChainExpression,
              AST_NODE_TYPES.BinaryExpression,
              AST_NODE_TYPES.UnaryExpression,
              AST_NODE_TYPES.LogicalExpression,
            ] as const
          ).some(
            (
              type:
                | AST_NODE_TYPES.BinaryExpression
                | AST_NODE_TYPES.ChainExpression
                | AST_NODE_TYPES.LogicalExpression
                | AST_NODE_TYPES.MemberExpression
                | AST_NODE_TYPES.UnaryExpression
            ): boolean => {
              return typeof node.parent !== 'undefined' && node.parent.type === type;
            }
          )
        ) {
          return;
        }

        if (isInJSXAttribute(node) || isInFunctionProp(node) || isInJSONStringify(node)) {
          return;
        }

        if (getSeverity('preferDirectSignalUsage', option) === 'off') {
          return;
        }

        context.report({
          node,
          messageId: 'preferDirectSignalUsage',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            if ('name' in node.object) {
              // For `.value`, replace the member expression with the identifier
              if ('name' in node.property && node.property.name === 'value') {
                return fixer.replaceText(node, node.object.name);
              }

              // For `.peek()`, replace the parent CallExpression if applicable
              if (
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                node.parent?.type === AST_NODE_TYPES.CallExpression &&
                node.parent.callee === node
              ) {
                return fixer.replaceText(node.parent, node.object.name);
              }
            }

            return null;
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
