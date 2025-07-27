import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

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
  ignoreComplexInitializers: boolean;
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds = 'preferUseSignal';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

const ruleName = 'prefer-use-signal-over-use-state';

export const preferUseSignalOverUseStateRule = createRule<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Prefer useSignal over useState for primitive values and simple initializers',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      preferUseSignal: 'Prefer useSignal over useState for {{type}} values',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreComplexInitializers: {
            type: 'boolean',
            default: true,
            description: 'Skip non-primitive initializers',
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
    fixable: 'code',
  },
  defaultOptions: [
    {
      ignoreComplexInitializers: true,
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

    function shouldContinue(): boolean {
      nodeCount++;

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

    endPhase(perfKey, 'rule-init');

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

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'useState' &&
          node.id.type === 'ArrayPattern' &&
          node.id.elements.length === 2
        ) {
          if (
            context.options[0]?.ignoreComplexInitializers !== false &&
            !(node
              ? [
                  'Literal',
                  'Identifier',
                  'MemberExpression',
                  'UnaryExpression',
                  'BinaryExpression',
                  'ConditionalExpression',
                  'TemplateLiteral',
                ].includes(node.type)
              : true)
          ) {
            return;
          }

          const [stateVar, setterVar] = node.id.elements;

          const initialValue: TSESTree.CallExpressionArgument | undefined = node.init.arguments[0];

          if (
            stateVar?.type === 'Identifier' &&
            setterVar?.type === 'Identifier' &&
            setterVar.name.startsWith('set')
          ) {
            context.report({
              node: node.init,
              messageId: 'preferUseSignal',
              data: {
                type: initialValue
                  ? initialValue.type === 'Literal'
                    ? typeof initialValue.value
                    : 'state'
                  : 'state', // getValueType(initialValue),
              },
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes = [];
                //  addUseSignalImport(context.sourceCode, fixer);

                const importDeclarations = context.sourceCode.ast.body.filter(
                  (node): node is TSESTree.ImportDeclaration => node.type === 'ImportDeclaration'
                );

                const hasSignalImport = importDeclarations.some((node) => {
                  return (
                    node.source.value === '@preact/signals-react' &&
                    node.specifiers.some((s) => {
                      return (
                        'imported' in s && 'name' in s.imported && s.imported.name === 'useSignal'
                      );
                    })
                  );
                });

                if (hasSignalImport) {
                  return null;
                }

                const lastImport = importDeclarations[importDeclarations.length - 1];
                const importText = "import { useSignal } from '@preact/signals-react'\n";

                const importFix = lastImport
                  ? fixer.insertTextAfter(lastImport, importText)
                  : fixer.insertTextBefore(context.sourceCode.ast.body[0], importText);

                if (importFix) {
                  fixes.push(importFix);
                }

                fixes.push(
                  fixer.replaceText(
                    node,
                    `const ${stateVar.name}Signal = useSignal(${
                      initialValue ? context.sourceCode.getText(initialValue) : 'undefined'
                    })`
                  )
                );

                return fixes;
              },
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
