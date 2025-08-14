/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext, SourceCode } from '@typescript-eslint/utils/ts-eslint';

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

type MessageIds =
  | 'preferComputedWithSignal'
  | 'preferComputedWithSignals'
  | 'suggestComputed'
  | 'addComputedImport'
  | 'suggestAddComputedImport';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
  /**
   * Controls whether the fixer renames the resulting computed variable and updates references.
   * Default: true
   */
  rename?: boolean;
  /**
   * Controls how accessors are applied when updating references to the computed variable.
   */
  accessors?: {
    /**
     * Accessor strategy within JSX (excluding attributes and call args which still require `.value`).
     * - 'auto'  => no accessor for general JSX expressions, '.value' for attributes/call args
     * - 'value' => force '.value' in all JSX contexts
     * - 'none'  => never add accessor in JSX contexts (attributes/call args still use '.value')
     */
    jsx?: 'auto' | 'value' | 'none';
    /** Accessor to use in non-JSX contexts within component/hook bodies. Default: 'value' */
    inComponent?: 'value' | 'peek';
    /** Accessor to use outside component scope. Default: 'peek' */
    outsideComponent?: 'peek' | 'value';
  };
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'preferComputedWithSignal': {
      return options.severity.preferComputedWithSignal ?? 'error';
    }

    case 'preferComputedWithSignals': {
      return options.severity.preferComputedWithSignals ?? 'error';
    }

    case 'suggestComputed': {
      return options.severity.suggestComputed ?? 'error';
    }

    case 'addComputedImport': {
      return options.severity.addComputedImport ?? 'error';
    }

    case 'suggestAddComputedImport': {
      return options.severity.suggestAddComputedImport ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

type SignalDependencyInfo = {
  signalName: string;
  isDirectAccess: boolean;
  node: TSESTree.Node;
};

function getOrCreateComputedImport(
  sourceCode: SourceCode,
  program: TSESTree.Program | null
): TSESTree.ImportDeclaration | undefined {
  if (program === null) {
    program = sourceCode.ast;
  }

  return program.body.find((n): n is TSESTree.ImportDeclaration => {
    return (
      n.type === AST_NODE_TYPES.ImportDeclaration && n.source.value === '@preact/signals-react'
    );
  });
}

function getSignalDependencyInfo(
  dep: TSESTree.Node | null,
  suffixRegex: RegExp
): SignalDependencyInfo | null {
  if (dep === null) {
    return null;
  }

  if (
    dep.type === AST_NODE_TYPES.MemberExpression &&
    dep.property.type === AST_NODE_TYPES.Identifier &&
    dep.property.name === 'value' &&
    dep.object.type === AST_NODE_TYPES.Identifier &&
    hasSignalSuffix(dep.object.name, suffixRegex)
  ) {
    return {
      signalName: dep.object.name,
      isDirectAccess: false,
      node: dep,
    };
  }

  if (dep.type === AST_NODE_TYPES.Identifier && hasSignalSuffix(dep.name, suffixRegex)) {
    return {
      signalName: dep.name,
      isDirectAccess: true,
      node: dep,
    };
  }

  return null;
}

let hasComputedImport = false;
let program: TSESTree.Program | null = null;

const ruleName = 'prefer-computed';

export const preferComputedRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Encourages using `computed()` from @preact/signals-react instead of `useMemo` when working with signals. This provides better performance through automatic dependency tracking and more predictable reactivity behavior in React components.',
      url: getRuleDocUrl(ruleName),
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferComputedWithSignal:
        'Prefer `computed()` over `useMemo` when using signal "{{ signalName }}" for better performance and automatic reactivity.',
      preferComputedWithSignals:
        'Prefer `computed()` over `useMemo` when using signals ({{ signalNames }}) for better performance and automatic reactivity.',
      suggestComputed: 'Replace `useMemo` with `computed()`',
      addComputedImport: 'Add `computed` import from @preact/signals-react',
      suggestAddComputedImport: 'Add missing import for `computed`',
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
              preferComputedWithSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              preferComputedWithSignals: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestComputed: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addComputedImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestAddComputedImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
          rename: { type: 'boolean' },
          accessors: {
            type: 'object',
            properties: {
              jsx: { type: 'string', enum: ['auto', 'value', 'none'] },
              inComponent: { type: 'string', enum: ['value', 'peek'] },
              outsideComponent: { type: 'string', enum: ['peek', 'value'] },
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
      rename: true,
      accessors: {
        jsx: 'auto',
        inComponent: 'value',
        outsideComponent: 'peek',
      },
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

    startPhase(perfKey, 'ruleExecution');

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        const op =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, op);
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        startPhase(perfKey, 'program-analysis');

        program = node;

        hasComputedImport = program.body.some(
          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
            trackOperation(perfKey, PerformanceOperations.importCheck);

            return (
              n.type === AST_NODE_TYPES.ImportDeclaration &&
              n.source.value === '@preact/signals-react' &&
              n.specifiers.some((s: TSESTree.ImportClause): boolean => {
                return (
                  s.type === AST_NODE_TYPES.ImportSpecifier &&
                  'name' in s.imported &&
                  s.imported.name === 'computed'
                );
              })
            );
          }
        );

        endPhase(perfKey, 'program-analysis');
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        recordMetric(perfKey, 'useMemoCallsAnalyzed', 1);

        trackOperation(perfKey, PerformanceOperations.callExpressionCheck);

        let depth = 0;

        let parent: TSESTree.Node | undefined = node.parent;

        while (parent) {
          if (parent.type === AST_NODE_TYPES.CallExpression) depth++;

          parent = parent.parent;
        }

        recordMetric(perfKey, 'currentCallDepth', depth);

        const isUseMemoCall = (() => {
          if (node.callee.type === AST_NODE_TYPES.Identifier) {
            return node.callee.name === 'useMemo';
          }

          if (
            node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier
          ) {
            // React.useMemo or aliased namespace
            return node.callee.property.name === 'useMemo';
          }

          return false;
        })();

        if (
          !isUseMemoCall ||
          node.arguments.length !== 2 ||
          node.arguments[1]?.type !== AST_NODE_TYPES.ArrayExpression
        ) {
          return;
        }

        startPhase(perfKey, 'signal-analysis');

        const signalDeps: Array<SignalDependencyInfo> = [];

        for (const dep of node.arguments[1].elements) {
          trackOperation(perfKey, PerformanceOperations.dependencyCheck);

          const depInfo = getSignalDependencyInfo(dep, suffixRegex);

          if (depInfo) {
            signalDeps.push(depInfo);

            recordMetric(perfKey, 'totalSignalDependencies', signalDeps.length);
          }
        }

        if (signalDeps.length === 0) {
          endPhase(perfKey, 'signal-analysis');

          return;
        }

        recordMetric(perfKey, 'useMemoCallsWithSignals', 1);

        const uniqueSignalNames = [...new Set(signalDeps.map((s) => s.signalName))];

        const hasMultipleSignals = uniqueSignalNames.length > 1;

        recordMetric(perfKey, 'uniqueSignalsPerUseMemo', uniqueSignalNames.length);

        if (hasMultipleSignals) {
          recordMetric(perfKey, 'useMemoWithMultipleSignals', 1);
        }

        const suggestionType = hasMultipleSignals ? 'multipleSignals' : 'singleSignal';

        recordMetric(perfKey, `suggestions.${suggestionType}`, 1);

        trackOperation(perfKey, PerformanceOperations.reportGeneration);

        const messageId =
          signalDeps.length === 1 ? 'preferComputedWithSignal' : 'preferComputedWithSignals';

        if (getSeverity(messageId, option) !== 'off') {
          context.report({
            node,
            messageId,
            data: {
              signalName: uniqueSignalNames[0],
              signalNames: uniqueSignalNames.join(', '),
            },
            suggest: [
              {
                messageId: 'suggestComputed',
                *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix> | null {
                  const callback = node.arguments[0];

                  if (typeof callback === 'undefined') {
                    return;
                  }

                  yield fixer.replaceText(
                    node,
                    `computed(${context.sourceCode.getText(callback)})`
                  );

                  // Also optionally rename the capturing variable to have Signal suffix and fix all references with correct accessors
                  // Find the VariableDeclarator that initializes with this call
                  let decl: TSESTree.VariableDeclarator | null = null;
                  for (const anc of context.sourceCode.getAncestors(node)) {
                    if (anc.type === AST_NODE_TYPES.VariableDeclarator && anc.init === node) {
                      decl = anc;
                      break;
                    }
                  }

                  if (
                    option?.rename !== false &&
                    decl &&
                    decl.id.type === AST_NODE_TYPES.Identifier
                  ) {
                    const originalName = decl.id.name;

                    // Build the fixed name similar to signal-variable-name rule
                    let fixedName = originalName;
                    if (fixedName.startsWith('use') && fixedName.length > 3) {
                      fixedName = fixedName.slice(3);
                    }
                    if (fixedName.length > 0) {
                      fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
                    }
                    if (!hasSignalSuffix(fixedName, suffixRegex)) {
                      fixedName += suffix;
                    }

                    if (fixedName !== originalName) {
                      // Avoid name collision in current scope
                      const declScope = context.sourceCode.getScope(decl);
                      if (!declScope.set.has(fixedName)) {
                        yield fixer.replaceText(decl.id, fixedName);

                        const variable = declScope.set.get(originalName);
                        if (variable) {
                          for (const reference of variable.references) {
                            const ref = reference.identifier;

                            // Skip the declarator id itself
                            if (
                              ref.range[0] === decl.id.range[0] &&
                              ref.range[1] === decl.id.range[1]
                            ) {
                              continue;
                            }

                            // Skip if used as property name in MemberExpression foo.bar
                            if (
                              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                              ref.parent?.type === AST_NODE_TYPES.MemberExpression &&
                              ref.parent.property === ref &&
                              !ref.parent.computed
                            ) {
                              continue;
                            }

                            const ancestors = context.sourceCode.getAncestors(ref);

                            const isJsx = ancestors.some(
                              (
                                a: TSESTree.Node
                              ): a is
                                | TSESTree.JSXElement
                                | TSESTree.JSXFragment
                                | TSESTree.JSXAttribute
                                | TSESTree.JSXExpressionContainer
                                | TSESTree.JSXSpreadAttribute => {
                                return (
                                  a.type === AST_NODE_TYPES.JSXElement ||
                                  a.type === AST_NODE_TYPES.JSXFragment ||
                                  a.type === AST_NODE_TYPES.JSXAttribute ||
                                  a.type === AST_NODE_TYPES.JSXExpressionContainer ||
                                  a.type === AST_NODE_TYPES.JSXSpreadAttribute
                                );
                              }
                            );

                            // In JSX attribute context? (either directly under JSXAttribute, or inside its expression container)
                            const inJsxAttribute = ancestors.some(
                              (a: TSESTree.Node, idx: number): boolean => {
                                if (a.type === AST_NODE_TYPES.JSXAttribute) {
                                  return true;
                                }

                                if (
                                  a.type === AST_NODE_TYPES.JSXExpressionContainer &&
                                  idx > 0 &&
                                  ancestors[idx - 1]?.type === AST_NODE_TYPES.JSXAttribute
                                ) {
                                  return true;
                                }
                                return false;
                              }
                            );

                            // Determine if inside a component/hook function
                            let inComponentScope = false;

                            for (let i = ancestors.length - 1; i >= 0; i--) {
                              // eslint-disable-next-line security/detect-object-injection
                              const anc = ancestors[i];

                              if (!anc) continue;

                              if (anc.type === AST_NODE_TYPES.FunctionDeclaration) {
                                if (anc.id && /^[A-Z]/.test(anc.id.name)) {
                                  inComponentScope = true;
                                }
                                break;
                              }

                              if (
                                anc.type === AST_NODE_TYPES.FunctionExpression ||
                                anc.type === AST_NODE_TYPES.ArrowFunctionExpression
                              ) {
                                // Look for enclosing variable declarator with Uppercase name
                                const vd = ancestors.find((x: TSESTree.Node) => {
                                  return x.type === AST_NODE_TYPES.VariableDeclarator;
                                }) as TSESTree.VariableDeclarator | undefined;

                                if (
                                  vd &&
                                  vd.id.type === AST_NODE_TYPES.Identifier &&
                                  /^[A-Z]/.test(vd.id.name)
                                ) {
                                  inComponentScope = true;
                                }
                                break;
                              }
                            }

                            // If identifier is inside a CallExpression argument in JSX, treat as argument usage and require .value
                            const isInJsxCallArg =
                              isJsx &&
                              ancestors.some((a: TSESTree.Node): boolean => {
                                if (a.type !== AST_NODE_TYPES.CallExpression) {
                                  return false;
                                }

                                // If identifier is within callee, it's not an argument
                                if (
                                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                                  a.callee &&
                                  ref.range[0] >= a.callee.range[0] &&
                                  ref.range[1] <= a.callee.range[1]
                                ) {
                                  return false;
                                }

                                // Identifier lies within one of the arguments' ranges
                                return a.arguments.some((arg: TSESTree.CallExpressionArgument) => {
                                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                                  if (!arg) {
                                    return false;
                                  }

                                  return (
                                    ref.range[0] >= arg.range[0] && ref.range[1] <= arg.range[1]
                                  );
                                });
                              });

                            const jsxStrategy = option?.accessors?.jsx ?? 'auto';
                            const inCompPref = option?.accessors?.inComponent ?? 'value';
                            const outCompPref = option?.accessors?.outsideComponent ?? 'peek';

                            let accessor = '';

                            if (inJsxAttribute || isInJsxCallArg) {
                              accessor = '.value';
                            } else if (isJsx) {
                              accessor = jsxStrategy === 'value' ? '.value' : '';
                            } else if (inComponentScope) {
                              accessor = inCompPref === 'value' ? '.value' : '.peek()';
                            } else {
                              accessor = outCompPref === 'peek' ? '.peek()' : '.value';
                            }

                            yield fixer.replaceText(ref, `${fixedName}${accessor}`);
                          }
                        }
                      }
                    }
                  }

                  if (getSeverity('suggestAddComputedImport', option) === 'off') {
                    return;
                  }

                  if (hasComputedImport) {
                    return;
                  }

                  const computedImport = getOrCreateComputedImport(context.sourceCode, program);

                  recordMetric(
                    perfKey,
                    'computedImportStatus',
                    computedImport ? 'present' : 'missing'
                  );

                  if (computedImport) {
                    const hasComputed = computedImport.specifiers.some(
                      (s: TSESTree.ImportClause): boolean => {
                        return (
                          s.type === AST_NODE_TYPES.ImportSpecifier &&
                          'name' in s.imported &&
                          s.imported.name === 'computed'
                        );
                      }
                    );

                    const last = computedImport.specifiers[computedImport.specifiers.length - 1];

                    if (!hasComputed && last) {
                      yield fixer.insertTextAfter(last, ', computed');
                    }

                    return;
                  }

                  if (typeof program?.body[0] !== 'undefined') {
                    yield fixer.insertTextBefore(
                      program.body[0],
                      "import { computed } from '@preact/signals-react';\n"
                    );
                  }
                },
              },
            ],
          });
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`]: (): void => {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
