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
  extraCreatorModules?: Array<string>; // additional modules exporting signal/computed creators
  extraCreatorNames?: Array<string>; // additional local creator function identifiers (e.g., ['signal', 'computed', 'sig'])
  extraCreatorNamespaces?: Array<string>; // additional namespaces that contain creator methods (e.g., ['Signals'])
  suggestOnly?: boolean; // when true, do not apply autofix automatically; offer suggestions instead
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

function hasAncestorOfType(node: TSESTree.Node, type: TSESTree.Node['type']): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === type) {
      return true;
    }

    if (
      current.type === AST_NODE_TYPES.JSXElement ||
      current.type === AST_NODE_TYPES.JSXFragment ||
      current.type === AST_NODE_TYPES.Program
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

// Returns true when `node` (typically a MemberExpression like `x.value`) is inside
// a CallExpression's argument list while within JSX. In that context we allow `.value`.
function isInJSXCallArgument(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      const callee = current.callee;

      // If node is within callee, it's not an argument
      if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        callee !== null &&
        typeof callee !== 'undefined' &&
        node.range[0] >= callee.range[0] &&
        node.range[1] <= callee.range[1]
      ) {
        return false;
      }

      if (
        current.arguments.some((arg) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
          if (!arg) {
            return false;
          }

          return node.range[0] >= arg.range[0] && node.range[1] <= arg.range[1];
        })
      ) {
        return true;
      }
    }

    if (current.type === AST_NODE_TYPES.JSXElement || current.type === AST_NODE_TYPES.JSXFragment) {
      break;
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
    hasSuggestions: true,
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
          extraCreatorModules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          extraCreatorNames: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          extraCreatorNamespaces: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          suggestOnly: { type: 'boolean', default: false },
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
    const creatorModules = new Set<string>([
      '@preact/signals-react',
      ...(Array.isArray(option?.extraCreatorModules) ? option.extraCreatorModules : []),
    ]);
    const signalVariables = new Set<string>();

    // Seed from explicit options if provided
    if (Array.isArray(option?.extraCreatorNames)) {
      for (const n of option.extraCreatorNames) {
        // Add to both sets so either name is treated as a creator of a signal or computed
        signalCreatorLocals.add(n);
        computedCreatorLocals.add(n);
      }
    }

    if (Array.isArray(option?.extraCreatorNamespaces)) {
      for (const ns of option.extraCreatorNamespaces) {
        creatorNamespaces.add(ns);
      }
    }

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

        // Be conservative with optional chaining and bail
        // - Direct optional on this member
        // - Any ChainExpression ancestor (e.g., signal?.peek?.())
        if (node.optional) {
          return;
        }

        if (hasAncestorOfType(node, AST_NODE_TYPES.ChainExpression)) {
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

        // Avoid fixing when part of complex expressions directly around the member
        if (
          (
            [
              AST_NODE_TYPES.MemberExpression,
              AST_NODE_TYPES.BinaryExpression,
              AST_NODE_TYPES.UnaryExpression,
              AST_NODE_TYPES.LogicalExpression,
            ] as const
          ).some((type): boolean => {
            return typeof node.parent !== 'undefined' && node.parent.type === type;
          })
        ) {
          return;
        }

        // Do not fix if this member (or its chained parent member) is on the LHS of assignment
        // or used as the argument of an update expression
        {
          let topMember: TSESTree.MemberExpression = node;

          let p = topMember.parent;

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          while (p && p.type === AST_NODE_TYPES.MemberExpression && p.object === topMember) {
            topMember = p;
            p = topMember.parent;
          }

          if (
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            p &&
            ((p.type === AST_NODE_TYPES.AssignmentExpression && p.left === topMember) ||
              (p.type === AST_NODE_TYPES.UpdateExpression && p.argument === topMember))
          ) {
            return;
          }
        }

        if (isInJSXAttribute(node) || isInFunctionProp(node) || isInJSONStringify(node)) {
          return;
        }

        // Allow `.value` when used as an argument to a function call inside JSX
        if (isInJSXCallArgument(node)) {
          return;
        }

        if (getSeverity('preferDirectSignalUsage', option) === 'off') {
          return;
        }

        function applyReplacement(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
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
        }

        if (option?.suggestOnly === true) {
          context.report({
            node,
            messageId: 'preferDirectSignalUsage',
            suggest: [
              {
                messageId: 'preferDirectSignalUsage',
                fix: applyReplacement,
              },
            ],
          });
        } else {
          context.report({
            node,
            messageId: 'preferDirectSignalUsage',
            fix: applyReplacement,
          });
        }
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
          if (typeof stmt.source.value === 'string' && creatorModules.has(stmt.source.value)) {
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
