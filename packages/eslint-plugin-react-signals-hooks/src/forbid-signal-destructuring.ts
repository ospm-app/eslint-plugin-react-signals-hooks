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

const ruleName = 'forbid-signal-destructuring';

type MessageIds = 'destructureSignal';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  suffix?: string;
  modules?: Array<string>;
  /** Additional function names to treat as signal creators (e.g., wrappers) */
  creatorNames?: Array<string>;
  enableSuffixHeuristic?: boolean;
  severity?: Severity;
  performance?: PerformanceBudget;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'destructureSignal': {
      return options.severity.destructureSignal ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

// Unwrap optional chaining containers to their inner expression
function unwrapChainExpression(expr: TSESTree.Expression): TSESTree.Expression {
  return expr.type === AST_NODE_TYPES.ChainExpression ? expr.expression : expr;
}

function getCallCalleeIfAny(expr: TSESTree.Expression): TSESTree.Node | null {
  // In typescript-estree, optional calls are represented as CallExpression
  // wrapped by ChainExpression with expr.optional === true. We already unwrap
  // ChainExpression before calling this helper, so a simple check is sufficient.
  return expr.type === AST_NODE_TYPES.CallExpression ? expr.callee : null;
}

function isCreatorCallee(
  node: TSESTree.Node | null | undefined,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  creatorNamesOpt: Set<string>
): boolean {
  trackOperation(perfKey, PerformanceOperations.signalCheck);
  if (!node) {
    return false;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    // Only consider identifiers that were imported as creators
    return creatorIdentifiers.has(node.name) || creatorNamesOpt.has(node.name);
  }

  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.object.type === AST_NODE_TYPES.Identifier
  ) {
    return (
      creatorNamespaces.has(node.object.name) &&
      (['signal', 'computed', 'effect'].includes(node.property.name) ||
        creatorNamesOpt.has(node.property.name))
    );
  }

  return false;
}

function reportDestructure(
  node: TSESTree.Node,
  name: string,
  context: TSESLint.RuleContext<MessageIds, Options>
): void {
  if (getSeverity('destructureSignal', context.options[0]) === 'off') {
    return;
  }

  context.report({
    node,
    messageId: 'destructureSignal',
    data: { name },
    suggest: [
      {
        messageId: 'destructureSignal',
        data: { name },
        fix(fixer) {
          return fixer.insertTextBefore(
            node,
            `/* react-signals-hooks: avoid destructuring from signal ${name}; read from .value or access members on the value. */\n`
          );
        },
      },
    ],
  });
}

function resolveBaseName(expr: TSESTree.Expression): string | null {
  // Walk to the left-most Identifier base of a MemberExpression chain
  let cur: TSESTree.Expression | TSESTree.PrivateIdentifier = expr;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    if (cur.type === AST_NODE_TYPES.Identifier) {
      return cur.name;
    }

    if (
      cur.type === AST_NODE_TYPES.MemberExpression &&
      (cur.object.type === AST_NODE_TYPES.Identifier ||
        cur.object.type === AST_NODE_TYPES.MemberExpression)
    ) {
      if (cur.object.type === AST_NODE_TYPES.Identifier) {
        return cur.object.name;
      }
      // continue walking if MemberExpression
      cur = cur.object;
      continue;
    }

    return null;
  }
}

// directly references a signal creator call or a known signal/container identifier.
function hasTopLevelSignalRef(
  node: TSESTree.ObjectExpression | TSESTree.ArrayExpression,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  creatorNamesOpt: Set<string>,
  knownSignalVars: Set<string>,
  knownSignalContainers: Set<string>
): boolean {
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    for (const prop of node.properties) {
      if (prop.type !== AST_NODE_TYPES.Property) {
        continue;
      }

      const v = prop.value as TSESTree.Expression;
      if (
        (v.type === AST_NODE_TYPES.CallExpression &&
          isCreatorCallee(
            v.callee,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt
          )) ||
        (v.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(v.name) || knownSignalContainers.has(v.name)))
      ) {
        return true;
      }
    }
    return false;
  }

  // ArrayExpression
  for (const el of node.elements) {
    if (!el) continue;
    if (
      (el.type === AST_NODE_TYPES.CallExpression &&
        isCreatorCallee(
          el.callee,
          perfKey,
          creatorIdentifiers,
          creatorNamespaces,
          creatorNamesOpt
        )) ||
      (el.type === AST_NODE_TYPES.Identifier &&
        (knownSignalVars.has(el.name) || knownSignalContainers.has(el.name)))
    ) {
      return true;
    }
  }

  return false;
}

// Return the set of top-level object keys or array indices that directly reference a signal.
function getTopLevelSignalKeys(
  node: TSESTree.ObjectExpression | TSESTree.ArrayExpression,
  perfKey: string,
  creatorIdentifiers: Set<string>,
  creatorNamespaces: Set<string>,
  creatorNamesOpt: Set<string>,
  knownSignalVars: Set<string>,
  knownSignalContainers: Set<string>
): Set<string> {
  const result = new Set<string>();
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    for (const prop of node.properties) {
      if (prop.type !== AST_NODE_TYPES.Property) continue;
      const v = prop.value as TSESTree.Expression;
      const k = prop.key;
      let keyName: string | null = null;
      if (k.type === AST_NODE_TYPES.Identifier) keyName = k.name;
      else if (k.type === AST_NODE_TYPES.Literal && typeof k.value === 'string') keyName = k.value;
      if (keyName === null) continue;

      if (
        (v.type === AST_NODE_TYPES.CallExpression &&
          isCreatorCallee(
            v.callee,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt
          )) ||
        (v.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(v.name) || knownSignalContainers.has(v.name)))
      ) {
        result.add(keyName);
      }
    }
    return result;
  }

  // ArrayExpression indices
  node.elements.forEach(
    (el: TSESTree.SpreadElement | TSESTree.Expression | null, idx: number): void => {
      if (el === null) {
        return;
      }

      if (
        (el.type === AST_NODE_TYPES.CallExpression &&
          isCreatorCallee(
            el.callee,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt
          )) ||
        (el.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(el.name) || knownSignalContainers.has(el.name)))
      ) {
        result.add(String(idx));
      }
    }
  );

  return result;
}

function patternOverlapsSignalKeys(
  pattern: TSESTree.ObjectPattern | TSESTree.ArrayPattern | TSESTree.BindingName,
  signalKeys: Set<string>
): boolean {
  if (pattern.type === AST_NODE_TYPES.ObjectPattern) {
    const picked = new Set<string>();

    let hasRest = false;

    for (const p of pattern.properties) {
      if (p.type === AST_NODE_TYPES.RestElement) {
        hasRest = true;

        continue;
      }

      if (p.key.type === AST_NODE_TYPES.Identifier) {
        picked.add(p.key.name);
      } else if (p.key.type === AST_NODE_TYPES.Literal && typeof p.key.value === 'string') {
        picked.add(p.key.value);
      }
    }

    // Any directly picked signal key is an overlap
    for (const k of picked) {
      if (signalKeys.has(k)) {
        return true;
      }
    }

    // If there is a rest element and not all signal keys are explicitly picked,
    // the rest binding will capture remaining signal-bearing keys.
    if (hasRest) {
      for (const k of signalKeys) {
        if (!picked.has(k)) {
          return true;
        }
      }
    }

    return false;
  }

  // ArrayPattern
  let restAt: number | null = null;

  if (!('elements' in pattern)) {
    return false;
  }

  for (let i = 0; i < pattern.elements.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const el: TSESTree.DestructuringPattern | null | undefined = pattern.elements[i];

    if (el === null || typeof el === 'undefined') {
      continue;
    }

    if (el.type === AST_NODE_TYPES.RestElement) {
      restAt = i;
      break;
    }

    if (signalKeys.has(String(i))) {
      return true;
    }
  }

  if (restAt !== null) {
    // Any signal-bearing index at or after rest position overlaps
    for (const idx of signalKeys) {
      const n = Number(idx);

      if (!Number.isNaN(n) && n >= restAt) {
        return true;
      }
    }
  }

  return false;
}

// Known modules exporting signal creators
const KNOWN_SIGNAL_MODULES = new Set(['@preact/signals-react', '@preact/signals-core']);

export const forbidSignalDestructuringRule = ESLintUtils.RuleCreator((name: string): string =>
  getRuleDocUrl(name)
)<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid destructuring that creates new bindings from a signal reference. Prefer explicit `.value` access or passing the signal directly.',
      url: getRuleDocUrl(ruleName),
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          suffix: { type: 'string', minLength: 1 },
          modules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          creatorNames: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
          enableSuffixHeuristic: { type: 'boolean' },
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
              destructureSignal: {
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
      destructureSignal:
        "Avoid destructuring from signal '{{name}}'. Read from '.value' or use direct member access instead.",
    },
  },
  defaultOptions: [
    {
      suffix: 'Signal',
      modules: [],
      creatorNames: [],
      enableSuffixHeuristic: false,
      performance: DEFAULT_PERFORMANCE_BUDGET,
      severity: {
        destructureSignal: 'error',
      },
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, Options>, [option]): TSESLint.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    const perf = createPerformanceTracker(perfKey, option?.performance);

    // Enable metrics if specified
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

    // Track imported creator identifiers and namespaces
    const creatorIdentifiers = new Set<string>();
    const creatorNamespaces = new Set<string>();
    const creatorNamesOpt = new Set<string>(option?.creatorNames ?? []);

    // Track variables definitely holding a signal or containers that include a signal
    const knownSignalVars = new Set<string>();
    const knownSignalContainers = new Set<string>();

    // Track locally declared identifiers to narrow suffix heuristic usage
    const declaredLocals = new Set<string>();

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (option?.performance?.maxNodes ?? 2000)) {
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

        trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
      },

      [AST_NODE_TYPES.ImportDeclaration](node: TSESTree.ImportDeclaration): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.source.type !== AST_NODE_TYPES.Literal) {
          return;
        }

        const allowedModules = new Set([...KNOWN_SIGNAL_MODULES, ...(option?.modules ?? [])]);

        if (!allowedModules.has(String(node.source.value))) {
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            const importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : null;

            if (
              importedName !== null &&
              (['signal', 'computed', 'effect'].includes(importedName) ||
                creatorNamesOpt.has(importedName))
            ) {
              creatorIdentifiers.add(spec.local.name);
            }
          } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            creatorNamespaces.add(spec.local.name);
          }
        }
      },

      // Track simple identifier initializations to populate known sets
      'VariableDeclarator[id.type="Identifier"]': (node: TSESTree.VariableDeclarator): void => {
        if (!node.init || node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        const initExpr = unwrapChainExpression(node.init);

        // Track declared local
        declaredLocals.add(node.id.name);

        {
          const callee = getCallCalleeIfAny(initExpr);
          if (
            callee &&
            isCreatorCallee(callee, perfKey, creatorIdentifiers, creatorNamespaces, creatorNamesOpt)
          ) {
            knownSignalVars.add(node.id.name);
            return;
          }
        }

        if (
          (initExpr.type === AST_NODE_TYPES.ObjectExpression ||
            initExpr.type === AST_NODE_TYPES.ArrayExpression) &&
          hasTopLevelSignalRef(
            initExpr,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt,
            knownSignalVars,
            knownSignalContainers
          )
        ) {
          knownSignalContainers.add(node.id.name);
          return;
        }

        if (
          initExpr.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(initExpr.name) || knownSignalContainers.has(initExpr.name))
        ) {
          // Propagate known-ness through simple reassignments
          if (knownSignalVars.has(initExpr.name)) {
            knownSignalVars.add(node.id.name);
          } else {
            knownSignalContainers.add(node.id.name);
          }
        }
      },

      // Destructuring variable declarations
      'VariableDeclarator[id.type="ObjectPattern"], VariableDeclarator[id.type="ArrayPattern"]': (
        node: TSESTree.VariableDeclarator
      ): void => {
        if (node.init === null) {
          return;
        }

        const initExpr = unwrapChainExpression(node.init as TSESTree.Expression);

        const stack: Array<TSESTree.Node> = [node.id];

        while (stack.length) {
          const cur = stack.pop();

          if (typeof cur === 'undefined') {
            continue;
          }

          if (cur.type === AST_NODE_TYPES.Identifier) {
            declaredLocals.add(cur.name);
          } else if (cur.type === AST_NODE_TYPES.Property) {
            stack.push(cur.value);
          } else if (
            cur.type === AST_NODE_TYPES.ObjectPattern ||
            cur.type === AST_NODE_TYPES.ArrayPattern ||
            cur.type === AST_NODE_TYPES.RestElement ||
            cur.type === AST_NODE_TYPES.AssignmentPattern
          ) {
            for (const key in cur) {
              if (key === 'parent') {
                continue;
              }

              const val = cur[key as keyof typeof cur];

              if (Array.isArray(val)) {
                for (const item of val) {
                  if (typeof item === 'object' && 'type' in item) {
                    stack.push(item);
                  }
                }
              } else if (typeof val !== 'undefined' && typeof val === 'object' && 'type' in val) {
                stack.push(val);
              }
            }
          }
        }

        // If RHS is direct signal() or namespaced creator call
        {
          const callee = getCallCalleeIfAny(initExpr);
          if (
            callee &&
            isCreatorCallee(callee, perfKey, creatorIdentifiers, creatorNamespaces, creatorNamesOpt)
          ) {
            reportDestructure(node.id, context.sourceCode.getText(initExpr), context);

            return;
          }
        }

        // If RHS is identifier previously marked as signal or container-with-signal
        if (
          initExpr.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(initExpr.name) ||
            knownSignalContainers.has(initExpr.name) ||
            (option?.enableSuffixHeuristic === true &&
              (creatorIdentifiers.size > 0 || creatorNamespaces.size > 0) &&
              declaredLocals.has(initExpr.name) &&
              hasSignalSuffix(initExpr.name, suffixRegex)))
        ) {
          reportDestructure(node.id, initExpr.name, context);

          return;
        }

        // If RHS is literal object/array containing a signal call, report only if pattern overlaps signal-bearing keys
        if (
          initExpr.type === AST_NODE_TYPES.ObjectExpression ||
          initExpr.type === AST_NODE_TYPES.ArrayExpression
        ) {
          const keys = getTopLevelSignalKeys(
            initExpr,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt,
            knownSignalVars,
            knownSignalContainers
          );
          if (keys.size > 0 && patternOverlapsSignalKeys(node.id, keys)) {
            reportDestructure(node.id, context.sourceCode.getText(initExpr), context);
          }
        }
      },

      // Destructuring assignment patterns
      [AST_NODE_TYPES.AssignmentExpression](node: TSESTree.AssignmentExpression): void {
        if (
          node.left.type !== AST_NODE_TYPES.ObjectPattern &&
          node.left.type !== AST_NODE_TYPES.ArrayPattern
        ) {
          return;
        }

        const rightExpr = unwrapChainExpression(node.right as TSESTree.Expression);

        // If RHS is direct signal() or namespaced creator call
        {
          const callee = getCallCalleeIfAny(rightExpr);
          if (
            callee &&
            isCreatorCallee(callee, perfKey, creatorIdentifiers, creatorNamespaces, creatorNamesOpt)
          ) {
            reportDestructure(node.left, context.sourceCode.getText(rightExpr), context);

            return;
          }
        }

        // If RHS is identifier previously marked as signal or container-with-signal
        if (
          rightExpr.type === AST_NODE_TYPES.Identifier &&
          (knownSignalVars.has(rightExpr.name) ||
            knownSignalContainers.has(rightExpr.name) ||
            (option?.enableSuffixHeuristic === true &&
              (creatorIdentifiers.size > 0 || creatorNamespaces.size > 0) &&
              declaredLocals.has(rightExpr.name) &&
              hasSignalSuffix(rightExpr.name, suffixRegex)))
        ) {
          reportDestructure(node.left, rightExpr.name, context);

          return;
        }

        // If RHS is literal object/array containing a signal call, report only if pattern overlaps signal-bearing keys
        if (
          rightExpr.type === AST_NODE_TYPES.ObjectExpression ||
          rightExpr.type === AST_NODE_TYPES.ArrayExpression
        ) {
          const keys = getTopLevelSignalKeys(
            rightExpr,
            perfKey,
            creatorIdentifiers,
            creatorNamespaces,
            creatorNamesOpt,
            knownSignalVars,
            knownSignalContainers
          );
          if (keys.size > 0 && patternOverlapsSignalKeys(node.left, keys)) {
            reportDestructure(node.left, context.sourceCode.getText(rightExpr), context);

            return;
          }
        }

        // Conservative heuristic: if MemberExpression base looks like variable we know
        if (rightExpr.type === AST_NODE_TYPES.MemberExpression) {
          const base = resolveBaseName(rightExpr);

          if (
            base !== null &&
            (knownSignalVars.has(base) ||
              knownSignalContainers.has(base) ||
              (option?.enableSuffixHeuristic === true &&
                (creatorIdentifiers.size > 0 || creatorNamespaces.size > 0) &&
                declaredLocals.has(base) &&
                hasSignalSuffix(base, suffixRegex)))
          ) {
            reportDestructure(node.left, base, context);
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
