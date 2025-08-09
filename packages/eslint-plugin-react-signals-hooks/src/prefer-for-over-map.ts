/** biome-ignore-all assist/source/organizeImports:off */
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
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'preferForOverMap' | 'suggestForComponent' | 'addForImport';

type Serenity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Serenity;
  suffix?: string;
};

type Options = [Option?];

const REACT_HOOKS = new Set([
  'useEffect',
  'useLayoutEffect',
  'useCallback',
  'useMemo',
  'useImperativeHandle',
  'useState',
  'useReducer',
  'useRef',
  'useContext',
]);

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'preferForOverMap': {
      return options.severity.preferForOverMap ?? 'error';
    }

    case 'suggestForComponent': {
      return options.severity.suggestForComponent ?? 'error';
    }

    case 'addForImport': {
      return options.severity.addForImport ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

const signalMapCache = new WeakMap<
  TSESTree.CallExpression,
  { signalName: string; hasValueAccess: boolean } | null
>();

function getBaseIdentifierFromMemberChain(
  node: TSESTree.MemberExpression
): TSESTree.Identifier | null {
  let current: TSESTree.Expression | TSESTree.PrivateIdentifier = node.object;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    if (current.type === AST_NODE_TYPES.Identifier) {
      return current;
    }

    if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
      continue;
    }

    return null;
  }
}

function memberChainIncludesValue(node: TSESTree.MemberExpression): boolean {
  let current: TSESTree.Expression | TSESTree.PrivateIdentifier = node;

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  while (current && current.type === AST_NODE_TYPES.MemberExpression) {
    if (current.property.type === AST_NODE_TYPES.Identifier && current.property.name === 'value') {
      return true;
    }

    current = current.object;
  }

  return false;
}

function unwrapCalleeMember(
  callee:
    | TSESTree.MemberExpression
    | TSESTree.ChainExpression
    | TSESTree.CallExpression
    | TSESTree.Identifier
): TSESTree.MemberExpression | null {
  // Handle ChainExpression wrapping a MemberExpression
  if (callee.type === AST_NODE_TYPES.ChainExpression) {
    const expr = callee.expression;
    if (expr.type === AST_NODE_TYPES.MemberExpression) {
      return expr;
    }
    return null;
  }

  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    return callee;
  }

  return null;
}

function isSignalArrayMap(
  node: TSESTree.CallExpression,
  suffixRegex: RegExp
): {
  signalName: string;
  hasValueAccess: boolean;
} | null {
  const cached = signalMapCache.get(node);

  if (typeof cached !== 'undefined') {
    return cached;
  }

  let result: { signalName: string; hasValueAccess: boolean } | null = null;

  const member = unwrapCalleeMember(
    node.callee as
      | TSESTree.MemberExpression
      | TSESTree.ChainExpression
      | TSESTree.CallExpression
      | TSESTree.Identifier
  );

  if (
    member &&
    member.property.type === AST_NODE_TYPES.Identifier &&
    member.property.name === 'map'
  ) {
    const obj = member.object;

    // Direct identifier receiver: fooSignal.map(...)
    if (obj.type === AST_NODE_TYPES.Identifier) {
      if (hasSignalSuffix(obj.name, suffixRegex)) {
        result = { signalName: obj.name, hasValueAccess: false };
      }
    }

    // Member chain receiver: may include .value and/or nested props
    else if (obj.type === AST_NODE_TYPES.MemberExpression) {
      const base = getBaseIdentifierFromMemberChain(obj);

      if (base && hasSignalSuffix(base.name, suffixRegex)) {
        const hasValue = memberChainIncludesValue(obj);

        result = { signalName: base.name, hasValueAccess: hasValue };
      }
    }
  }

  signalMapCache.set(node, result);

  return result;
}

function getForComponentReplacement(
  node: TSESTree.CallExpression,
  signalName: string,
  hasValueAccess: boolean,
  sourceCode: SourceCode
): { replacement: string; needsParens: boolean } | null {
  const mapCallback = node.arguments[0];

  if (!mapCallback) {
    return null;
  }

  const signalAccess = hasValueAccess ? `${signalName}.value` : signalName;

  // Handle different callback types
  if (
    mapCallback.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    mapCallback.type === AST_NODE_TYPES.FunctionExpression
  ) {
    const params = 'params' in mapCallback ? mapCallback.params : [];

    const itemParam = params[0]?.type === AST_NODE_TYPES.Identifier ? params[0].name : 'item';

    // Get the body of the callback
    let bodyText = '';
    let needsParens = false;

    if ('body' in mapCallback) {
      if (mapCallback.body.type === AST_NODE_TYPES.BlockStatement) {
        // For block statements, we need to handle the return statement
        const returnStmt = mapCallback.body.body.find(
          (stmt) => stmt.type === AST_NODE_TYPES.ReturnStatement
        ) as TSESTree.ReturnStatement | undefined;

        if (returnStmt?.argument) {
          bodyText = sourceCode.getText(returnStmt.argument);
        } else if (mapCallback.body.body.length > 0) {
          bodyText = sourceCode.getText(mapCallback.body);
        }
      } else {
        // For concise arrow functions, just get the expression
        bodyText = sourceCode.getText(mapCallback.body);
        needsParens =
          mapCallback.body.type !== AST_NODE_TYPES.JSXElement &&
          mapCallback.body.type !== AST_NODE_TYPES.JSXFragment;
      }
    }

    // Determine if we need to include the index parameter
    const hasIndexParam = params.length > 1;
    const paramList = hasIndexParam
      ? `(${itemParam}, ${params[1]?.type === AST_NODE_TYPES.Identifier ? params[1].name : 'index'})`
      : `(${itemParam})`;

    // Format the replacement
    const replacement = hasIndexParam
      ? `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`
      : `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`;

    return { replacement, needsParens: false };
  }

  // For identifier callbacks, just use the identifier directly
  if (mapCallback.type === AST_NODE_TYPES.Identifier) {
    const callbackName = sourceCode.getText(mapCallback);

    return {
      replacement: `<For each={${signalAccess}}>{${callbackName}}</For>`,
      needsParens: false,
    };
  }

  // For member expressions or other call expressions
  const callbackText = sourceCode.getText(mapCallback);
  return {
    replacement: `<For each={${signalAccess}}>{${callbackText}}</For>`,
    needsParens: true,
  };
}

let importCheckCache: boolean = false;

function checkForImport(context: RuleContext<MessageIds, Options>): boolean {
  if (!importCheckCache) {
    importCheckCache = context.sourceCode.ast.body.some(
      (node: TSESTree.ProgramStatement): boolean => {
        return (
          node.type === AST_NODE_TYPES.ImportDeclaration &&
          node.source.value === '@preact/signals-react' &&
          node.specifiers.some((s): boolean => {
            return (
              s.type === AST_NODE_TYPES.ImportSpecifier &&
              'name' in s.imported &&
              s.imported.name === 'For'
            );
          })
        );
      }
    );
  }

  return importCheckCache;
}

let inJSX = false;
let jsxDepth = 0;
let inHook = false;
let hookDepth = 0;

const ruleName = 'prefer-for-over-map';

export const preferForOverMapRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer For component over .map() for rendering signal arrays',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      preferForOverMap:
        'Prefer using the `<For>` component instead of `.map()` for better performance with signal arrays.',
      suggestForComponent: 'Replace `.map()` with `<For>` component',
      addForImport: 'Add `For` import from @preact/signals-react',
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
          severity: {
            type: 'object',
            properties: {
              preferForOverMap: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestForComponent: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addForImport: {
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

    const suffix =
      typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal';
    const suffixRegex = buildSuffixRegex(suffix);

    startPhase(perfKey, 'ruleExecution');

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        const op =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;
        trackOperation(perfKey, op);
      },

      [AST_NODE_TYPES.JSXElement](_node: TSESTree.Node): void {
        inJSX = true;

        jsxDepth++;
      },
      [`${AST_NODE_TYPES.JSXElement}:exit`](_node: TSESTree.Node): void {
        jsxDepth--;

        if (jsxDepth === 0) {
          inJSX = false;
        }
      },

      [AST_NODE_TYPES.JSXFragment](_node: TSESTree.Node): void {
        inJSX = true;

        jsxDepth++;
      },

      [`${AST_NODE_TYPES.JSXFragment}:exit`](_node: TSESTree.Node): void {
        jsxDepth--;

        if (jsxDepth === 0) {
          inJSX = false;
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (node.callee.type === AST_NODE_TYPES.Identifier && REACT_HOOKS.has(node.callee.name)) {
          hookDepth++;

          if (hookDepth === 1) {
            inHook = true;
          }

          return;
        }

        if (!inJSX || inHook || hookDepth > 0) {
          return;
        }

        const signalMapInfo = isSignalArrayMap(node, suffixRegex);

        if (signalMapInfo === null) {
          return;
        }

        const replacement = getForComponentReplacement(
          node,
          signalMapInfo.signalName,
          signalMapInfo.hasValueAccess,
          context.sourceCode
        );

        if (!replacement) {
          return;
        }

        if (getSeverity('preferForOverMap', option) === 'off') {
          return;
        }

        context.report({
          node,
          messageId: 'preferForOverMap',
          fix: (fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null => {
            const replacementResult = getForComponentReplacement(
              node,
              signalMapInfo.signalName,
              signalMapInfo.hasValueAccess,
              context.sourceCode
            );

            if (!replacementResult) {
              return null;
            }

            const fixes = [fixer.replaceText(node, replacementResult.replacement)];

            if (!checkForImport(context) && getSeverity('addForImport', option) !== 'off') {
              const forImport = "import { For } from '@preact/signals-react';\n";

              const firstImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return n.type === AST_NODE_TYPES.ImportDeclaration;
                }
              );

              if (firstImport) {
                fixes.push(fixer.insertTextBefore(firstImport, forImport));
              } else {
                const b = context.sourceCode.ast.body[0];

                if (!b) {
                  return null;
                }

                fixes.push(fixer.insertTextBefore(b, forImport));
              }
            }

            return fixes;
          },
          suggest:
            getSeverity('suggestForComponent', option) === 'off'
              ? []
              : [
                  {
                    messageId: 'suggestForComponent',
                    fix: (fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null => {
                      const replacementResult = getForComponentReplacement(
                        node,
                        signalMapInfo.signalName,
                        signalMapInfo.hasValueAccess,
                        context.sourceCode
                      );

                      if (!replacementResult) {
                        return null;
                      }

                      const { replacement } = replacementResult;

                      const fixes = [fixer.replaceText(node, replacement)];

                      if (
                        !checkForImport(context) &&
                        getSeverity('addForImport', option) !== 'off'
                      ) {
                        const forImport = "import { For } from '@preact/signals-react';\n";

                        const firstImport = context.sourceCode.ast.body.find(
                          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                            return n.type === AST_NODE_TYPES.ImportDeclaration;
                          }
                        );

                        if (firstImport) {
                          fixes.push(fixer.insertTextBefore(firstImport, forImport));
                        } else {
                          const b = context.sourceCode.ast.body[0];

                          if (!b) {
                            return null;
                          }

                          fixes.push(fixer.insertTextBefore(b, forImport));
                        }
                      }

                      return fixes;
                    },
                  },
                ],
        });
      },

      [`${AST_NODE_TYPES.CallExpression}:exit`](node: TSESTree.CallExpression) {
        if (node.callee.type === AST_NODE_TYPES.Identifier && REACT_HOOKS.has(node.callee.name)) {
          hookDepth = Math.max(0, hookDepth - 1);
          if (hookDepth === 0) {
            inHook = false;
          }
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
