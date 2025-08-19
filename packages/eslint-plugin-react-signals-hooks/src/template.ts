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

type MessageIds = 'exampleMessageId';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  // Add your rule-specific options here
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'exampleMessageId': {
      return options.severity.exampleMessageId ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}
const ruleName = 'rule-name';

export const rule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion', // or 'problem' or 'layout'
    docs: {
      description: 'Brief description of what the rule does',
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
              exampleMessageId: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exampleMessageId: 'Your error message here',
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

      // Example for specific node types
      // CallExpression: (node) => {
      //   trackOperation(perf, perfKey, 'CallExpression', () => {
      //     // Your validation logic here
      //   });
      // },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
