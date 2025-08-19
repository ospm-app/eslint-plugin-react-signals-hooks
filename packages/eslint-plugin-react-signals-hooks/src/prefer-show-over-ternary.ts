/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition } from '@typescript-eslint/scope-manager';
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
  /** Additional modules that export Show/signal utilities (e.g., alternative packages) */
  extraCreatorModules?: Array<string>;
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

    const creatorModules = new Set<string>([
      '@preact/signals-react',
      ...(Array.isArray(option?.extraCreatorModules) ? option.extraCreatorModules : []),
    ]);

    function hasShowImportFromAny(context: Readonly<RuleContext<MessageIds, Options>>): boolean {
      return context.sourceCode.ast.body.some(
        (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
          if (node.type !== AST_NODE_TYPES.ImportDeclaration) return false;
          return (
            typeof node.source.value === 'string' &&
            creatorModules.has(node.source.value) &&
            node.specifiers.some((s: TSESTree.ImportClause): boolean => {
              return (
                s.type === AST_NODE_TYPES.ImportSpecifier &&
                'name' in s.imported &&
                s.imported.name === 'Show'
              );
            })
          );
        }
      );
    }

    function ensureShowImportAny(
      fixer: TSESLint.RuleFixer,
      fixes: Array<TSESLint.RuleFix>,
      context: Readonly<RuleContext<MessageIds, Options>>
    ): void {
      if (hasShowImportFromAny(context)) {
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

      const importText = "import { Show } from '@preact/signals-react';\n";

      if (!anyCreatorImport) {
        const lastImport = importDecls[importDecls.length - 1];

        const firstStmt = context.sourceCode.ast.body[0];

        if (typeof firstStmt === 'undefined') {
          return;
        }

        fixes.push(
          typeof lastImport === 'undefined'
            ? fixer.insertTextBefore(firstStmt, importText)
            : fixer.insertTextAfter(lastImport, `\n${importText.trimStart()}`)
        );

        return;
      }

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
        anyCreatorImport.specifiers.some(
          (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
            return (
              s.type === AST_NODE_TYPES.ImportSpecifier &&
              'name' in s.imported &&
              s.imported.name === 'Show'
            );
          }
        )
      ) {
        return;
      }

      const lastNamed = [...anyCreatorImport.specifiers]
        .reverse()
        .find((s): s is TSESTree.ImportSpecifier => s.type === AST_NODE_TYPES.ImportSpecifier);

      if (lastNamed) {
        fixes.push(fixer.insertTextAfter(lastNamed, ', Show'));

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
            `import ${defaultSpec.local.name}, { Show } from '${String(anyCreatorImport.source.value)}';`
          )
        );
        return;
      }

      fixes.push(fixer.insertTextAfter(anyCreatorImport, `\n${importText}`));
    }

    hasShowImport = hasShowImportFromAny(context);

    startPhase(perfKey, 'ruleExecution');

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

      [AST_NODE_TYPES.ReturnStatement](node: TSESTree.ReturnStatement): void {
        perf.trackNode(node);

        if (node.argument === null || node.argument.type !== AST_NODE_TYPES.ConditionalExpression) {
          return;
        }

        const branchIsJsx = (n: TSESTree.Node): boolean =>
          n.type === AST_NODE_TYPES.JSXElement || n.type === AST_NODE_TYPES.JSXFragment;

        function isEffectivelyEmpty(n: TSESTree.Node): boolean {
          if (n.type === AST_NODE_TYPES.Literal) {
            return (
              n.value === null ||
              n.value === false ||
              n.value === '' ||
              n.raw === 'null' ||
              n.raw === 'false' ||
              n.raw === "''" ||
              n.raw === '""'
            );
          }

          if (n.type === AST_NODE_TYPES.Identifier) {
            return n.name === 'undefined';
          }

          if (n.type === AST_NODE_TYPES.JSXFragment) {
            const text = context.sourceCode.getText(n).replace(/\s+/g, '');

            return text === '<></>';
          }

          return false;
        }

        if (
          !(
            branchIsJsx(node.argument.consequent) ||
            branchIsJsx(node.argument.alternate) ||
            isEffectivelyEmpty(node.argument.consequent) ||
            isEffectivelyEmpty(node.argument.alternate)
          )
        ) {
          return;
        }

        // Reuse the same logic as ConditionalExpression visitor by operating on arg
        const testText = context.sourceCode.getText(node.argument.test);

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

        if (!(containsSignalFromVars || hasSuffixSignalInExpr(node.argument.test))) {
          return;
        }

        if (
          !(
            typeof option?.minComplexity === 'number' &&
            getComplexity(node.argument) >= option.minComplexity
          )
        ) {
          return;
        }

        if (getSeverity('preferShowOverTernary', option) === 'off') {
          return;
        }

        const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

        if (getSeverity('suggestShowComponent', option) !== 'off') {
          suggestions.push({
            messageId: 'suggestShowComponent',
            *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
              if (node.argument === null || !('consequent' in node.argument)) {
                return;
              }

              const consequentText = context.sourceCode.getText(node.argument.consequent);

              const childrenText =
                node.argument.consequent.type === AST_NODE_TYPES.JSXElement ||
                node.argument.consequent.type === AST_NODE_TYPES.JSXFragment
                  ? `${consequentText}`
                  : `{${consequentText}}`;

              const alternateText = context.sourceCode.getText(node.argument.alternate);

              const consEmpty = isEffectivelyEmpty(node.argument.consequent);
              const altEmpty = isEffectivelyEmpty(node.argument.alternate);

              if (consEmpty && altEmpty) {
                return;
              }

              const baseIndent = ' '.repeat(
                context.sourceCode.getLocFromIndex(node.argument.range[0]).column
              );

              const indent1 = `${baseIndent} `;
              const indent2 = `${baseIndent}    `;

              function buildSingleLine(alternate: TSESTree.Expression): string {
                if (consEmpty && !altEmpty) {
                  return `<Show when={!(${testText})}>${branchIsJsx(alternate) ? alternateText : `{${alternateText}}`}</Show>`;
                } else if (!consEmpty && altEmpty) {
                  return `<Show when={${testText}}>${childrenText}</Show>`;
                }

                return `<Show when={${testText}} fallback={${alternateText}}>${childrenText}</Show>`;
              }

              function buildMultiLine(alternate: TSESTree.Expression): string {
                if (consEmpty && !altEmpty) {
                  return [
                    `<Show`,
                    `${indent1}when={!(${testText})}`,
                    `>`,
                    `${indent2}${branchIsJsx(alternate) ? alternateText : `{${alternateText}}`}`,
                    `</Show>`,
                  ].join('\n');
                }

                if (!consEmpty && altEmpty) {
                  return [
                    `<Show`,
                    `${indent1}when={${testText}}`,
                    `>`,
                    `${indent2}${childrenText}`,
                    `</Show>`,
                  ].join('\n');
                }

                return [
                  `<Show`,
                  `${indent1}when={${testText}}`,
                  `${indent1}fallback={${alternateText}}`,
                  `>`,
                  `${indent2}${childrenText}`,
                  `</Show>`,
                ].join('\n');
              }

              yield fixer.replaceText(
                node.argument,
                context.sourceCode.getText(node.argument).includes('\n')
                  ? buildMultiLine(node.argument.alternate)
                  : buildSingleLine(node.argument.alternate)
              );

              if (hasShowImport) {
                return;
              }

              if (hasShowImportFromAny(context)) {
                return;
              }

              const fixes: Array<TSESLint.RuleFix> = [];

              ensureShowImportAny(fixer, fixes, context);

              for (const f of fixes) {
                yield f;
              }
            },
          });
        }

        if (!hasShowImportFromAny(context) && getSeverity('addShowImport', option) !== 'off') {
          suggestions.push({
            messageId: 'addShowImport',
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              const fixes: Array<TSESLint.RuleFix> = [];

              ensureShowImportAny(fixer, fixes, context);

              return fixes.length > 0 ? fixes : null;
            },
          });
        }

        context.report({
          node: node.argument,
          messageId: 'preferShowOverTernary',
          suggest: suggestions,
        });
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

        hasShowImport = hasShowImportFromAny(context);

        endPhase(perfKey, 'importAnalysis');
      },

      [AST_NODE_TYPES.ConditionalExpression](node: TSESTree.ConditionalExpression): void {
        perf.trackNode(node);

        // Allow ternaries inside JSX, including when wrapped by JSXExpressionContainer
        const parent = node.parent;

        const inJsxContext =
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          (parent !== null && typeof parent !== 'undefined' && isJSXNode(parent)) ||
          parent.type === AST_NODE_TYPES.JSXExpressionContainer;

        if (!inJsxContext) {
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
                const consequentIsJsx =
                  node.consequent.type === AST_NODE_TYPES.JSXElement ||
                  node.consequent.type === AST_NODE_TYPES.JSXFragment;

                const consequentText = context.sourceCode.getText(node.consequent);
                const childrenText = consequentIsJsx ? `${consequentText}` : `{${consequentText}}`;

                const alternateText = context.sourceCode.getText(node.alternate);

                const isEffectivelyEmptyAlternate = (): boolean => {
                  const alt = node.alternate;

                  if (alt.type === AST_NODE_TYPES.Literal) {
                    // null, false, empty string
                    return (
                      alt.value === null ||
                      alt.value === false ||
                      alt.value === '' ||
                      alt.raw === 'null' ||
                      alt.raw === 'false' ||
                      alt.raw === "''" ||
                      alt.raw === '""'
                    );
                  }

                  if (alt.type === AST_NODE_TYPES.Identifier) {
                    return alt.name === 'undefined';
                  }

                  if (alt.type === AST_NODE_TYPES.JSXFragment) {
                    // Heuristic: empty fragment text
                    const text = context.sourceCode.getText(alt).replace(/\s+/g, '');
                    return text === '<></>';
                  }

                  return false;
                };

                const isEffectivelyEmptyConsequent = (): boolean => {
                  const cons = node.consequent;

                  if (cons.type === AST_NODE_TYPES.Literal) {
                    // null, false, empty string
                    return (
                      cons.value === null ||
                      cons.value === false ||
                      cons.value === '' ||
                      cons.raw === 'null' ||
                      cons.raw === 'false' ||
                      cons.raw === "''" ||
                      cons.raw === '""'
                    );
                  }

                  if (cons.type === AST_NODE_TYPES.Identifier) {
                    return cons.name === 'undefined';
                  }

                  if (cons.type === AST_NODE_TYPES.JSXFragment) {
                    const text = context.sourceCode.getText(cons).replace(/\s+/g, '');
                    return text === '<></>';
                  }

                  return false;
                };

                const testText = context.sourceCode.getText(node.test);

                const consEmpty = isEffectivelyEmptyConsequent();
                const altEmpty = isEffectivelyEmptyAlternate();

                // If both branches are effectively empty, skip providing a fix
                if (consEmpty && altEmpty) {
                  return;
                }

                // Decide single-line vs multi-line formatting based on original ternary text
                const originalText = context.sourceCode.getText(node);

                const isMultiline = originalText.includes('\n');

                // Compute indentation for pretty multi-line output
                const startLoc = context.sourceCode.getLocFromIndex(node.range[0]);

                const baseIndent = ' '.repeat(startLoc.column);

                const indent1 = `${baseIndent} `;

                const indent2 = `${baseIndent}    `;

                const buildSingleLine = (): string => {
                  if (consEmpty && !altEmpty) {
                    return `<Show when={!(${testText})}>${
                      node.alternate.type === AST_NODE_TYPES.JSXElement ||
                      node.alternate.type === AST_NODE_TYPES.JSXFragment
                        ? alternateText
                        : `{${alternateText}}`
                    }</Show>`;
                  } else if (!consEmpty && altEmpty) {
                    return `<Show when={${testText}}>${childrenText}</Show>`;
                  }

                  return `<Show when={${testText}} fallback={${alternateText}}>${childrenText}</Show>`;
                };

                const buildMultiLine = (): string => {
                  if (consEmpty && !altEmpty) {
                    const altIsJsx =
                      node.alternate.type === AST_NODE_TYPES.JSXElement ||
                      node.alternate.type === AST_NODE_TYPES.JSXFragment;
                    const altChildren = altIsJsx ? alternateText : `{${alternateText}}`;
                    return [
                      `<Show`,
                      `${indent1}when={!(${testText})}`,
                      `>`,
                      `${indent2}${altChildren}`,
                      `</Show>`,
                    ].join('\n');
                  }

                  if (!consEmpty && altEmpty) {
                    return [
                      `<Show`,
                      `${indent1}when={${testText}}`,
                      `>`,
                      `${indent2}${childrenText}`,
                      `</Show>`,
                    ].join('\n');
                  }

                  // Both have content: include fallback on its own line
                  return [
                    `<Show`,
                    `${indent1}when={${testText}}`,
                    `${indent1}fallback={${alternateText}}`,
                    `>`,
                    `${indent2}${childrenText}`,
                    `</Show>`,
                  ].join('\n');
                };

                const fixText = isMultiline ? buildMultiLine() : buildSingleLine();

                yield fixer.replaceText(node, fixText);

                if (hasShowImport) {
                  return;
                }

                // Also add the Show import within the same suggestion for a single-apply experience
                const importFixes = ensureNamedImportFixes(
                  { sourceCode: context.sourceCode },
                  fixer,
                  '@preact/signals-react',
                  'Show'
                );

                for (const f of importFixes) {
                  yield f;
                }
              },
            });
          }

          if (!hasShowImport && getSeverity('addShowImport', option) !== 'off') {
            suggestions.push({
              messageId: 'addShowImport',
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                const fixes = ensureNamedImportFixes(
                  { sourceCode: context.sourceCode },
                  fixer,
                  '@preact/signals-react',
                  'Show'
                );
                return fixes.length > 0 ? fixes : null;
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
