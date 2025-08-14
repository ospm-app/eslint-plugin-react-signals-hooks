/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  stopTracking,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

const ruleName = 'forbid-signal-re-assignment';

// Cache for subtree scans in containsSignalRef
const signalRefCache = new WeakMap<TSESTree.Node, boolean>();

// Unwrap optional chaining wrapper to access the underlying callee/node
function unwrapChainExpression(
  node: TSESTree.Node | null | undefined
): TSESTree.Node | null | undefined {
  if (!node) {
    return node;
  }

  if ('type' in node && node.type === AST_NODE_TYPES.ChainExpression) {
    return node.expression;
  }

  return node;
}

type MessageIds = 'reassignSignal';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  suffix?: string;
  severity?: Severity;
  performance?: PerformanceBudget;
  /** Additional module sources exporting signal creators */
  modules?: Array<string>;
  /** If true, treat bare names `signal`/`computed`/`effect` as creators without import scoping */
  allowBareNames?: boolean;
  /** Custom creator base names, e.g. project-specific wrappers */
  creatorNames?: Array<string>;
  /**
   * If true, enable suffix-based heuristics (e.g. variables ending with suffix like `Signal`).
   * The heuristic will only be active if at least one known creator import/namespace is present in the file.
   */
  enableSuffixHeuristic?: boolean;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'reassignSignal': {
      return options.severity.reassignSignal ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function isCreatorCallee(
  node: TSESTree.Node | null | undefined,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  allowBareNames: boolean,
  creatorBaseNames: Set<string>
): boolean {
  trackOperation(perfKey, PerformanceOperations.signalCheck);

  if (!node) {
    return false;
  }

  const unwrapped = unwrapChainExpression(node);

  if (!unwrapped) {
    return false;
  }

  if (unwrapped.type === AST_NODE_TYPES.Identifier) {
    return (
      creatorIdentifiers.has(unwrapped.name) ||
      (allowBareNames === true && creatorBaseNames.has(unwrapped.name))
    );
  }

  if (
    unwrapped.type === AST_NODE_TYPES.MemberExpression &&
    !unwrapped.computed &&
    unwrapped.property.type === AST_NODE_TYPES.Identifier &&
    unwrapped.object.type === AST_NODE_TYPES.Identifier
  ) {
    return (
      creatorNamespaces.has(unwrapped.object.name) && creatorBaseNames.has(unwrapped.property.name)
    );
  }

  return false;
}

// Runtime type guard for ESTree nodes
function isESTreeNode(value: unknown): value is TSESTree.Node {
  return (
    value !== null &&
    typeof value === 'object' &&
    // eslint-disable-next-line n/no-unsupported-features/es-builtins, n/no-unsupported-features/es-syntax
    Object.hasOwn(value, 'type')
  );
}

function containsSignalRef(
  expr: TSESTree.Node,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  allowBareNames: boolean,
  creatorBaseNames: Set<string>
): boolean {
  const cached = signalRefCache.get(expr);
  if (typeof cached === 'boolean') {
    return cached;
  }
  const stack: Array<TSESTree.Node> = [expr];
  const visited = new WeakSet<TSESTree.Node>();

  while (stack.length) {
    const cur = stack.pop();

    if (!cur) {
      continue;
    }

    // Avoid infinite loops by not revisiting nodes
    if (visited.has(cur)) {
      continue;
    }

    visited.add(cur);

    if (
      'type' in cur &&
      cur.type === AST_NODE_TYPES.CallExpression &&
      isCreatorCallee(
        cur.callee,
        perfKey,
        creatorIdentifiers,
        creatorNamespaces,
        allowBareNames,
        creatorBaseNames
      )
    ) {
      signalRefCache.set(expr, true);
      return true;
    }

    for (const k in cur) {
      // Skip cyclical parent link commonly added by parsers
      if (k === 'parent') {
        continue;
      }

      const v = cur[k as keyof typeof cur];

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (v !== null && typeof v === 'object') {
        if (Array.isArray(v)) {
          for (const it of v) {
            if (isESTreeNode(it) && !visited.has(it)) {
              stack.push(it);
            }
          }
        } else if (isESTreeNode(v) && !visited.has(v)) {
          stack.push(v);
        }
      }
    }
  }
  return false;
}

function rhsIsSignalLike(
  rhs: TSESTree.Expression,
  knownSignalVars: Set<string>,
  knownSignalContainers: Set<string>,
  suffixRegex: RegExp,
  context: TSESLint.RuleContext<MessageIds, Options>,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  allowBareNames: boolean,
  creatorBaseNames: Set<string>,
  suffixHeuristicActive: boolean,
  hasCreatorImport: boolean
): {
  match: boolean;
  name: string;
} {
  const node = unwrapChainExpression(rhs) ?? rhs;

  if (
    node.type === AST_NODE_TYPES.Identifier &&
    (knownSignalVars.has(node.name) ||
      knownSignalContainers.has(node.name) ||
      (suffixHeuristicActive && hasSignalSuffix(node.name, suffixRegex)))
  ) {
    return { match: true, name: node.name };
  }

  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    isCreatorCallee(
      node.callee,
      perfKey,
      creatorIdentifiers,
      creatorNamespaces,
      hasCreatorImport && allowBareNames,
      creatorBaseNames
    )
  ) {
    return { match: true, name: context.sourceCode.getText(node) };
  }

  if (
    (node.type === AST_NODE_TYPES.ObjectExpression ||
      node.type === AST_NODE_TYPES.ArrayExpression) &&
    containsSignalRef(
      node,
      perfKey,
      creatorIdentifiers,
      creatorNamespaces,
      hasCreatorImport && allowBareNames,
      creatorBaseNames
    )
  ) {
    return { match: true, name: context.sourceCode.getText(node) };
  }

  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    (knownSignalContainers.has(node.object.name) ||
      knownSignalVars.has(node.object.name) ||
      (suffixHeuristicActive && hasSignalSuffix(node.object.name, suffixRegex)))
  ) {
    return { match: true, name: context.sourceCode.getText(node) };
  }

  return { match: false, name: '' };
}

function report(
  node: TSESTree.Node,
  name: string,
  context: TSESLint.RuleContext<MessageIds, Options>
): void {
  if (getSeverity('reassignSignal', context.options[0]) === 'off') {
    return;
  }

  context.report({ node, messageId: 'reassignSignal', data: { name } });
}

// Known modules exporting signal creators
const KNOWN_SIGNAL_MODULES = new Set(['@preact/signals-react', '@preact/signals-core']);

export const forbidSignalReAssignmentRule = ESLintUtils.RuleCreator((name: string): string =>
  getRuleDocUrl(name)
)<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    docs: {
      description:
        "Forbid aliasing or re-assigning variables that hold a signal. Prefer reading '.value' or using the original reference.",
      url: getRuleDocUrl(ruleName),
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          suffix: { type: 'string', minLength: 1 },
          creatorNames: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          enableSuffixHeuristic: { type: 'boolean' },
          modules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          allowBareNames: { type: 'boolean' },
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
                  Object.entries(PerformanceOperations).map(([k]) => [
                    k,
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
              reassignSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      reassignSignal:
        "Avoid re-assigning or aliasing signal '{{name}}'. Access its '.value' or pass it directly instead.",
    },
  },
  defaultOptions: [
    {
      suffix: 'Signal',
      performance: DEFAULT_PERFORMANCE_BUDGET,
      allowBareNames: false,
      creatorNames: [],
      enableSuffixHeuristic: true,
      severity: {
        reassignSignal: 'error',
      },
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, Options>, [option]): TSESLint.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

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

    const suffixRegex =
      typeof option?.suffix === 'string'
        ? // eslint-disable-next-line security/detect-non-literal-regexp, optimize-regex/optimize-regex
          new RegExp(`${option.suffix.replace(/[-/\\^$*+?.()|[\]{}]/g, '')}$`)
        : /Signal$/;

    // Effective modules set
    const effectiveModules = new Set<string>([...KNOWN_SIGNAL_MODULES, ...(option?.modules ?? [])]);

    // Detection state
    const creatorIdentifiers = new Set<string>();
    const creatorNamespaces = new Set<string>();
    const knownSignalVars = new Set<string>(); // variables that hold a signal
    const knownSignalContainers = new Set<string>(); // variables that are arrays/objects containing signals

    const creatorBaseNames = new Set<string>([
      'signal',
      'computed',
      'effect',
      ...(option?.creatorNames ?? []),
    ]);

    let hasCreatorImport = false;

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

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations.nodeProcessing);
      },

      [AST_NODE_TYPES.ImportDeclaration](node: TSESTree.ImportDeclaration): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.source.type !== AST_NODE_TYPES.Literal) {
          return;
        }

        if (!effectiveModules.has(node.source.value)) {
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            const importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : null;

            if (importedName !== null && creatorBaseNames.has(importedName)) {
              creatorIdentifiers.add(spec.local.name);

              hasCreatorImport = true;
            }
          } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            creatorNamespaces.add(spec.local.name);

            hasCreatorImport = true;
          }
        }
      },

      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        // Track known signal vars and containers
        if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
          if (
            node.init.type === AST_NODE_TYPES.CallExpression &&
            isCreatorCallee(
              node.init.callee,
              perfKey,
              creatorIdentifiers,
              creatorNamespaces,
              option?.allowBareNames === true && hasCreatorImport,
              creatorBaseNames
            )
          ) {
            knownSignalVars.add(node.id.name);
          } else if (
            node.init.type === AST_NODE_TYPES.ObjectExpression ||
            node.init.type === AST_NODE_TYPES.ArrayExpression
          ) {
            if (
              containsSignalRef(
                node.init,
                perfKey,
                creatorIdentifiers,
                creatorNamespaces,
                option?.allowBareNames === true && hasCreatorImport,
                creatorBaseNames
              )
            ) {
              knownSignalContainers.add(node.id.name);
            }
          } else if (node.init.type === AST_NODE_TYPES.Identifier) {
            const isVar = knownSignalVars.has(node.init.name);

            const isContainer = knownSignalContainers.has(node.init.name);

            const suffixOnly =
              !isVar &&
              !isContainer &&
              option?.enableSuffixHeuristic === true &&
              hasCreatorImport &&
              hasSignalSuffix(node.init.name, suffixRegex);

            if (isVar || isContainer || suffixOnly) {
              report(node, node.init.name, context);

              // propagate only when we know the source kind
              if (isVar) {
                knownSignalVars.add(node.id.name);
              } else if (isContainer) {
                knownSignalContainers.add(node.id.name);
              }
            }
          } else if (node.init.type === AST_NODE_TYPES.MemberExpression) {
            // alias from container access
            const base =
              node.init.object.type === AST_NODE_TYPES.Identifier ? node.init.object.name : null;

            if (base !== null && (knownSignalContainers.has(base) || knownSignalVars.has(base))) {
              report(node, context.sourceCode.getText(node.init), context);
              // propagate alias so subsequent uses are tracked
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (node.id.type === AST_NODE_TYPES.Identifier) {
                knownSignalVars.add(node.id.name);
              }
            }
          }
        }

        // Destructuring that aliases signal itself from container literal or identifier
        if (
          !(
            (node.id.type === AST_NODE_TYPES.ObjectPattern ||
              node.id.type === AST_NODE_TYPES.ArrayPattern) &&
            node.init !== null
          )
        ) {
          return;
        }

        const initUnwrapped = unwrapChainExpression(node.init as unknown as TSESTree.Node) as
          | TSESTree.Expression
          | undefined;

        if (
          initUnwrapped &&
          initUnwrapped.type === AST_NODE_TYPES.CallExpression &&
          isCreatorCallee(
            initUnwrapped.callee,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            option?.allowBareNames === true && hasCreatorImport,
            creatorBaseNames
          )
        ) {
          // const [s] = signal() -- unlikely but catch
          report(node.id, context.sourceCode.getText(initUnwrapped), context);
          return;
        }

        if (node.init.type === AST_NODE_TYPES.Identifier) {
          if (
            knownSignalVars.has(node.init.name) ||
            knownSignalContainers.has(node.init.name) ||
            (option?.enableSuffixHeuristic === true &&
              hasCreatorImport &&
              hasSignalSuffix(node.init.name, suffixRegex))
          ) {
            report(node.id, node.init.name, context);

            return;
          }
        }

        if (
          (node.init.type === AST_NODE_TYPES.ObjectExpression ||
            node.init.type === AST_NODE_TYPES.ArrayExpression) &&
          containsSignalRef(
            node.init,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            option?.allowBareNames === true && hasCreatorImport,
            creatorBaseNames
          )
        ) {
          report(node.id, context.sourceCode.getText(node.init), context);
        }
      },

      [AST_NODE_TYPES.AssignmentExpression](node: TSESTree.AssignmentExpression): void {
        if (node.operator !== '=') {
          return;
        }

        // Simple alias assignment like `a = countSignal` or destructuring handled below
        if (node.left.type === AST_NODE_TYPES.Identifier) {
          const { match, name } = rhsIsSignalLike(
            node.right,
            knownSignalVars,
            knownSignalContainers,
            suffixRegex,
            context,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            option?.allowBareNames === true,
            creatorBaseNames,
            option?.enableSuffixHeuristic === true && hasCreatorImport,
            hasCreatorImport
          );

          if (match) {
            report(node, name, context);
            // propagate alias; if rhs is a known container identifier, track as container
            if (
              node.right.type === AST_NODE_TYPES.Identifier &&
              knownSignalContainers.has(node.right.name)
            ) {
              knownSignalContainers.add(node.left.name);
            } else {
              knownSignalVars.add(node.left.name);
            }
          }

          return;
        }

        if (
          node.left.type === AST_NODE_TYPES.ObjectPattern ||
          node.left.type === AST_NODE_TYPES.ArrayPattern
        ) {
          const { match, name } = rhsIsSignalLike(
            node.right,
            knownSignalVars,
            knownSignalContainers,
            suffixRegex,
            context,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            option?.allowBareNames === true,
            creatorBaseNames,
            option?.enableSuffixHeuristic === true && hasCreatorImport,
            hasCreatorImport
          );

          if (match) {
            report(node.left, name, context);
          }
        }
      },

      [AST_NODE_TYPES.FunctionDeclaration](node: TSESTree.FunctionDeclaration): void {
        for (const param of node.params) {
          if (
            param.type === AST_NODE_TYPES.AssignmentPattern &&
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            param.right &&
            param.left.type === AST_NODE_TYPES.Identifier
          ) {
            const { match, name } = rhsIsSignalLike(
              param.right,
              knownSignalVars,
              knownSignalContainers,
              suffixRegex,
              context,
              perfKey,
              creatorIdentifiers,
              creatorNamespaces,
              option?.allowBareNames === true,
              creatorBaseNames,
              option?.enableSuffixHeuristic === true && hasCreatorImport,
              hasCreatorImport
            );

            if (match) {
              report(param, name, context);
            }
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
