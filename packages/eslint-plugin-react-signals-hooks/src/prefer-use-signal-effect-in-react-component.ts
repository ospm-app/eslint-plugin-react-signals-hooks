import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import { ensureNamedImportFixes } from './utils/imports.js';
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
  | 'preferUseSignalEffectInComponent'
  | 'suggestUseSignalEffect'
  | 'addUseSignalEffectImport';

type Option = {
  performance?: PerformanceBudget;
};

type Options = [Option?];

function isReactComponent(node: TSESTree.Node): boolean {
  // Check if this is a function declaration with PascalCase name
  if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
    return typeof node.id?.name === 'undefined' ? false : /^[A-Z]/.test(node.id.name);
  }

  // Check if this is a variable declarator with PascalCase name assigned to a function
  if (node.type === AST_NODE_TYPES.VariableDeclarator) {
    if (
      node.id.type === AST_NODE_TYPES.Identifier &&
      /^[A-Z]/.test(node.id.name) &&
      node.init &&
      (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        node.init.type === AST_NODE_TYPES.FunctionExpression)
    ) {
      return true;
    }
  }

  return false;
}

function isInsideReactComponent(
  node: TSESTree.Node,
  context: RuleContext<MessageIds, Options>
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    // eslint-disable-next-line security/detect-object-injection
    const ancestor = ancestors[i];

    if (!ancestor) {
      continue;
    }

    if (isReactComponent(ancestor)) {
      return true;
    }
  }

  return false;
}

function isEffectCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === AST_NODE_TYPES.Identifier) {
    return node.callee.name === 'effect';
  }

  if (
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    !node.callee.computed &&
    node.callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return node.callee.property.name === 'effect';
  }

  return false;
}

function hasUseSignalEffectImport(context: RuleContext<MessageIds, Options>): boolean {
  return context.sourceCode.ast.body.some((stmt): stmt is TSESTree.ImportDeclaration => {
    return (
      stmt.type === AST_NODE_TYPES.ImportDeclaration &&
      stmt.source.value === '@preact/signals-react' &&
      stmt.specifiers.some((spec) => {
        return (
          spec.type === AST_NODE_TYPES.ImportSpecifier &&
          spec.imported.type === AST_NODE_TYPES.Identifier &&
          spec.imported.name === 'useSignalEffect'
        );
      })
    );
  });
}

const ruleName = 'prefer-use-signal-effect-in-react-component';

export const preferUseSignalEffectInReactComponentRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforces using `useSignalEffect()` instead of `effect()` inside React components to ensure proper lifecycle integration.',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferUseSignalEffectInComponent:
        'Use `useSignalEffect()` instead of `effect()` inside React components to ensure proper lifecycle integration',
      suggestUseSignalEffect: 'Replace `effect()` with `useSignalEffect()`',
      addUseSignalEffectImport: 'Add `useSignalEffect` import from @preact/signals-react',
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

    const perf = createPerformanceTracker(perfKey, option?.performance);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

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
          return;
        }

        perf.trackNode(node);

        trackOperation(
          perfKey,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing
        );
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (!isEffectCall(node)) {
          return;
        }

        if (!isInsideReactComponent(node, context)) {
          return;
        }

        recordMetric(perfKey, 'effectCallsInComponents', 1);

        const hasUseSignalEffect = hasUseSignalEffectImport(context);

        context.report({
          node,
          messageId: 'preferUseSignalEffectInComponent',
          fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
            const fixes: Array<TSESLint.RuleFix> = [];

            // Replace effect with useSignalEffect
            if (node.callee.type === AST_NODE_TYPES.Identifier) {
              fixes.push(fixer.replaceText(node.callee, 'useSignalEffect'));
            } else if (
              node.callee.type === AST_NODE_TYPES.MemberExpression &&
              node.callee.property.type === AST_NODE_TYPES.Identifier
            ) {
              fixes.push(fixer.replaceText(node.callee.property, 'useSignalEffect'));
            }

            // Add useSignalEffect import if needed
            if (!hasUseSignalEffect) {
              const importFixes = ensureNamedImportFixes(
                context,
                fixer,
                '@preact/signals-react',
                'useSignalEffect'
              );
              fixes.push(...importFixes);
            }

            return fixes;
          },
          suggest: [
            {
              messageId: 'suggestUseSignalEffect',
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes: Array<TSESLint.RuleFix> = [];

                // Replace effect with useSignalEffect
                if (node.callee.type === AST_NODE_TYPES.Identifier) {
                  fixes.push(fixer.replaceText(node.callee, 'useSignalEffect'));
                } else if (
                  node.callee.type === AST_NODE_TYPES.MemberExpression &&
                  node.callee.property.type === AST_NODE_TYPES.Identifier
                ) {
                  fixes.push(fixer.replaceText(node.callee.property, 'useSignalEffect'));
                }

                // Add useSignalEffect import if needed
                if (!hasUseSignalEffect) {
                  const importFixes = ensureNamedImportFixes(
                    context,
                    fixer,
                    '@preact/signals-react',
                    'useSignalEffect'
                  );
                  fixes.push(...importFixes);
                }

                return fixes;
              },
            },
          ],
        });
      },

      [`${AST_NODE_TYPES.Program}:exit`]: (): void => {
        startPhase(perfKey, 'programExit');
        perf['Program:exit']();
        endPhase(perfKey, 'programExit');
      },
    };
  },
});
