// FIXED by @ospm/eslint-plugin-react-signals-hooks
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';

import {
  endPhase,
  startPhase,
  stopTracking,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames: string[];
  /** Patterns where mutations are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns: string[];
  /** Custom severity levels for different violation types */
  severity: {
    signalValueAssignment: 'error' | 'warn' | 'off';
    signalPropertyAssignment: 'error' | 'warn' | 'off';
    signalArrayIndexAssignment: 'error' | 'warn' | 'off';
    signalNestedPropertyAssignment: 'error' | 'warn' | 'off';
  };
  /** Performance tuning option */
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'signalValueAssignment'
  | 'signalValueUpdate'
  | 'signalPropertyAssignment'
  | 'suggestUseEffect'
  | 'suggestEventHandler'
  | 'signalArrayIndexAssignment'
  | 'signalNestedPropertyAssignment';

function getAssignmentType(
  node: TSESTree.AssignmentExpression
): 'computedMemberAssignment' | 'memberAssignment' | 'identifierAssignment' | 'otherAssignment' {
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

function trackIdentifier(
  name: string,
  perfKey: string,
  resolvedIdentifiers: Map<string, number>
): void {
  const count = resolvedIdentifiers.get(name) ?? 0;

  resolvedIdentifiers.set(name, count + 1);

  if (count === 0) {
    // Only count unique identifier resolutions
    trackOperation(perfKey, PerformanceOperations.identifierResolution);
  }
}

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

const resolvedIdentifiers = new Map<string, number>();

let inRenderContext = false;
let renderDepth = 0;
let hookDepth = 0;
let functionDepth = 0;

const ruleName = 'no-mutation-in-render';

export const noMutationInRenderRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct signal mutation during render',
      url: getRuleDocUrl(ruleName),
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
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option.performance.enableMetrics,
        logMetrics: option.performance.logMetrics,
      },
    });

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    startPhase(perfKey, 'fileAnalysis');

    if (
      option.allowedPatterns?.some((pattern: string): boolean => {
        try {
          return new RegExp(pattern).test(context.filename);
        } catch (error: unknown) {
          console.error(`Invalid regex pattern: ${pattern}`, error);
          // Invalid regex pattern, ignore it
          return false;
        }
      }) ??
      false
    ) {
      trackOperation(perfKey, PerformanceOperations.fileAnalysis);

      endPhase(perfKey, 'fileAnalysis');

      return {};
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
      },

      FunctionDeclaration(node: TSESTree.FunctionDeclaration): void {
        trackOperation(perfKey, PerformanceOperations.FunctionDeclarationProcessing);

        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          trackOperation(
            perfKey,
            PerformanceOperations.reactComponentFunctionDeclarationProcessing
          );

          inRenderContext = true;

          renderDepth++;

          trackIdentifier(node.id.name, perfKey, resolvedIdentifiers);

          startPhase(perfKey, `render:${node.id.name}`);
          startPhase(perfKey, `render:${node.id.name}`);
        }
      },

      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
        trackOperation(perfKey, PerformanceOperations.ArrowFunctionExpressionProcessing);

        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          // This is a React component
          trackOperation(
            perfKey,
            PerformanceOperations.reactComponentArrowFunctionExpressionProcessing
          );

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
        trackOperation(perfKey, PerformanceOperations.FunctionExpressionProcessing);

        functionDepth++;

        // Check if this is a React component
        if (
          node.parent?.type === 'VariableDeclarator' &&
          node.parent.id?.type === 'Identifier' &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          trackOperation(perfKey, PerformanceOperations.reactComponentFunctionExpressionProcessing);

          inRenderContext = true;

          renderDepth++;

          trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

          startPhase(perfKey, `render:${node.parent.id.name}`);
        } else if (functionDepth === 1 && renderDepth >= 1) {
          // This is a nested function inside a render method
          inRenderContext = false;
        }
      },
      CallExpression(node: TSESTree.CallExpression): void {
        trackOperation(perfKey, PerformanceOperations.CallExpressionProcessing);

        type CalleeNames =
          | 'useEffect'
          | 'useLayoutEffect'
          | 'useCallback'
          | 'useMemo'
          | 'useImperativeHandle' // @preact/signals-core effect
          | 'effect'
          | 'computed';

        if (
          node.callee.type === 'Identifier' &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            // @preact/signals-core effect
            'effect',
            // @preact/signals-core computed
            'computed',
          ].includes(node.callee.name)
        ) {
          trackOperation(perfKey, PerformanceOperations[`hook:${node.callee.name as CalleeNames}`]);

          hookDepth++;

          if (hookDepth === 1) {
            inRenderContext = false;

            trackOperation(perfKey, PerformanceOperations.enteredHookContextProcessing);
          }
        }

        if (node.callee.type === 'Identifier' && option.signalNames.includes(node.callee.name)) {
          trackOperation(perfKey, PerformanceOperations.signalFunctionCallProcessing);

          trackIdentifier(node.callee.name, perfKey, resolvedIdentifiers);
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        trackOperation(perfKey, PerformanceOperations.AssignmentExpressionProcessing);

        // Skip if not in a render context or inside hooks/functions
        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        startPhase(perfKey, PerformanceOperations.assignmentAnalysis);

        const assignmentType = getAssignmentType(node);

        trackOperation(perfKey, PerformanceOperations[`assignmentType:${assignmentType}`]);

        // Check for direct signal value assignment (signal.value = x)
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'value' &&
          node.left.object.type === 'Identifier' &&
          option.signalNames.some((name: string): boolean => {
            return (
              ('object' in node.left &&
                'name' in node.left.object &&
                node.left.object.name.endsWith(name.replace(/^[A-Z]/, ''))) ||
              ('object' in node.left &&
                'name' in node.left.object &&
                node.left.object.name === name)
            );
          })
        ) {
          const severity = getSeverity('signalValueAssignment', option);

          if (severity === 'off') {
            return;
          }

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

        if (
          node.left.type === 'MemberExpression' &&
          node.left.computed &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.property.type === 'Identifier' &&
          node.left.object.property.name === 'value' &&
          node.left.object.object.type === 'Identifier' &&
          option.signalNames.some((name: string): boolean => {
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
        ) {
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

        if (
          node.left.type === 'MemberExpression' &&
          !node.left.computed &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.property.type === 'Identifier' &&
          node.left.object.property.name === 'value' &&
          node.left.object.object.type === 'Identifier' &&
          option.signalNames.some((name: string): boolean => {
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
        ) {
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
        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        // Check for signal.value++ or ++signal.value
        if (
          node.argument.type === 'MemberExpression' &&
          node.argument.property.type === 'Identifier' &&
          node.argument.property.name === 'value' &&
          node.argument.object.type === 'Identifier' &&
          option.signalNames.some((name: string): boolean => {
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

      'FunctionDeclaration > :not(FunctionDeclaration)'(node: TSESTree.FunctionDeclaration): void {
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          renderDepth--;

          if (renderDepth === 0) inRenderContext = false;
        }
      },

      'ArrowFunctionExpression > :not(ArrowFunctionExpression)'(
        node: TSESTree.ArrowFunctionExpression
      ): void {
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

      'FunctionExpression > :not(FunctionExpression)'(_node: TSESTree.FunctionExpression): void {
        functionDepth--;

        if (functionDepth === 0 && renderDepth >= 1 && hookDepth === 0) {
          inRenderContext = true; // Back in render context
        }
      },
      'CallExpression:exit'(node: TSESTree.CallExpression): void {
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
      'Program:exit'(_node: TSESTree.Program): void {
        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (typeof finalMetrics !== 'undefined') {
            console.info(
              `\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget ? 'EXCEEDED' : 'OK'}):`
            );
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

            if (finalMetrics.exceededBudget) {
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
