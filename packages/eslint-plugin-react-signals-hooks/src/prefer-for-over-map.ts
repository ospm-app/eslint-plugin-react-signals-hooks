import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint';

import {
  endPhase,
  startPhase,
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
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds = 'preferForOverMap' | 'suggestForComponent' | 'addForImport';

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

const signalMapCache = new WeakMap<
  TSESTree.CallExpression,
  { signalName: string; hasValueAccess: boolean } | null
>();

function isSignalArrayMap(node: TSESTree.CallExpression): {
  signalName: string;
  hasValueAccess: boolean;
} | null {
  const cached = signalMapCache.get(node);

  if (typeof cached !== 'undefined') {
    return cached;
  }

  const result: { signalName: string; hasValueAccess: boolean } | null = null;
  // Check for signalName.value.map(...)
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map' &&
    node.callee.object.type === 'MemberExpression' &&
    node.callee.object.property.type === 'Identifier' &&
    node.callee.object.property.name === 'value' &&
    node.callee.object.object.type === 'Identifier' &&
    node.callee.object.object.name.endsWith('Signal')
  ) {
    return {
      signalName: node.callee.object.object.name,
      hasValueAccess: true,
    };
  }

  // Check for direct signal.map() (without .value)
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name.endsWith('Signal')
  ) {
    return {
      signalName: node.callee.object.name,
      hasValueAccess: false,
    };
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
  if (mapCallback.type === 'ArrowFunctionExpression' || mapCallback.type === 'FunctionExpression') {
    const params = 'params' in mapCallback ? mapCallback.params : [];

    const itemParam = params[0]?.type === 'Identifier' ? params[0].name : 'item';

    // Get the body of the callback
    let bodyText = '';
    let needsParens = false;

    if ('body' in mapCallback) {
      if (mapCallback.body.type === 'BlockStatement') {
        // For block statements, we need to handle the return statement
        const returnStmt = mapCallback.body.body.find((stmt) => stmt.type === 'ReturnStatement') as
          | TSESTree.ReturnStatement
          | undefined;

        if (returnStmt?.argument) {
          bodyText = sourceCode.getText(returnStmt.argument);
        } else if (mapCallback.body.body.length > 0) {
          bodyText = sourceCode.getText(mapCallback.body);
        }
      } else {
        // For concise arrow functions, just get the expression
        bodyText = sourceCode.getText(mapCallback.body);
        needsParens =
          mapCallback.body.type !== 'JSXElement' && mapCallback.body.type !== 'JSXFragment';
      }
    }

    // Determine if we need to include the index parameter
    const hasIndexParam = params.length > 1;
    const paramList = hasIndexParam
      ? `(${itemParam}, ${params[1]?.type === 'Identifier' ? params[1].name : 'index'})`
      : `(${itemParam})`;

    // Format the replacement
    const replacement = hasIndexParam
      ? `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`
      : `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`;

    return { replacement, needsParens: false };
  }

  // For identifier callbacks, just use the identifier directly
  if (mapCallback.type === 'Identifier') {
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

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'prefer-for-over-map';

export const preferForOverMapRule = createRule<Options, MessageIds>({
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

    startPhase(perfKey, 'rule-init');

    const perf = createPerformanceTracker(perfKey, option.performance, context);

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

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

    if (option.performance.enableMetrics) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    trackOperation(perfKey, PerformanceOperations.ruleInitialization);

    let inJSX = false;
    let jsxDepth = 0;
    let inHook = false;
    let hookDepth = 0;
    let hasForImport = false;

    // Cache for import checks to avoid repeated AST traversal
    let importCheckCache: boolean | null = null;

    endPhase(perfKey, 'rule-init');

    function checkForImport(): boolean {
      if (importCheckCache === null) {
        importCheckCache = context.sourceCode.ast.body.some(
          (node: TSESTree.ProgramStatement): boolean => {
            return (
              node.type === 'ImportDeclaration' &&
              node.source.value === '@preact/signals-react' &&
              node.specifiers.some((s): boolean => {
                return (
                  s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'For'
                );
              })
            );
          }
        );
      }

      hasForImport = importCheckCache;

      return hasForImport;
    }

    checkForImport();

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
          trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
        }
      },

      JSXElement(_node: TSESTree.Node): void {
        inJSX = true;
        jsxDepth++;
      },
      'JSXElement:exit'(_node: TSESTree.Node): void {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },

      JSXFragment(_node: TSESTree.Node): void {
        inJSX = true;
        jsxDepth++;
      },
      'JSXFragment:exit'(_node: TSESTree.Node): void {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },

      CallExpression(node: TSESTree.CallExpression): void {
        // Track hook usage
        if (node.callee.type === 'Identifier' && REACT_HOOKS.has(node.callee.name)) {
          hookDepth++;

          if (hookDepth === 1) {
            inHook = true;
          }

          return;
        }

        // Only apply the rule if we're in JSX and NOT in a hook
        if (!inJSX || inHook || hookDepth > 0) {
          return;
        }

        const signalMapInfo = isSignalArrayMap(node);

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

            // Add For import if needed
            if (!hasForImport) {
              const forImport = "import { For } from '@preact/signals-react';\n";

              const firstImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return n.type === 'ImportDeclaration';
                }
              );

              if (firstImport) {
                fixes.push(fixer.insertTextBefore(firstImport, forImport));
              } else {
                fixes.push(fixer.insertTextBefore(context.sourceCode.ast.body[0], forImport));
              }
            }

            return fixes;
          },
          suggest: [
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

                // Add For import if needed
                if (!checkForImport()) {
                  const forImport = "import { For } from '@preact/signals-react';\n";

                  const firstImport = context.sourceCode.ast.body.find(
                    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                      return n.type === 'ImportDeclaration';
                    }
                  );

                  if (firstImport) {
                    fixes.push(fixer.insertTextBefore(firstImport, forImport));
                  } else {
                    fixes.push(fixer.insertTextBefore(context.sourceCode.ast.body[0], forImport));
                  }
                }

                return fixes;
              },
            },
          ],
        });
      },
      'CallExpression:exit'(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && REACT_HOOKS.has(node.callee.name)) {
          hookDepth = Math.max(0, hookDepth - 1);
          if (hookDepth === 0) {
            inHook = false;
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
