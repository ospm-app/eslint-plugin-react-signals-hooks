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
  stopTracking,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type Severity = {
  invalidSignalName?: 'error' | 'warn' | 'off';
  invalidComputedName?: 'error' | 'warn' | 'off';
};

type MessageIds = 'invalidSignalName' | 'invalidComputedName';

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
    case 'invalidSignalName': {
      return options.severity.invalidSignalName ?? 'error';
    }

    case 'invalidComputedName': {
      return options.severity.invalidComputedName ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function isValidSignalName(name: string): boolean {
  if (!name.endsWith('Signal')) {
    return false;
  }

  if (!/^[a-z]/.test(name)) {
    return false;
  }

  if (
    name.startsWith('use') &&
    name.length > 2 &&
    typeof name[2] === 'string' &&
    /^[A-Z]/.test(name[2])
  ) {
    return false;
  }

  return true;
}

function getFixedName(originalName: string): string {
  let fixedName = originalName;

  if (fixedName.startsWith('use') && fixedName.length > 3) {
    fixedName = fixedName.slice(3);
  }

  if (fixedName.length > 0) {
    fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
  }

  if (!fixedName.endsWith('Signal')) {
    fixedName += 'Signal';
  }

  return fixedName;
}

const ruleName = 'signal-variable-name';

export const signalVariableNameRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        'Enforces consistent naming conventions for signal and computed variables. Signal variables should end with "Signal" (e.g., `countSignal`), start with a lowercase letter, and not use the "use" prefix to avoid confusion with React hooks. This improves code readability and maintainability by making signal usage immediately obvious.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      invalidSignalName:
        "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
      invalidComputedName:
        "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
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

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option?.performance, context);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    // console.info(`${ruleName}: Rule configuration:`, option);

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

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          node.init.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          (node.init.callee.name === 'signal' || node.init.callee.name === 'computed') &&
          !isValidSignalName(node.id.name) &&
          getSeverity(
            node.init.callee.name === 'signal' ? 'invalidSignalName' : 'invalidComputedName',
            option
          ) !== 'off'
        ) {
          context.report({
            node: node.id,
            messageId:
              node.init.callee.name === 'signal' ? 'invalidSignalName' : 'invalidComputedName',
            data: {
              name: node.id.name,
            },
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> {
              const fixes: Array<TSESLint.RuleFix> = [];

              try {
                if (!('name' in node.id)) {
                  return [];
                }

                const variableName = node.id.name;
                const fixedName = getFixedName(variableName);

                if (fixedName === variableName) {
                  return [];
                }

                // Fix the declaration
                fixes.push(fixer.replaceText(node.id, fixedName));

                // Get all references to fix
                const sourceCode = context.sourceCode;
                const scope = sourceCode.getScope(node);
                const variable = scope.set.get(variableName);

                if (variable) {
                  for (const reference of variable.references) {
                    const ref = reference.identifier;

                    // Skip the declaration itself
                    if (ref.range[0] === node.id.range[0] && ref.range[1] === node.id.range[1]) {
                      continue;
                    }

                    // Skip property accesses (e.g., obj.prop)
                    if (
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      ref.parent?.type === AST_NODE_TYPES.MemberExpression &&
                      ref.parent.property === ref &&
                      !ref.parent.computed
                    ) {
                      continue;
                    }

                    fixes.push(fixer.replaceText(ref, fixedName));
                  }
                }

                return fixes;
              } catch (error: unknown) {
                console.error('Error in fixer:', error);
                return [];
              }
            },
          });
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
            console.info(
              `\n[${ruleName}] Performance Metrics (${finalMetrics.exceededBudget === true ? 'EXCEEDED' : 'OK'}):`
            );
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${finalMetrics.duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${finalMetrics.nodeCount}`);

            if (finalMetrics.exceededBudget === true) {
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
