import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
  startPhase,
  endPhase,
  stopTracking,
  recordMetric,
  trackOperation,
  type PerformanceBudget,
  createPerformanceTracker,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: string[] | undefined;
  /** Patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: string[] | undefined;
  /** Custom severity levels for different violation types */
  severity?:
    | {
        signalAssignmentInEffect?: 'error' | 'warn' | 'off' | undefined;
        signalAssignmentInLayoutEffect?: 'error' | 'warn' | 'off' | undefined;
      }
    | undefined;
  /** Performance tuning options */
  performance?: PerformanceBudget | undefined;
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

// Cache for compiled regex patterns to avoid recompilation
const patternCache = new Map<string, RegExp>();

// Cache for signal name checks to avoid repeated string operations
const signalNameCache = new Map<string, boolean>();

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

// Function to record final metrics and clean up
function recordFinalMetrics(
  perfKey: string,
  metrics: {
    signalChecks: number;
    effectVisits: number;
    layoutEffectVisits: number;
    signalAssignments: number;
    performanceBudgetExceeded: boolean;
  },
  option: Option,
  context: Readonly<RuleContext<MessageIds, Options>>
) {
  try {
    // Record all metrics
    recordMetric(perfKey, 'signalChecks', metrics.signalChecks);
    recordMetric(perfKey, 'effectVisits', metrics.effectVisits);
    recordMetric(perfKey, 'layoutEffectVisits', metrics.layoutEffectVisits);
    recordMetric(perfKey, 'signalAssignments', metrics.signalAssignments);
    recordMetric(perfKey, 'performanceBudgetExceeded', metrics.performanceBudgetExceeded);

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

/**
 * Checks if a given node is a signal assignment (e.g., `signal.value = x`)
 * @param node The AST node to check
 * @param signalNames Array of signal function names to check against
 * @param perfKey Key for performance tracking
 * @param metrics Object to track performance metrics
 * @returns True if the node is a signal assignment
 */
function isSignalAssignment(
  node: TSESTree.Node,
  signalNames: string[],
  perfKey: string,
  metrics: { signalChecks: number }
): node is TSESTree.MemberExpression {
  if (node.type !== AST_NODE_TYPES.MemberExpression) {
    return false;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.signalCheck);
    metrics.signalChecks++;

    // Check if this is a property access like `something.value`
    if (
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'value'
    ) {
      // Get the object being accessed (the signal variable)
      const object = node.object;

      if (object.type === AST_NODE_TYPES.Identifier) {
        const cacheKey = `${object.name}:${signalNames.join(',')}`;

        // Check cache first
        if (signalNameCache.has(cacheKey)) {
          return signalNameCache.get(cacheKey) as boolean;
        }

        // Check if the variable name matches any signal names
        const isSignal = signalNames.some((name) => object.name.endsWith(name));
        signalNameCache.set(cacheKey, isSignal);

        return isSignal;
      }
    }

    return false;
  } catch (error) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error; // Re-throw to be handled by the caller
    }
    // For other errors, assume it's not a signal assignment
    return false;
  }
}

/**
 * Checks if a given call expression is a React effect hook
 * @param node The call expression node to check
 * @param effectHooks Set of effect hook names to check against
 * @param perfKey Key for performance tracking
 * @returns Object with effect type flags or null if not an effect hook
 */
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

    const hookName = node.callee.name;

    // Check if this is one of our target effect hooks
    if (effectHooks.has(hookName)) {
      const isLayoutEffect = hookName === 'useLayoutEffect';
      return {
        isEffect: true,
        isLayoutEffect,
      };
    }

    return null;
  } catch (error) {
    if (error instanceof PerformanceLimitExceededError) {
      throw error; // Re-throw to be handled by the caller
    }
    // For other errors, assume it's not an effect hook
    return null;
  }
}

// /**
//  * Visits nodes in the AST to check for signal assignments within effect hooks
//  * @param node The current AST node being visited
//  * @param effectStack Stack of active effect contexts
//  * @param signalNames Array of signal function names to check against
//  * @param perfKey Key for performance tracking
//  * @param metrics Object to track performance metrics
//  */
function visitNode(
  node: TSESTree.Node,
  effectStack: Array<{
    isEffect: boolean;
    isLayoutEffect: boolean;
    signalAssignments: TSESTree.MemberExpression[];
    node: TSESTree.CallExpression;
  }>,
  signalNames: string[],
  perfKey: string,
  metrics: { signalChecks: number }
) {
  if (!node || effectStack.length === 0) {
    return;
  }

  try {
    trackOperation(perfKey, PerformanceOperations.nodeProcessing);

    // Check for signal assignments
    if (
      node.type === 'AssignmentExpression' &&
      node.operator === '=' &&
      isSignalAssignment(node.left, signalNames, perfKey, metrics)
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
            visitNode(item as TSESTree.Node, effectStack, signalNames, perfKey, metrics);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Process single node
        visitNode(value as TSESTree.Node, effectStack, signalNames, perfKey, metrics);
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

/**
 * ESLint rule: no-signal-assignment-in-effect
 *
 * Prevents direct signal assignments inside React's useEffect/useLayoutEffect hooks.
 * Instead, use useSignalsEffect/useSignalsLayoutEffect from @preact/signals-react/runtime.
 */
export const noSignalAssignmentInEffectRule = createRule<Options, MessageIds>({
  name: 'no-signal-assignment-in-effect',
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prevent direct signal assignments in useEffect and useLayoutEffect',
      url: 'https://github.com/your-org/eslint-plugin-react-signals-hooks/docs/rules/no-signal-assignment-in-effect.md',
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
              maxTime: {
                type: 'number',
                minimum: 0,
                default: 40,
                description: 'Maximum execution time in milliseconds',
              },
              maxNodes: {
                type: 'number',
                minimum: 0,
                default: 1000,
                description: 'Maximum AST nodes to process',
              },
              maxMemory: {
                type: 'number',
                minimum: 0,
                default: 40 * 1024 * 1024, // 40MB
                description: 'Maximum memory usage in bytes',
              },
              maxOperations: {
                type: 'object',
                properties: {
                  signalAccess: {
                    type: 'number',
                    minimum: 1,
                    default: 300,
                    description: 'Maximum number of signal accesses',
                  },
                  effectCheck: {
                    type: 'number',
                    minimum: 1,
                    default: 150,
                    description: 'Maximum number of effect checks',
                  },
                  identifierResolution: {
                    type: 'number',
                    minimum: 1,
                    default: 250,
                    description: 'Maximum number of identifier resolutions',
                  },
                  scopeLookup: {
                    type: 'number',
                    minimum: 1,
                    default: 300,
                    description: 'Maximum number of scope lookups',
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
      signalNames: ['signal', 'useSignal', 'createSignal'],
      allowedPatterns: [],
      severity: {
        signalAssignmentInEffect: 'error',
        signalAssignmentInLayoutEffect: 'error',
      },
      performance: {
        // Time and resource limits
        maxTime: 50, // ms
        maxNodes: 2000,
        maxMemory: 50 * 1024 * 1024, // 50MB

        // Operation limits using standardized operation names
        maxOperations: {
          [PerformanceOperations.signalAccess]: 500,
          [PerformanceOperations.signalCheck]: 200,
          [PerformanceOperations.effectCheck]: 200,
          [PerformanceOperations.identifierResolution]: 300,
          [PerformanceOperations.scopeLookup]: 400,
          [PerformanceOperations.typeCheck]: 300,
        },

        // Feature toggles
        enableMetrics: false, // Whether to enable detailed performance metrics
        logMetrics: false, // Whether to log performance metrics to console
      },
    },
  ],
  create(context, [option = {}]): TSESLint.RuleListener {
    // Set up performance tracking with a unique key
    const perfKey = `no-signal-assignment-in-effect:${context.filename}`;

    // Start performance tracking for this rule execution
    startPhase(perfKey, 'rule-execution');

    // Create performance tracker for node processing
    const perf = createPerformanceTracker(perfKey, option.performance, context);

    const signalNames = option.signalNames ?? ['signal', 'useSignal', 'createSignal'];
    const signalNameSet = new Set(signalNames);
    const allowedPatterns = option.allowedPatterns ?? [];
    const effectHooks = new Set(['useEffect', 'useLayoutEffect']);

    // Start performance tracking for this rule execution
    startPhase(perfKey, 'rule-execution');

    // Track effect stack for nested effects
    const effectStack: Array<{
      isEffect: boolean;
      isLayoutEffect: boolean;
      signalAssignments: TSESTree.MemberExpression[];
      node: TSESTree.CallExpression;
    }> = [];

    // Track variables that are signals
    const signalVariables = new Set<string>();

    // Track if we've exceeded performance budget
    let performanceBudgetExceeded = false;

    // Check if we should continue processing
    function shouldContinue(operation: string = PerformanceOperations.nodeProcessing): boolean {
      if (performanceBudgetExceeded) {
        return false;
      }

      try {
        trackOperation(perfKey, operation);
        return true;
      } catch (error) {
        if (error instanceof PerformanceLimitExceededError) {
          performanceBudgetExceeded = true;
          recordMetric(perfKey, 'performanceLimitExceeded', true);
          context.report({
            node: { type: 'Program' } as TSESTree.Node,
            messageId: 'performanceLimitExceeded',
            data: { message: error.message },
          });
          return false;
        }
        throw error;
      }
    }

    // Initialize performance metrics
    const metrics = {
      // Track if we've hit any performance limits
      signalChecks: 0,
      effectVisits: 0,
      layoutEffectVisits: 0,
      signalAssignments: 0,
      performanceBudgetExceeded: false,
    };

    // Initialize performance tracking
    try {
      startPhase(perfKey, 'rule-init');

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

      return {
        // Track function declarations and variables
        ':function'(
          node:
            | TSESTree.FunctionDeclaration
            | TSESTree.FunctionExpression
            | TSESTree.ArrowFunctionExpression
        ) {
          if (!shouldContinue()) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.scopeLookup);
            const scope = context.getScope();

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
              performanceBudgetExceeded = true;
              context.report({
                node,
                messageId: 'performanceLimitExceeded',
                data: { message: error.message },
              });
            } else {
              throw error;
            }
          }
        },

        // Track effect hooks
        CallExpression(node: TSESTree.CallExpression) {
          if (!shouldContinue()) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.hookCheck);
            const effectInfo = isEffectHook(node, effectHooks, perfKey);

            if (!effectInfo) {
              return;
            }

            // Track metrics
            if (effectInfo.isLayoutEffect) {
              metrics.layoutEffectVisits++;
            } else {
              metrics.effectVisits++;
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
                      visitNode(statement.expression, effectStack, signalNames, perfKey, {
                        signalChecks: 0,
                      });
                    }
                  }
                } else if (callbackBody.type === AST_NODE_TYPES.CallExpression) {
                  // Handle direct function call in arrow function
                  visitNode(callbackBody, effectStack, signalNames, perfKey, { signalChecks: 0 });
                }
              }
            }
          } catch (error) {
            if (error instanceof PerformanceLimitExceededError) {
              performanceBudgetExceeded = true;
              context.report({
                node,
                messageId: 'performanceLimitExceeded',
                data: { message: error.message },
              });
            } else {
              throw error;
            }
          }
        },

        'CallExpression:exit'(node: TSESTree.CallExpression) {
          if (!shouldContinue() || effectStack.length === 0) {
            return;
          }

          const effectInfo = isEffectHook(node, effectHooks, perfKey);
          if (!effectInfo) {
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
                  // Get the source code and node range
                  const sourceCode = context.getSourceCode();
                  const effectNode = node as TSESTree.CallExpression;
                  const callback = effectNode.arguments[0];

                  if (
                    !callback ||
                    (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                      callback.type !== AST_NODE_TYPES.FunctionExpression)
                  ) {
                    return null;
                  }

                  // Get the body of the effect callback
                  const body = callback.body;
                  if (!body) return null;

                  // Get the range of the effect callback body
                  const [start] = body.range;
                  const [end] = effectNode.arguments[1]?.range || effectNode.range;

                  // Get the effect code and wrap it in a useSignalsLayoutEffect
                  const effectCode = sourceCode.text.slice(start, end);
                  const fixedCode = `useSignalsLayoutEffect(() => ${effectCode.trim()})`;

                  return fixer.replaceTextRange(
                    [effectNode.range[0], effectNode.range[1]],
                    fixedCode
                  );
                },
              });
            } else {
              suggest.push({
                messageId: 'suggestUseSignalsEffect',
                fix: (fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null => {
                  // Get the source code and node range
                  const sourceCode = context.getSourceCode();
                  const effectNode = node as TSESTree.CallExpression;
                  const callback = effectNode.arguments[0];

                  if (
                    !callback ||
                    (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                      callback.type !== AST_NODE_TYPES.FunctionExpression)
                  ) {
                    return null;
                  }

                  // Get the body of the effect callback
                  const body = callback.body;
                  if (!body) return null;

                  // Get the range of the effect callback body
                  const [start] = body.range;
                  const [end] = effectNode.arguments[1]?.range || effectNode.range;

                  // Get the effect code and wrap it in a useSignals
                  const effectCode = sourceCode.text.slice(start, end);
                  const fixedCode = `useSignals(() => ${effectCode.trim()})`;

                  return fixer.replaceTextRange(
                    [effectNode.range[0], effectNode.range[1]],
                    fixedCode
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
        AssignmentExpression(node: TSESTree.AssignmentExpression) {
          if (!shouldContinue() || effectStack.length === 0) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.signalAccess);
            const currentEffect = effectStack[effectStack.length - 1];

            if (node.left.type === AST_NODE_TYPES.MemberExpression) {
              const isSignal = isSignalAssignment(node.left, signalNames, perfKey, {
                signalChecks: 0,
              });

              if (isSignal) {
                currentEffect.signalAssignments.push(node.left);
                metrics.signalAssignments++;
              }
            }
          } catch (error: unknown) {
            if (error instanceof PerformanceLimitExceededError) {
              performanceBudgetExceeded = true;
              context.report({
                node,
                messageId: 'performanceLimitExceeded',
                data: { message: error.message },
              });
            } else {
              throw error;
            }
          }
        },

        // Track signal value access
        MemberExpression(node: TSESTree.MemberExpression) {
          if (!shouldContinue() || effectStack.length === 0) {
            return;
          }

          try {
            trackOperation(perfKey, PerformanceOperations.signalAccess);
            const isSignal = isSignalAssignment(node, signalNames, perfKey, { signalChecks: 0 });

            if (isSignal) {
              const currentEffect = effectStack[effectStack.length - 1];
              currentEffect.signalAssignments.push(node);
              metrics.signalAssignments++;
            }
          } catch (error: unknown) {
            if (error instanceof PerformanceLimitExceededError) {
              performanceBudgetExceeded = true;
              context.report({
                node,
                messageId: 'performanceLimitExceeded',
                data: { message: error.message },
              });
            } else {
              throw error;
            }
          }
        },
      };
    } catch (error: unknown) {
      // Handle performance-related errors gracefully
      if (error instanceof PerformanceLimitExceededError) {
        metrics.performanceBudgetExceeded = true;
        performanceBudgetExceeded = true;
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'performanceLimitExceeded',
          data: {
            message: error.message,
          },
        });

        // Record metrics before returning
        recordFinalMetrics(perfKey, metrics, option, context);

        return {};
      }

      // Record metrics before re-throwing
      recordFinalMetrics(perfKey, metrics, option, context);

      throw error; // Re-throw unexpected errors
    }
  },
});
