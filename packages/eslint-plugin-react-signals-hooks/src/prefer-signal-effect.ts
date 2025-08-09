/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext, SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';

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

type MessageIds = 'preferSignalEffect' | 'suggestEffect' | 'addEffectImport';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return messageId === 'addEffectImport' ? 'warn' : 'error';
  }

  switch (messageId) {
    case 'preferSignalEffect': {
      return options.severity.preferSignalEffect ?? 'error';
    }

    case 'suggestEffect': {
      return options.severity.suggestEffect ?? 'error';
    }

    case 'addEffectImport': {
      return options.severity.addEffectImport ?? 'warn';
    }

    default: {
      return 'error';
    }
  }
}

function isSignalDependency(
  dep: TSESTree.Expression | TSESTree.SpreadElement | null,
  suffixRegex?: RegExp
): boolean {
  if (!dep || dep.type === 'SpreadElement') {
    return false;
  }

  const defaultSuffixRegex = buildSuffixRegex('Signal');

  if (
    dep.type === AST_NODE_TYPES.MemberExpression &&
    dep.property.type === AST_NODE_TYPES.Identifier &&
    dep.property.name === 'value' &&
    dep.object.type === AST_NODE_TYPES.Identifier &&
    hasSignalSuffix(dep.object.name, suffixRegex ?? defaultSuffixRegex)
  ) {
    return true;
  }

  if (
    dep.type === AST_NODE_TYPES.Identifier &&
    hasSignalSuffix(dep.name, suffixRegex ?? defaultSuffixRegex)
  ) {
    return true;
  }

  return false;
}

function isUseEffectCall(callee: TSESTree.Expression, effectLocalNames: Set<string>): boolean {
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return effectLocalNames.has(callee.name);
  }

  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return callee.property.name === 'useEffect' || callee.property.name === 'useLayoutEffect';
  }

  return false;
}

const ruleName = 'prefer-signal-effect';

export const preferSignalEffectRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem', // Changed from 'suggestion' to 'problem' as this helps prevent critical issues like infinite loops
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        'Encourages using `effect()` from @preact/signals-react instead of `useEffect` when working with signals. This provides better performance through automatic dependency tracking and more predictable reactivity behavior.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      preferSignalEffect:
        'Prefer using `effect()` instead of `useEffect` for signal-only dependencies',
      suggestEffect: 'Replace `useEffect` with `effect()`',
      addEffectImport: 'Add `effect` import from @preact/signals-react',
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
              preferSignalEffect: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestEffect: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addEffectImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
          suffix: {
            type: 'string',
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

    // Collect local identifiers that refer to React's useEffect/useLayoutEffect
    // Handles aliased imports like: import { useEffect as uef } from 'react'
    const effectLocalNames = new Set<string>(['useEffect', 'useLayoutEffect']);
    for (const stmt of context.sourceCode.ast.body) {
      if (stmt.type === AST_NODE_TYPES.ImportDeclaration && stmt.source.value === 'react') {
        for (const spec of stmt.specifiers) {
          if (
            spec.type === AST_NODE_TYPES.ImportSpecifier &&
            spec.imported.type === AST_NODE_TYPES.Identifier &&
            (spec.imported.name === 'useEffect' || spec.imported.name === 'useLayoutEffect')
          ) {
            effectLocalNames.add(spec.local.name);
          }
        }
      }
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
        if (
          !isUseEffectCall(node.callee, effectLocalNames) ||
          node.arguments.length !== 2 ||
          node.arguments[1]?.type !== AST_NODE_TYPES.ArrayExpression
        ) {
          return;
        }

        if (
          !(
            node.arguments[1].elements.length > 0 &&
            node.arguments[1].elements.every(
              (dep: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => {
                return isSignalDependency(dep, suffixRegex);
              }
            )
          )
        ) {
          return;
        }

        const hasEffectImport = context.sourceCode.ast.body.some(
          (node): node is TSESTree.ImportDeclaration => {
            return (
              node.type === AST_NODE_TYPES.ImportDeclaration &&
              node.source.value === '@preact/signals-react' &&
              node.specifiers.some((s: TSESTree.ImportClause): boolean => {
                return (
                  s.type === AST_NODE_TYPES.ImportSpecifier &&
                  'name' in s.imported &&
                  s.imported.name === 'effect'
                );
              })
            );
          }
        );

        if (getSeverity('preferSignalEffect', option) === 'off') {
          return;
        }

        context.report({
          node,
          messageId: 'preferSignalEffect',
          fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
            // Conservative autofix: only when callback is a zero-arg function with no cleanup return
            const cb = node.arguments[0] as TSESTree.Node | undefined;
            if (
              !cb ||
              (cb.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                cb.type !== AST_NODE_TYPES.FunctionExpression)
            ) {
              return null;
            }

            // zero params only
            const paramsLength = (
              cb as TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
            ).params.length;
            if (paramsLength !== 0) {
              return null;
            }

            // if body contains a top-level return (cleanup), skip fix
            const hasCleanupReturn = (() => {
              if (
                cb.type === AST_NODE_TYPES.ArrowFunctionExpression &&
                cb.body.type === AST_NODE_TYPES.BlockStatement
              ) {
                return cb.body.body.some((s) => s.type === AST_NODE_TYPES.ReturnStatement);
              }
              if (cb.type === AST_NODE_TYPES.FunctionExpression) {
                return cb.body.body.some((s) => s.type === AST_NODE_TYPES.ReturnStatement);
              }
              return false;
            })();

            if (hasCleanupReturn) {
              return null;
            }

            const fixes: Array<TSESLint.RuleFix> = [];

            fixes.push(fixer.replaceText(node, `effect(${context.sourceCode.getText(cb)})`));

            if (!hasEffectImport) {
              const effectImport = "import { effect } from '@preact/signals-react';\n";

              const firstImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return n.type === AST_NODE_TYPES.ImportDeclaration;
                }
              );

              if (firstImport) {
                fixes.push(fixer.insertTextBefore(firstImport, effectImport));
              } else if (context.sourceCode.ast.body[0]) {
                fixes.push(fixer.insertTextBefore(context.sourceCode.ast.body[0], effectImport));
              } else {
                return null;
              }
            }

            return fixes;
          },
          suggest: [
            {
              messageId: 'suggestEffect',
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes: Array<TSESLint.RuleFix> = [];
                const cb = node.arguments[0] as TSESTree.Node | undefined;
                const cbText = cb ? context.sourceCode.getText(cb) : '';
                fixes.push(
                  fixer.replaceText(node, `effect(${cbText || '() => { /* TODO: port body */ }'})`)
                );

                // Add effect import if needed
                if (!hasEffectImport) {
                  const effectImport = "import { effect } from '@preact/signals-react';\n";

                  const firstImport = context.sourceCode.ast.body.find(
                    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                      return n.type === AST_NODE_TYPES.ImportDeclaration;
                    }
                  );

                  if (firstImport) {
                    fixes.push(fixer.insertTextBefore(firstImport, effectImport));
                  } else {
                    const b = context.sourceCode.ast.body[0];

                    if (!b) {
                      return null;
                    }

                    fixes.push(fixer.insertTextBefore(b, effectImport));
                  }
                }

                return fixes;
              },
            },
            ...(hasEffectImport
              ? []
              : ([
                  {
                    messageId: 'addEffectImport',
                    fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                      const signalsImport = context.sourceCode.ast.body.find(
                        (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                          return (
                            n.type === AST_NODE_TYPES.ImportDeclaration &&
                            n.source.value === '@preact/signals-react'
                          );
                        }
                      );

                      if (signalsImport) {
                        const last = signalsImport.specifiers[signalsImport.specifiers.length - 1];

                        if (!last) {
                          return null;
                        }

                        return [fixer.insertTextAfter(last, ', effect')];
                      }

                      const b = context.sourceCode.ast.body[0];

                      if (!b) {
                        return null;
                      }

                      return [
                        fixer.insertTextBefore(
                          b,
                          "import { effect } from '@preact/signals-react';\n"
                        ),
                      ];
                    },
                  } satisfies SuggestionReportDescriptor<MessageIds>,
                ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
          ],
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
