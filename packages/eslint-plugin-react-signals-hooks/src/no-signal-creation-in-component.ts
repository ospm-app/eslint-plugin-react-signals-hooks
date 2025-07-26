import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint';
import {
  endPhase,
  startPhase,
  stopTracking,
  startTracking,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  trackOperation,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';

type Option = {
  /** Performance tuning option */
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'avoidSignalInComponent'
  | 'suggestMoveToModuleLevel'
  | 'suggestMoveToCustomHook'
  | 'moveToModuleLevel'
  | 'createCustomHook';

function debug(message: string, data?: unknown | undefined): void {
  console.info(`[no-signal-creation-in-component] ${message}`, data ?? '');
}

function getParentNode(node: TSESTree.Node): TSESTree.Node | undefined {
  debug('Getting parent node', {
    nodeType: node.type,
    parentType: node.parent?.type,
    nodeText: 'code' in node ? node.code : 'N/A',
  });

  return node.parent;
}

function isReactComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function isHookName(name: string): boolean {
  return name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase();
}

function getSignalInfo(node: TSESTree.CallExpression, sourceCode: Readonly<SourceCode>) {
  const signalName = node.callee.type === 'Identifier' ? node.callee.name : 'signal';

  return {
    signalName,
    signalValue: node.arguments.length > 0 ? sourceCode.getText(node.arguments[0]) : 'undefined',
    varName: signalName === 'signal' ? 'value' : 'computedValue',
  };
}

function getNewLine(sourceCode: Readonly<SourceCode>): string {
  return sourceCode.getText().includes('\r\n') ? '\r\n' : '\n';
}

function generateUniqueHookName(
  context: Readonly<RuleContext<MessageIds, Options>>,
  baseName: string
): string {
  const usedNames = new Set<string>();

  function collectNames(node: TSESTree.Node): void {
    if (node.type === 'Identifier' && node.parent?.type !== 'MemberExpression') {
      usedNames.add(node.name);
    }

    if ('body' in node && Array.isArray(node.body)) {
      node.body.forEach(collectNames);
    } else if ('body' in node && node.body) {
      collectNames(node.body as TSESTree.Node);
    }

    if ('declarations' in node && Array.isArray(node.declarations)) {
      node.declarations.forEach(collectNames);
    }
  }

  collectNames(context.sourceCode.ast);

  let hookName = `use${baseName.charAt(0).toUpperCase() + baseName.slice(1)}`;
  let counter = 1;

  while (usedNames.has(hookName)) {
    hookName = `use${baseName.charAt(0).toUpperCase() + baseName.slice(1)}${counter++}`;
  }

  return hookName;
}

function getNodeText<Options extends Array<unknown>>(
  node: TSESTree.Node,
  context: Readonly<RuleContext<MessageIds, Options>>
): string {
  try {
    return context.sourceCode.getText(node);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    console.error(error);
    return `[${node.type}]`;
  }
}

function getLeadingCommentsText(
  node: TSESTree.Node,
  sourceCode: Readonly<SourceCode>
): { text: string; range: [number, number] } | null {
  const leadingComments = sourceCode.getCommentsBefore(node);

  if (leadingComments.length === 0) {
    return null;
  }

  const firstComment = leadingComments[0];
  const lastComment = leadingComments[leadingComments.length - 1];

  return {
    text: sourceCode.text.slice(firstComment.range[0], lastComment.range[1]),
    range: [
      firstComment.range[0],
      lastComment.range[1] + (sourceCode.text[lastComment.range[1]] === '\n' ? 1 : 0),
    ],
  };
}

function isSignalCreation<Options extends Array<unknown>>(
  node: TSESTree.Node,
  context: Readonly<RuleContext<MessageIds, Options>>
): boolean {
  const isSignal =
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    (node.callee.name === 'signal' || node.callee.name === 'computed');

  debug('Checking if node is signal creation', {
    nodeType: node.type,
    calleeType: node.type === 'CallExpression' ? node.callee.type : 'N/A',
    calleeName:
      node.type === 'CallExpression' && node.callee.type === 'Identifier'
        ? node.callee.name
        : 'N/A',
    isSignal,
    nodeText: getNodeText(node, context),
  });

  return isSignal;
}

function isReactComponent<Options extends Array<unknown>>(
  node:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression,
  parent: TSESTree.Node | undefined,
  context: Readonly<RuleContext<MessageIds, Options>>
): boolean {
  if (node.type === 'FunctionDeclaration' && node.id) {
    const isComp = isReactComponentName(node.id.name);

    debug('Checking function declaration for React component', {
      name: node.id.name,
      isComponent: isComp,
      nodeText: getNodeText(node, context),
    });

    return isComp;
  }

  if (parent?.type === 'VariableDeclarator') {
    if (parent.id?.type === 'Identifier') {
      const isComp = isReactComponentName(parent.id.name);

      debug('Checking variable declaration for React component', {
        name: parent.id.name,
        isComponent: isComp,
        nodeText: getNodeText(node, context),
      });

      return isComp;
    }
  }

  return false;
}

function isHookFunction<Options extends Array<unknown>>(
  node: TSESTree.Node,
  context: Readonly<RuleContext<MessageIds, Options>>
): boolean {
  if (
    !['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)
  ) {
    debug('Not a function node', { nodeType: node.type });
    return false;
  }

  // For function declarations, check the name directly first
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  if (node.type === 'FunctionDeclaration' && node.id) {
    const isHook = isHookName(node.id.name);

    debug('Checking function declaration for hook', {
      name: node.id.name,
      isHook,
      nodeText: getNodeText(node, context),
    });

    return isHook;
  }

  const parent = getParentNode(node);

  if (parent?.type === 'VariableDeclarator') {
    if (parent.id.type === 'Identifier') {
      const isHook = isHookName(parent.id.name);

      debug('Checking variable declaration for hook', {
        name: parent.id.name,
        isHook,
        nodeText: getNodeText(node, context),
      });

      return isHook;
    }
  }

  return false;
}

function isInHookCall(node: TSESTree.CallExpression): boolean {
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    return ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(node.callee.name);
  }

  return false;
}

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const functionStack: Array<{ isComponent: boolean; isHook: boolean }> = [];

let perf:
  | {
      trackNode(node: TSESTree.Node): void;
      'Program:exit'(): void;
    }
  | undefined;

const ruleName = 'no-signal-creation-in-component';

export const noSignalCreationInComponentRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prevent signal creation inside React components, hooks, or effects',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-signal-creation-in-component',
    },
    messages: {
      avoidSignalInComponent:
        'Avoid creating {{ signalType }} signals inside {{ context }}. Move signal creation to module level or a custom hook.',
      suggestMoveToModuleLevel: 'Move {{ signalType }} signal to module level',
      suggestMoveToCustomHook: 'Extract {{ signalType }} signal to a custom hook',
      moveToModuleLevel: 'Move to module level',
      createCustomHook: 'Create custom hook for {{ signalType }} signal',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}`;

    perf = createPerformanceTracker<Options>(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance);
    }

    console.info(`Initializing rule for file: ${context.filename}`);
    console.info('Rule configuration:', option);

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

    let inComponent = false;
    let inHook = false;
    let inEffect = false;

    return {
      '*': (node: TSESTree.Node): void => {
        if (!perf) {
          throw new Error('Performance tracker not initialized');
        }

        // Check if we should continue processing
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
      'FunctionDeclaration, ArrowFunctionExpression, FunctionExpression'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
      ): void {
        const parent = getParentNode(node);

        const isComponent = isReactComponent(node, parent, context);

        const isHook = isHookFunction(node, context);

        debug('Entering function', {
          type: node.type,
          isComponent,
          isHook,
          parentType: parent?.type,
          nodeText: `${getNodeText(node, context).substring(0, 100)}...`,
        });

        functionStack.push({ isComponent, isHook });

        if (isComponent) {
          inComponent = true;

          debug('Entering component function', { nodeType: node.type });
        } else if (isHook) {
          inHook = true;

          debug('Entering hook function', { nodeType: node.type });
        }
      },
      'FunctionDeclaration:exit, ArrowFunctionExpression:exit, FunctionExpression:exit'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
      ): void {
        const state = functionStack.pop();

        if (!state) {
          debug('No function state found on exit', { nodeType: node.type });

          return;
        }

        debug('Exiting function', {
          type: node.type,
          wasComponent: state.isComponent,
          wasHook: state.isHook,
          nodeText: `${getNodeText(node, context).substring(0, 100)}...`,
        });

        if (state.isComponent) {
          inComponent = false;

          debug('Exiting component function', { nodeType: node.type });
        } else if (state.isHook) {
          inHook = false;

          debug('Exiting hook function', { nodeType: node.type });
        }
      },

      CallExpression(node: TSESTree.CallExpression): void {
        const wasInEffect = inEffect;

        if (isInHookCall(node)) {
          inEffect = true;
        }

        if (isSignalCreation(node, context) && (inComponent || inHook || wasInEffect)) {
          const sourceCode = context.sourceCode;

          const { signalName, signalValue, varName } = getSignalInfo(node, sourceCode);

          const signalType = signalName === 'signal' ? 'reactive' : 'computed';

          context.report({
            node,
            messageId: 'avoidSignalInComponent',
            data: {
              context: inEffect || wasInEffect ? 'effects' : inHook ? 'hooks' : 'React components',
              signalType: signalName === 'signal' ? 'reactive' : 'computed',
            },
            suggest: [
              {
                messageId: 'suggestMoveToModuleLevel',
                data: { signalType },
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                  const firstNode = sourceCode.ast.body[0];
                  const newLine = getNewLine(sourceCode);

                  // Add the signal to the top of the file
                  yield fixer.insertTextBefore(
                    firstNode,
                    `const ${varName} = ${signalName}(${signalValue});${newLine}${newLine}`
                  );

                  // Replace the original signal creation with the variable name
                  yield fixer.replaceText(node, varName);

                  // Handle comments if any
                  const comments = getLeadingCommentsText(node, sourceCode);

                  if (comments !== null) {
                    yield fixer.insertTextBefore(firstNode, comments.text + newLine);
                    yield fixer.removeRange(comments.range);
                  }
                },
              },
              {
                messageId: 'moveToModuleLevel',
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                  const newLine = getNewLine(sourceCode);

                  yield fixer.insertTextBefore(
                    sourceCode.ast.body[0],
                    `const ${varName} = ${signalName}(${signalValue});${newLine}${newLine}`
                  );

                  yield fixer.replaceText(node, varName);
                },
              },
              {
                messageId: 'createCustomHook',
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                  const lastImport = sourceCode.ast.body.findLast(
                    (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                      return node.type === 'ImportDeclaration';
                    }
                  );

                  const insertPosition =
                    typeof lastImport === 'undefined' ? 0 : lastImport.range[1] + 1;

                  const hookName = `use${signalName.charAt(0).toUpperCase() + signalName.slice(1)}`;
                  const newLine = getNewLine(sourceCode);

                  yield fixer.insertTextAfterRange(
                    [insertPosition, insertPosition],
                    `${newLine}function ${hookName}() {${newLine}  return ${signalName}(${signalValue});${newLine}}${newLine}${newLine}`
                  );

                  yield fixer.replaceText(node, `${hookName}()`);
                },
              },
              {
                messageId: 'suggestMoveToCustomHook',
                data: { signalType },
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                  // Find the last import or the start of the file
                  const lastImport = sourceCode.ast.body
                    .slice()
                    .reverse()
                    .find((node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                      return node.type === 'ImportDeclaration';
                    });

                  const insertPosition = lastImport ? lastImport.range[1] + 1 : 0;

                  const hookName = generateUniqueHookName(
                    context,
                    signalName === 'signal' ? 'value' : 'computedValue'
                  );

                  const newLine = getNewLine(sourceCode);

                  // Add the new custom hook after the last import
                  yield fixer.insertTextAfterRange(
                    [insertPosition, insertPosition],
                    `${newLine}function ${hookName}() {${newLine}  return ${signalName}(${signalValue});${newLine}}${newLine}${newLine}`
                  );

                  // Replace the signal creation with a call to the hook
                  yield fixer.replaceText(node, `${hookName}()`);

                  // Handle comments if any
                  const comments = getLeadingCommentsText(node, sourceCode);

                  if (comments !== null) {
                    yield fixer.insertTextBeforeRange(
                      [insertPosition, insertPosition],
                      comments.text + newLine
                    );

                    yield fixer.removeRange(comments.range);
                  }
                },
              },
            ],
          });
        }

        if (isInHookCall(node)) {
          inEffect = wasInEffect;
        }
      },

      'ClassDeclaration, PropertyDefinition, MethodDefinition'(): void {
        inComponent = true;
      },

      'ClassDeclaration:exit'() {
        inComponent = false;
      },

      'MethodDefinition, PropertyDefinition'(): void {
        if (inComponent) {
          functionStack.push({ isComponent: true, isHook: false });
        }
      },

      'MethodDefinition:exit, PropertyDefinition:exit'(): void {
        if (inComponent) {
          functionStack.pop();
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
