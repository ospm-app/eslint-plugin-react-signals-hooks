import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
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

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: string[];
  /** Patterns where signal assignments are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: string[];
  /** Custom severity levels for different violation types */
  severity?: {
    signalAssignmentInEffect?: 'error' | 'warn' | 'off';
    signalAssignmentInLayoutEffect?: 'error' | 'warn' | 'off';
  };
  /** Performance tuning options */
  performance?: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'avoidSignalAssignmentInEffect'
  | 'suggestUseSignalsEffect'
  | 'suggestUseSignalsLayoutEffect'
  | 'performanceLimitExceeded';

// Cache for compiled regex patterns to avoid recompilation
const patternCache = new Map<string, RegExp>();

// Cache for signal name checks to avoid repeated string operations
const signalNameCache = new Map<string, boolean>();

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

/**
 * Checks if a node is a signal assignment with caching for better performance.
 * Uses a cache to avoid repeated string operations on the same node name.
 */
function isSignalAssignment(
  node: TSESTree.Node,
  signalNames: string[]
): node is TSESTree.MemberExpression {
  if (
    node.type !== 'MemberExpression' ||
    node.property.type !== 'Identifier' ||
    node.property.name !== 'value' ||
    node.object.type !== 'Identifier' ||
    !('name' in node.object)
  ) {
    return false;
  }

  const nodeName = node.object.name;
  const cacheKey = `${nodeName}:${signalNames.join(',')}`;

  // Check cache first
  if (signalNameCache.has(cacheKey)) {
    return signalNameCache.get(cacheKey) as boolean;
  }

  // Perform the check
  const isSignal = signalNames.some((signalName: string): boolean => {
    return nodeName.endsWith(signalName);
  });

  // Cache the result
  signalNameCache.set(cacheKey, isSignal);

  return isSignal;
}

/**
 * Visits AST nodes to find signal assignments within effects.
 * Optimized to avoid unnecessary recursion and object property access.
 */
function visitNode(
  node: TSESTree.Node | TSESTree.Node[] | undefined,
  effectStack: Array<{
    isEffect: boolean;
    isLayoutEffect: boolean;
    signalAssignments: TSESTree.MemberExpression[];
  }>,
  signalNames: string[]
): void {
  // Early return for null/undefined or empty effect stack
  if (!node || effectStack.length === 0) {
    return;
  }

  // Handle arrays of nodes
  if (Array.isArray(node)) {
    // Use for...of for better performance with large arrays
    for (const childNode of node) {
      visitNode(childNode, effectStack, signalNames);
    }
    return;
  }

  // Check for signal assignments
  if (
    node.type === 'AssignmentExpression' &&
    node.operator === '=' &&
    isSignalAssignment(node.left, signalNames)
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
          visitNode(item as TSESTree.Node | Array<TSESTree.Node>, effectStack, signalNames);
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      // Process single node
      visitNode(value as TSESTree.Node | Array<TSESTree.Node>, effectStack, signalNames);
    }
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
      description: 'Prevent direct signal assignments inside React effects',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-signal-assignment-in-effect',
    },
    messages: {
      avoidSignalAssignmentInEffect:
        'Avoid direct signal assignments in {{ hookName }}. This can cause unexpected behavior in React 18+ strict mode.',
      suggestUseSignalsEffect:
        'Use useSignalsEffect from @preact/signals-react/runtime for signal assignments in effects',
      suggestUseSignalsLayoutEffect:
        'Use useSignalsLayoutEffect from @preact/signals-react/runtime for signal assignments in layout effects',
      performanceLimitExceeded:
        'Performance limit exceeded during rule initialization: {{ message }}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          signalNames: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            description: 'Custom signal function names',
          },
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            description: 'Patterns where signal assignments are allowed',
          },
          severity: {
            type: 'object',
            properties: {
              signalAssignmentInEffect: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalAssignmentInLayoutEffect: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
            },
            additionalProperties: false,
          },
          performance: {
            type: 'object',
            properties: {
              maxTime: {
                type: 'number',
                minimum: 1,
                default: 40,
                description: 'Maximum time in milliseconds the rule should take to process a file',
              },
              maxNodes: {
                type: 'number',
                minimum: 100,
                default: 1000,
                description: 'Maximum number of AST nodes the rule should process',
              },
              maxMemory: {
                type: 'number',
                minimum: 1024 * 1024, // 1MB
                default: 40 * 1024 * 1024, // 40MB
                description: 'Maximum memory in bytes the rule should use',
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
  create(context, [options = {}]) {
    // Set up performance tracking with a unique key
    const perfKey = `no-signal-assignment-in-effect:${context.filename}`;
    const signalNames = options.signalNames ?? ['signal', 'useSignal', 'createSignal'];
    const allowedPatterns = options.allowedPatterns ?? [];

    // Track if we've exceeded performance budget
    let performanceBudgetExceeded = false;

    // Helper to check if we should continue processing
    const shouldContinue = (): boolean => {
      if (performanceBudgetExceeded) {
        return false;
      }
      trackOperation(perfKey, 'shouldContinueCheck');
      return true;
    };

    // Initialize performance metrics
    const metrics = {
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
    } catch (error) {
      // Handle performance-related errors gracefully
      if (error instanceof PerformanceLimitExceededError) {
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'performanceLimitExceeded',
          data: {
            message: error.message,
          },
        });
        return {};
      }
      throw error; // Re-throw unexpected errors
    }

    // Create performance tracker instance
    const perf = createPerformanceTracker(
      perfKey,
      {
        // Time and resource limits
        maxTime: options.performance?.maxTime ?? 40, // ms
        maxNodes: options.performance?.maxNodes ?? 1000,
        maxMemory: options.performance?.maxMemory ?? 40 * 1024 * 1024, // 40MB

        // Operation-specific limits
        maxOperations: {
          [PerformanceOperations.signalAccess]:
            options.performance?.maxOperations?.[PerformanceOperations.signalAccess] ?? 500,
          [PerformanceOperations.signalCheck]:
            options.performance?.maxOperations?.[PerformanceOperations.signalCheck] ?? 200,
          [PerformanceOperations.effectCheck]:
            options.performance?.maxOperations?.[PerformanceOperations.effectCheck] ?? 200,
          [PerformanceOperations.identifierResolution]:
            options.performance?.maxOperations?.[PerformanceOperations.identifierResolution] ?? 300,
          [PerformanceOperations.scopeLookup]:
            options.performance?.maxOperations?.[PerformanceOperations.scopeLookup] ?? 400,
        },

        // Feature toggles
        enableMetrics: options.performance?.enableMetrics ?? false,
        logMetrics: options.performance?.logMetrics ?? false,
      },
      context
    );

    function getSeverity(hookType: 'effect' | 'layoutEffect'): 'error' | 'warn' | 'off' {
      if (!options.severity) {
        return 'error';
      }

      return hookType === 'effect'
        ? (options.severity.signalAssignmentInEffect ?? 'error')
        : (options.severity.signalAssignmentInLayoutEffect ?? 'error');
    }

    const effectStack: Array<{
      isEffect: boolean;
      isLayoutEffect: boolean;
      signalAssignments: TSESTree.MemberExpression[];
    }> = [];

    // Create rule visitor object
    const visitor: TSESLint.RuleListener = {
      '*': (node: TSESTree.Node): void => {
        try {
          perf.trackNode(node);
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            // Continue with reduced functionality
            trackOperation(perfKey, 'nodeTrackingSkipped');
          }
        }
      },

      'CallExpression[calee.name="useEffect"]'(): void {
        if (!shouldContinue() || performanceBudgetExceeded) {
          return;
        }

        try {
          startPhase(perfKey, 'useEffect-visit');
          trackOperation(perfKey, 'useEffectVisit');
          metrics.effectVisits++;
          effectStack.push({
            isEffect: true,
            isLayoutEffect: false,
            signalAssignments: [],
          });
          endPhase(perfKey, 'useEffect-visit');
        } catch (error) {
          if (error instanceof PerformanceLimitExceededError) {
            performanceBudgetExceeded = true;
            trackOperation(perfKey, 'useEffectVisitSkipped');
          }
        }
      },

      'CallExpression[callee.name="useEffect"]:exit'(node: TSESTree.CallExpression): void {
        try {
          startPhase(perfKey, 'useEffect-exit');

          const currentEffect = effectStack.pop();

          if (typeof currentEffect === 'undefined') {
            endPhase(perfKey, 'useEffect-exit');
            return;
          }

          const severity = getSeverity('effect');
          if (severity === 'off') {
            endPhase(perfKey, 'useEffect-exit');

            return;
          }

          currentEffect.signalAssignments.forEach((assignment: TSESTree.MemberExpression): void => {
            metrics.signalAssignments++;

            context.report({
              node: assignment,
              messageId: 'avoidSignalAssignmentInEffect',
              data: { hookName: 'useEffect' },
              suggest: [
                {
                  messageId: 'suggestUseSignalsEffect',
                  *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                    const effectCallback: TSESTree.CallExpressionArgument | undefined =
                      node.arguments[0];

                    if (!effectCallback) {
                      return;
                    }

                    if (
                      effectCallback.type !== 'ArrowFunctionExpression' &&
                      effectCallback.type !== 'FunctionExpression'
                    ) {
                      return;
                    }

                    yield fixer.replaceText(node.callee, 'useSignalsEffect');
                  },
                },
              ],
            });
          });
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            // Continue with reduced functionality
            trackOperation(perfKey, 'useEffectExitSkipped');
          }
        } finally {
          endPhase(perfKey, 'useEffect-exit');
        }
      },

      'CallExpression[callee.name="useLayoutEffect"]'(): void {
        if (!shouldContinue() || performanceBudgetExceeded) {
          return;
        }
        try {
          startPhase(perfKey, 'useLayoutEffect-visit');
          trackOperation(perfKey, 'useLayoutEffectVisit');
          metrics.layoutEffectVisits++;
          effectStack.push({
            isEffect: false,
            isLayoutEffect: true,
            signalAssignments: [],
          });
          endPhase(perfKey, 'useLayoutEffect-visit');
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            performanceBudgetExceeded = true;
            trackOperation(perfKey, 'useLayoutEffectVisitSkipped');
          }
        }
      },

      'CallExpression[callee.name="useLayoutEffect"]:exit'(node: TSESTree.CallExpression): void {
        try {
          startPhase(perfKey, 'useLayoutEffect-exit');

          const currentEffect = effectStack.pop();
          if (typeof currentEffect === 'undefined') {
            endPhase(perfKey, 'useLayoutEffect-exit');
            return;
          }

          const severity = getSeverity('layoutEffect');
          if (severity === 'off') {
            endPhase(perfKey, 'useLayoutEffect-exit');
            return;
          }

          currentEffect.signalAssignments.forEach((assignment: TSESTree.MemberExpression): void => {
            metrics.signalAssignments++;
            context.report({
              node: assignment,
              messageId: 'avoidSignalAssignmentInEffect',
              data: { hookName: 'useLayoutEffect' },
              suggest: [
                {
                  messageId: 'suggestUseSignalsLayoutEffect',
                  *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                    const effectCallback: TSESTree.CallExpressionArgument | undefined =
                      node.arguments[0];

                    if (!effectCallback) {
                      return;
                    }

                    if (
                      effectCallback.type !== 'ArrowFunctionExpression' &&
                      effectCallback.type !== 'FunctionExpression'
                    ) {
                      return;
                    }

                    yield fixer.replaceText(node.callee, 'useSignalsLayoutEffect');
                  },
                },
              ],
            });
          });
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            // Continue with reduced functionality
            trackOperation(perfKey, 'useLayoutEffectExitSkipped');
          }
        } finally {
          endPhase(perfKey, 'useLayoutEffect-exit');
        }
      },

      // Use more specific selectors to reduce the number of nodes visited
      'FunctionExpression, ArrowFunctionExpression, BlockStatement, ExpressionStatement': (
        node: TSESTree.Node
      ): void => {
        if (effectStack.length > 0 && !performanceBudgetExceeded) {
          visitNode(node, effectStack, signalNames);
        }
      },
      'Program:exit'(): void {
        try {
          if (perf && typeof perf['Program:exit'] === 'function') {
            perf['Program:exit']();
          }
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            // Continue with reduced functionality
            trackOperation(perfKey, 'programExitSkipped');
          }
          // Ignore errors during cleanup
        }
      },
    };

    // Replace the default Program:exit with our enhanced version
    const originalProgramExit = visitor['Program:exit'];

    visitor['Program:exit'] = (node: TSESTree.Program): void => {
      try {
        // Call the performance tracker's Program:exit first
        if (perf && typeof perf['Program:exit'] === 'function') {
          perf['Program:exit']();
        }

        // Then call the original Program:exit if it exists
        if (typeof originalProgramExit === 'function') {
          originalProgramExit.call(this, node);
        }

        // Record final metrics if performance tracking is enabled
        if (options.performance?.enableMetrics) {
          try {
            recordMetric(perfKey, 'finalMetrics', metrics);

            // Log detailed metrics if enabled
            if (options.performance.logMetrics) {
              console.info(`[${context.filename}] Performance metrics:`, {
                signalChecks: metrics.signalChecks,
                effectVisits: metrics.effectVisits,
                layoutEffectVisits: metrics.layoutEffectVisits,
                signalAssignments: metrics.signalAssignments,
                cacheStats: {
                  patternCacheSize: patternCache.size,
                  signalNameCacheSize: signalNameCache.size,
                },
              });
            }
          } catch (error: unknown) {
            // Ignore errors in metrics recording
            if (error instanceof PerformanceLimitExceededError) {
              trackOperation(perfKey, 'metricsRecordingSkipped');
            }
          }
        }

        // Log performance metrics if enabled
        if (options.performance?.logMetrics) {
          console.info(`[${context.filename}] Performance metrics:`, {
            signalChecks: metrics.signalChecks,
            effectVisits: metrics.effectVisits,
            layoutEffectVisits: metrics.layoutEffectVisits,
            signalAssignments: metrics.signalAssignments,
          });
        }
      } catch (error: unknown) {
        // Handle any errors during cleanup
        if (error instanceof PerformanceLimitExceededError) {
          trackOperation(perfKey, 'cleanupSkipped');
        }
        // Re-throw to ensure the linter is aware of the error
        throw error;
      } finally {
        // Ensure we always clean up performance tracking
        try {
          stopTracking(perfKey);
        } catch (error) {
          // Ignore errors during stop tracking
          if (error instanceof PerformanceLimitExceededError) {
            trackOperation(perfKey, 'stopTrackingSkipped');
          }
        }
      }
    };

    return visitor;
  },
});
