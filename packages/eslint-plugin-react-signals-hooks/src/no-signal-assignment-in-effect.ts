import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
  endPhase,
  startPhase,
  stopTracking,
  recordMetric,
  trackOperation,
  startTracking,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { PerformanceOperations } from './utils/performance-constants.js';

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames: string[];
  /** Patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns: string[];
  /** Custom severity levels for different violation types */
  severity: {
    signalAssignmentInEffect: 'error' | 'warn' | 'off';
    signalAssignmentInLayoutEffect: 'error' | 'warn' | 'off';
  };
  /** Performance tuning options */
  performance: PerformanceBudget;
};

type Options = [Option];

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
  signalAssignments: TSESTree.MemberExpression[];
  node: TSESTree.CallExpression;
};

function recordFinalMetrics(
  perfKey: string,
  option: Option,
  context: Readonly<RuleContext<MessageIds, Options>>
) {
  try {
    // End the performance tracking phase
    endPhase(perfKey, 'rule-execution');

    // Stop tracking and clean up resources
    const finalMetrics = stopTracking(perfKey);

    if (finalMetrics?.exceededBudget && option.performance?.logMetrics) {
      console.warn(
        `[no-signal-assignment-in-effect] Performance budget exceeded in ${context.filename}: ` +
          `Processed ${finalMetrics.nodeCount} nodes in ${finalMetrics.duration?.toFixed(2)}ms`
      );
    }
  } catch (error) {
    // Don't let errors in metric recording break the rule
    console.error('Error recording performance metrics:', error);
  }
}

const signalNameCache = new Map<string, boolean>();

function isSignalAssignment(
  node: TSESTree.Node,
  signalNames: string[],
  perfKey: string
): node is TSESTree.MemberExpression {
  if (node.type !== AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.signalCheck);

    // Check if this is a property access like `something.value`
    if (
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'value' &&
      node.object.type === AST_NODE_TYPES.Identifier
    ) {
      const object = node.object;
      const cacheKey = `${object.name}:${signalNames.join(',')}`;

      // Check if we've already identified this as a signal variable
      if (signalVariables.has(object.name)) {
        return true;
      }

      // Check cache next
      if (signalNameCache.has(cacheKey)) {
        const cached = signalNameCache.get(cacheKey) ?? false;

        if (cached) {
          signalVariables.add(object.name);
        }

        return cached;
      }

      // Check if the variable name matches any signal names
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
      throw error; // Re-throw to be handled by the caller
    }

    // For other errors, assume it's not a signal assignment
    return false;
  }
}

function isEffectHook(
  node: TSESTree.CallExpression,
  effectHooks: Set<string>,
  perfKey: string
): { isEffect: boolean; isLayoutEffect: boolean } | null {
  try {
    trackOperation(perfKey, PerformanceOperations.hookCheck);

    // Must be an identifier (not a member expression)
    if (node.callee.type !== AST_NODE_TYPES.Identifier) {
      return null;
    }

    // Check if this is one of our target effect hooks
    if (effectHooks.has(node.callee.name)) {
      return {
        isEffect: true,
        isLayoutEffect: node.callee.name === 'useLayoutEffect',
      };
    }

    return null;
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error; // Re-throw to be handled by the caller
    }

    // For other errors, assume it's not an effect hook
    return null;
  }
}

function visitNode(
  node: TSESTree.Node,
  effectStack: Array<Effect>,
  signalNames: string[],
  perfKey: string
): void {
  // Track variable declarations that might be signals
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
  if (!node || effectStack.length === 0) {
    return;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.nodeProcessing);

    // Check for signal assignments
    if (
      node.type === 'AssignmentExpression' &&
      node.operator === '=' &&
      isSignalAssignment(node.left, signalNames, perfKey)
    ) {
      const currentEffect = effectStack[effectStack.length - 1];

      if (currentEffect) {
        currentEffect.signalAssignments.push(node.left);
      }

      return; // No need to visit children of an assignment
    }

    // Only process object values that might contain AST nodes
    if (typeof node !== 'object' || node === null) {
      return;
    }

    // Process child nodes, skipping known non-node properties
    const skipKeys = new Set(['parent', 'range', 'loc', 'comments']);

    for (const [key, value] of Object.entries(node)) {
      if (skipKeys.has(key)) {
        continue;
      }

      if (Array.isArray(value)) {
        // Process array of nodes
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            visitNode(item as TSESTree.Node, effectStack, signalNames, perfKey);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Process single node
        visitNode(value as TSESTree.Node, effectStack, signalNames, perfKey);
      }
    }
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error; // Re-throw to be handled by the caller
    }
    // For other errors, assume it's not an effect hook
    return;
  }
}

const patternCache = new Map<string, RegExp>();

// Track effect stack for nested effects
const effectStack: Array<Effect> = [];

// Track variables that are signals
const signalVariables = new Set<string>();

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'no-signal-assignment-in-effect';

export const noSignalAssignmentInEffectRule = createRule<Options, MessageIds>({
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
              signalAssignmentInEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for signal assignments in useEffect',
              },
              signalAssignmentInLayoutEffect: {
                type: 'string',
                enum: ['off', 'warn', 'error'],
                default: 'error',
                description: 'Severity for signal assignments in useLayoutEffect',
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
        signalAssignmentInEffect: 'error',
        signalAssignmentInLayoutEffect: 'error',
      },
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): TSESLint.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'rule-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`Initializing rule for file: ${context.filename}`);
    console.info('Rule configuration:', option);

    let nodeCount = 0;

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    const signalNames = option.signalNames ?? ['signal', 'useSignal', 'createSignal'];
    const signalNameSet = new Set(signalNames);
    const allowedPatterns = option.allowedPatterns ?? [];
    const effectHooks = new Set(['useEffect', 'useLayoutEffect']);

    startPhase(perfKey, 'fileAnalysis');

    try {
      // Check if current file matches any allowed patterns with caching
      if (allowedPatterns.length > 0) {
        const fileMatchesPattern = allowedPatterns.some((pattern: string): boolean => {
          // Check cache first
          if (patternCache.has(pattern)) {
            const regex = patternCache.get(pattern);

            return regex?.test(context.filename) ?? false;
          }

          // Compile and cache the regex
          try {
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

            // Invalid regex pattern, ignore it
            return false;
          }
        });

        if (fileMatchesPattern) {
          return {};
        }
      }

      // Track rule initialization
      recordMetric(perfKey, 'signalNames', signalNames);
      recordMetric(perfKey, 'allowedPatterns', allowedPatterns);

      endPhase(perfKey, 'rule-init');

      // Create the rule listener with performance tracking
      return {
        // Track all nodes for performance monitoring
        '*': (node: TSESTree.Node): void => {
          if (!shouldContinue()) {
            return;
          }

          perf.trackNode(node);

          // Track specific node types that are more expensive to process
          if (
            node.type === 'CallExpression' ||
            node.type === 'MemberExpression' ||
            node.type === 'Identifier'
          ) {
            trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
          }

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
                  variable.defs.some((def) => {
                    trackOperation(perfKey, PerformanceOperations.signalCheck);
                    return (
                      'init' in def.node &&
                      def.node.init?.type === AST_NODE_TYPES.CallExpression &&
                      def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
                      signalNameSet.has(def.node.init.callee.name)
                    );
                  })
                ) {
                  signalVariables.add(variable.name);
                }
              }
            } catch (error) {
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
          }
        },

        // Track effect hooks
        CallExpression(node: TSESTree.CallExpression): void {
          if (!shouldContinue()) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.hookCheck);
            const effectInfo = isEffectHook(node, effectHooks, perfKey);

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
              const callback = node.arguments[0];
              const isFunction =
                callback.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                callback.type === AST_NODE_TYPES.FunctionExpression;

              if (isFunction) {
                // Visit the callback body to find signal assignments
                const callbackBody = callback.body;
                if (callbackBody.type === AST_NODE_TYPES.BlockStatement) {
                  // Process block statement body
                  for (const statement of callbackBody.body) {
                    if (statement.type === AST_NODE_TYPES.ExpressionStatement) {
                      visitNode(statement.expression, effectStack, signalNames, perfKey);
                    }
                  }
                } else if (callbackBody.type === AST_NODE_TYPES.CallExpression) {
                  // Handle direct function call in arrow function
                  visitNode(callbackBody, effectStack, signalNames, perfKey);
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

        'CallExpression:exit'(node: TSESTree.CallExpression): void {
          if (!shouldContinue() || effectStack.length === 0) {
            return;
          }

          if (!isEffectHook(node, effectHooks, perfKey)) {
            return;
          }

          const currentEffect = effectStack[effectStack.length - 1];

          if (currentEffect.node !== node) {
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

                  if (!callback.body) {
                    return null;
                  }

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

                  if (!callback.body) {
                    return null;
                  }

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

            context.report({
              node,
              messageId: 'avoidSignalAssignmentInEffect',
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

          effectStack.pop();
        },

        // Track signal assignments
        AssignmentExpression(node: TSESTree.AssignmentExpression): void {
          if (!shouldContinue() || effectStack.length === 0) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.signalAccess);

            const currentEffect = effectStack[effectStack.length - 1];

            if (node.left.type === AST_NODE_TYPES.MemberExpression) {
              const isSignal = isSignalAssignment(node.left, signalNames, perfKey);

              if (isSignal) {
                currentEffect.signalAssignments.push(node.left);
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

            if (isSignalAssignment(node, signalNames, perfKey)) {
              const currentEffect = effectStack[effectStack.length - 1];

              currentEffect.signalAssignments.push(node);
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

        'Program:exit'(node: TSESTree.Program): void {
          if (!shouldContinue()) {
            return;
          }

          startPhase(perfKey, 'programExit');

          perf.trackNode(node);

          try {
            startPhase(perfKey, 'recordMetrics');

            const finalMetrics = stopTracking(perfKey);

            if (finalMetrics) {
              const { exceededBudget, nodeCount, duration } = finalMetrics;
              const status = exceededBudget ? 'EXCEEDED' : 'OK';

              console.info(`\n[${ruleName}] Performance Metrics (${status}):`);
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
    } catch (error: unknown) {
      // Handle performance-related errors gracefully
      if (error instanceof PerformanceLimitExceededError) {
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'performanceLimitExceeded',
          data: {
            message: error.message,
            ruleName,
          },
        });

        // Record metrics before returning
        recordFinalMetrics(perfKey, option, context);

        return {};
      }

      // Record metrics before re-throwing
      recordFinalMetrics(perfKey, option, context);

      throw error; // Re-throw unexpected errors
    }
  },
});
