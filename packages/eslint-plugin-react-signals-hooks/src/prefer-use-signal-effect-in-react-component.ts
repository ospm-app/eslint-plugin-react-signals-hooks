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
    return node.id?.name ? /^[A-Z]/.test(node.id.name) : false;
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
    const ancestor = ancestors[i];
    if (!ancestor) continue;

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

function removeUnusedEffectImport(
  context: RuleContext<MessageIds, Options>,
  fixer: TSESLint.RuleFixer,
  fixes: TSESLint.RuleFix[]
): void {
  // Find all effect calls in the file
  const effectCalls: TSESTree.CallExpression[] = [];

  function isESTreeNode(value: unknown): value is TSESTree.Node {
    return (
      !!value &&
      typeof value === 'object' &&
      'type' in (value as Record<string, unknown>) &&
      typeof (value as { type?: unknown }).type === 'string'
    );
  }

  function findEffectCalls(node: TSESTree.Node): void {
    if (node.type === AST_NODE_TYPES.CallExpression && isEffectCall(node)) {
      effectCalls.push(node);
    }

    for (const key of Object.keys(node) as Array<keyof typeof node>) {
      if (key === 'parent') continue;
      const value = node[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (isESTreeNode(item)) {
            findEffectCalls(item);
          }
        }
      } else if (isESTreeNode(value)) {
        findEffectCalls(value);
      }
    }
  }

  findEffectCalls(context.sourceCode.ast);

  // Check if all effect calls are in React components
  const allEffectInComponents = effectCalls.every((call) => isInsideReactComponent(call, context));

  if (allEffectInComponents && effectCalls.length > 0) {
    // Remove effect import
    const importDecl = context.sourceCode.ast.body.find(
      (stmt): stmt is TSESTree.ImportDeclaration => {
        return (
          stmt.type === AST_NODE_TYPES.ImportDeclaration &&
          stmt.source.value === '@preact/signals-react'
        );
      }
    );

    if (importDecl) {
      const effectSpec = importDecl.specifiers.find((spec): spec is TSESTree.ImportSpecifier => {
        return (
          spec.type === AST_NODE_TYPES.ImportSpecifier &&
          spec.imported.type === AST_NODE_TYPES.Identifier &&
          spec.imported.name === 'effect'
        );
      });

      if (effectSpec && importDecl.specifiers.length > 1) {
        // Remove just the effect specifier
        const isLast =
          importDecl.specifiers.indexOf(effectSpec) === importDecl.specifiers.length - 1;
        const isPrevComma = context.sourceCode.getTokenBefore(effectSpec)?.value === ',';
        const isNextComma = context.sourceCode.getTokenAfter(effectSpec)?.value === ',';

        if (isLast && isPrevComma) {
          // Remove ", effect"
          const prevToken = context.sourceCode.getTokenBefore(effectSpec);
          if (prevToken) {
            fixes.push(fixer.removeRange([prevToken.range[0], effectSpec.range[1]]));
          }
        } else if (isNextComma) {
          // Remove "effect, "
          const nextToken = context.sourceCode.getTokenAfter(effectSpec);
          if (nextToken) {
            fixes.push(fixer.removeRange([effectSpec.range[0], nextToken.range[1]]));
          }
        } else {
          // Remove just "effect"
          fixes.push(fixer.remove(effectSpec));
        }
      } else if (effectSpec && importDecl.specifiers.length === 1) {
        // Remove entire import
        fixes.push(fixer.remove(importDecl));
      }
    }
  }
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

        const op =
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, op);
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
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
            const fixes: TSESLint.RuleFix[] = [];

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

            // Remove unused effect import
            removeUnusedEffectImport(context, fixer, fixes);

            return fixes;
          },
          suggest: [
            {
              messageId: 'suggestUseSignalEffect',
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix[] | null {
                const fixes: TSESLint.RuleFix[] = [];

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
