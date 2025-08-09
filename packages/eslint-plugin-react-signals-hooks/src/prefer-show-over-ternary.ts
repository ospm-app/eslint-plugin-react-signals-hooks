/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition } from '@typescript-eslint/scope-manager';
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

type MessageIds = 'preferShowOverTernary' | 'suggestShowComponent' | 'addShowImport';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  /** Minimum complexity score to trigger the rule */
  minComplexity?: number;
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: Array<string>;
  /** Configurable suffix to recognize as signals (default: 'Signal') */
  suffix?: string;
  performance?: PerformanceBudget;
  severity?: Severity;
};

type Options = [Option?];

function isJSXNode(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.JSXElement ||
    node.type === AST_NODE_TYPES.JSXFragment ||
    (node.type === AST_NODE_TYPES.ExpressionStatement &&
      'expression' in node &&
      'type' in node.expression &&
      (node.expression.type === AST_NODE_TYPES.JSXElement ||
        node.expression.type === AST_NODE_TYPES.JSXFragment))
  );
}

function getComplexity(
  node: TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier,
  visited = new Set<TSESTree.Node | TSESTree.Expression | TSESTree.PrivateIdentifier>()
): number {
  if (visited.has(node)) {
    return 0;
  }

  visited.add(node);

  let complexity = 0;

  if (isJSXNode(node)) {
    complexity++;
  } else if ('type' in node && node.type === AST_NODE_TYPES.CallExpression) {
    complexity++;
  } else if ('type' in node && node.type === AST_NODE_TYPES.ConditionalExpression) {
    complexity += 2;
  }

  for (const key of [
    'body',
    'consequent',
    'alternate',
    'test',
    'left',
    'right',
    'argument',
    'callee',
    'arguments',
    'elements',
    'properties',
  ] as const) {
    const value = node[key as keyof typeof node];

    if (typeof value !== 'undefined') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            complexity += getComplexity(item, visited);
          }
        }
      } else if (typeof value === 'object' && 'type' in value) {
        complexity += getComplexity(value, visited);
      }
    }
  }

  visited.delete(node);

  return complexity;
}

let hasShowImport = false;

const signalVariables = new Set<string>();

const ruleName = 'prefer-show-over-ternary';

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'preferShowOverTernary': {
      return options.severity.preferShowOverTernary ?? 'error';
    }

    case 'suggestShowComponent': {
      return options.severity.suggestShowComponent ?? 'error';
    }

    case 'addShowImport': {
      return options.severity.addShowImport ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

export const preferShowOverTernaryRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer Show component over ternary for conditional rendering with signals',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      preferShowOverTernary:
        'Prefer using the `<Show>` component instead of ternary for better performance with signal conditions.',
      suggestShowComponent: 'Replace ternary with `<Show>` component',
      addShowImport: 'Add `Show` import from @preact/signals-react',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minComplexity: {
            type: 'number',
            minimum: 1,
            default: 2,
          },
          signalNames: {
            type: 'array',
            items: { type: 'string' },
            default: ['signal', 'useSignal', 'createSignal'],
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
              preferShowOverTernary: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              suggestShowComponent: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addShowImport: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
          suffix: {
            description:
              "Configurable suffix used to detect signal identifiers (default: 'Signal')",
            type: 'string',
            default: 'Signal',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minComplexity: 2,
      signalNames: ['signal', 'useSignal', 'createSignal'],
      suffix: 'Signal',
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}${Date.now()}`;

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

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

    hasShowImport = context.sourceCode.ast.body.some(
      (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
        if (node.type !== 'ImportDeclaration') {
          return false;
        }

        if (
          typeof node.source.value !== 'string' ||
          node.source.value !== '@preact/signals-react'
        ) {
          return false;
        }

        return node.specifiers.some((s: TSESTree.ImportClause): boolean => {
          return s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'Show';
        });
      }
    );

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

        // Handle function declarations and variables
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.FunctionExpression ||
          node.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          const scope = context.sourceCode.getScope(node);

          for (const variable of scope.variables) {
            if (
              variable.defs.some((def: Definition) => {
                trackOperation(perfKey, PerformanceOperations.signalCheck);
                return (
                  'init' in def.node &&
                  def.node.init?.type === AST_NODE_TYPES.CallExpression &&
                  def.node.init.callee.type === AST_NODE_TYPES.Identifier &&
                  new Set(option?.signalNames ?? ['signal', 'useSignal', 'createSignal']).has(
                    def.node.init.callee.name
                  )
                );
              })
            ) {
              signalVariables.add(variable.name);
            }
          }
        }
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        startPhase(perfKey, 'importAnalysis');

        const hasJSX = node.body.some((n: TSESTree.ProgramStatement): boolean => {
          return isJSXNode(n);
        });

        if (!hasJSX) {
          endPhase(perfKey, 'importAnalysis');
          return;
        }

        hasShowImport = node.body.some(
          (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
            return (
              n.type === 'ImportDeclaration' &&
              n.source.value === '@preact/signals-react' &&
              n.specifiers.some((s: TSESTree.ImportClause): boolean => {
                return (
                  s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'Show'
                );
              })
            );
          }
        );

        endPhase(perfKey, 'importAnalysis');
      },

      [AST_NODE_TYPES.ConditionalExpression](node: TSESTree.ConditionalExpression): void {
        perf.trackNode(node);

        if (!('type' in node.parent) || !isJSXNode(node.parent)) {
          return;
        }

        // Check if the condition contains signal reads by either:
        // 1) previously recorded local signal variables (init via known creators)
        // 2) identifiers or member chains whose base has the configured suffix
        const testText = context.sourceCode.getText(node.test);

        const containsSignalFromVars = [...signalVariables].some((signal: string): boolean => {
          // eslint-disable-next-line security/detect-non-literal-regexp
          return new RegExp(`\\b${signal}\\b`).test(testText);
        });

        const suffixRegex = buildSuffixRegex(option?.suffix);

        function hasSuffixSignalInExpr(expr: TSESTree.Node): boolean {
          if (expr.type === AST_NODE_TYPES.Identifier) {
            return hasSignalSuffix(expr.name, suffixRegex);
          }

          if (expr.type === AST_NODE_TYPES.MemberExpression) {
            let obj: TSESTree.Expression | TSESTree.PrivateIdentifier = expr.object;

            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            while (obj && obj.type === AST_NODE_TYPES.MemberExpression) {
              obj = obj.object as TSESTree.Expression;
            }

            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            if (obj && obj.type === AST_NODE_TYPES.Identifier) {
              return hasSignalSuffix(obj.name, suffixRegex);
            }

            return false;
          }

          if (
            expr.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            expr.type === AST_NODE_TYPES.FunctionExpression
          ) {
            return false;
          }

          for (const key of [
            'left',
            'right',
            'argument',
            'callee',
            'object',
            'property',
            'test',
            'consequent',
            'alternate',
            'expression',
          ] as const) {
            const v = expr[key as keyof typeof expr];
            if (
              typeof v !== 'undefined' &&
              typeof v === 'object' &&
              'type' in v &&
              hasSuffixSignalInExpr(v)
            ) {
              return true;
            }
          }

          // Arrays and call args
          if ('elements' in expr && Array.isArray(expr.elements)) {
            for (const e of expr.elements) {
              if (e && typeof e === 'object' && 'type' in e && hasSuffixSignalInExpr(e)) {
                return true;
              }
            }
          }
          if ('arguments' in expr && Array.isArray(expr.arguments)) {
            for (const a of expr.arguments) {
              if (
                typeof a !== 'undefined' &&
                typeof a === 'object' &&
                'type' in a &&
                hasSuffixSignalInExpr(a)
              ) {
                return true;
              }
            }
          }

          return false;
        }

        const containsSignal = containsSignalFromVars || hasSuffixSignalInExpr(node.test);

        // Skip if no signal variables are found in the condition
        if (!containsSignal) {
          return;
        }

        // Track conditional analysis
        trackOperation(perfKey, PerformanceOperations.conditionalAnalysis);

        const complexity = getComplexity(node);

        trackOperation(perfKey, PerformanceOperations.complexityAnalysis);

        if (typeof option?.minComplexity === 'number' && complexity >= option.minComplexity) {
          if (getSeverity('preferShowOverTernary', option) === 'off') {
            return;
          }

          const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

          if (getSeverity('suggestShowComponent', option) !== 'off') {
            suggestions.push({
              messageId: 'suggestShowComponent',
              *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
                const consequentText = context.sourceCode.getText(node.consequent);

                const alternateText = context.sourceCode.getText(node.alternate);

                const fixText =
                  alternateText === ''
                    ? `{/* @ts-expect-error Server Component */}
                        <Show when={${context.sourceCode.getText(node.test)}}>
                        {${consequentText}}
                        </Show>
                      `
                    : `{/* @ts-expect-error Server Component */}
                        <Show when={${context.sourceCode.getText(node.test)}} fallback={${alternateText}}>
                        {${consequentText}}
                        </Show>`;

                yield fixer.replaceText(node, fixText);

                if (hasShowImport) {
                  return;
                }
              },
            });
          }

          if (!hasShowImport && getSeverity('addShowImport', option) !== 'off') {
            suggestions.push({
              messageId: 'addShowImport',
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const body = context.sourceCode.ast.body;
                const signalsImport = body.find(
                  (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                    return (
                      n.type === AST_NODE_TYPES.ImportDeclaration &&
                      n.source.value === '@preact/signals-react'
                    );
                  }
                );

                if (!signalsImport) {
                  // Insert a new import at the top (before the first statement)
                  const first = body[0];
                  const importText = "import { Show } from '@preact/signals-react';\n";
                  if (first) {
                    return [fixer.insertTextBefore(first, importText)];
                  }
                  // If no body, cannot safely insert
                  return null;
                }

                const last = signalsImport.specifiers[signalsImport.specifiers.length - 1];

                if (!last) {
                  return null;
                }

                return [fixer.insertTextAfter(last, ', Show')];
              },
            });
          }

          context.report({
            node,
            messageId: 'preferShowOverTernary',
            suggest: suggestions,
          });
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](node: TSESTree.Node): void {
        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
