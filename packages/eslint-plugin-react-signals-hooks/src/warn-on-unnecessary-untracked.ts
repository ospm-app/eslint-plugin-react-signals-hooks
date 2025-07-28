import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import {
  endPhase,
  startPhase,
  recordMetric,
  stopTracking,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type Option = {
  allowInEffects: boolean;
  allowInEventHandlers: boolean;
  allowForSignalWrites: boolean;
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'unnecessaryUntracked'
  | 'unnecessaryPeek'
  | 'suggestRemoveUntracked'
  | 'suggestRemovePeek';

function containsSignalAccess(node: TSESTree.Node): boolean {
  if (
    [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
      'ClassMethod',
      'ClassPrivateMethod',
      'ObjectMethod',
    ].includes(node.type)
  ) {
    return false;
  }

  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    (node.object.name.endsWith('Signal') || node.object.name.endsWith('signal'))
  ) {
    return true;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.some((child: TSESTree.JSXChild): boolean => {
      return child && typeof child === 'object' && 'type' in child && containsSignalAccess(child);
    });
  }

  if ('properties' in node && Array.isArray(node.properties)) {
    return node.properties.some(
      (
        prop:
          | TSESTree.PropertyComputedName
          | TSESTree.PropertyNonComputedName
          | TSESTree.RestElement
          | TSESTree.SpreadElement
      ) => {
        return containsSignalAccess(prop);
      }
    );
  }

  if ('elements' in node && Array.isArray(node.elements)) {
    return node.elements.some((element: TSESTree.Node | null): boolean => {
      return (
        element !== null &&
        typeof element === 'object' &&
        'type' in element &&
        containsSignalAccess(element)
      );
    });
  }

  for (const key of Object.keys(node)) {
    if (['parent', 'loc', 'range', 'type'].includes(key)) {
      continue;
    }

    const value = node[key as keyof typeof node];

    if (Array.isArray(value)) {
      if (
        value.some(
          (item) => item && typeof item === 'object' && 'type' in item && containsSignalAccess(item)
        )
      ) {
        return true;
      }
    } else if (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      containsSignalAccess(value)
    ) {
      return true;
    }
  }

  return false;
}

function isSignalNode(node: TSESTree.Node): boolean {
  return (
    node.type === 'Identifier' && (node.name.endsWith('Signal') || node.name.endsWith('signal'))
  );
}

function isPeekAccess(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'peek' &&
    node.arguments.length === 0 &&
    node.callee.object.type === 'MemberExpression' &&
    node.callee.object.property.type === 'Identifier' &&
    node.callee.object.property.name === 'value' &&
    isSignalNode(node.callee.object.object)
  );
}

function isUnnecessaryUntrackedCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'untracked' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ArrowFunctionExpression' &&
    node.arguments[0].params.length === 0 &&
    containsSignalAccess(node.arguments[0].body)
  );
}

function isInReactiveContext(
  node: TSESTree.Node,
  context: RuleContext<MessageIds, Options>
): boolean {
  // Check if we're in a component or hook
  if (!isInComponentOrHook(node)) {
    return false;
  }

  // Check if we're in an effect
  if (context.options[0].allowInEffects === false) {
    let parent = node.parent;
    while (parent) {
      if (
        parent.type === 'CallExpression' &&
        parent.callee.type === 'Identifier' &&
        parent.callee.name === 'useSignalEffect'
      ) {
        return false;
      }
      parent = parent.parent;
    }
  }

  // Check if we're in an event handler
  if (context.options[0].allowInEventHandlers === false) {
    let parent = node.parent;
    while (parent) {
      if (
        parent.type === 'JSXAttribute' &&
        parent.name.type === 'JSXIdentifier' &&
        parent.name.name.startsWith('on') &&
        parent.name.name[2] === parent.name.name[2].toUpperCase()
      ) {
        return false;
      }
      parent = parent.parent;
    }
  }

  return true;
}

function isInSignalWriteContext(node: TSESTree.Node): boolean {
  // Check if this node is part of an assignment to a signal
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    // Check for direct assignment to signal.value
    if (
      parent.type === 'AssignmentExpression' &&
      parent.left.type === 'MemberExpression' &&
      parent.left.property.type === 'Identifier' &&
      parent.left.property.name === 'value' &&
      parent.left.object.type === 'Identifier' &&
      (parent.left.object.name.endsWith('Signal') || parent.left.object.name.endsWith('signal'))
    ) {
      return true;
    }

    // Check for increment/decrement operators
    if (
      (parent.type === 'UpdateExpression' || parent.type === 'UnaryExpression') &&
      parent.argument.type === 'MemberExpression' &&
      parent.argument.property.type === 'Identifier' &&
      parent.argument.property.name === 'value' &&
      parent.argument.object.type === 'Identifier' &&
      (parent.argument.object.name.endsWith('Signal') ||
        parent.argument.object.name.endsWith('signal'))
    ) {
      return true;
    }

    // Stop at function boundaries
    if (
      [
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'ClassMethod',
        'ClassPrivateMethod',
        'ObjectMethod',
      ].includes(parent.type)
    ) {
      break;
    }

    parent = parent.parent;
  }

  return false;
}

function isInComponentOrHook(node: TSESTree.Node): boolean {
  let currentNode: TSESTree.Node | null = node;

  while (currentNode) {
    if (
      ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(
        currentNode.type
      )
    ) {
      let functionName = 'anonymous';

      if (currentNode.type === 'FunctionDeclaration' && currentNode.id) {
        functionName = currentNode.id.name;
      } else if (
        currentNode.parent?.type === 'VariableDeclarator' &&
        currentNode.parent.id.type === 'Identifier'
      ) {
        functionName = currentNode.parent.id.name;
      }

      return /^[A-Z]/.test(functionName) || functionName.startsWith('use');
    }

    currentNode = currentNode.parent || null;
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'warn-on-unnecessary-untracked';

export const warnOnUnnecessaryUntrackedRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warns about unnecessary `untracked()` calls and `.peek()` usage in reactive contexts. In React components using signals, these patterns can often be simplified for better performance and readability. The rule helps identify when these optimizations are no longer needed or could be replaced with direct signal access.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      unnecessaryUntracked: "Avoid unnecessary 'untracked()' in reactive context",
      unnecessaryPeek: "Avoid unnecessary '.peek()' in reactive context",
      suggestRemoveUntracked: "Remove unnecessary 'untracked()' wrapper",
      suggestRemovePeek: "Use '.value' instead of '.peek()'",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInEffects: {
            type: 'boolean',
            description: 'Allow in useSignalEffect callbacks',
            default: true,
          },
          allowInEventHandlers: {
            type: 'boolean',
            description: 'Allow in DOM event handlers',
            default: true,
          },
          allowForSignalWrites: {
            type: 'boolean',
            description: 'Allow when used to prevent circular dependencies in effects',
            default: true,
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
    hasSuggestions: true,
  },
  defaultOptions: [
    {
      allowInEffects: true,
      allowInEventHandlers: true,
      allowForSignalWrites: true,
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'rule-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    if (option.performance.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    // Track rule initialization
    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option.performance.enableMetrics,
        logMetrics: option.performance.logMetrics,
      },
    });

    endPhase(perfKey, 'rule-init');

    startPhase(perfKey, 'rule-execution');

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

    let nodeCount = 0;

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option.performance?.maxNodes ?? 2_000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    trackOperation(perfKey, PerformanceOperations.ruleInitialization);

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

      CallExpression(node: TSESTree.CallExpression): void {
        // Check for unnecessary untracked()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'untracked' &&
          isUnnecessaryUntrackedCall(node) &&
          isInReactiveContext(node, context)
        ) {
          context.report({
            node,
            messageId: 'unnecessaryUntracked',
            suggest: [
              {
                messageId: 'suggestRemoveUntracked',
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const arg = node.arguments[0];

                  if (!('body' in arg)) {
                    return null;
                  }

                  return fixer.replaceText(node, context.sourceCode.getText(arg.body));
                },
              },
            ],
          });
        }
        // Check for .peek() usage
        else if (isPeekAccess(node) && isInReactiveContext(node, context)) {
          // Check if this is a signal write operation
          const isSignalWrite = isInSignalWriteContext(node);

          if (!isSignalWrite || !option.allowForSignalWrites) {
            context.report({
              node,
              messageId: 'unnecessaryPeek',
              suggest: [
                {
                  messageId: 'suggestRemovePeek',
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    if ('object' in node.callee) {
                      return fixer.replaceText(
                        node,
                        `${context.sourceCode.getText(node.callee.object)}.value`
                      );
                    }

                    return null;
                  },
                },
              ],
            });
          }
        }
      },

      // Clean up
      'Program:exit'(): void {
        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
            const status = finalMetrics.exceededBudget ? 'EXCEEDED' : 'OK';

            console.info(`\n[${ruleName}] Performance Metrics (${status}):`);
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
