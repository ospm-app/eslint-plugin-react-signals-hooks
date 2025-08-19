/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { SourceCode, RuleContext } from '@typescript-eslint/utils/ts-eslint';

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
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'avoidSignalInComponent'
  | 'suggestMoveToModuleLevel'
  | 'suggestMoveToCustomHook'
  | 'moveToModuleLevel'
  | 'createCustomHook';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'avoidSignalInComponent': {
      return options.severity.avoidSignalInComponent ?? 'error';
    }

    case 'suggestMoveToModuleLevel': {
      return options.severity.suggestMoveToModuleLevel ?? 'error';
    }

    case 'suggestMoveToCustomHook': {
      return options.severity.suggestMoveToCustomHook ?? 'error';
    }

    case 'moveToModuleLevel': {
      return options.severity.moveToModuleLevel ?? 'error';
    }

    case 'createCustomHook': {
      return options.severity.createCustomHook ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function getSignalInfo(
  node: TSESTree.CallExpression,
  sourceCode: Readonly<SourceCode>
): { signalName: string; signalValue: string; varName: string } {
  return {
    signalName: node.callee.type === 'Identifier' ? node.callee.name : 'signal',
    signalValue: node.arguments.length > 0 ? sourceCode.getText(node.arguments[0]) : 'undefined',
    varName:
      (node.callee.type === 'Identifier' ? node.callee.name : 'signal') === 'signal'
        ? 'value'
        : 'computedValue',
  };
}

function generateUniqueHookName(
  context: Readonly<RuleContext<MessageIds, Options>>,
  baseName: string
): string {
  const usedNames = new Set<string>();

  function collectNames(node: TSESTree.Node): void {
    if (node.type === 'Identifier' && node.parent.type !== 'MemberExpression') {
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

  if (!firstComment || !lastComment) {
    return null;
  }

  return {
    text: sourceCode.text.slice(firstComment.range[0], lastComment.range[1]),
    range: [
      firstComment.range[0],
      lastComment.range[1] + (sourceCode.text[lastComment.range[1]] === '\n' ? 1 : 0),
    ],
  };
}

function isReactComponent(
  node:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression,
  parent: TSESTree.Node | undefined
): boolean {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return /^[A-Z]/.test(node.id.name);
  }

  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return /^[A-Z]/.test(parent.id.name);
  }

  return false;
}

function isHookFunction(node: TSESTree.Node): boolean {
  if (
    ![
      AST_NODE_TYPES.FunctionDeclaration,
      AST_NODE_TYPES.ArrowFunctionExpression,
      AST_NODE_TYPES.FunctionExpression,
    ].includes(node.type)
  ) {
    return false;
  }

  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
    return (
      node.id.name.startsWith('use') &&
      node.id.name.length > 3 &&
      node.id.name[3] === node.id.name[3]?.toUpperCase()
    );
  }

  if (
    node.parent?.type === AST_NODE_TYPES.VariableDeclarator &&
    node.parent.id.type === AST_NODE_TYPES.Identifier
  ) {
    return (
      node.parent.id.name.startsWith('use') &&
      node.parent.id.name.length > 3 &&
      node.parent.id.name[3] === node.parent.id.name[3]?.toUpperCase()
    );
  }

  return false;
}

const functionStack: Array<{ isComponent: boolean; isHook: boolean }> = [];

let inComponent = false;
let inHook = false;
let inEffect = false;

const ruleName = 'no-signal-creation-in-component';

export const noSignalCreationInComponentRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prevent signal creation inside React components, hooks, or effects',
      url: getRuleDocUrl(ruleName),
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
          severity: {
            type: 'object',
            properties: {
              avoidSignalInComponent: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestMoveToModuleLevel: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestMoveToCustomHook: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              moveToModuleLevel: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              createCustomHook: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
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
      performance: DEFAULT_PERFORMANCE_BUDGET,
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

    startPhase(perfKey, 'ruleExecution');

    // Track local names and namespaces for signal creators
    const signalCreatorLocals = new Set<string>(['signal', 'computed']);
    const signalNamespaces = new Set<string>();

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        trackOperation(
          perfKey,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing
        );
      },

      'FunctionDeclaration, ArrowFunctionExpression, FunctionExpression'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
      ): void {
        const parent = node.parent;

        const isComponent = isReactComponent(node, parent);

        const isHook = isHookFunction(node);

        functionStack.push({ isComponent, isHook });

        if (isComponent) {
          inComponent = true;
        } else if (isHook) {
          inHook = true;
        }
      },
      'FunctionDeclaration > :not(FunctionDeclaration), ArrowFunctionExpression > :not(ArrowFunctionExpression), FunctionExpression > :not(FunctionExpression)'(
        _node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
      ): void {
        const state = functionStack.pop();

        if (typeof state === 'undefined') {
          return;
        }

        if (state.isComponent) {
          inComponent = false;
        } else if (state.isHook) {
          inHook = false;
        }
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (
            stmt.type === AST_NODE_TYPES.ImportDeclaration &&
            typeof stmt.source.value === 'string' &&
            stmt.source.value === '@preact/signals-react'
          ) {
            for (const spec of stmt.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
                if (
                  'name' in spec.imported &&
                  (spec.imported.name === 'signal' || spec.imported.name === 'computed')
                ) {
                  signalCreatorLocals.add(spec.local.name);
                }
              } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                signalNamespaces.add(spec.local.name);
              }
            }
          }
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        const wasInEffect = inEffect;

        if (
          (node.callee.type === AST_NODE_TYPES.Identifier &&
            ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(
              node.callee.name
            )) ||
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(
              node.callee.property.name
            ))
        ) {
          inEffect = true;
        }

        function isSignalCreate(): boolean {
          // identifier call: alias or bare
          if (node.callee.type === AST_NODE_TYPES.Identifier) {
            return signalCreatorLocals.has(node.callee.name);
          }

          // namespace call: ns.signal/ns.computed
          if (
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.object.type === AST_NODE_TYPES.Identifier &&
            signalNamespaces.has(node.callee.object.name) &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            (node.callee.property.name === 'signal' || node.callee.property.name === 'computed')
          ) {
            return true;
          }

          // fallback to original broad heuristic (member .signal/.computed)
          if (
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            (node.callee.property.name === 'signal' || node.callee.property.name === 'computed')
          ) {
            return true;
          }

          return false;
        }

        if (isSignalCreate() && (inComponent || inHook || wasInEffect)) {
          const { signalName, signalValue, varName } = getSignalInfo(node, context.sourceCode);

          const signalType = signalName === 'signal' ? 'reactive' : 'computed';

          if (getSeverity('avoidSignalInComponent', option) !== 'off') {
            context.report({
              node,
              messageId: 'avoidSignalInComponent',
              data: {
                signalName,
                context: inComponent ? 'component' : inHook ? 'hook' : 'effect',
              },
              suggest: [
                {
                  messageId: 'suggestMoveToModuleLevel',
                  data: { signalType },
                  *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                    const firstNode = context.sourceCode.ast.body[0];
                    const newLine = context.sourceCode.getText().includes('\r\n') ? '\r\n' : '\n';

                    if (typeof firstNode === 'undefined') {
                      return;
                    }

                    yield fixer.insertTextBefore(
                      firstNode,
                      `const ${varName} = ${signalName}(${signalValue});${newLine}${newLine}`
                    );

                    yield fixer.replaceText(node, varName);

                    const comments = getLeadingCommentsText(node, context.sourceCode);

                    if (comments !== null) {
                      yield fixer.insertTextBefore(firstNode, comments.text + newLine);

                      yield fixer.removeRange(comments.range);
                    }
                  },
                },
                {
                  messageId: 'createCustomHook',
                  *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                    // eslint-disable-next-line n/no-unsupported-features/es-syntax
                    const lastImport = context.sourceCode.ast.body.findLast(
                      (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                        return node.type === 'ImportDeclaration';
                      }
                    );

                    const insertPosition =
                      typeof lastImport === 'undefined' ? 0 : lastImport.range[1] + 1;

                    const hookName = `use${signalName.charAt(0).toUpperCase() + signalName.slice(1)}`;
                    const newLine = context.sourceCode.getText().includes('\r\n') ? '\r\n' : '\n';

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
                    const lastImport = context.sourceCode.ast.body
                      .slice()
                      .reverse()
                      .find(
                        (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
                          return node.type === 'ImportDeclaration';
                        }
                      );

                    const insertPosition = lastImport ? lastImport.range[1] + 1 : 0;

                    const hookName = generateUniqueHookName(
                      context,
                      signalName === 'signal' ? 'value' : 'computedValue'
                    );

                    const newLine = context.sourceCode.getText().includes('\r\n') ? '\r\n' : '\n';

                    yield fixer.insertTextAfterRange(
                      [insertPosition, insertPosition],
                      `${newLine}function ${hookName}() {${newLine}  return ${signalName}(${signalValue});${newLine}}${newLine}${newLine}`
                    );

                    yield fixer.replaceText(node, `${hookName}()`);

                    const comments = getLeadingCommentsText(node, context.sourceCode);

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
        }

        if (
          (node.callee.type === AST_NODE_TYPES.Identifier &&
            ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(
              node.callee.name
            )) ||
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(
              node.callee.property.name
            ))
        ) {
          inEffect = wasInEffect;
        }
      },

      'ClassDeclaration, PropertyDefinition, MethodDefinition'(): void {
        inComponent = true;
      },

      'ClassDeclaration > :not(ClassDeclaration)'(): void {
        inComponent = false;
      },

      'MethodDefinition, PropertyDefinition'(): void {
        if (inComponent) {
          functionStack.push({ isComponent: true, isHook: false });
        }
      },

      'MethodDefinition > :not(MethodDefinition), PropertyDefinition > :not(PropertyDefinition)'(): void {
        if (inComponent) {
          functionStack.pop();
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
