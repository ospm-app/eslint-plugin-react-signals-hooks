/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition } from '@typescript-eslint/scope-manager';
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  stopTracking,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  if (messageId === 'performanceLimitExceeded') {
    return 'warn';
  }

  switch (messageId) {
    case 'avoidSignalAssignmentInEffect': {
      return options.severity.avoidSignalAssignmentInEffect ?? 'error';
    }
    case 'suggestUseSignalsEffect': {
      return options.severity.suggestUseSignalsEffect ?? 'error';
    }
    case 'suggestUseSignalsLayoutEffect': {
      return options.severity.suggestUseSignalsLayoutEffect ?? 'error';
    }
    case 'missingDependencies': {
      return options.severity.missingDependencies ?? 'error';
    }

    case 'unnecessaryDependencies': {
      return options.severity.unnecessaryDependencies ?? 'error';
    }

    case 'duplicateDependencies': {
      return options.severity.duplicateDependencies ?? 'error';
    }

    case 'avoidSignalAssignmentInLayoutEffect': {
      return options.severity.avoidSignalAssignmentInLayoutEffect ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

type Severity = {
  avoidSignalAssignmentInEffect?: 'error' | 'warn' | 'off';
  suggestUseSignalsEffect?: 'error' | 'warn' | 'off';
  suggestUseSignalsLayoutEffect?: 'error' | 'warn' | 'off';
  performanceLimitExceeded?: 'error' | 'warn' | 'off';
  missingDependencies?: 'error' | 'warn' | 'off';
  unnecessaryDependencies?: 'error' | 'warn' | 'off';
  duplicateDependencies?: 'error' | 'warn' | 'off';
  avoidSignalAssignmentInLayoutEffect?: 'error' | 'warn' | 'off';
};

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: Array<string>;
  /** Patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: Array<string>;
  /** Custom severity levels for different violation types */
  severity?: Severity;
  /** Performance tuning options */
  performance?: PerformanceBudget;
};

type Options = [Option?];

type MessageIds =
  | 'avoidSignalAssignmentInEffect'
  | 'suggestUseSignalsEffect'
  | 'suggestUseSignalsLayoutEffect'
  | 'performanceLimitExceeded'
  | 'missingDependencies'
  | 'unnecessaryDependencies'
  | 'duplicateDependencies'
  | 'avoidSignalAssignmentInLayoutEffect';

type Effect = {
  isEffect: boolean;
  isLayoutEffect: boolean;
  signalAssignments: Array<TSESTree.MemberExpression>;
  node: TSESTree.CallExpression;
};

function isSignalAssignment(
  node: TSESTree.Node,
  signalNames: Array<string>,
  perfKey: string,
  signalNameCache: Map<string, boolean>,
  signalVariables: Set<string>
): node is TSESTree.MemberExpression {
  if (node.type !== AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.signalCheck);

    if (
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'value' &&
      node.object.type === AST_NODE_TYPES.Identifier
    ) {
      const object = node.object;
      const cacheKey = `${object.name}:${signalNames.join(',')}`;

      if (signalVariables.has(object.name)) {
        return true;
      }

      if (signalNameCache.has(cacheKey)) {
        const cached = signalNameCache.get(cacheKey) ?? false;

        if (cached) {
          signalVariables.add(object.name);
        }

        return cached;
      }

      const isSignal = signalNames.some((name: string): boolean => {
        return object.name.endsWith(name);
      });

      signalNameCache.set(cacheKey, isSignal);

      if (isSignal) {
        signalVariables.add(object.name);
      }

      return isSignal;
    }

    return false;
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error;
    }

    return false;
  }
}

function isEffectHook(
  node: TSESTree.CallExpression,
  perfKey: string
): { isEffect: boolean; isLayoutEffect: boolean } | null {
  try {
    trackOperation(perfKey, PerformanceOperations.hookCheck);

    if (node.callee.type !== AST_NODE_TYPES.Identifier) {
      return null;
    }

    if (['useEffect', 'useLayoutEffect'].includes(node.callee.name)) {
      return {
        isEffect: true,
        isLayoutEffect: node.callee.name === 'useLayoutEffect',
      };
    }

    return null;
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error;
    }

    return null;
  }
}

function visitNode(
  node: TSESTree.Node,
  effectStack: Array<Effect>,
  signalNames: Array<string>,
  signalNameCache: Map<string, boolean>,
  signalVariables: Set<string>,
  perfKey: string
): void {
  if (
    node.type === AST_NODE_TYPES.VariableDeclarator &&
    node.init?.type === AST_NODE_TYPES.CallExpression &&
    node.init.callee.type === AST_NODE_TYPES.Identifier &&
    signalNames.some((name: string): boolean => {
      return (
        node.init !== null &&
        'callee' in node.init &&
        'name' in node.init.callee &&
        node.init.callee.name.endsWith(name)
      );
    }) &&
    node.id.type === AST_NODE_TYPES.Identifier
  ) {
    signalVariables.add(node.id.name);
  }

  if (effectStack.length === 0) {
    return;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.nodeProcessing);

    if (
      node.type === AST_NODE_TYPES.AssignmentExpression &&
      node.operator === '=' &&
      isSignalAssignment(node.left, signalNames, perfKey, signalNameCache, signalVariables)
    ) {
      const currentEffect = effectStack[effectStack.length - 1];

      if (currentEffect) {
        currentEffect.signalAssignments.push(node.left);
      }

      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    for (const key in node) {
      if (key === 'parent' || key === 'range' || key === 'loc' || key === 'comments') {
        continue;
      }

      const value = node[key as 'parent' | 'loc' | 'range' | 'type'];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && 'type' in item) {
            visitNode(
              // Array.isArray produces incorrect item type number, which down the line converts to never
              item as TSESTree.Node,
              effectStack,
              signalNames,
              signalNameCache,
              signalVariables,
              perfKey
            );
          }
        }
      } else if (typeof value === 'object' && 'type' in value) {
        visitNode(value, effectStack, signalNames, signalNameCache, signalVariables, perfKey);
      }
    }
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error;
    }

    return;
  }
}

const effectStack: Array<Effect> = [];
const signalVariables = new Set<string>();
const patternCache = new Map<string, RegExp>();
const signalNameCache = new Map<string, boolean>();

const ruleName = 'no-signal-assignment-in-effect';

export const noSignalAssignmentInEffectRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prevent direct signal assignments in useEffect and useLayoutEffect',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      avoidSignalAssignmentInEffect:
        'Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode. Use useSignalsEffect instead.',
      avoidSignalAssignmentInLayoutEffect:
        'Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode. Use useSignalsLayoutEffect instead.',
      suggestUseSignalsEffect: 'Use useSignalsEffect for signal assignments',
      suggestUseSignalsLayoutEffect:
        'Use useSignalsLayoutEffect for signal assignments in layout effects',
      performanceLimitExceeded:
        'Performance limit exceeded: {{message}}. Some checks may have been skipped.',
      missingDependencies: 'Missing dependencies: {{dependencies}}',
      unnecessaryDependencies: 'Unnecessary dependencies: {{dependencies}}',
      duplicateDependencies: 'Duplicate dependencies: {{dependencies}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          signalNames: {
            type: 'array',
            items: { type: 'string' },
            default: ['signal', 'useSignal', 'createSignal'],
            description: 'Custom signal function names to check',
          },
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'File patterns where signal assignments are allowed',
          },
          severity: {
            type: 'object',
            properties: {
              avoidSignalAssignmentInEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for signal assignments in useEffect',
              },
              avoidSignalAssignmentInLayoutEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for signal assignments in useLayoutEffect',
              },
              missingDependencies: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for missing dependencies',
              },
              unnecessaryDependencies: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for unnecessary dependencies',
              },
              duplicateDependencies: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for duplicate dependencies',
              },
              suggestUseSignalsEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for suggest useSignalsEffect',
              },
              suggestUseSignalsLayoutEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for suggest useSignalsLayoutEffect',
              },
              performanceLimitExceeded: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for performance limit exceeded',
              },
            },
            additionalProperties: false,
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
      signalNames: ['signal', 'useSignal', 'createSignal'],
      allowedPatterns: [],
      severity: {
        avoidSignalAssignmentInEffect: 'error',
        avoidSignalAssignmentInLayoutEffect: 'error',
        missingDependencies: 'error',
        unnecessaryDependencies: 'error',
        duplicateDependencies: 'error',
        suggestUseSignalsEffect: 'error',
        suggestUseSignalsLayoutEffect: 'error',
        performanceLimitExceeded: 'error',
      },
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option?.performance, context);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    // console.info(`${ruleName}: Rule configuration:`, option);

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

      if (nodeCount > (option?.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    startPhase(perfKey, 'fileAnalysis');

    if ((option?.allowedPatterns?.length ?? 0) > 0) {
      const fileMatchesPattern = option?.allowedPatterns?.some((pattern: string): boolean => {
        if (patternCache.has(pattern)) {
          return patternCache.get(pattern)?.test(context.filename) ?? false;
        }

        try {
          // User defined value
          // eslint-disable-next-line security/detect-non-literal-regexp
          const regex = new RegExp(pattern);

          patternCache.set(pattern, regex);

          return regex.test(context.filename);
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error(`Invalid regex pattern: ${pattern}. Error: ${error.message}`);
          } else if (typeof error === 'string') {
            console.error(`Invalid regex pattern: ${pattern}. Error: ${error}`);
          } else {
            console.error(`Invalid regex pattern: ${pattern}. Error: ${JSON.stringify(error)}`);
          }

          return false;
        }
      });

      if (fileMatchesPattern === true) {
        return {};
      }
    }

    startPhase(perfKey, 'ruleExecution');

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);

        // Handle function declarations and variables
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.FunctionExpression ||
          node.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          try {
            const scope = context.sourceCode.getScope(node);

            for (const variable of scope.variables) {
              if (
                variable.defs.some((def: Definition): boolean => {
                  trackOperation(perfKey, PerformanceOperations.signalCheck);

                  return (
                    'init' in def.node &&
                    def.node.init?.type === AST_NODE_TYPES.CallExpression &&
                    def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
                    option?.signalNames?.includes(def.node.init.callee.name) === true
                  );
                }) === true
              ) {
                signalVariables.add(variable.name);
              }
            }
          } catch (error: unknown) {
            if (error instanceof PerformanceLimitExceededError) {
              const messageId = 'performanceLimitExceeded';

              if (getSeverity(messageId, option) !== 'off') {
                context.report({
                  node,
                  messageId,
                  data: { message: error.message, ruleName },
                });
              }
            } else {
              throw error;
            }
          }
        }
      },

      // Track effect hooks
      CallExpression(node: TSESTree.CallExpression): void {
        if (!shouldContinue()) {
          return;
        }

        try {
          trackOperation(perfKey, PerformanceOperations.hookCheck);
          const effectInfo = isEffectHook(node, perfKey);

          if (!effectInfo) {
            return;
          }

          // Push new effect context
          effectStack.push({
            isEffect: effectInfo.isEffect,
            isLayoutEffect: effectInfo.isLayoutEffect,
            signalAssignments: [],
            node,
          });

          // Check for signal assignments in the effect callback
          if (node.arguments.length > 0) {
            if (
              node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
              node.arguments[0]?.type === AST_NODE_TYPES.FunctionExpression
            ) {
              if (node.arguments[0].body.type === AST_NODE_TYPES.BlockStatement) {
                // Process block statement body
                for (const statement of node.arguments[0].body.body) {
                  if (
                    typeof option?.signalNames !== 'undefined' &&
                    statement.type === AST_NODE_TYPES.ExpressionStatement
                  ) {
                    visitNode(
                      statement.expression,
                      effectStack,
                      option.signalNames,
                      signalNameCache,
                      signalVariables,
                      perfKey
                    );
                  }
                }
              } else if (
                typeof option?.signalNames !== 'undefined' &&
                node.arguments[0].body.type === AST_NODE_TYPES.CallExpression
              ) {
                // Handle direct function call in arrow function
                visitNode(
                  node.arguments[0].body,
                  effectStack,
                  option.signalNames,
                  signalNameCache,
                  signalVariables,
                  perfKey
                );
              }
            }
          }
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            context.report({
              node,
              messageId: 'performanceLimitExceeded',
              data: { message: error.message, ruleName },
            });
          } else {
            throw error;
          }
        }
      },

      // Track signal assignments
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        if (!shouldContinue() || effectStack.length === 0) {
          return;
        }

        try {
          trackOperation(perfKey, PerformanceOperations.signalAccess);

          if (option?.signalNames && node.left.type === AST_NODE_TYPES.MemberExpression) {
            const isSignal = isSignalAssignment(
              node.left,
              option.signalNames,
              perfKey,
              signalNameCache,
              signalVariables
            );

            if (isSignal) {
              effectStack[effectStack.length - 1]?.signalAssignments.push(node.left);
            }
          }
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            context.report({
              node,
              messageId: 'performanceLimitExceeded',
              data: { message: error.message, ruleName },
            });
          } else {
            throw error;
          }
        }
      },

      // Track signal value access
      MemberExpression(node: TSESTree.MemberExpression): void {
        if (!shouldContinue() || effectStack.length === 0) {
          return;
        }

        try {
          trackOperation(perfKey, PerformanceOperations.signalAccess);

          if (
            typeof option?.signalNames !== 'undefined' &&
            isSignalAssignment(node, option.signalNames, perfKey, signalNameCache, signalVariables)
          ) {
            effectStack[effectStack.length - 1]?.signalAssignments.push(node);
          }
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            context.report({
              node,
              messageId: 'performanceLimitExceeded',
              data: { message: error.message, ruleName },
            });
          } else {
            throw error;
          }
        }
      },

      'CallExpression > :not(CallExpression)'(node: TSESTree.CallExpression): void {
        if (!shouldContinue() || effectStack.length === 0) {
          return;
        }

        if (!isEffectHook(node, perfKey)) {
          return;
        }

        const currentEffect = effectStack[effectStack.length - 1];

        if (currentEffect?.node !== node) {
          return;
        }

        if (currentEffect.signalAssignments.length > 0) {
          const suggest: Array<{
            messageId: MessageIds;
            fix: (fixer: TSESLint.RuleFixer) => TSESLint.RuleFix | null;
          }> = [];

          if (currentEffect.isLayoutEffect) {
            suggest.push({
              messageId: 'suggestUseSignalsLayoutEffect',
              fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                const callback = node.arguments[0];

                if (
                  !callback ||
                  (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                    callback.type !== AST_NODE_TYPES.FunctionExpression)
                ) {
                  return null;
                }

                // if (!callback.body) {
                //   return null;
                // }

                // Get the range of the effect callback body
                const [start] = callback.body.range;

                const [end] = node.arguments[1]?.range ?? node.range;

                return fixer.replaceTextRange(
                  [node.range[0], node.range[1]],
                  `useSignalsLayoutEffect(() => ${context.sourceCode.text.slice(start, end).trim()})`
                );
              },
            });
          } else {
            suggest.push({
              messageId: 'suggestUseSignalsEffect',
              fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                const callback = node.arguments[0];

                if (
                  !callback ||
                  (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                    callback.type !== AST_NODE_TYPES.FunctionExpression)
                ) {
                  return null;
                }

                // if (!callback.body) {
                //   return null;
                // }

                // Get the range of the effect callback body
                const [start] = callback.body.range;

                const [end] = node.arguments[1]?.range ?? node.range;

                return fixer.replaceTextRange(
                  [node.range[0], node.range[1]],
                  `useSignals(() => ${context.sourceCode.text.slice(start, end).trim()})`
                );
              },
            });
          }

          const messageId = currentEffect.isLayoutEffect
            ? 'avoidSignalAssignmentInLayoutEffect'
            : 'avoidSignalAssignmentInEffect';

          if (getSeverity(messageId, option) !== 'off') {
            context.report({
              node,
              messageId,
              suggest,
              data: {
                hookName: currentEffect.isLayoutEffect ? 'useLayoutEffect' : 'useEffect',
                signalNames: currentEffect.signalAssignments
                  .map((assign: TSESTree.MemberExpression): string => {
                    if (assign.object.type === AST_NODE_TYPES.Identifier) {
                      return assign.object.name;
                    }

                    return context.getSourceCode().getText(assign.object);
                  })
                  .join(', '),
              },
            });
          }
        }

        effectStack.pop();
      },

      'Program:exit'(node: TSESTree.Program): void {
        if (!shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (typeof finalMetrics !== 'undefined') {
            console.info(
              `\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget === true ? 'EXCEEDED' : 'OK'}):`
            );
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

            if (finalMetrics.exceededBudget === true) {
              const messageId = 'performanceLimitExceeded' as const;

              if (getSeverity(messageId, option) !== 'off') {
                context.report({
                  node,
                  messageId,
                  data: {
                    message: 'Performance budget exceeded',
                    ruleName,
                  },
                });
              }
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
