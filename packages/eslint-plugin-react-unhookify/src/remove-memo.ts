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

type MessageIds = 'removeMemo';

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
    case 'removeMemo': {
      return options.severity.removeMemo ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

const ruleName = 'remove-memo';

export const removeMemoRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Removes React.memo HOC calls to simplify code by eliminating unnecessary memoization',
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
              removeMemo: {
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
      removeMemo: 'Remove React.memo call and use the component directly to simplify code',
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

        // Check if this is React.memo or just memo
        const isReactMemo = 
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
           node.callee.object.type === AST_NODE_TYPES.Identifier &&
           node.callee.object.name === 'React' &&
           node.callee.property.type === AST_NODE_TYPES.Identifier &&
           node.callee.property.name === 'memo') ||
          (node.callee.type === AST_NODE_TYPES.Identifier &&
           node.callee.name === 'memo');

        if (!isReactMemo) {
          return;
        }

        // Check if memo has at least one argument (the component)
        if (node.arguments.length === 0) {
          return;
        }

        const [component] = node.arguments;

        if (!component) {
          return;
        }

        const severity = getSeverity('removeMemo', option);
        if (severity === 'off') {
          return;
        }

        // Report the issue and provide the fix
        context.report({
          node,
          messageId: 'removeMemo',
          fix: (fixer) => {
            const sourceCode = context.getSourceCode();
            const componentText = sourceCode.getText(component);
            return fixer.replaceText(node, componentText);
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
