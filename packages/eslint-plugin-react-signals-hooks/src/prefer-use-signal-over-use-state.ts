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
};

type Options = [Option?];

const ruleName = 'prefer-use-signal-over-use-state';

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
              preferUseSignal: { type: 'string', enum: ['error', 'warn', 'off'] },
              addUseSignalImport: { type: 'string', enum: ['error', 'warn', 'off'] },
              convertToUseSignal: { type: 'string', enum: ['error', 'warn', 'off'] },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
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

    let inComponentOrHook: boolean = false;

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

        const dynamicOp =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing;

        trackOperation(perfKey, dynamicOp);
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
        if (node.id && /^[A-Z]/.test(node.id.name)) {
          inComponentOrHook = true;
        }
      },
      [`${AST_NODE_TYPES.FunctionDeclaration}:exit`]() {
        inComponentOrHook = false;
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (
          (node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.init?.type === AST_NODE_TYPES.FunctionExpression) &&
          node.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.id.name)
        ) {
          inComponentOrHook = true;
        }

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
          stateVar?.type === AST_NODE_TYPES.Identifier &&
          setterVar?.type === AST_NODE_TYPES.Identifier &&
          setterVar.name.startsWith('set')
        ) {
          if (getSeverity('preferUseSignal', option) === 'off') {
            return;
          }

          const suffix =
            typeof option?.suffix === 'string' && option.suffix.length > 0
              ? option.suffix
              : 'Signal';

          const suggestions: TSESLint.ReportSuggestionArray<MessageIds> = [];

          // Suggestion 1: add import only (non-destructive)
          suggestions.push({
            messageId: 'addUseSignalImport',
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              const fixes: Array<TSESLint.RuleFix> = [];
              const importDeclarations = context.sourceCode.ast.body.filter(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return n.type === AST_NODE_TYPES.ImportDeclaration;
                }
              );

              const signalsImport = importDeclarations.find(
                (d: TSESTree.ImportDeclaration): d is TSESTree.ImportDeclaration => {
                  return d.source.value === '@preact/signals-react';
                }
              );

              if (signalsImport) {
                if (
                  !signalsImport.specifiers.some(
                    (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return (
                        s.type === AST_NODE_TYPES.ImportSpecifier &&
                        s.imported.type === AST_NODE_TYPES.Identifier &&
                        s.imported.name === 'useSignal'
                      );
                    }
                  )
                ) {
                  const lastNamed = [...signalsImport.specifiers]
                    .reverse()
                    .find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return s.type === AST_NODE_TYPES.ImportSpecifier;
                    });
                  if (lastNamed) {
                    fixes.push(fixer.insertTextAfter(lastNamed, ', useSignal'));
                  } else {
                    fixes.push(
                      fixer.insertTextAfter(
                        signalsImport,
                        "\nimport { useSignal } from '@preact/signals-react';\n"
                      )
                    );
                  }
                }
              } else {
                const lastImport = importDeclarations[importDeclarations.length - 1];

                const importText = "import { useSignal } from '@preact/signals-react';\n";

                const b = context.sourceCode.ast.body[0];

                if (!b) {
                  return null;
                }

                fixes.push(
                  typeof lastImport === 'undefined'
                    ? fixer.insertTextBefore(b, importText)
                    : fixer.insertTextAfter(lastImport, importText)
                );
              }

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

                const importDeclarations = context.sourceCode.ast.body.filter(
                  (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                    return n.type === AST_NODE_TYPES.ImportDeclaration;
                  }
                );

                const signalsImport = importDeclarations.find(
                  (d: TSESTree.ImportDeclaration): d is TSESTree.ImportDeclaration => {
                    return d.source.value === '@preact/signals-react';
                  }
                );

                if (signalsImport) {
                  const hasSpecifier = signalsImport.specifiers.some(
                    (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                      return (
                        s.type === AST_NODE_TYPES.ImportSpecifier &&
                        s.imported.type === AST_NODE_TYPES.Identifier &&
                        s.imported.name === 'useSignal'
                      );
                    }
                  );

                  if (!hasSpecifier) {
                    const lastNamed = [...signalsImport.specifiers]
                      .reverse()
                      .find(
                        (s): s is TSESTree.ImportSpecifier =>
                          s.type === AST_NODE_TYPES.ImportSpecifier
                      );

                    if (lastNamed) {
                      fixes.push(fixer.insertTextAfter(lastNamed, ', useSignal'));
                    } else {
                      fixes.push(
                        fixer.insertTextAfter(
                          signalsImport,
                          "\nimport { useSignal } from '@preact/signals-react';\n"
                        )
                      );
                    }
                  }
                } else {
                  const lastImport = importDeclarations[importDeclarations.length - 1];

                  const importText = "import { useSignal } from '@preact/signals-react';\n";

                  const b = context.sourceCode.ast.body[0];

                  if (!b) {
                    return null;
                  }

                  fixes.push(
                    typeof lastImport === 'undefined'
                      ? fixer.insertTextBefore(b, importText)
                      : fixer.insertTextAfter(lastImport, importText)
                  );
                }

                fixes.push(
                  fixer.replaceText(
                    node,
                    `const ${stateVar.name}${suffix} = useSignal(${initialValue ? context.sourceCode.getText(initialValue) : 'undefined'})`
                  )
                );

                return fixes;
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
        }
      },

      [`${AST_NODE_TYPES.VariableDeclarator}:exit`](node: TSESTree.VariableDeclarator): void {
        if (
          node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          node.init?.type === AST_NODE_TYPES.FunctionExpression
        ) {
          if (node.id.type === AST_NODE_TYPES.Identifier && /^[A-Z]/.test(node.id.name)) {
            inComponentOrHook = false;
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
