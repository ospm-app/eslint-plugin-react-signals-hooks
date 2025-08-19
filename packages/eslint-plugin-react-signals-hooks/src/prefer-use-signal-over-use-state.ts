/** biome-ignore-all assist/source/organizeImports: off */
import type { Variable } from '@typescript-eslint/scope-manager';
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

type MessageIds = 'preferUseSignal' | 'addUseSignalImport' | 'convertToUseSignal';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  ignoreComplexInitializers?: boolean;
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
  /** Additional module specifiers that may export `useSignal`. */
  extraCreatorModules?: Array<string>;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'preferUseSignal': {
      return options.severity.preferUseSignal ?? 'error';
    }

    case 'addUseSignalImport': {
      return options.severity.addUseSignalImport ?? 'error';
    }

    case 'convertToUseSignal': {
      return options.severity.convertToUseSignal ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

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
      addUseSignalImport: "Add `useSignal` import from '@preact/signals-react'",
      convertToUseSignal: 'Convert this useState to useSignal',
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
          severity: {
            type: 'object',
            properties: {
              preferUseSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addUseSignalImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              convertToUseSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
          extraCreatorModules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
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
      severity: {
        preferUseSignal: 'error',
        addUseSignalImport: 'error',
        convertToUseSignal: 'error',
      },
      suffix: 'Signal',
    } satisfies Option,
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

    const useStateLocalNames = new Set<string>(['useState']);

    const reactNamespaces = new Set<string>();

    // Track whether we're inside a React component or custom hook body using a depth counter.
    let componentOrHookDepth = 0;
    const markedComponentOrHookFns = new WeakSet<
      TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    >();

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

    // Support importing creators from multiple modules
    const creatorModules = new Set<string>([
      '@preact/signals-react',
      ...(Array.isArray(option?.extraCreatorModules) ? option.extraCreatorModules : []),
    ]);

    function hasUseSignalImportFromAny(): boolean {
      return context.sourceCode.ast.body.some((n: TSESTree.ProgramStatement): boolean => {
        return (
          n.type === AST_NODE_TYPES.ImportDeclaration &&
          typeof n.source.value === 'string' &&
          creatorModules.has(n.source.value) &&
          n.specifiers.some((s: TSESTree.ImportClause): boolean => {
            return (
              s.type === AST_NODE_TYPES.ImportSpecifier &&
              s.imported.type === AST_NODE_TYPES.Identifier &&
              s.imported.name === 'useSignal'
            );
          })
        );
      });
    }

    function ensureUseSignalImportAny(
      fixer: TSESLint.RuleFixer,
      fixes: Array<TSESLint.RuleFix>,
      context: RuleContext<MessageIds, Options>
    ): void {
      if (hasUseSignalImportFromAny()) {
        return;
      }

      const importDeclarations = context.sourceCode.ast.body.filter(
        (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
          return n.type === AST_NODE_TYPES.ImportDeclaration;
        }
      );

      const existingCreatorImport = importDeclarations.find(
        (d: TSESTree.ImportDeclaration): d is TSESTree.ImportDeclaration => {
          return typeof d.source.value === 'string' && creatorModules.has(d.source.value);
        }
      );

      if (existingCreatorImport && typeof existingCreatorImport.source.value === 'string') {
        const helperFixes = ensureNamedImportFixes(
          { sourceCode: context.sourceCode },
          fixer,
          existingCreatorImport.source.value,
          'useSignal'
        );

        for (const f of helperFixes) {
          fixes.push(f);
        }

        return;
      }

      const helperFixes = ensureNamedImportFixes(
        { sourceCode: context.sourceCode },
        fixer,
        '@preact/signals-react',
        'useSignal'
      );
      for (const f of helperFixes) {
        fixes.push(f);
      }
    }

    return {
      '*': (node: TSESTree.Node): void => {
        if (!shouldContinue()) {
          endPhase(perfKey, 'recordMetrics');

          return;
        }

        perf.trackNode(node);

        trackOperation(
          perfKey,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing
        );
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (stmt.type === AST_NODE_TYPES.ImportDeclaration && stmt.source.value === 'react') {
            for (const spec of stmt.specifiers) {
              if (
                spec.type === AST_NODE_TYPES.ImportSpecifier &&
                spec.imported.type === AST_NODE_TYPES.Identifier &&
                spec.imported.name === 'useState'
              ) {
                useStateLocalNames.add(spec.local.name);
              } else if (
                spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
                spec.type === AST_NODE_TYPES.ImportDefaultSpecifier
              ) {
                reactNamespaces.add(spec.local.name);
              }
            }
          }
        }
      },

      [AST_NODE_TYPES.FunctionDeclaration](node: TSESTree.FunctionDeclaration): void {
        if (node.id && (/^[A-Z]/.test(node.id.name) || /^use[A-Z]/.test(node.id.name))) {
          markedComponentOrHookFns.add(node);
          componentOrHookDepth++;
        }
      },
      [`${AST_NODE_TYPES.FunctionDeclaration}:exit`](node: TSESTree.FunctionDeclaration): void {
        if (markedComponentOrHookFns.has(node)) {
          componentOrHookDepth--;
        }
      },

      // Handle components/hooks declared as: const Name = () => {} or function expressions
      [AST_NODE_TYPES.FunctionExpression](node: TSESTree.FunctionExpression): void {
        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          node.parent !== null &&
          typeof node.parent !== 'undefined' &&
          node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
          node.parent.id.type === AST_NODE_TYPES.Identifier &&
          (/^[A-Z]/.test(node.parent.id.name) || /^use[A-Z]/.test(node.parent.id.name))
        ) {
          markedComponentOrHookFns.add(node);
          componentOrHookDepth++;
        }
      },
      [`${AST_NODE_TYPES.FunctionExpression}:exit`](node: TSESTree.FunctionExpression): void {
        if (markedComponentOrHookFns.has(node)) {
          componentOrHookDepth--;
        }
      },
      [AST_NODE_TYPES.ArrowFunctionExpression](node: TSESTree.ArrowFunctionExpression): void {
        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          node.parent !== null &&
          typeof node.parent !== 'undefined' &&
          node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
          node.parent.id.type === AST_NODE_TYPES.Identifier &&
          (/^[A-Z]/.test(node.parent.id.name) || /^use[A-Z]/.test(node.parent.id.name))
        ) {
          markedComponentOrHookFns.add(node);
          componentOrHookDepth++;
        }
      },
      [`${AST_NODE_TYPES.ArrowFunctionExpression}:exit`](
        node: TSESTree.ArrowFunctionExpression
      ): void {
        if (markedComponentOrHookFns.has(node)) {
          componentOrHookDepth--;
        }
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        const inComponentOrHook = componentOrHookDepth > 0;

        if (
          !(
            node.init?.type === AST_NODE_TYPES.CallExpression &&
            ((node.init.callee.type === AST_NODE_TYPES.Identifier &&
              useStateLocalNames.has(node.init.callee.name)) ||
              (node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
                node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
                reactNamespaces.has(node.init.callee.object.name) &&
                node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
                node.init.callee.property.name === 'useState')) &&
            node.id.type === AST_NODE_TYPES.ArrayPattern &&
            node.id.elements.length === 2
          ) ||
          !inComponentOrHook ||
          // If ignoring complex initializers (default), only allow simple initializer node types
          (context.options[0]?.ignoreComplexInitializers !== false &&
          typeof node.init.arguments[0] === 'undefined'
            ? false
            : ![
                AST_NODE_TYPES.Literal,
                AST_NODE_TYPES.Identifier,
                AST_NODE_TYPES.MemberExpression,
                AST_NODE_TYPES.UnaryExpression,
                AST_NODE_TYPES.BinaryExpression,
                AST_NODE_TYPES.ConditionalExpression,
                AST_NODE_TYPES.TemplateLiteral,
              ].includes(node.init.arguments[0]?.type ?? ''))
        ) {
          return;
        }

        const [stateVar, setterVar] = node.id.elements;

        const initialValue: TSESTree.CallExpressionArgument | undefined = node.init.arguments[0];

        if (
          !(
            stateVar?.type === AST_NODE_TYPES.Identifier &&
            setterVar?.type === AST_NODE_TYPES.Identifier &&
            setterVar.name.startsWith('set')
          )
        ) {
          return;
        }

        if (getSeverity('preferUseSignal', option) === 'off') {
          return;
        }

        const suffix =
          typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal';

        const suggestions: TSESLint.ReportSuggestionArray<MessageIds> = [];

        // Suggestion 1: add import only (non-destructive)
        suggestions.push({
          messageId: 'addUseSignalImport',
          fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
            const fixes: Array<TSESLint.RuleFix> = [];
            if (hasUseSignalImportFromAny()) {
              return null;
            }

            ensureUseSignalImportAny(fixer, fixes, context);
            return fixes.length > 0 ? fixes : null;
          },
        });

        if (
          (typeof initialValue === 'undefined' ||
            initialValue.type === AST_NODE_TYPES.Literal ||
            initialValue.type === AST_NODE_TYPES.Identifier) &&
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          stateVar.type === AST_NODE_TYPES.Identifier
        ) {
          suggestions.push({
            messageId: 'convertToUseSignal',
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              const fixes: Array<TSESLint.RuleFix> = [];
              // Ensure `useSignal` import is present for this conversion across any creator module
              ensureUseSignalImportAny(fixer, fixes, context);
              // Track used ranges to avoid overlapping fixes within the same suggestion
              const usedRanges: Array<readonly [number, number]> = [];

              function overlaps(
                a: readonly [number, number],
                b: readonly [number, number]
              ): boolean {
                return a[0] < b[1] && a[1] > b[0];
              }

              function tryPushReplace(range: readonly [number, number], text: string): void {
                // Skip if this range overlaps any previously added fix
                for (const r of usedRanges) {
                  if (overlaps(range, r)) {
                    return;
                  }
                }

                usedRanges.push(range);

                fixes.push(fixer.replaceTextRange(range, text));
              }

              const initText = initialValue
                ? context.sourceCode.getText(initialValue)
                : 'undefined';

              const typeParamsNode =
                (node.init &&
                  ('typeParameters' in node.init
                    ? node.init.typeParameters
                    : 'typeArguments' in node.init
                      ? node.init.typeArguments
                      : null)) ??
                null;

              const typeParamsText = typeParamsNode
                ? context.sourceCode.getText(typeParamsNode)
                : '';

              if (
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                node.parent &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                node.parent.type === AST_NODE_TYPES.VariableDeclaration &&
                node.parent.declarations.length === 1
              ) {
                // Compute a collision-safe signal variable name
                const baseSignalName = `${stateVar.name}${suffix}`;

                const hasName = (n: string): boolean => {
                  return context.sourceCode
                    .getScope(node)
                    .variables.some((v: Variable): boolean => v.name === n);
                };

                let signalName = baseSignalName;

                let i = 1;

                while (hasName(signalName)) {
                  signalName = `${baseSignalName}${++i}`;
                }

                fixes.push(
                  fixer.replaceText(
                    node.parent,
                    `const ${signalName} = useSignal${typeParamsText}(${initText})`
                  )
                );
              } else {
                // Compute a collision-safe signal variable name
                const baseSignalName = `${stateVar.name}${suffix}`;

                const hasName = (n: string): boolean => {
                  return context.sourceCode
                    .getScope(node)
                    .variables.some((v: Variable): boolean => {
                      return v.name === n;
                    });
                };

                let signalName = baseSignalName;

                let i = 1;

                while (hasName(signalName)) {
                  signalName = `${baseSignalName}${++i}`;
                }

                tryPushReplace(
                  [node.range[0], node.range[1]],
                  `${signalName} = useSignal${typeParamsText}(${initText})`
                );
              }

              const variable = context.sourceCode
                .getScope(node)
                .variables.find((v: Variable): boolean => {
                  return v.name === stateVar.name;
                });

              if (typeof variable !== 'undefined') {
                // Recompute collision-safe signalName for reference replacements in this scope
                const baseSignalName = `${stateVar.name}${suffix}`;

                function hasName(n: string): boolean {
                  return context.sourceCode
                    .getScope(node)
                    .variables.some((v: Variable): boolean => v.name === n);
                }

                let signalName = baseSignalName;

                let i = 1;

                while (hasName(signalName)) {
                  signalName = `${baseSignalName}${++i}`;
                }

                for (const ref of variable.references) {
                  if (
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                    !ref.identifier ||
                    ref.identifier.range[0] === stateVar.range[0]
                  ) {
                    continue;
                  }

                  const ancestors = context.sourceCode.getAncestors(ref.identifier);

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

                  // Determine if inside a component/hook function
                  let inComponentScope = false;

                  for (let i = ancestors.length - 1; i >= 0; i--) {
                    // eslint-disable-next-line security/detect-object-injection
                    const anc = ancestors[i];

                    if (typeof anc === 'undefined') {
                      continue;
                    }

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
                      const vd = ancestors.find(
                        (
                          x: TSESTree.Node
                        ): x is
                          | TSESTree.VariableDeclaratorDefiniteAssignment
                          | TSESTree.VariableDeclaratorMaybeInit
                          | TSESTree.VariableDeclaratorNoInit
                          | TSESTree.UsingInForOfDeclarator
                          | TSESTree.UsingInNormalContextDeclarator => {
                          return x.type === AST_NODE_TYPES.VariableDeclarator;
                        }
                      );

                      if (
                        typeof vd !== 'undefined' &&
                        vd.id.type === AST_NODE_TYPES.Identifier &&
                        /^[A-Z]/.test(vd.id.name)
                      ) {
                        inComponentScope = true;
                      }

                      break;
                    }
                  }

                  tryPushReplace(
                    [ref.identifier.range[0], ref.identifier.range[1]],
                    `${signalName}${
                      ancestors.some((a: TSESTree.Node, idx: number): boolean => {
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
                      }) ||
                      (isJsx &&
                        ancestors.some((a: TSESTree.Node): boolean => {
                          if (a.type !== AST_NODE_TYPES.CallExpression) {
                            return false;
                          }

                          if (
                            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                            a.callee &&
                            ref.identifier.range[0] >= a.callee.range[0] &&
                            ref.identifier.range[1] <= a.callee.range[1]
                          ) {
                            return false;
                          }

                          return a.arguments.some(
                            (arg: TSESTree.CallExpressionArgument): boolean => {
                              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                              if (!arg) {
                                return false;
                              }

                              return (
                                ref.identifier.range[0] >= arg.range[0] &&
                                ref.identifier.range[1] <= arg.range[1]
                              );
                            }
                          );
                        })) ||
                      (
                        isJsx &&
                          ancestors.some((a: TSESTree.Node): boolean => {
                            if (a.type === AST_NODE_TYPES.BinaryExpression) {
                              return (
                                a.operator === '+' ||
                                a.operator === '-' ||
                                a.operator === '*' ||
                                a.operator === '/' ||
                                a.operator === '%' ||
                                a.operator === '**'
                              );
                            }

                            if (a.type === AST_NODE_TYPES.UnaryExpression) {
                              return a.operator === '+' || a.operator === '-';
                            }

                            if (a.type === AST_NODE_TYPES.UpdateExpression) {
                              return true; // ++x, --x, x++, x--
                            }

                            if (a.type === AST_NODE_TYPES.AssignmentExpression) {
                              return ['+=', '-=', '*=', '/=', '%=', '**='].includes(a.operator);
                            }
                            return false;
                          })
                      )
                        ? '.value'
                        : isJsx
                          ? ''
                          : inComponentScope
                            ? '.value'
                            : '.peek()'
                    }`
                  );
                }
              }

              // Replace setter usages to mutate the signal
              if (
                typeof setterVar !== 'undefined' &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                setterVar.type === AST_NODE_TYPES.Identifier
              ) {
                const setterVariable = context.sourceCode
                  .getScope(node)
                  .variables.find((v: Variable): boolean => {
                    return v.name === setterVar.name;
                  });

                if (typeof setterVariable !== 'undefined') {
                  const baseSignalName = `${stateVar.name}${suffix}`;

                  function hasName(n: string): boolean {
                    return context.sourceCode
                      .getScope(node)
                      .variables.some((v: Variable): boolean => {
                        return v.name === n;
                      });
                  }

                  let signalName = baseSignalName;

                  let i = 1;

                  while (hasName(signalName)) {
                    signalName = `${baseSignalName}${++i}`;
                  }

                  for (const ref of setterVariable.references) {
                    if (
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                      ref.identifier.parent &&
                      ref.identifier.parent.type === AST_NODE_TYPES.CallExpression &&
                      ref.identifier.parent.callee === ref.identifier
                    ) {
                      const args = ref.identifier.parent.arguments;

                      if (args.length === 1) {
                        const arg = args[0];

                        if (typeof arg === 'undefined') {
                          continue;
                        }

                        const argText = context.sourceCode.getText(arg);

                        let replacement: string;

                        if (
                          arg.type === AST_NODE_TYPES.ArrowFunctionExpression ||
                          arg.type === AST_NODE_TYPES.FunctionExpression
                        ) {
                          // Functional update: state = cb(state)
                          replacement = `${signalName}.value = ${argText}(${signalName}.value)`;
                        } else {
                          replacement = `${signalName}.value = ${argText}`;
                        }
                        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
                        if (ref.identifier.parent?.range) {
                          tryPushReplace(
                            [ref.identifier.parent.range[0], ref.identifier.parent.range[1]],
                            replacement
                          );
                        }
                      }
                    }
                  }
                }
              }

              return fixes;
            },
          });
        } else {
          // If conversion isn't applicable, provide a safe import-only suggestion
          suggestions.push({
            messageId: 'addUseSignalImport',
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              const fixes: Array<TSESLint.RuleFix> = [];

              ensureUseSignalImportAny(fixer, fixes, context);

              return fixes.length > 0 ? fixes : null;
            },
          });
        }

        context.report({
          node: node.init,
          messageId: 'preferUseSignal',
          data: {
            type:
              typeof initialValue === 'undefined'
                ? 'state'
                : initialValue.type === AST_NODE_TYPES.Literal
                  ? initialValue.value === null
                    ? 'null'
                    : typeof initialValue.value
                  : initialValue.type === AST_NODE_TYPES.TemplateLiteral
                    ? 'string'
                    : initialValue.type === AST_NODE_TYPES.Identifier
                      ? 'identifier'
                      : 'state',
          },
          suggest: suggestions,
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
