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
  recordMetric,
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

const ruleName = 'prefer-use-signal-over-use-state';

export const preferUseSignalOverUseStateRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        "Encourages using `useSignal` instead of `useState` for primitive values and simple initializers. `useSignal` often provides better performance and ergonomics for local component state that doesn't require the full React reconciliation cycle. This rule helps migrate simple state management to signals while still allowing complex state to use `useState` when needed.",
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
    } satisfies Option,
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option.performance, context);

    if (option.performance.enableMetrics === true) {
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

      if (nodeCount > (option.performance.maxNodes ?? 2_000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
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
