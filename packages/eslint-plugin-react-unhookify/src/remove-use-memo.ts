/** biome-ignore-all assist/source/organizeImports: off */
/** biome-ignore-all lint/correctness/noUnusedVariables: off */
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
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
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'removeUseMemo';

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
    case 'removeUseMemo': {
      return options.severity.removeUseMemo ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

const ruleName = 'remove-use-memo';

export const removeUseMemoRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Removes React.useMemo calls to simplify code by eliminating unnecessary memoization',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    hasSuggestions: false,
    schema: [
      {
        type: 'object',
        properties: {
          performance: {
            type: 'object',
            additionalProperties: false,
            properties: {
              maxNodes: { type: 'number', minimum: 1 },
              maxTime: { type: 'number', minimum: 1 },
            },
          },
          severity: {
            type: 'object',
            properties: {
              removeUseMemo: {
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
    messages: {
      removeUseMemo: 'Remove React.useMemo call and inline the value to simplify code',
    },
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

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations.nodeProcessing);
      },

      CallExpression(node: TSESTree.CallExpression): void {
        if (!shouldContinue()) {
          return;
        }

        trackOperation(perfKey, PerformanceOperations.CallExpressionProcessing);

        // Check if this is React.useMemo or just useMemo
        const isReactUseMemo =
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
           node.callee.object.type === AST_NODE_TYPES.Identifier &&
           node.callee.object.name === 'React' &&
           node.callee.property.type === AST_NODE_TYPES.Identifier &&
           node.callee.property.name === 'useMemo') ||
          (node.callee.type === AST_NODE_TYPES.Identifier &&
           node.callee.name === 'useMemo');

        if (!isReactUseMemo) {
          return;
        }

        // Check if useMemo has the expected signature: useMemo(() => value, [deps])
        if (node.arguments.length < 2) {
          return;
        }

        const [factoryFn, deps] = node.arguments;

        if (!factoryFn || !deps) {
          return;
        }

        // Factory should be a function
        if (factoryFn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
            factoryFn.type !== AST_NODE_TYPES.FunctionExpression) {
          return;
        }

        // Dependencies should be an array (allow empty arrays too)
        if (deps.type !== AST_NODE_TYPES.ArrayExpression) {
          return;
        }

        const severity = getSeverity('removeUseMemo', option);
        if (severity === 'off') {
          return;
        }

        // Get the factory function body to extract the value
        let valueToInline: TSESTree.Expression | TSESTree.Statement | null = null;

        if (factoryFn.type === AST_NODE_TYPES.ArrowFunctionExpression) {
          if (factoryFn.body.type === AST_NODE_TYPES.BlockStatement) {
            // If it's a block statement with multiple statements, we can't safely inline
            if (factoryFn.body.body.length === 1) {
              const statement = factoryFn.body.body[0];
              if (statement && statement.type === AST_NODE_TYPES.ReturnStatement && statement.argument) {
                valueToInline = statement.argument;
              }
            }
          } else {
            // It's a concise arrow function, just use the body
            valueToInline = factoryFn.body;
          }
        } else if (factoryFn.type === AST_NODE_TYPES.FunctionExpression) {
          if (factoryFn.body.body.length === 1) {
            const statement = factoryFn.body.body[0];
            if (statement && statement.type === AST_NODE_TYPES.ReturnStatement && statement.argument) {
              valueToInline = statement.argument;
            }
          }
        }

        if (!valueToInline) {
          return;
        }

        // Additional safety check: don't inline if the value contains hooks or complex expressions
        const sourceCode = context.getSourceCode();
        const valueText = sourceCode.getText(valueToInline as TSESTree.Node);

        // Skip if the inline value contains React hooks (might cause dependency issues)
        if (valueText.includes('useState') || valueText.includes('useEffect') ||
            valueText.includes('useContext') || valueText.includes('useRef')) {
          return;
        }

        // Report the issue and provide the fix
        context.report({
          node,
          messageId: 'removeUseMemo',
          fix: (fixer) => {
            return fixer.replaceText(node, valueText);
          },
        });
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
