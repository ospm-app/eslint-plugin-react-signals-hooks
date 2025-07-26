// FIXED by @ospm/eslint-plugin-react-signals-hooks
import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
  stopTracking,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import type { PerformanceBudget } from './utils/types.js';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}.md`;
});

type MessageIds =
  | 'signalValueAssignment'
  | 'signalValueUpdate'
  | 'signalPropertyAssignment'
  | 'suggestUseEffect'
  | 'suggestEventHandler'
  | 'signalArrayIndexAssignment'
  | 'signalNestedPropertyAssignment';

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: string[] | undefined;
  /** Patterns where mutations are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: string[] | undefined;
  /** Custom severity levels for different violation types */
  severity?:
    | {
        signalValueAssignment?: 'error' | 'warn' | 'off' | undefined;
        signalPropertyAssignment?: 'error' | 'warn' | 'off' | undefined;
        signalArrayIndexAssignment?: 'error' | 'warn' | 'off' | undefined;
        signalNestedPropertyAssignment?: 'error' | 'warn' | 'off' | undefined;
      }
    | undefined;
  /** Performance tuning option */
  performance?: PerformanceBudget | undefined;
};

type Options = [Option];

/**
 * Determines the type of assignment for performance tracking
 */
function getAssignmentType(node: TSESTree.AssignmentExpression): string {
  if (node.left.type === 'MemberExpression') {
    if (node.left.computed) {
      return 'computedMemberAssignment';
    }
    return 'memberAssignment';
  }

  if (node.left.type === 'Identifier') {
    return 'identifierAssignment';
  }
  return 'otherAssignment';
}

/**
 * Checks if the assignment is a direct signal value assignment (signal.value = x)
 */
function isDirectSignalValueAssignment(
  node: TSESTree.AssignmentExpression,
  signalNames: string[]
): boolean {
  return (
    node.left.type === 'MemberExpression' &&
    node.left.property.type === 'Identifier' &&
    node.left.property.name === 'value' &&
    node.left.object.type === 'Identifier' &&
    signalNames.some((name: string): boolean => {
      return (
        ('object' in node.left &&
          'name' in node.left.object &&
          node.left.object.name.endsWith(name.replace(/^[A-Z]/, ''))) ||
        ('object' in node.left && 'name' in node.left.object && node.left.object.name === name)
      );
    })
  );
}

/**
 * Checks if the assignment is an array index assignment on a signal (signal.value[index] = x)
 */
function isArrayIndexSignalAssignment(
  node: TSESTree.AssignmentExpression,
  signalNames: string[]
): boolean {
  return (
    node.left.type === 'MemberExpression' &&
    node.left.computed &&
    node.left.object.type === 'MemberExpression' &&
    node.left.object.property.type === 'Identifier' &&
    node.left.object.property.name === 'value' &&
    node.left.object.object.type === 'Identifier' &&
    signalNames.some((name: string): boolean => {
      return (
        ('object' in node.left &&
          'object' in node.left.object &&
          'name' in node.left.object.object &&
          node.left.object.object.name.endsWith(name.replace(/^[A-Z]/, ''))) ||
        ('object' in node.left &&
          'object' in node.left.object &&
          'name' in node.left.object.object &&
          node.left.object.object.name === name)
      );
    })
  );
}

/**
 * Checks if the assignment is a nested property assignment on a signal (signal.value.prop = x)
 */
function isNestedSignalPropertyAssignment(
  node: TSESTree.AssignmentExpression,
  signalNames: string[]
): boolean {
  return (
    node.left.type === 'MemberExpression' &&
    !node.left.computed &&
    node.left.object.type === 'MemberExpression' &&
    node.left.object.property.type === 'Identifier' &&
    node.left.object.property.name === 'value' &&
    node.left.object.object.type === 'Identifier' &&
    signalNames.some((name: string): boolean => {
      return (
        ('object' in node.left &&
          'object' in node.left.object &&
          'name' in node.left.object.object &&
          node.left.object.object.name.endsWith(name.replace(/^[A-Z]/, ''))) ||
        ('object' in node.left &&
          'object' in node.left.object &&
          'name' in node.left.object.object &&
          node.left.object.object.name === name)
      );
    })
  );
}

// Helper function to track identifier resolution
function trackIdentifier(
  name: string,
  perfKey: string,
  resolvedIdentifiers: Map<string, number>
): void {
  const count = resolvedIdentifiers.get(name) || 0;
  resolvedIdentifiers.set(name, count + 1);

  if (count === 0) {
    // Only count unique identifier resolutions
    trackOperation(perfKey, 'identifierResolution');
  }
}

// Helper function to get severity level for a specific violation type
function getSeverity(messageId: MessageIds, option: Option): 'error' | 'warn' | 'off' {
  if (!option.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'signalValueAssignment': {
      return option.severity.signalValueAssignment ?? 'error';
    }

    case 'signalPropertyAssignment': {
      return option.severity.signalPropertyAssignment ?? 'error';
    }

    case 'signalArrayIndexAssignment': {
      return option.severity.signalArrayIndexAssignment ?? 'error';
    }

    case 'signalNestedPropertyAssignment': {
      return option.severity.signalNestedPropertyAssignment ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

/**
 * ESLint rule: no-mutation-in-render
 *
 * Disallows direct signal mutation during render.
 * Signal mutations should occur in effects, event handlers, or other side-effect contexts.
 */
export const noMutationInRenderRule = createRule<Options, MessageIds>({
  name: 'no-mutation-in-render',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct signal mutation during render',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-mutation-in-render',
    },
    hasSuggestions: true,
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          signalNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
            description: 'Custom signal function names',
          },
          allowedPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
            description: 'Patterns where mutations are allowed',
          },
          severity: {
            type: 'object',
            properties: {
              signalValueAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalPropertyAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalArrayIndexAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalNestedPropertyAssignment: {
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
                default: 50,
                description: 'Maximum time in milliseconds the rule should take to process a file',
              },
              maxNodes: {
                type: 'number',
                minimum: 100,
                default: 2000,
                description: 'Maximum number of AST nodes the rule should process',
              },
              maxMemory: {
                type: 'number',
                minimum: 1024 * 1024, // 1MB
                default: 50 * 1024 * 1024, // 50MB
                description: 'Maximum memory in bytes the rule should use',
              },
              maxOperations: {
                type: 'object',
                properties: {
                  signalAccess: {
                    type: 'number',
                    minimum: 1,
                    default: 500,
                    description: 'Maximum number of signal accesses',
                  },
                  nestedPropertyCheck: {
                    type: 'number',
                    minimum: 1,
                    default: 200,
                    description: 'Maximum number of nested property checks',
                  },
                  identifierResolution: {
                    type: 'number',
                    minimum: 1,
                    default: 300,
                    description: 'Maximum number of identifier resolutions',
                  },
                  scopeLookup: {
                    type: 'number',
                    minimum: 1,
                    default: 400,
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
    messages: {
      signalValueAssignment:
        'Avoid mutating signal.value directly in render. Move this to an effect or event handler.',
      signalValueUpdate:
        'Avoid updating signal.value with operators (++, --, +=, etc.) in render. Move this to an effect or event handler.',
      signalPropertyAssignment:
        'Avoid mutating signal properties directly in render. Move this to an effect or event handler.',
      signalArrayIndexAssignment:
        'Avoid mutating array indexes of signal values in render. Move this to an effect or event handler.',
      signalNestedPropertyAssignment:
        'Avoid mutating nested properties of signal values in render. Move this to an effect or event handler.',
      suggestUseEffect: 'Wrap in useEffect',
      suggestEventHandler: 'Move to event handler',
    },
  },
  defaultOptions: [
    {
      signalNames: ['signal', 'useSignal', 'createSignal'],
      allowedPatterns: [],
      severity: {
        signalValueAssignment: 'error',
        signalPropertyAssignment: 'error',
        signalArrayIndexAssignment: 'error',
        signalNestedPropertyAssignment: 'error',
      },
      performance: {
        // Time and resource limits
        maxTime: 50, // ms
        maxNodes: 2000,
        maxMemory: 50 * 1024 * 1024, // 50MB

        // Operation limits using standardized operation names
        maxOperations: {
          [PerformanceOperations.signalAccess]: 1000,
          [PerformanceOperations.signalCheck]: 500,
          [PerformanceOperations.nestedPropertyCheck]: 500,
          [PerformanceOperations.identifierResolution]: 1000,
          [PerformanceOperations.scopeLookup]: 1000,
          [PerformanceOperations.typeCheck]: 500,
        },

        // Feature toggles
        enableMetrics: false,
        logMetrics: false,
      },
    },
  ],
  create(context, [option = {}]): ESLintUtils.RuleListener {
    // Set up performance tracking for this rule
    const perfKey = `no-mutation-in-render:${context.filename}`;

    const perfBudget: PerformanceBudget = {
      maxTime: option.performance?.maxTime ?? 50, // ms
      maxNodes: option.performance?.maxNodes ?? 2000, // Maximum nodes to process
      maxMemory: option.performance?.maxMemory ?? 50 * 1024 * 1024, // 50MB
      maxOperations: {
        [PerformanceOperations.signalAccess]:
          option.performance?.maxOperations?.signalAccess ?? 1000,
        [PerformanceOperations.signalCheck]: option.performance?.maxOperations?.signalCheck ?? 500,
        [PerformanceOperations.nestedPropertyCheck]:
          option.performance?.maxOperations?.nestedPropertyCheck ?? 500,
        [PerformanceOperations.identifierResolution]:
          option.performance?.maxOperations?.identifierResolution ?? 1000,
        [PerformanceOperations.scopeLookup]: option.performance?.maxOperations?.scopeLookup ?? 1000,
        [PerformanceOperations.typeCheck]: option.performance?.maxOperations?.typeCheck ?? 500,
      },
      enableMetrics: option.performance?.enableMetrics ?? false,
      logMetrics: option.performance?.logMetrics ?? false,
    };

    // Initialize performance tracking
    const perf = createPerformanceTracker(perfKey, perfBudget, context);

    // Track rule initialization
    trackOperation(perfKey, 'ruleInit');

    // Default signal names if none provided
    const signalNames = option.signalNames ?? ['signal', 'useSignal', 'createSignal'];

    const isFileExempt =
      option.allowedPatterns?.some((pattern): boolean => {
        try {
          return new RegExp(pattern).test(context.filename);
        } catch (e: unknown) {
          console.error(`Invalid regex pattern: ${pattern}`, e);
          // Invalid regex pattern, ignore it
          return false;
        }
      }) ?? false;

    // Track file analysis start
    startPhase(perfKey, 'fileAnalysis');

    // Track signal names being used
    trackOperation(perfKey, 'signalNames', signalNames.length);

    // Skip rule if file matches any allowed patterns
    if (isFileExempt) {
      trackOperation(perfKey, 'fileExempt');
      endPhase(perfKey, 'fileAnalysis');
      return {};
    }

    // Track node processing
    let nodeCount = 0;

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, 'nodeBudgetExceeded');

        return false;
      }

      return true;
    }

    // Track identifier resolution
    const resolvedIdentifiers = new Map<string, number>();

    let inRenderContext = false;
    let renderDepth = 0;
    let hookDepth = 0;
    let functionDepth = 0; // Track nested functions

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
          trackOperation(perfKey, `${node.type}Processing`);
        }
      },
      FunctionDeclaration(node: TSESTree.FunctionDeclaration): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        // Track function declaration processing
        trackOperation(perfKey, 'functionDeclaration');

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          trackOperation(perfKey, 'reactComponentRender');
          inRenderContext = true;
          renderDepth++;

          // Track component name for analysis
          trackIdentifier(node.id.name, perfKey, resolvedIdentifiers);

          // Start a new phase for this component render
          startPhase(perfKey, `render:${node.id.name}`);
        }
      },
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        trackOperation(perfKey, 'arrowFunction');

        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          // This is a React component
          trackOperation(perfKey, 'reactComponentArrow');
          inRenderContext = true;

          renderDepth++;

          // Track component name for analysis
          trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

          // Start a new phase for this component render
          startPhase(perfKey, `render:${node.parent.id.name}`);
        } else {
          // This is a regular arrow function
          functionDepth++;

          if (functionDepth === 1 && renderDepth >= 1) {
            inRenderContext = false;
          }
        }
      },
      FunctionExpression(node: TSESTree.FunctionExpression): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        trackOperation(perfKey, 'functionExpression');
        functionDepth++;

        // Check if this is a React component
        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          trackOperation(perfKey, 'reactComponentFunction');
          inRenderContext = true;
          renderDepth++;

          // Track component name for analysis
          trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

          // Start a new phase for this component render
          startPhase(perfKey, `render:${node.parent.id.name}`);
        } else if (functionDepth === 1 && renderDepth >= 1) {
          // This is a nested function inside a render method
          inRenderContext = false;
        }
      },
      CallExpression(node: TSESTree.CallExpression): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        trackOperation(perfKey, 'callExpression');

        // Track hook usage
        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect', // @preact/signals-core effect
            'computed', // @preact/signals-core computed
          ].includes(node.callee.name)
        ) {
          trackOperation(perfKey, `hook:${node.callee.name}`);
          hookDepth++;
          if (hookDepth === 1) {
            inRenderContext = false;
            trackOperation(perfKey, 'enteredHookContext');
          }
        }

        // Track signal function calls
        if (node.callee.type === 'Identifier' && signalNames.includes(node.callee.name)) {
          trackOperation(perfKey, 'signalFunctionCall');
          trackIdentifier(node.callee.name, perfKey, resolvedIdentifiers);
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        trackOperation(perfKey, 'assignmentExpression');

        // Skip if not in a render context or inside hooks/functions
        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        // Start phase for assignment analysis
        startPhase(perfKey, 'assignmentAnalysis');

        // Track the type of assignment
        const assignmentType = getAssignmentType(node);

        trackOperation(perfKey, `assignmentType:${assignmentType}`);

        // Check for direct signal value assignment (signal.value = x)
        const isSignalValueAssignment = isDirectSignalValueAssignment(node, signalNames);

        if (!isSignalValueAssignment) {
        } else {
          const severity = getSeverity('signalValueAssignment', option);
          if (severity === 'off') return;

          context.report({
            node,
            messageId: 'signalValueAssignment',
            suggest: [
              {
                messageId: 'suggestUseEffect',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.replaceText(
                    node,
                    `useEffect(() => { ${context.sourceCode.getText(node)} }, [])`
                  );
                },
              },
              {
                messageId: 'suggestEventHandler',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.replaceText(
                    node,
                    `const handleEvent = () => { ${context.sourceCode.getText(node)} }`
                  );
                },
              },
            ],
          });

          return;
        }

        if (isArrayIndexSignalAssignment(node, signalNames)) {
          const severity = getSeverity('signalArrayIndexAssignment', option);

          if (severity !== 'off') {
            context.report({
              node,
              messageId: 'signalArrayIndexAssignment',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    return fixer.replaceText(
                      node,
                      `useEffect(() => { ${context.sourceCode.getText(node)} }, [${
                        'object' in node.left &&
                        'object' in node.left.object &&
                        'name' in node.left.object.object &&
                        node.left.object.object.name
                      }])`
                    );
                  },
                },
              ],
            });
          }

          return;
        }

        if (isNestedSignalPropertyAssignment(node, signalNames)) {
          if (getSeverity('signalNestedPropertyAssignment', option) !== 'off') {
            context.report({
              node,
              messageId: 'signalNestedPropertyAssignment',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    return fixer.replaceText(
                      node,
                      `useEffect(() => { ${context.sourceCode.getText(node)} }, [])`
                    );
                  },
                },
              ],
            });
          }
        }
      },
      UpdateExpression(node: TSESTree.UpdateExpression): void {
        perf.trackNode(node);

        if (!shouldContinue()) {
          return;
        }

        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        // Check for signal.value++ or ++signal.value
        if (
          node.argument.type === 'MemberExpression' &&
          node.argument.property.type === 'Identifier' &&
          node.argument.property.name === 'value' &&
          node.argument.object.type === 'Identifier' &&
          signalNames.some((name): boolean => {
            return (
              ('object' in node.argument &&
                'object' in node.argument.object &&
                'name' in node.argument.object &&
                typeof node.argument.object.name === 'string' &&
                node.argument.object.name.endsWith(name.replace(/^[A-Z]/, ''))) ||
              ('object' in node.argument &&
                'name' in node.argument.object &&
                typeof node.argument.object.name === 'string' &&
                node.argument.object.name === name)
            );
          })
        ) {
          const severity = getSeverity('signalValueAssignment', option);

          if (severity === 'off') {
            return;
          }

          context.report({
            node,
            messageId: 'signalValueUpdate',
            suggest: [
              {
                messageId: 'suggestUseEffect',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.replaceText(
                    node,
                    `useEffect(() => { ${context.sourceCode.getText(node)} }, [${
                      'object' in node.argument &&
                      'name' in node.argument.object &&
                      typeof node.argument.object.name === 'string'
                        ? node.argument.object.name
                        : ''
                    }])`
                  );
                },
              },
              {
                messageId: 'suggestEventHandler',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.replaceText(
                    node,
                    `const handleEvent = () => { ${context.sourceCode.getText(node)} }`
                  );
                },
              },
            ],
          });
        }
      },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration): void {
        perf.trackNode(node);

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          renderDepth--;

          if (renderDepth === 0) inRenderContext = false;
        }
      },
      'ArrowFunctionExpression:exit'(node: TSESTree.ArrowFunctionExpression): void {
        perf.trackNode(node);

        // Check if this is the main component arrow function
        if (
          node.parent.type === 'VariableDeclarator' &&
          node.parent.id.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          // This is a main component - exit render context
          renderDepth--;

          if (renderDepth === 0) {
            inRenderContext = false;
          }
        } else {
          // This is a nested arrow function - back to render context if appropriate
          functionDepth--;

          if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
            inRenderContext = true;
          }
        }
      },
      'FunctionExpression:exit'(node: TSESTree.FunctionExpression): void {
        perf.trackNode(node);

        functionDepth--;

        if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
          inRenderContext = true; // Back in render context
        }
      },
      'CallExpression:exit'(node: TSESTree.CallExpression): void {
        perf.trackNode(node);

        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect', // @preact/signals-core effect
            'computed', // @preact/signals-core computed
          ].includes(node.callee.name)
        ) {
          hookDepth--;
          if (hookDepth === 0 && renderDepth >= 1 && functionDepth === 0) {
            inRenderContext = true;
          }
        }
      },
      'Program:exit'(node: TSESTree.Program): void {
        if (!perf) {
          throw new Error('Performance tracker not initialized');
        }

        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
            const { exceededBudget, nodeCount, duration } = finalMetrics;
            const status = exceededBudget ? 'EXCEEDED' : 'OK';

            console.info(`\n[prefer-batch-updates] Performance Metrics (${status}):`);
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
  },
});
