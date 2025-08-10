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
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds = 'missingUseSignals';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  ignoreComponents?: Array<string>;
  performance?: PerformanceBudget;
  severity?: Severity;
  /** Configurable suffix to recognize as signals (default: 'Signal') */
  suffix?: string;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'missingUseSignals': {
      return options.severity.missingUseSignals ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function isSignalUsageLocal(node: TSESTree.Node, suffixRegex: RegExp): boolean {
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    if (
      node.property.type === AST_NODE_TYPES.Identifier &&
      (node.property.name === 'value' || node.property.name === 'peek')
    ) {
      let base: TSESTree.Expression | TSESTree.PrivateIdentifier = node.object;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      while (base && base.type === AST_NODE_TYPES.MemberExpression) {
        base = base.object;
      }

      return (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
        !!base && base.type === AST_NODE_TYPES.Identifier && hasSignalSuffix(base.name, suffixRegex)
      );
    }

    return false;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    // Exclude various non-value or declaration/name positions to reduce false positives
    const parent = node.parent;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!parent) {
      return false;
    }

    // Skip when part of a MemberExpression (handled above when accessing .value/.peek)
    if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === node) {
      return false;
    }
    // Skip import/export specifiers and type positions
    if (
      parent.type === AST_NODE_TYPES.ImportSpecifier ||
      parent.type === AST_NODE_TYPES.ExportSpecifier ||
      parent.type === AST_NODE_TYPES.TSTypeReference ||
      parent.type === AST_NODE_TYPES.TSTypeAnnotation ||
      parent.type === AST_NODE_TYPES.TSQualifiedName ||
      parent.type === AST_NODE_TYPES.TSTypeParameter ||
      parent.type === AST_NODE_TYPES.TSEnumMember ||
      parent.type === AST_NODE_TYPES.TSTypeAliasDeclaration
    ) {
      return false;
    }
    // Skip label and property key/name contexts
    if (
      parent.type === AST_NODE_TYPES.LabeledStatement ||
      (parent.type === AST_NODE_TYPES.Property &&
        parent.key === node &&
        parent.computed === false) ||
      parent.type === AST_NODE_TYPES.PropertyDefinition ||
      (parent.type === AST_NODE_TYPES.MethodDefinition && parent.key === node)
    ) {
      return false;
    }
    // Skip JSX identifier/name contexts
    if (
      parent.type === AST_NODE_TYPES.JSXIdentifier ||
      parent.type === AST_NODE_TYPES.JSXAttribute ||
      parent.type === AST_NODE_TYPES.JSXMemberExpression
    ) {
      return false;
    }

    return hasSignalSuffix(node.name, suffixRegex);
  }

  return false;
}

let hasUseSignals = false;

let hasSignalUsage = false;

let componentName = '';
let componentNode: TSESTree.Node | null = null;

const ruleName = 'require-use-signals';

export const requireUseSignalsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem', // Changed from 'suggestion' to 'problem' as missing useSignals() can break reactivity
    docs: {
      description:
        'Ensures that components using signals properly import and call the `useSignals()` hook. This hook is essential for signal reactivity in React components. The rule helps prevent subtle bugs by ensuring that any component using signals has the necessary hook in place.',
      url: getRuleDocUrl(ruleName),
    },
    hasSuggestions: true,
    messages: {
      missingUseSignals:
        "Component '{{componentName}}' reads signals; call useSignals() to subscribe for updates",
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          ignoreComponents: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of component names to ignore',
          },
          severity: {
            type: 'object',
            properties: {
              missingUseSignals: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
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
          suffix: {
            description:
              "Configurable suffix used to detect signal identifiers (default: 'Signal')",
            type: 'string',
            default: 'Signal',
          },
        },
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [
    {
      ignoreComponents: [],
      suffix: 'Signal',
      performance: DEFAULT_PERFORMANCE_BUDGET,
    } satisfies Option,
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    const suffixRegex = buildSuffixRegex(option?.suffix);

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

    startPhase(perfKey, 'ruleExecution');

    // Track local aliases for useSignals (e.g. import { useSignals as uS } from '@preact/signals-react/runtime')
    const useSignalsLocalNames = new Set<string>(['useSignals']);

    // Track local names and namespaces for signal/computed creators
    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();

    // Track variables that were initialized from signal/computed creators
    const signalVariables = new Set<string>();

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

      [AST_NODE_TYPES.FunctionDeclaration](node: TSESTree.FunctionDeclaration): void {
        if (!(typeof node.id?.name === 'string' && /^[A-Z]/.test(node.id.name))) {
          return;
        }

        componentName = node.id.name;

        componentNode = node;

        hasUseSignals = false;

        hasSignalUsage = false;
      },

      [AST_NODE_TYPES.ArrowFunctionExpression](node: TSESTree.ArrowFunctionExpression): void {
        if (
          !(
            node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
            node.parent.id.type === AST_NODE_TYPES.Identifier &&
            /^[A-Z]/.test(node.parent.id.name)
          )
        ) {
          return;
        }

        componentName = node.parent.id.name;

        componentNode = node;

        hasUseSignals = false;

        hasSignalUsage = false;
      },

      [AST_NODE_TYPES.FunctionExpression](node: TSESTree.FunctionExpression): void {
        if (
          !(
            node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
            node.parent.id.type === AST_NODE_TYPES.Identifier &&
            /^[A-Z]/.test(node.parent.id.name)
          )
        ) {
          return;
        }

        componentName = node.parent.id.name;

        componentNode = node;

        hasUseSignals = false;

        hasSignalUsage = false;
      },

      [AST_NODE_TYPES.ExportDefaultDeclaration](node: TSESTree.ExportDefaultDeclaration): void {
        if (node.declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
          if (node.declaration.id && /^[A-Z]/.test(node.declaration.id.name)) {
            componentName = node.declaration.id.name;
            componentNode = node.declaration;
            hasUseSignals = false;
            hasSignalUsage = false;
          } else if (!node.declaration.id) {
            componentName = 'default';
            componentNode = node.declaration;
            hasUseSignals = false;
            hasSignalUsage = false;
          }
        } else if (
          node.declaration.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          node.declaration.type === AST_NODE_TYPES.FunctionExpression
        ) {
          componentName = 'default';
          componentNode = node.declaration;
          hasUseSignals = false;
          hasSignalUsage = false;
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        if (
          (node.callee.type === AST_NODE_TYPES.Identifier &&
            useSignalsLocalNames.has(node.callee.name)) ||
          (node.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.callee.property.type === AST_NODE_TYPES.Identifier &&
            node.callee.property.name === 'useSignals')
        ) {
          hasUseSignals = true;
        }
      },

      [AST_NODE_TYPES.MemberExpression](node: TSESTree.MemberExpression): void {
        // First, check suffix-based heuristic
        if (isSignalUsageLocal(node, suffixRegex)) {
          hasSignalUsage = true;

          return;
        }

        // Also treat member `.value`/`.peek()` on known signal variables as usage
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          (node.property.name === 'value' || node.property.name === 'peek')
        ) {
          let base: TSESTree.Expression | TSESTree.PrivateIdentifier = node.object;

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          while (base && base.type === AST_NODE_TYPES.MemberExpression) {
            base = base.object;
          }

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          if (base && base.type === AST_NODE_TYPES.Identifier && signalVariables.has(base.name)) {
            hasSignalUsage = true;
          }
        }
      },

      [AST_NODE_TYPES.Identifier](node: TSESTree.Identifier): void {
        // Count direct identifier usage if it matches suffix heuristic
        if (isSignalUsageLocal(node, suffixRegex)) {
          hasSignalUsage = true;

          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
        if (!node.parent) {
          return;
        }

        // Skip property keys, imports/exports, types, member object handled in MemberExpression
        if (node.parent.type === AST_NODE_TYPES.MemberExpression && node.parent.object === node) {
          return;
        }

        if (
          node.parent.type === AST_NODE_TYPES.ImportSpecifier ||
          node.parent.type === AST_NODE_TYPES.ExportSpecifier ||
          node.parent.type === AST_NODE_TYPES.TSTypeReference ||
          node.parent.type === AST_NODE_TYPES.TSTypeAnnotation ||
          node.parent.type === AST_NODE_TYPES.TSQualifiedName ||
          node.parent.type === AST_NODE_TYPES.TSTypeParameter ||
          node.parent.type === AST_NODE_TYPES.TSEnumMember ||
          node.parent.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
          node.parent.type === AST_NODE_TYPES.LabeledStatement ||
          (node.parent.type === AST_NODE_TYPES.Property &&
            node.parent.key === node &&
            node.parent.computed === false) ||
          node.parent.type === AST_NODE_TYPES.PropertyDefinition ||
          (node.parent.type === AST_NODE_TYPES.MethodDefinition && node.parent.key === node) ||
          node.parent.type === AST_NODE_TYPES.JSXIdentifier ||
          node.parent.type === AST_NODE_TYPES.JSXAttribute ||
          node.parent.type === AST_NODE_TYPES.JSXMemberExpression
        ) {
          return;
        }
        if (signalVariables.has(node.name)) {
          hasSignalUsage = true;
        }
      },

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) {
            continue;
          }

          if (stmt.source.value === '@preact/signals-react/runtime') {
            for (const spec of stmt.specifiers) {
              if (
                spec.type === AST_NODE_TYPES.ImportSpecifier &&
                spec.imported.type === AST_NODE_TYPES.Identifier &&
                spec.imported.name === 'useSignals'
              ) {
                useSignalsLocalNames.add(spec.local.name);
              }
            }
          }

          if (
            typeof stmt.source.value === 'string' &&
            stmt.source.value === '@preact/signals-react'
          ) {
            for (const spec of stmt.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
                if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'signal'
                ) {
                  signalCreatorLocals.add(spec.local.name);
                } else if (
                  spec.imported.type === AST_NODE_TYPES.Identifier &&
                  spec.imported.name === 'computed'
                ) {
                  computedCreatorLocals.add(spec.local.name);
                }
              } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                creatorNamespaces.add(spec.local.name);
              }
            }
          }
        }
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        if (!node.init || node.init.type !== AST_NODE_TYPES.CallExpression) {
          return;
        }

        let isCreator = false;

        if (node.init.callee.type === AST_NODE_TYPES.Identifier) {
          if (
            signalCreatorLocals.has(node.init.callee.name) ||
            computedCreatorLocals.has(node.init.callee.name)
          ) {
            isCreator = true;
          }
        } else if (
          node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
          creatorNamespaces.has(node.init.callee.object.name) &&
          node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.init.callee.property.name === 'signal' ||
            node.init.callee.property.name === 'computed')
        ) {
          isCreator = true;
        }
        if (isCreator) {
          signalVariables.add(node.id.name);
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        if (
          hasSignalUsage &&
          !hasUseSignals &&
          componentName &&
          !new Set(context.options[0]?.ignoreComponents ?? []).has(componentName) &&
          componentNode &&
          getSeverity('missingUseSignals', option) !== 'off'
        ) {
          context.report({
            node: componentNode,
            messageId: 'missingUseSignals',
            data: { componentName },
            fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
              const fixes: Array<TSESLint.RuleFix> = [];

              if (!componentNode) {
                return null;
              }

              if (
                componentNode.type === AST_NODE_TYPES.ArrowFunctionExpression &&
                componentNode.body.type !== AST_NODE_TYPES.BlockStatement
              ) {
                const exprText = context.sourceCode.getText(componentNode.body);

                fixes.push(
                  fixer.replaceText(
                    componentNode.body,
                    `{
                        const store = useSignals();

                        try {
                          return ${exprText};
                        } finally {
                          store.f();
                        }
                     }`
                  )
                );
              } else if (
                (componentNode.type === AST_NODE_TYPES.FunctionDeclaration ||
                  componentNode.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
                componentNode.body.type === AST_NODE_TYPES.BlockStatement
              ) {
                const body = componentNode.body;

                // Preserve directive prologues (e.g., 'use client')
                let lastDirectiveEnd: number | null = null;
                for (const stmt of body.body) {
                  if (
                    stmt.type === AST_NODE_TYPES.ExpressionStatement &&
                    stmt.expression.type === AST_NODE_TYPES.Literal &&
                    typeof stmt.expression.value === 'string'
                  ) {
                    lastDirectiveEnd = stmt.range[1];
                    continue;
                  }
                  break;
                }

                const innerStart = lastDirectiveEnd ?? body.range[0] + 1;
                const innerEnd = body.range[1] - 1;

                fixes.push(
                  fixer.replaceTextRange(
                    [innerStart, innerEnd],
                    `\n\tconst store = useSignals();\n\ttry {${context.sourceCode.text.slice(innerStart, innerEnd)}} finally { store.f(); }`
                  )
                );
              }

              const signalsImport = context.sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return (
                    n.type === AST_NODE_TYPES.ImportDeclaration &&
                    n.source.value === '@preact/signals-react/runtime'
                  );
                }
              );

              if (signalsImport) {
                const hasNamedSpecifier = signalsImport.specifiers.some(
                  (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                    return s.type === AST_NODE_TYPES.ImportSpecifier;
                  }
                );

                const hasUseSignalsNamed = signalsImport.specifiers.some(
                  (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier => {
                    return (
                      s.type === AST_NODE_TYPES.ImportSpecifier &&
                      s.imported.type === AST_NODE_TYPES.Identifier &&
                      s.imported.name === 'useSignals'
                    );
                  }
                );

                if (!hasUseSignalsNamed) {
                  if (hasNamedSpecifier) {
                    const lastNamed = [...signalsImport.specifiers]
                      .reverse()
                      .find(
                        (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier =>
                          s.type === AST_NODE_TYPES.ImportSpecifier
                      );

                    if (typeof lastNamed !== 'undefined') {
                      fixes.push(fixer.insertTextAfter(lastNamed, ', useSignals'));
                    }
                  } else {
                    fixes.push(
                      fixer.insertTextAfter(
                        signalsImport,
                        "\nimport { useSignals } from '@preact/signals-react/runtime';\n"
                      )
                    );
                  }
                }
              } else {
                const first = context.sourceCode.ast.body[0];

                if (first) {
                  fixes.push(
                    fixer.insertTextBefore(
                      first,
                      "import { useSignals } from '@preact/signals-react/runtime';\n"
                    )
                  );
                }
              }

              return fixes.length > 0 ? fixes : null;
            },
          });
        }

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
