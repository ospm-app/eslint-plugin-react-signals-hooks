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

// Require at least one JSX branch (or effectively empty) to avoid firing for non-JSX ternaries (e.g., numbers)
function branchIsJsx(n: TSESTree.Node): boolean {
  return n.type === AST_NODE_TYPES.JSXElement || n.type === AST_NODE_TYPES.JSXFragment;
}

function isEffectivelyEmpty(
  n: TSESTree.Node,
  context: Readonly<TSESLint.RuleContext<MessageIds, Options>>
): boolean {
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
      addShowImport: 'Add `Show` import from @preact/signals-react/utils',
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

    // Where the Show component is exported from
    const showModules = new Set<string>(['@preact/signals-react/utils']);

    function hasShowImportFromAny(context: Readonly<RuleContext<MessageIds, Options>>): boolean {
      return context.sourceCode.ast.body.some(
        (node: TSESTree.ProgramStatement): node is TSESTree.ImportDeclaration => {
          if (node.type !== AST_NODE_TYPES.ImportDeclaration) {
            return false;
          }

          return (
            typeof node.source.value === 'string' &&
            showModules.has(node.source.value) &&
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

      // Prefer to merge into an existing Show module import, otherwise add a new import from utils
      const anyShowImport = importDecls.find((d: TSESTree.ImportDeclaration): boolean => {
        return typeof d.source.value === 'string' && showModules.has(d.source.value);
      });

      const importText = "import { Show } from '@preact/signals-react/utils';\n";

      if (!anyShowImport) {
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

      const hasNamespace = anyShowImport.specifiers.some(
        (s: TSESTree.ImportClause): s is TSESTree.ImportNamespaceSpecifier => {
          return s.type === AST_NODE_TYPES.ImportNamespaceSpecifier;
        }
      );

      if (anyShowImport.importKind === 'type' || hasNamespace) {
        fixes.push(fixer.insertTextAfter(anyShowImport, `\n${importText}`));
        return;
      }

      if (
        anyShowImport.specifiers.some((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
          return (
            s.type === AST_NODE_TYPES.ImportSpecifier &&
            'name' in s.imported &&
            s.imported.name === 'Show'
          );
        })
      ) {
        return;
      }

      const lastNamed = [...anyShowImport.specifiers]
        .reverse()
        .find((s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
          return s.type === AST_NODE_TYPES.ImportSpecifier;
        });

      if (typeof lastNamed !== 'undefined') {
        fixes.push(fixer.insertTextAfter(lastNamed, ', Show'));

        return;
      }

      const defaultSpec = anyShowImport.specifiers.find(
        (s: TSESTree.ImportClause): s is TSESTree.ImportDefaultSpecifier => {
          return s.type === AST_NODE_TYPES.ImportDefaultSpecifier;
        }
      );

      if (typeof defaultSpec !== 'undefined') {
        fixes.push(
          fixer.replaceText(
            anyShowImport,
            `import ${defaultSpec.local.name}, { Show } from '${String(anyShowImport.source.value)}';`
          )
        );

        return;
      }

      fixes.push(fixer.insertTextAfter(anyShowImport, `\n${importText}`));
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

        // Handle function scopes and top-level program scope to collect signal variables
        if (
          node.type === AST_NODE_TYPES.FunctionDeclaration ||
          node.type === AST_NODE_TYPES.FunctionExpression ||
          node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          node.type === AST_NODE_TYPES.Program
        ) {
          const scope = context.sourceCode.getScope(node);

          for (const variable of scope.variables) {
            if (
              variable.defs.some((def: Definition): boolean => {
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

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        perf.trackNode(node);

        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          node.init.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          new Set(option?.signalNames ?? ['signal', 'useSignal', 'createSignal']).has(
            node.init.callee.name
          )
        ) {
          signalVariables.add(node.id.name);
        }
      },

      [AST_NODE_TYPES.LogicalExpression](node: TSESTree.LogicalExpression): void {
        perf.trackNode(node);

        if (
          !(
            (node.parent !== null && // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              typeof node.parent !== 'undefined' &&
              isJSXNode(node.parent)) ||
            node.parent.type === AST_NODE_TYPES.JSXExpressionContainer
          ) ||
          !(node.left.type === AST_NODE_TYPES.Identifier && signalVariables.has(node.left.name)) ||
          !(
            node.right.type === AST_NODE_TYPES.JSXElement ||
            node.right.type === AST_NODE_TYPES.JSXFragment
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
              const leftText = context.sourceCode.getText(node.left);
              const rightText = context.sourceCode.getText(node.right);

              // Determine mapping based on operator
              function buildSingleLine(node: TSESTree.LogicalExpression): string {
                if (node.operator === '&&') {
                  return `<Show when={${leftText}}>${rightText}</Show>`;
                }

                // operator '||' -> render right when left is falsy
                return `<Show when={!(${leftText})}>${rightText}</Show>`;
              }

              const baseIndent = ' '.repeat(
                context.sourceCode.getLocFromIndex(node.range[0]).column
              );

              const indent1 = `${baseIndent} `;

              const indent2 = `${baseIndent}    `;

              function buildMultiLine(): string {
                if (node.operator === '&&') {
                  return [
                    `<Show`,
                    `${indent1}when={${leftText}}`,
                    `>`,
                    `${indent2}${rightText}`,
                    `</Show>`,
                  ].join('\n');
                }
                return [
                  `<Show`,
                  `${indent1}when={!(${leftText})}`,
                  `>`,
                  `${indent2}${rightText}`,
                  `</Show>`,
                ].join('\n');
              }

              // If this logical expression is inside a JSXExpressionContainer, replace the container
              // so we remove the surrounding braces `{}`.
              const targetForReplace =
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                node.parent?.type === AST_NODE_TYPES.JSXExpressionContainer ? node.parent : node;

              yield fixer.replaceText(
                targetForReplace,
                context.sourceCode.getText(node).includes('\n')
                  ? buildMultiLine()
                  : buildSingleLine(node)
              );

              if (hasShowImport || hasShowImportFromAny(context)) {
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
          node,
          messageId: 'preferShowOverTernary',
          suggest: suggestions,
        });
      },

      [AST_NODE_TYPES.ReturnStatement](node: TSESTree.ReturnStatement): void {
        perf.trackNode(node);

        if (
          node.argument === null ||
          node.argument.type !== AST_NODE_TYPES.ConditionalExpression ||
          !(
            branchIsJsx(node.argument.consequent) ||
            branchIsJsx(node.argument.alternate) ||
            isEffectivelyEmpty(node.argument.consequent, context) ||
            isEffectivelyEmpty(node.argument.alternate, context)
          )
        ) {
          return;
        }

        if (
          !(
            node.argument.test.type === AST_NODE_TYPES.Identifier &&
            signalVariables.has(node.argument.test.name)
          ) ||
          !(
            typeof option?.minComplexity === 'number' &&
            getComplexity(node.argument) >= option.minComplexity
          ) ||
          getSeverity('preferShowOverTernary', option) === 'off'
        ) {
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

              const consEmpty = isEffectivelyEmpty(node.argument.consequent, context);
              const altEmpty = isEffectivelyEmpty(node.argument.alternate, context);

              if (consEmpty && altEmpty) {
                return;
              }

              const baseIndent = ' '.repeat(
                context.sourceCode.getLocFromIndex(node.argument.range[0]).column
              );

              const indent1 = `${baseIndent} `;
              const indent2 = `${baseIndent}    `;

              function buildSingleLine(alternate: TSESTree.Expression): string {
                if (node.argument === null || !('test' in node.argument)) {
                  return '';
                }

                const testText = context.sourceCode.getText(node.argument.test);
                if (consEmpty && !altEmpty) {
                  return `<Show when={!(${testText})}>${branchIsJsx(alternate) ? alternateText : `{${alternateText}}`}</Show>`;
                } else if (!consEmpty && altEmpty) {
                  return `<Show when={${testText}}>${childrenText}</Show>`;
                }

                return `<Show when={${testText}} fallback={${alternateText}}>${childrenText}</Show>`;
              }

              function buildMultiLine(alternate: TSESTree.Expression): string {
                if (node.argument === null || !('test' in node.argument)) {
                  return '';
                }

                const testText = context.sourceCode.getText(node.argument.test);

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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                node.argument.parent?.type === AST_NODE_TYPES.JSXExpressionContainer
                  ? node.argument.parent
                  : node.argument,
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

        // Do not report if this ternary is nested inside another ternary whose test is NOT a direct signal.
        // Example to skip: condExpr ? null : directSignal ? A : B
        // We only want the top-most conditional to be considered in such composite expressions.
        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          node.parent?.type === AST_NODE_TYPES.ConditionalExpression &&
          (node.parent.consequent === node || node.parent.alternate === node)
        ) {
          const parentTest = node.parent.test;
          const parentIsDirectSignal =
            parentTest.type === AST_NODE_TYPES.Identifier && signalVariables.has(parentTest.name);

          if (!parentIsDirectSignal) {
            return;
          }
        }

        if (
          !(
            ((node.parent !== null && // eslint-disable-line @typescript-eslint/no-unnecessary-condition
              typeof node.parent !== 'undefined' &&
              isJSXNode(node.parent)) ||
              node.parent.type === AST_NODE_TYPES.JSXExpressionContainer) &&
            node.test.type === AST_NODE_TYPES.Identifier &&
            signalVariables.has(node.test.name)
          )
        ) {
          return;
        }

        if (
          !(
            branchIsJsx(node.consequent) ||
            branchIsJsx(node.alternate) ||
            isEffectivelyEmpty(node.consequent, context) ||
            isEffectivelyEmpty(node.alternate, context)
          )
        ) {
          return;
        }

        // Track conditional analysis
        trackOperation(perfKey, PerformanceOperations.conditionalAnalysis);

        const complexity = getComplexity(node);

        trackOperation(perfKey, PerformanceOperations.complexityAnalysis);

        if (
          !(typeof option?.minComplexity === 'number' && complexity >= option.minComplexity) ||
          getSeverity('preferShowOverTernary', option) === 'off'
        ) {
          return;
        }

        const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

        if (getSeverity('suggestShowComponent', option) !== 'off') {
          suggestions.push({
            messageId: 'suggestShowComponent',
            *fix(fixer: TSESLint.RuleFixer): Generator<TSESLint.RuleFix, void, unknown> {
              const consequentText = context.sourceCode.getText(node.consequent);
              const childrenText =
                node.consequent.type === AST_NODE_TYPES.JSXElement ||
                node.consequent.type === AST_NODE_TYPES.JSXFragment
                  ? `${consequentText}`
                  : `{${consequentText}}`;

              const alternateText = context.sourceCode.getText(node.alternate);

              function isEffectivelyEmptyAlternate(): boolean {
                if (node.alternate.type === AST_NODE_TYPES.Literal) {
                  // null, false, empty string
                  return (
                    node.alternate.value === null ||
                    node.alternate.value === false ||
                    node.alternate.value === '' ||
                    node.alternate.raw === 'null' ||
                    node.alternate.raw === 'false' ||
                    node.alternate.raw === "''" ||
                    node.alternate.raw === '""'
                  );
                }

                if (node.alternate.type === AST_NODE_TYPES.Identifier) {
                  return node.alternate.name === 'undefined';
                }

                if (node.alternate.type === AST_NODE_TYPES.JSXFragment) {
                  return context.sourceCode.getText(node.alternate).replace(/\s+/g, '') === '<></>';
                }

                return false;
              }

              function isEffectivelyEmptyConsequent(): boolean {
                if (node.consequent.type === AST_NODE_TYPES.Literal) {
                  // null, false, empty string
                  return (
                    node.consequent.value === null ||
                    node.consequent.value === false ||
                    node.consequent.value === '' ||
                    node.consequent.raw === 'null' ||
                    node.consequent.raw === 'false' ||
                    node.consequent.raw === "''" ||
                    node.consequent.raw === '""'
                  );
                }

                if (node.consequent.type === AST_NODE_TYPES.Identifier) {
                  return node.consequent.name === 'undefined';
                }

                if (node.consequent.type === AST_NODE_TYPES.JSXFragment) {
                  return (
                    context.sourceCode.getText(node.consequent).replace(/\s+/g, '') === '<></>'
                  );
                }

                return false;
              }

              const testText = context.sourceCode.getText(node.test);

              const consEmpty = isEffectivelyEmptyConsequent();
              const altEmpty = isEffectivelyEmptyAlternate();

              // If both branches are effectively empty, skip providing a fix
              if (consEmpty && altEmpty) {
                return;
              }

              const baseIndent = ' '.repeat(
                context.sourceCode.getLocFromIndex(node.range[0]).column
              );

              const indent1 = `${baseIndent} `;

              const indent2 = `${baseIndent}    `;

              function buildSingleLine(): string {
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
              }

              function buildMultiLine(): string {
                if (consEmpty && !altEmpty) {
                  return [
                    `<Show`,
                    `${indent1}when={!(${testText})}`,
                    `>`,
                    `${indent2}${
                      node.alternate.type === AST_NODE_TYPES.JSXElement ||
                      node.alternate.type === AST_NODE_TYPES.JSXFragment
                        ? alternateText
                        : `{${alternateText}}`
                    }`,
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
              }

              yield fixer.replaceText(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                node.parent?.type === AST_NODE_TYPES.JSXExpressionContainer ? node.parent : node,
                context.sourceCode.getText(node).includes('\n')
                  ? buildMultiLine()
                  : buildSingleLine()
              );

              if (hasShowImport || hasShowImportFromAny(context)) {
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

        if (!hasShowImport && getSeverity('addShowImport', option) !== 'off') {
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
          node,
          messageId: 'preferShowOverTernary',
          suggest: suggestions,
          fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
            const consequentText = context.sourceCode.getText(node.consequent);
            const childrenText =
              node.consequent.type === AST_NODE_TYPES.JSXElement ||
              node.consequent.type === AST_NODE_TYPES.JSXFragment
                ? `${consequentText}`
                : `{${consequentText}}`;

            const alternateText = context.sourceCode.getText(node.alternate);

            function isEffectivelyEmptyAlternate(): boolean {
              const alt = node.alternate;
              if (alt.type === AST_NODE_TYPES.Literal) {
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
                return context.sourceCode.getText(alt).replace(/\s+/g, '') === '<></>';
              }

              return false;
            }

            function isEffectivelyEmptyConsequent(): boolean {
              if (node.consequent.type === AST_NODE_TYPES.Literal) {
                return (
                  node.consequent.value === null ||
                  node.consequent.value === false ||
                  node.consequent.value === '' ||
                  node.consequent.raw === 'null' ||
                  node.consequent.raw === 'false' ||
                  node.consequent.raw === "''" ||
                  node.consequent.raw === '""'
                );
              }

              if (node.consequent.type === AST_NODE_TYPES.Identifier) {
                return node.consequent.name === 'undefined';
              }

              if (node.consequent.type === AST_NODE_TYPES.JSXFragment) {
                return context.sourceCode.getText(node.consequent).replace(/\s+/g, '') === '<></>';
              }

              return false;
            }

            const testText = context.sourceCode.getText(node.test);

            const consEmpty = isEffectivelyEmptyConsequent();
            const altEmpty = isEffectivelyEmptyAlternate();

            if (consEmpty && altEmpty) {
              return null;
            }

            const baseIndent = ' '.repeat(context.sourceCode.getLocFromIndex(node.range[0]).column);

            const indent1 = `${baseIndent} `;
            const indent2 = `${baseIndent}    `;

            function buildSingleLine(): string {
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
            }

            function buildMultiLine(): string {
              if (consEmpty && !altEmpty) {
                return [
                  `<Show`,
                  `${indent1}when={!(${testText})}`,
                  `>`,
                  `${indent2}${
                    node.alternate.type === AST_NODE_TYPES.JSXElement ||
                    node.alternate.type === AST_NODE_TYPES.JSXFragment
                      ? alternateText
                      : `{${alternateText}}`
                  }`,
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

            const fixes: Array<TSESLint.RuleFix> = [];

            fixes.push(
              fixer.replaceText(
                node,
                context.sourceCode.getText(node).includes('\n')
                  ? buildMultiLine()
                  : buildSingleLine()
              )
            );

            if (!hasShowImport && !hasShowImportFromAny(context)) {
              ensureShowImportAny(fixer, fixes, context);
            }

            return fixes;
          },
        });
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
