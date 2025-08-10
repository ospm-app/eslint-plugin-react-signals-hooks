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

type MessageIds = 'invalidSignalName' | 'invalidComputedName';

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
    return 'error';
  }

  switch (messageId) {
    case 'invalidSignalName': {
      return options.severity.invalidSignalName ?? 'error';
    }

    case 'invalidComputedName': {
      return options.severity.invalidComputedName ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function isValidSignalName(name: string, suffixRegex: RegExp): boolean {
  if (!hasSignalSuffix(name, suffixRegex)) {
    return false;
  }

  if (!/^[a-z]/.test(name)) {
    return false;
  }

  if (
    name.startsWith('use') &&
    name.length > 2 &&
    typeof name[2] === 'string' &&
    /^[A-Z]/.test(name[2])
  ) {
    return false;
  }

  return true;
}

function getFixedName(originalName: string, suffix: string): string {
  let fixedName = originalName;

  if (fixedName.startsWith('use') && fixedName.length > 3) {
    fixedName = fixedName.slice(3);
  }

  if (fixedName.length > 0) {
    fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
  }

  if (!fixedName.endsWith(suffix)) {
    fixedName += suffix;
  }

  return fixedName;
}

const ruleName = 'signal-variable-name';

export const signalVariableNameRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: false,
    docs: {
      description:
        'Enforces consistent naming conventions for signal and computed variables. Signal variables should end with "Signal" (e.g., `countSignal`), start with a lowercase letter, and not use the "use" prefix to avoid confusion with React hooks. This improves code readability and maintainability by making signal usage immediately obvious.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      invalidSignalName:
        "Signal variable '{{name}}' should end with '{{expectedSuffix}}', start with lowercase, and not start with 'use'",
      invalidComputedName:
        "Computed variable '{{name}}' should end with '{{expectedSuffix}}', start with lowercase, and not start with 'use'",
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
              invalidSignalName: { type: 'string', enum: ['error', 'warn', 'off'] },
              invalidComputedName: { type: 'string', enum: ['error', 'warn', 'off'] },
            },
            additionalProperties: false,
          },
          suffix: { type: 'string', minLength: 1 },
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

    startPhase(perfKey, 'ruleExecution');

    // Track local identifiers and namespaces for creators
    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();

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
          if (
            stmt.type === AST_NODE_TYPES.ImportDeclaration &&
            typeof stmt.source.value === 'string' &&
            stmt.source.value === '@preact/signals-react'
          ) {
            for (const spec of stmt.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
                if ('name' in spec.imported) {
                  if (spec.imported.name === 'signal') {
                    signalCreatorLocals.add(spec.local.name);
                  } else if (spec.imported.name === 'computed') {
                    computedCreatorLocals.add(spec.local.name);
                  }
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

        let kind: 'signal' | 'computed' | null = null;

        const callee = node.init.callee;

        if (callee.type === AST_NODE_TYPES.Identifier) {
          if (signalCreatorLocals.has(callee.name)) {
            kind = 'signal';
          } else if (computedCreatorLocals.has(callee.name)) {
            kind = 'computed';
          }
        } else if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          creatorNamespaces.has(callee.object.name) &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'signal' || callee.property.name === 'computed')
        ) {
          kind = callee.property.name as 'signal' | 'computed';
        }

        if (kind === null) {
          return;
        }

        if (!isValidSignalName(node.id.name, suffixRegex)) {
          const messageId = kind === 'signal' ? 'invalidSignalName' : 'invalidComputedName';

          if (getSeverity(messageId, option) !== 'off') {
            context.report({
              node: node.id,
              messageId,
              data: {
                name: node.id.name,
                expectedSuffix: suffix,
              },
              fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> {
                const fixes: Array<TSESLint.RuleFix> = [];

                try {
                  if (!('name' in node.id)) {
                    return [];
                  }

                  const fixedName = getFixedName(node.id.name, suffix);

                  if (fixedName === node.id.name) {
                    return [];
                  }

                  const currentScope = context.sourceCode.getScope(node);

                  if (currentScope.set.has(fixedName)) {
                    return [];
                  }

                  fixes.push(fixer.replaceText(node.id, fixedName));

                  const variable = context.sourceCode.getScope(node).set.get(node.id.name);

                  if (variable) {
                    for (const reference of variable.references) {
                      const ref = reference.identifier;

                      if (ref.range[0] === node.id.range[0] && ref.range[1] === node.id.range[1]) {
                        continue;
                      }

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

                        if (!anc) {
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

                      // If reference is already the object of a member access (e.g., foo.value), don't add any accessor
                      const isObjectOfMember =
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        ref.parent?.type === AST_NODE_TYPES.MemberExpression &&
                        ref.parent.object === ref;

                      const accessor = isObjectOfMember
                        ? ''
                        : inJsxAttribute ||
                            (isJsx &&
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
                                return a.arguments.some(
                                  (arg: TSESTree.CallExpressionArgument): boolean => {
                                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
                                    if (!arg) {
                                      return false;
                                    }

                                    return (
                                      ref.range[0] >= arg.range[0] && ref.range[1] <= arg.range[1]
                                    );
                                  }
                                );
                              }))
                          ? '.value'
                          : isJsx
                            ? ''
                            : inComponentScope
                              ? '.value'
                              : '.peek()';

                      fixes.push(fixer.replaceText(ref, `${fixedName}${accessor}`));
                    }
                  }

                  return fixes;
                } catch (error: unknown) {
                  if (
                    option?.performance?.enableMetrics === true &&
                    option.performance.logMetrics === true
                  ) {
                    console.error(`${ruleName}: Error in fixer:`, error);
                  }

                  return [];
                }
              },
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
