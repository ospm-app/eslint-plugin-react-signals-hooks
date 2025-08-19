/** biome-ignore-all assist/source/organizeImports: off */
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
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { hasSignalSuffix, buildSuffixRegex } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'unnecessaryUntracked'
  | 'unnecessaryPeek'
  | 'suggestRemoveUntracked'
  | 'suggestRemovePeek';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  allowInEffects?: boolean;
  allowInEventHandlers?: boolean;
  allowForSignalWrites?: boolean;
  suffix?: string;
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'unnecessaryUntracked': {
      return options.severity.unnecessaryUntracked ?? 'error';
    }

    case 'unnecessaryPeek': {
      return options.severity.unnecessaryPeek ?? 'error';
    }

    case 'suggestRemoveUntracked': {
      return options.severity.suggestRemoveUntracked ?? 'error';
    }

    case 'suggestRemovePeek': {
      return options.severity.suggestRemovePeek ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function getBaseIdentifierFromMemberChain(
  node: TSESTree.MemberExpression
): TSESTree.Identifier | null {
  let current: TSESTree.Expression | TSESTree.PrivateIdentifier = node.object;

  // Walk down to the left-most Identifier of the chain
  // e.g., for a.b.c.value -> returns Identifier 'a'
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    if (current.type === AST_NODE_TYPES.Identifier) {
      return current;
    }

    if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
      continue;
    }

    // Unsupported base (super, call result, etc.)
    return null;
  }
}

function containsSignalAccess(node: TSESTree.Node, suffixRegex: RegExp): boolean {
  if (
    [
      AST_NODE_TYPES.FunctionDeclaration,
      AST_NODE_TYPES.FunctionExpression,
      AST_NODE_TYPES.ArrowFunctionExpression,
    ].includes(node.type)
  ) {
    return false;
  }

  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'value'
  ) {
    // Handle direct base: fooSignal.value
    if (
      node.object.type === AST_NODE_TYPES.Identifier &&
      hasSignalSuffix(node.object.name, suffixRegex)
    ) {
      return true;
    }

    // Handle nested base: obj.fooSignal.value or state.user.fooSignal.value
    const base = getBaseIdentifierFromMemberChain(node);

    if (base && hasSignalSuffix(base.name, suffixRegex)) {
      return true;
    }
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.some((child: TSESTree.JSXChild): boolean => {
      return (
        typeof child === 'object' && 'type' in child && containsSignalAccess(child, suffixRegex)
      );
    });
  }

  // Type-safe iteration over node properties
  for (const key in node) {
    // Skip internal properties that don't contain user code
    if (['parent', 'loc', 'range', 'type'].includes(key)) {
      continue;
    }

    const value = node[key as 'parent' | 'loc' | 'range' | 'type'];

    // Array.isArray produces incorrect item type number, which down the line converts to never
    if (Array.isArray(value)) {
      for (const item of value) {
        if (
          typeof item === 'object' &&
          'type' in item &&
          ![
            AST_NODE_TYPES.FunctionDeclaration,
            AST_NODE_TYPES.FunctionExpression,
            AST_NODE_TYPES.ArrowFunctionExpression,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
          ].includes(item.type) &&
          containsSignalAccess(item, suffixRegex)
        ) {
          return true;
        }
      }
    }

    // Handle single node values
    else if (
      typeof value === 'object' &&
      'type' in value &&
      ![
        AST_NODE_TYPES.FunctionDeclaration,
        AST_NODE_TYPES.FunctionExpression,
        AST_NODE_TYPES.ArrowFunctionExpression,
      ].includes(value.type) &&
      containsSignalAccess(value, suffixRegex)
    ) {
      return true;
    }
  }

  return false;
}

function isInReactiveContext(
  node: TSESTree.Node,
  context: RuleContext<MessageIds, Options>
): boolean {
  if (!isInComponentOrHook(node)) {
    return false;
  }

  if (context.options[0]?.allowInEffects === false) {
    let parent = node.parent;

    while (parent) {
      if (
        parent.type === AST_NODE_TYPES.CallExpression &&
        parent.callee.type === AST_NODE_TYPES.Identifier &&
        parent.callee.name === 'useSignalEffect'
      ) {
        return false;
      }

      parent = parent.parent;
    }
  }

  if (context.options[0]?.allowInEventHandlers === false) {
    let parent = node.parent;

    while (parent) {
      if (
        parent.type === AST_NODE_TYPES.JSXAttribute &&
        parent.name.type === AST_NODE_TYPES.JSXIdentifier &&
        parent.name.name.startsWith('on') &&
        parent.name.name[2] === parent.name.name[2]?.toUpperCase()
      ) {
        return false;
      }

      parent = parent.parent;
    }
  }

  return true;
}

function isSignal(
  node: TSESTree.CallExpression,
  suffixRegex: RegExp,
  signalVariables: Set<string>
): boolean {
  let base: TSESTree.Identifier | null = null;

  // Narrow callee to a MemberExpression (direct or inside a ChainExpression)
  let member: TSESTree.MemberExpression | null = null;
  if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
    member = node.callee;
  } else if (
    node.callee.type === AST_NODE_TYPES.ChainExpression &&
    node.callee.expression.type === AST_NODE_TYPES.MemberExpression
  ) {
    member = node.callee.expression;
  }

  if (member) {
    const obj = member.object;

    if (obj.type === AST_NODE_TYPES.Identifier) {
      base = obj;
    } else if (obj.type === AST_NODE_TYPES.MemberExpression) {
      base = getBaseIdentifierFromMemberChain(obj);
    }
  }

  return (
    base !== null && (hasSignalSuffix(base.name, suffixRegex) || signalVariables.has(base.name))
  );
}

function isInSignalWriteContext(node: TSESTree.Node, suffixRegex: RegExp): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (
      parent.type === 'AssignmentExpression' &&
      parent.left.type === 'MemberExpression' &&
      parent.left.property.type === 'Identifier' &&
      parent.left.property.name === 'value' &&
      ((parent.left.object.type === 'Identifier' &&
        hasSignalSuffix(parent.left.object.name, suffixRegex)) ||
        (() => {
          const base = getBaseIdentifierFromMemberChain(parent.left);
          return base ? hasSignalSuffix(base.name, suffixRegex) : false;
        })())
    ) {
      return true;
    }

    if (
      (parent.type === 'UpdateExpression' || parent.type === 'UnaryExpression') &&
      parent.argument.type === 'MemberExpression' &&
      parent.argument.property.type === 'Identifier' &&
      parent.argument.property.name === 'value' &&
      ((parent.argument.object.type === 'Identifier' &&
        hasSignalSuffix(parent.argument.object.name, suffixRegex)) ||
        (() => {
          const base = getBaseIdentifierFromMemberChain(parent.argument);
          return base ? hasSignalSuffix(base.name, suffixRegex) : false;
        })())
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

function isSignalCreation(
  callee: TSESTree.Expression,
  creatorLocals: ReadonlySet<string>,
  namespaces: ReadonlySet<string>
): boolean {
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return creatorLocals.has(callee.name);
  }

  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    namespaces.has(callee.object.name) &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    (callee.property.name === 'signal' || callee.property.name === 'computed')
  ) {
    return true;
  }

  return false;
}

function containsSignalAccessTracked(node: TSESTree.Node, signalVariables: Set<string>): boolean {
  // Quick path: look for .value reads whose base identifier is a tracked signal variable
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'value'
  ) {
    const base = getBaseIdentifierFromMemberChain(node);

    if (base && signalVariables.has(base.name)) {
      return true;
    }
  }

  // Generic scan of child nodes
  for (const key in node) {
    if (['parent', 'loc', 'range', 'type'].includes(key)) {
      continue;
    }

    const value = node[key as keyof TSESTree.Node];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in (item as TSESTree.Node)) {
          const child = item as TSESTree.Node;
          if (
            child.type !== AST_NODE_TYPES.FunctionDeclaration &&
            child.type !== AST_NODE_TYPES.FunctionExpression &&
            child.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
            containsSignalAccessTracked(child, signalVariables)
          ) {
            return true;
          }
        }
      }
    } else if (
      typeof value !== 'undefined' &&
      typeof value === 'object' &&
      'type' in (value as TSESTree.Node)
    ) {
      const child = value as TSESTree.Node;
      if (
        child.type !== AST_NODE_TYPES.FunctionDeclaration &&
        child.type !== AST_NODE_TYPES.FunctionExpression &&
        child.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        containsSignalAccessTracked(child, signalVariables)
      ) {
        return true;
      }
    }
  }

  return false;
}

const ruleName = 'warn-on-unnecessary-untracked';

export const warnOnUnnecessaryUntrackedRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
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
          suffix: {
            type: 'string',
            description: "Suffix used to identify signal variables (default: 'Signal')",
            default: 'Signal',
          },
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
          severity: {
            type: 'object',
            properties: {
              unnecessaryUntracked: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              unnecessaryPeek: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestRemoveUntracked: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestRemovePeek: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
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
      suffix: 'Signal',
      allowInEffects: true,
      allowInEventHandlers: true,
      allowForSignalWrites: true,
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    const suffixRegex = buildSuffixRegex(option?.suffix);

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

    // Per-file detection state: import aliases/namespaces and variables created via signal/computed
    const signalCreatorLocals = new Set<string>(['signal', 'computed']);
    const signalNamespaces = new Set<string>();
    const signalVariables = new Set<string>();

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        // Guard dynamic PerformanceOperations lookup with a safe fallback
        const op =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, op);
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

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          node.init.type === AST_NODE_TYPES.CallExpression &&
          isSignalCreation(node.init.callee, signalCreatorLocals, signalNamespaces)
        ) {
          signalVariables.add(node.id.name);
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'untracked' &&
          node.arguments.length === 1 &&
          node.arguments[0]?.type === AST_NODE_TYPES.ArrowFunctionExpression &&
          node.arguments[0].params.length === 0 &&
          (containsSignalAccess(node.arguments[0].body, suffixRegex) ||
            containsSignalAccessTracked(node.arguments[0].body, signalVariables)) &&
          isInReactiveContext(node, context)
        ) {
          if (getSeverity('unnecessaryUntracked', option) !== 'off') {
            context.report({
              node,
              messageId: 'unnecessaryUntracked',
              suggest: [
                {
                  messageId: 'suggestRemoveUntracked',
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    const arg = node.arguments[0];

                    if (typeof arg === 'undefined' || !('body' in arg)) {
                      return null;
                    }

                    return fixer.replaceText(node, context.sourceCode.getText(arg.body));
                  },
                },
              ],
            });
          }
        } else if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          node.type === AST_NODE_TYPES.CallExpression &&
          // support optional chaining and broaden detection: `.value.peek()` and `signal.peek()`

          // Direct MemberExpression callee
          ((node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            node.callee.property.name === 'peek' &&
            node.arguments.length === 0 &&
            // `.value.peek()`
            ((node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
              node.callee.object.property.type === AST_NODE_TYPES.Identifier &&
              node.callee.object.property.name === 'value') ||
              // `signal.peek()` (custom wrappers may expose this)
              node.callee.object.type === AST_NODE_TYPES.Identifier)) ||
            // Optional chaining callee
            (node.callee.type === AST_NODE_TYPES.ChainExpression &&
              node.callee.expression.type === AST_NODE_TYPES.MemberExpression &&
              node.callee.expression.property.type === AST_NODE_TYPES.Identifier &&
              node.callee.expression.property.name === 'peek' &&
              node.arguments.length === 0 &&
              // `.value?.peek()` or `?.` on the callee
              ((node.callee.expression.object.type === AST_NODE_TYPES.MemberExpression &&
                node.callee.expression.object.property.type === AST_NODE_TYPES.Identifier &&
                node.callee.expression.object.property.name === 'value') ||
                // `signal?.peek()`
                node.callee.expression.object.type === AST_NODE_TYPES.Identifier))) &&
          (() => {
            // Compute base identifier for either `.value.peek()` or `signal.peek()` forms
            let base: TSESTree.Identifier | null = null;
            switch (node.callee.type) {
              case AST_NODE_TYPES.MemberExpression: {
                const obj = node.callee.object;
                if (obj.type === AST_NODE_TYPES.MemberExpression) {
                  base = getBaseIdentifierFromMemberChain(obj);
                } else if (obj.type === AST_NODE_TYPES.Identifier) {
                  base = obj;
                }
                break;
              }
              case AST_NODE_TYPES.ChainExpression: {
                if (node.callee.expression.type === AST_NODE_TYPES.MemberExpression) {
                  const obj = node.callee.expression.object;
                  if (obj.type === AST_NODE_TYPES.MemberExpression) {
                    base = getBaseIdentifierFromMemberChain(obj);
                  } else if (obj.type === AST_NODE_TYPES.Identifier) {
                    base = obj;
                  }
                }
                break;
              }

              default: {
                break;
              }
            }

            if (!base) return false;

            return hasSignalSuffix(base.name, suffixRegex) || signalVariables.has(base.name);
          })() &&
          isInReactiveContext(node, context) &&
          (!isInSignalWriteContext(node, suffixRegex) || option?.allowForSignalWrites !== true) &&
          getSeverity('unnecessaryPeek', option) !== 'off'
        ) {
          context.report({
            node,
            messageId: 'unnecessaryPeek',
            suggest:
              getSeverity('suggestRemovePeek', option) === 'off'
                ? []
                : [
                    {
                      messageId: 'suggestRemovePeek',
                      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                        // Replace the entire call `X.value.peek()` with just `X.value`
                        const memberObj =
                          node.callee.type === AST_NODE_TYPES.MemberExpression
                            ? node.callee.object
                            : node.callee.type === AST_NODE_TYPES.ChainExpression &&
                                node.callee.expression.type === AST_NODE_TYPES.MemberExpression
                              ? node.callee.expression.object
                              : null;
                        if (memberObj)
                          return fixer.replaceText(node, context.sourceCode.getText(memberObj));

                        return null;
                      },
                    },
                  ],
          });
        } else if (
          // Also detect direct `.peek()` calls on signals: `signal.peek()`
          ((node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            node.callee.property.name === 'peek') ||
            (node.callee.type === AST_NODE_TYPES.ChainExpression &&
              node.callee.expression.type === AST_NODE_TYPES.MemberExpression &&
              node.callee.expression.property.type === AST_NODE_TYPES.Identifier &&
              node.callee.expression.property.name === 'peek')) &&
          node.arguments.length === 0 &&
          // resolve base identifier from the callee.object chain (also supports ChainExpression)
          isSignal(node, suffixRegex, signalVariables) &&
          isInReactiveContext(node, context) &&
          (!isInSignalWriteContext(node, suffixRegex) || option?.allowForSignalWrites !== true) &&
          getSeverity('unnecessaryPeek', option) !== 'off'
        ) {
          context.report({
            node,
            messageId: 'unnecessaryPeek',
            suggest:
              getSeverity('suggestRemovePeek', option) === 'off'
                ? []
                : [
                    {
                      messageId: 'suggestRemovePeek',
                      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                        // Replace the entire call `signal?.peek()` / `signal.peek()` with just `signal`
                        const target =
                          node.callee.type === AST_NODE_TYPES.MemberExpression
                            ? node.callee.object
                            : node.callee.type === AST_NODE_TYPES.ChainExpression &&
                                node.callee.expression.type === AST_NODE_TYPES.MemberExpression
                              ? node.callee.expression.object
                              : null;

                        if (target) {
                          return fixer.replaceText(node, context.sourceCode.getText(target));
                        }

                        return null;
                      },
                    },
                  ],
          });
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
