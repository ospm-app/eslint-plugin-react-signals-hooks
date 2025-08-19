/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext, SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';

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

type MessageIds = 'preferSignalEffect' | 'suggestEffect' | 'addEffectImport' | 'mixedDeps';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
  reportMixedDeps?: boolean;
  extraCreatorModules?: Array<string>; // additional modules exporting signal/computed creators
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

    case 'mixedDeps': {
      return options.severity.mixedDeps ?? 'warn';
    }

    default: {
      return 'error';
    }
  }
}

function isSignalDependency(
  dep: TSESTree.Expression | TSESTree.SpreadElement | null,
  createdSignals: ReadonlySet<string>
): boolean {
  if (!dep || dep.type === AST_NODE_TYPES.SpreadElement) {
    return false;
  }

  // Unwrap ChainExpression conservatively; bail if optional access exists later
  if (dep.type === AST_NODE_TYPES.ChainExpression) {
    dep = dep.expression;
  }

  // Member: fooSignal.value (no optional)
  if (
    dep.type === AST_NODE_TYPES.MemberExpression &&
    !dep.optional &&
    dep.property.type === AST_NODE_TYPES.Identifier &&
    dep.property.name === 'value' &&
    dep.object.type === AST_NODE_TYPES.Identifier &&
    createdSignals.has(dep.object.name)
  ) {
    return true;
  }

  // Identifier: fooSignal
  if (dep.type === AST_NODE_TYPES.Identifier && createdSignals.has(dep.name)) {
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

function hasCleanupReturn(
  cb: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
): boolean {
  if (
    cb.type === AST_NODE_TYPES.ArrowFunctionExpression &&
    cb.body.type === AST_NODE_TYPES.BlockStatement
  ) {
    return cb.body.body.some((s: TSESTree.Statement): s is TSESTree.ReturnStatement => {
      return s.type === AST_NODE_TYPES.ReturnStatement;
    });
  }

  if (cb.type === AST_NODE_TYPES.FunctionExpression) {
    return cb.body.body.some((s: TSESTree.Statement): s is TSESTree.ReturnStatement => {
      return s.type === AST_NODE_TYPES.ReturnStatement;
    });
  }

  return false;
}

function callbackReadsSignal(
  cb: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
  createdSignals: ReadonlySet<string>
): boolean {
  const visit = (n: TSESTree.Node): boolean => {
    // Look for member reads like: foo.value where foo is a created signal
    if (
      n.type === AST_NODE_TYPES.MemberExpression &&
      !n.optional &&
      n.object.type === AST_NODE_TYPES.Identifier &&
      n.property.type === AST_NODE_TYPES.Identifier &&
      n.property.name === 'value' &&
      createdSignals.has(n.object.name)
    ) {
      return true;
    }

    // Traverse children conservatively; avoid parent back-references that cause cycles
    for (const key of Object.keys(n) as Array<keyof typeof n>) {
      if (key === 'parent') {
        continue;
      }

      const val = n[key as keyof typeof n];

      if (typeof val !== 'undefined' && typeof val === 'object') {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === 'object' && 'type' in item && visit(item)) {
              return true;
            }
          }
        } else if ('type' in val && visit(val)) {
          return true;
        }
      }
    }

    return false;
  };

  // Body can be block or expression for arrow functions
  if (
    cb.type === AST_NODE_TYPES.ArrowFunctionExpression &&
    cb.body.type !== AST_NODE_TYPES.BlockStatement
  ) {
    return visit(cb.body);
  }

  if ('body' in cb.body && Array.isArray(cb.body.body)) {
    for (const stmt of cb.body.body) {
      if (visit(stmt)) {
        return true;
      }
    }
  }

  return false;
}

function hasEffectImportFromAny(
  context: RuleContext<MessageIds, Options>,
  creatorModules: Set<string>
): boolean {
  return context.sourceCode.ast.body.some(
    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
      return (
        n.type === AST_NODE_TYPES.ImportDeclaration &&
        typeof n.source.value === 'string' &&
        creatorModules.has(n.source.value) &&
        n.specifiers.some((s: TSESTree.ImportClause): boolean => {
          return (
            s.type === AST_NODE_TYPES.ImportSpecifier &&
            'name' in s.imported &&
            s.imported.name === 'effect'
          );
        })
      );
    }
  );
}

function ensureEffectImportAny(
  fixer: TSESLint.RuleFixer,
  fixes: Array<TSESLint.RuleFix>,
  context: RuleContext<MessageIds, Options>,
  creatorModules: Set<string>
): void {
  if (hasEffectImportFromAny(context, creatorModules)) {
    return;
  }

  const importDecls = context.sourceCode.ast.body.filter(
    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
      return n.type === AST_NODE_TYPES.ImportDeclaration;
    }
  );

  const anyCreatorImport = importDecls.find((d: TSESTree.ImportDeclaration): boolean => {
    return typeof d.source.value === 'string' && creatorModules.has(d.source.value);
  });

  const importText = "import { effect } from '@preact/signals-react';\n";

  if (!anyCreatorImport) {
    const lastImport = importDecls[importDecls.length - 1];

    const firstStmt = context.sourceCode.ast.body[0];

    if (!firstStmt) {
      return;
    }

    fixes.push(
      typeof lastImport === 'undefined'
        ? fixer.insertTextBefore(firstStmt, importText)
        : fixer.insertTextAfter(lastImport, `\n${importText.trimStart()}`)
    );

    return;
  }

  // If we have an import from any creator module, try to append named import
  const hasNamespace = anyCreatorImport.specifiers.some(
    (s: TSESTree.ImportClause): s is TSESTree.ImportNamespaceSpecifier => {
      return s.type === AST_NODE_TYPES.ImportNamespaceSpecifier;
    }
  );

  if (anyCreatorImport.importKind === 'type' || hasNamespace) {
    fixes.push(fixer.insertTextAfter(anyCreatorImport, `\n${importText}`));
    return;
  }

  if (
    anyCreatorImport.specifiers.some((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
      return (
        s.type === AST_NODE_TYPES.ImportSpecifier &&
        'name' in s.imported &&
        s.imported.name === 'effect'
      );
    })
  ) {
    return;
  }

  const lastNamed = [...anyCreatorImport.specifiers]
    .reverse()
    .find((s): s is TSESTree.ImportSpecifier => s.type === AST_NODE_TYPES.ImportSpecifier);

  if (lastNamed) {
    fixes.push(fixer.insertTextAfter(lastNamed, ', effect'));

    return;
  }

  const defaultSpec = anyCreatorImport.specifiers.find(
    (s: TSESTree.ImportClause): s is TSESTree.ImportDefaultSpecifier => {
      return s.type === AST_NODE_TYPES.ImportDefaultSpecifier;
    }
  );

  if (defaultSpec) {
    fixes.push(
      fixer.replaceText(
        anyCreatorImport,
        `import ${defaultSpec.local.name}, { effect } from '${String(anyCreatorImport.source.value)}';`
      )
    );

    return;
  }

  // Fallback: separate import
  fixes.push(fixer.insertTextAfter(anyCreatorImport, `\n${importText}`));
}

const ruleName = 'prefer-signal-effect';

export const preferSignalEffectRule = ESLintUtils.RuleCreator((name: string) => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
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
      mixedDeps:
        'Effect has mixed dependencies (signals and non-signals); consider splitting logic or using effect() for signal reads',
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
          reportMixedDeps: {
            type: 'boolean',
          },
          extraCreatorModules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
      severity: {
        preferSignalEffect: 'error',
        suggestEffect: 'error',
        addEffectImport: 'warn',
        mixedDeps: 'warn',
      },
      reportMixedDeps: false,
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

    const effectLocalNames = new Set<string>(['useEffect', 'useLayoutEffect']);
    const creatorLocalNames = new Set<string>(); // e.g., signal, computed (possibly aliased)
    const signalsNamespaceNames = new Set<string>(); // e.g., Signals in `import * as Signals from ...`
    const createdSignals = new Set<string>(); // identifiers created via recognized creators
    const creatorModules = new Set<string>([
      '@preact/signals-react',
      ...(Array.isArray(option?.extraCreatorModules) ? option.extraCreatorModules : []),
    ]);

    for (const stmt of context.sourceCode.ast.body) {
      if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
        if (stmt.source.value === 'react') {
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

        if (typeof stmt.source.value === 'string' && creatorModules.has(stmt.source.value)) {
          for (const spec of stmt.specifiers) {
            if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
              const importedName =
                spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : '';

              if (importedName === 'signal' || importedName === 'computed') {
                creatorLocalNames.add(spec.local.name);
              }
            } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
              signalsNamespaceNames.add(spec.local.name);
            }
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

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        // Track const foo = signal(...); or const foo = computed(...);
        if (node.id.type !== AST_NODE_TYPES.Identifier || !node.init) return;

        if (node.init.type === AST_NODE_TYPES.CallExpression) {
          if (node.init.callee.type === AST_NODE_TYPES.Identifier) {
            if (creatorLocalNames.has(node.init.callee.name)) {
              createdSignals.add(node.id.name);
            }
          } else if (
            node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
            !node.init.callee.computed &&
            node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
            node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
            signalsNamespaceNames.has(node.init.callee.object.name) &&
            (node.init.callee.property.name === 'signal' ||
              node.init.callee.property.name === 'computed')
          ) {
            createdSignals.add(node.id.name);
          }
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (!isUseEffectCall(node.callee, effectLocalNames)) {
          return;
        }

        // Case A: effect with deps array that's signal-only -> main report + fix
        if (
          node.arguments.length === 2 &&
          node.arguments[1]?.type === AST_NODE_TYPES.ArrayExpression
        ) {
          if (
            !(
              node.arguments[1].elements.length > 0 &&
              node.arguments[1].elements.every(
                (dep: TSESTree.Expression | TSESTree.SpreadElement | null): boolean => {
                  return isSignalDependency(dep, createdSignals);
                }
              )
            )
          ) {
            // Not all are signals; if configured, report mixed deps when both present
            if (option?.reportMixedDeps === true && node.arguments[1].elements.length > 0) {
              const hasSignal = node.arguments[1].elements.some((dep) =>
                isSignalDependency(dep, createdSignals)
              );

              const hasNonSignal = node.arguments[1].elements.some((dep) => {
                if (!dep || dep.type === AST_NODE_TYPES.SpreadElement) return false;
                return !isSignalDependency(dep, createdSignals);
              });

              if (hasSignal && hasNonSignal && getSeverity('mixedDeps', option) !== 'off') {
                context.report({ node, messageId: 'mixedDeps' });
              }
            }

            return;
          }

          const hasEffectImport = hasEffectImportFromAny(context, creatorModules);

          if (getSeverity('preferSignalEffect', option) === 'off') {
            return;
          }

          context.report({
            node,
            messageId: 'preferSignalEffect',
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              // Conservative autofix: only when callback is a zero-arg function with no cleanup return
              const cb = node.arguments[0];
              if (
                !cb ||
                (cb.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                  cb.type !== AST_NODE_TYPES.FunctionExpression)
              ) {
                return null;
              }

              if (cb.params.length !== 0) {
                return null;
              }

              if (hasCleanupReturn(cb)) {
                return null;
              }

              const fixes: Array<TSESLint.RuleFix> = [];

              fixes.push(fixer.replaceText(node, `effect(${context.sourceCode.getText(cb)})`));

              if (!hasEffectImport) {
                ensureEffectImportAny(fixer, fixes, context, creatorModules);
              }

              return fixes;
            },
            suggest: [
              {
                messageId: 'suggestEffect',
                fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                  const fixes: Array<TSESLint.RuleFix> = [];

                  if (
                    !node.arguments[0] ||
                    (node.arguments[0].type !== AST_NODE_TYPES.ArrowFunctionExpression &&
                      node.arguments[0].type !== AST_NODE_TYPES.FunctionExpression)
                  ) {
                    return null;
                  }

                  fixes.push(
                    fixer.replaceText(
                      node,
                      `effect(${context.sourceCode.getText(node.arguments[0])})`
                    )
                  );

                  // Add effect import if needed
                  if (!hasEffectImport) {
                    ensureEffectImportAny(fixer, fixes, context, creatorModules);
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
                        const fixes: Array<TSESLint.RuleFix> = [];

                        ensureEffectImportAny(fixer, fixes, context, creatorModules);

                        return fixes.length > 0 ? fixes : null;
                      },
                    } satisfies SuggestionReportDescriptor<MessageIds>,
                  ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
            ],
          });
          return;
        }

        // Case B: effect without deps array, but callback reads signals -> suggestion-only
        if (
          (node.arguments.length === 1 ||
            node.arguments[1]?.type !== AST_NODE_TYPES.ArrayExpression) &&
          node.arguments[0] &&
          (node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.arguments[0].type === AST_NODE_TYPES.FunctionExpression)
        ) {
          const cb = node.arguments[0];
          if (
            cb.params.length === 0 &&
            !hasCleanupReturn(cb) &&
            callbackReadsSignal(cb, createdSignals)
          ) {
            const hasEffectImport = hasEffectImportFromAny(context, creatorModules);

            context.report({
              node,
              messageId: 'preferSignalEffect',
              suggest: [
                {
                  messageId: 'suggestEffect',
                  fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                    const fixes: Array<TSESLint.RuleFix> = [];

                    fixes.push(
                      fixer.replaceText(node, `effect(${context.sourceCode.getText(cb)})`)
                    );

                    if (!hasEffectImport) {
                      const importFixes = ensureNamedImportFixes(
                        { sourceCode: context.sourceCode },
                        fixer,
                        '@preact/signals-react',
                        'effect'
                      );

                      if (importFixes.length === 0) {
                        return null;
                      }

                      for (const f of importFixes) {
                        fixes.push(f);
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
                          const fixes: Array<TSESLint.RuleFix> = [];

                          ensureEffectImportAny(fixer, fixes, context, creatorModules);

                          return fixes.length > 0 ? fixes : null;
                        },
                      } satisfies SuggestionReportDescriptor<MessageIds>,
                    ] satisfies Array<SuggestionReportDescriptor<MessageIds>>)),
              ],
            });
          }
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
