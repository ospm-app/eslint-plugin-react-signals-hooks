/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type ts from 'typescript';

import { isInJSXContext, isInJSXAttribute } from './utils/jsx.js';
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

type MessageIds = 'useValueInNonJSX';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
  consumers?: Array<string>;
  typeAware?: boolean; // when true, use TS types (if available) to confirm signals
  extraCreatorModules?: Array<string>; // additional modules that export signal/computed creators
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, options: Option | undefined): 'error' | 'warn' | 'off' {
  if (!options?.severity) {
    return 'error';
  }

  switch (messageId) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case 'useValueInNonJSX': {
      return options.severity.useValueInNonJSX ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

function hasOptionalChainAncestor(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (current.type === AST_NODE_TYPES.ChainExpression) {
      return true;
    }
    if (
      (current.type === AST_NODE_TYPES.MemberExpression ||
        current.type === AST_NODE_TYPES.CallExpression) &&
      current.optional === true
    ) {
      return true;
    }

    if (
      current.type === AST_NODE_TYPES.Program ||
      current.type === AST_NODE_TYPES.JSXElement ||
      current.type === AST_NODE_TYPES.JSXFragment
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

// Detect if an identifier is inside a React hook dependency array argument
function isInHookDependencyArray(node: TSESTree.Identifier): boolean {
  // Walk up until we see an ArrayExpression that's directly an argument of a CallExpression
  let current: TSESTree.Node | undefined = node.parent;

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  while (current) {
    if (current.type === AST_NODE_TYPES.ArrayExpression) {
      const parent = current.parent;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      if (parent && parent.type === AST_NODE_TYPES.CallExpression) {
        // Find the position of this array within the call arguments
        const argIndex = parent.arguments.indexOf(current);

        if (argIndex === -1) {
          return false;
        }

        // Identify hook name: Identifier or MemberExpression (.property)
        let hookName: string | null = null;

        if (parent.callee.type === AST_NODE_TYPES.Identifier) {
          hookName = parent.callee.name;
        } else if (
          parent.callee.type === AST_NODE_TYPES.MemberExpression &&
          parent.callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          hookName = parent.callee.property.name;
        }

        if (hookName === null) {
          return false;
        }

        // Hooks where deps array is at index 1
        const depsIndexOne = new Set([
          'useEffect',
          'useLayoutEffect',
          'useInsertionEffect',
          'useMemo',
          'useCallback',
        ]);

        // Hooks where deps array is at index 2 (e.g. useImperativeHandle)
        const depsIndexTwo = new Set(['useImperativeHandle']);

        if (
          (depsIndexOne.has(hookName) && argIndex === 1) ||
          (depsIndexTwo.has(hookName) && argIndex === 2)
        ) {
          return true;
        }

        return false;
      }
    }

    // Stop early at boundaries where deps arrays won't be found above
    if (
      current.type === AST_NODE_TYPES.FunctionDeclaration ||
      current.type === AST_NODE_TYPES.FunctionExpression ||
      current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      current.type === AST_NODE_TYPES.Program
    ) {
      return false;
    }

    current = current.parent;
  }

  return false;
}

function isBindingOrWritePosition(node: TSESTree.Identifier): boolean {
  const p = node.parent;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
  if (!p) {
    return false;
  }

  // Direct writes like: fooSignal = ..., ++fooSignal, --fooSignal
  if (
    (p.type === AST_NODE_TYPES.AssignmentExpression && p.left === node) ||
    (p.type === AST_NODE_TYPES.UpdateExpression && p.argument === node)
  ) {
    return true;
  }

  // Function parameters: function f(fooSignal) {}
  if (
    (p.type === AST_NODE_TYPES.FunctionDeclaration ||
      p.type === AST_NODE_TYPES.FunctionExpression ||
      p.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
    p.params.includes(node)
  ) {
    return true;
  }

  // Catch clause parameter
  if (p.type === AST_NODE_TYPES.CatchClause && p.param === node) {
    return true;
  }

  // Destructuring/binding patterns: const { fooSignal } = obj; const [fooSignal] = arr;
  // Identifier as value of Property within ObjectPattern
  if (
    p.type === AST_NODE_TYPES.Property &&
    p.value === node &&
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
    p.parent &&
    p.parent.type === AST_NODE_TYPES.ObjectPattern
  ) {
    return true;
  }

  // Array pattern element
  if (p.type === AST_NODE_TYPES.ArrayPattern) {
    return true;
  }

  // Rest element within patterns
  if (p.type === AST_NODE_TYPES.RestElement) {
    return true;
  }

  // AssignmentPattern on the left side (default param or destructuring default)
  if (p.type === AST_NODE_TYPES.AssignmentPattern && p.left === node) {
    return true;
  }

  // VariableDeclarator with simple id
  if (p.type === AST_NODE_TYPES.VariableDeclarator && p.id === node) {
    return true;
  }

  // Declaration identifiers (names) are bindings too
  // e.g. function Foo() {}, const Foo = () => {}, class Bar {}
  if (
    (p.type === AST_NODE_TYPES.FunctionDeclaration && p.id === node) ||
    (p.type === AST_NODE_TYPES.FunctionExpression && p.id === node) ||
    (p.type === AST_NODE_TYPES.ClassDeclaration && p.id === node)
  ) {
    return true;
  }

  return false;
}

const ruleName = 'prefer-signal-reads';

export const preferSignalReadsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    hasSuggestions: false,
    docs: {
      description:
        'Enforces using `.value` when reading signal values in non-JSX contexts. In JSX, signals are automatically unwrapped, but in regular JavaScript/TypeScript code, you must explicitly access the `.value` property to read the current value of a signal. This rule helps catch cases where you might have forgotten to use `.value` when needed.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      useValueInNonJSX: 'Use .value to read the current value of the signal in non-JSX context',
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
          suffix: { type: 'string', minLength: 1 },
          consumers: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          extraCreatorModules: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          typeAware: { type: 'boolean' },
          severity: {
            type: 'object',
            properties: {
              useValueInNonJSX: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [
    {
      performance: DEFAULT_PERFORMANCE_BUDGET,
      typeAware: false,
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

    const suffixRegex = buildSuffixRegex(
      typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal'
    );

    // Build a set of configured consumer names that accept Signal<T> directly.
    const consumerAllowlist = new Set<string>([
      // default consumers that accept Signal instances directly
      'subscribe',
      ...(Array.isArray(option?.consumers) ? option.consumers : []),
    ]);

    startPhase(perfKey, 'ruleExecution');

    // Avoid touching identifiers within TypeScript type positions
    function isInTypePosition(node: TSESTree.Node): boolean {
      const ancestors = context.sourceCode.getAncestors(node);
      // If any TS* node is in the chain, conservatively treat as type position
      if (
        ancestors.some((a: TSESTree.Node): boolean => {
          return (
            a.type.startsWith('TS') ||
            a.type === AST_NODE_TYPES.TSTypeAnnotation ||
            a.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
            a.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
            a.type === AST_NODE_TYPES.TSEnumDeclaration ||
            a.type === AST_NODE_TYPES.TSModuleDeclaration
          );
        })
      ) {
        return true;
      }

      if (!node.parent) {
        return false;
      }

      // Direct parent in TS type constructs
      switch (node.parent.type) {
        case AST_NODE_TYPES.TSTypeReference:
        case AST_NODE_TYPES.TSQualifiedName:
        case AST_NODE_TYPES.TSTypeQuery:
        case AST_NODE_TYPES.TSTypeOperator:
        case AST_NODE_TYPES.TSTypePredicate:
        case AST_NODE_TYPES.TSImportType:
        case AST_NODE_TYPES.TSTypeAnnotation:
        case AST_NODE_TYPES.TSTypeParameter:
        case AST_NODE_TYPES.TSTypeLiteral:
        case AST_NODE_TYPES.TSPropertySignature:
        case AST_NODE_TYPES.TSMethodSignature:
        case AST_NODE_TYPES.TSIndexSignature:
        case AST_NODE_TYPES.TSInterfaceDeclaration:
        case AST_NODE_TYPES.TSTypeAliasDeclaration:
        case AST_NODE_TYPES.TSEnumDeclaration:
        case AST_NODE_TYPES.TSModuleDeclaration: {
          return true;
        }
        default: {
          return false;
        }
      }
    }
    // Track local names and namespaces for signal/computed creators
    const signalCreatorLocals = new Set<string>(['signal']);
    const computedCreatorLocals = new Set<string>(['computed']);
    const creatorNamespaces = new Set<string>();
    const creatorModules = new Set<string>([
      '@preact/signals-react',
      ...(Array.isArray(option?.extraCreatorModules) ? option.extraCreatorModules : []),
    ]);

    // Track variables initialized from signal/computed creators
    const signalVariables = new Set<string>();

    const checker: ts.TypeChecker | undefined =
      context.sourceCode.parserServices?.program?.getTypeChecker();

    function isSignalType(node: TSESTree.Identifier): boolean | undefined {
      if (
        !checker ||
        !context.sourceCode.parserServices ||
        !('esTreeNodeToTSNodeMap' in context.sourceCode.parserServices)
      ) {
        return undefined;
      }

      const type = checker.getTypeAtLocation(
        context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(node)
      );

      if (
        typeof type.getProperty('value') !== 'undefined' &&
        typeof type.getProperty('peek') !== 'undefined'
      ) {
        return true;
      }

      const apparent = checker.getApparentType(type);

      if (
        typeof apparent.getProperty('value') !== 'undefined' &&
        typeof apparent.getProperty('peek') !== 'undefined'
      ) {
        return true;
      }

      const sym = type.aliasSymbol ?? type.symbol;

      if (sym.escapedName === 'Signal' || sym.escapedName === 'ReadableSignal') {
        return true;
      }

      return false;
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

      [AST_NODE_TYPES.Identifier](node: TSESTree.Node): void {
        if (node.type !== AST_NODE_TYPES.Identifier) {
          return;
        }

        // Never modify identifiers inside TS type positions
        if (isInTypePosition(node)) {
          return;
        }

        const byHeuristicSuffix = hasSignalSuffix(node.name, suffixRegex);
        const byVariableTracking = signalVariables.has(node.name);

        let isSignalIdent = byHeuristicSuffix || byVariableTracking;

        if (option?.typeAware === true) {
          const byType = isSignalType(node);

          if (byType === true) {
            isSignalIdent = true;
          } else if (byType === false) {
            isSignalIdent = byVariableTracking; // avoid suffix-only false positives if type says no
          }
        }

        if (!isSignalIdent) {
          return;
        }

        // Skip inside JSX elements/attributes
        if (isInJSXContext(node) || isInJSXAttribute(node)) {
          return;
        }

        // Be conservative: bail when inside optional chaining
        if (hasOptionalChainAncestor(node)) {
          return;
        }

        // Skip identifiers used inside React hook dependency arrays
        if (isInHookDependencyArray(node)) {
          return;
        }

        if (
          node.parent.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.object === node &&
          'property' in node.parent &&
          node.parent.property.type === AST_NODE_TYPES.Identifier &&
          (node.parent.property.name === 'value' || node.parent.property.name === 'peek')
        ) {
          return;
        }

        // Skip if identifier is being written to or bound (not a read context)
        if (isBindingOrWritePosition(node)) {
          return;
        }

        // Allow member calls like signal.subscribe(...)
        if (
          node.parent.type === AST_NODE_TYPES.MemberExpression &&
          node.parent.object === node &&
          node.parent.property.type === AST_NODE_TYPES.Identifier &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          node.parent.parent &&
          node.parent.parent.type === AST_NODE_TYPES.CallExpression &&
          node.parent.parent.callee === node.parent &&
          consumerAllowlist.has(node.parent.property.name)
        ) {
          return;
        }

        if (
          (node.parent.type === AST_NODE_TYPES.CallExpression && node.parent.callee === node) ||
          (node.parent.type === AST_NODE_TYPES.NewExpression && node.parent.callee === node) ||
          // Object literal property key
          (node.parent.type === AST_NODE_TYPES.Property && node.parent.key === node) ||
          // Class method/field names (declaration keys)
          (node.parent.type === AST_NODE_TYPES.MethodDefinition &&
            node.parent.key === node &&
            !node.parent.computed) ||
          (node.parent.type === AST_NODE_TYPES.PropertyDefinition &&
            node.parent.key === node &&
            !node.parent.computed) ||
          // Member property name (non-computed)
          (node.parent.type === AST_NODE_TYPES.MemberExpression &&
            node.parent.property === node &&
            !node.parent.computed) ||
          node.parent.type === AST_NODE_TYPES.ImportSpecifier ||
          node.parent.type === AST_NODE_TYPES.ExportSpecifier ||
          node.parent.type === AST_NODE_TYPES.LabeledStatement ||
          node.parent.type === AST_NODE_TYPES.TSTypeReference ||
          node.parent.type === AST_NODE_TYPES.TSQualifiedName ||
          node.parent.type === AST_NODE_TYPES.TSTypeQuery ||
          node.parent.type === AST_NODE_TYPES.TSTypeOperator
        ) {
          return;
        }

        if (
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          node.parent.arguments.includes(node)
        ) {
          let calleeName: string | null = null;

          if (node.parent.callee.type === AST_NODE_TYPES.Identifier) {
            calleeName = node.parent.callee.name;
          } else if (
            node.parent.callee.type === AST_NODE_TYPES.MemberExpression &&
            node.parent.callee.property.type === AST_NODE_TYPES.Identifier
          ) {
            calleeName = node.parent.callee.property.name;
          }

          // Configured APIs that accept a Signal instance directly
          if (calleeName !== null && consumerAllowlist.has(calleeName)) {
            return;
          }
        }

        if (getSeverity('useValueInNonJSX', option) === 'off') {
          return;
        }

        context.report({
          node,
          messageId: 'useValueInNonJSX',
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.insertTextAfter(node, '.value');
          },
        });
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

      [AST_NODE_TYPES.Program](node: TSESTree.Program): void {
        for (const stmt of node.body) {
          if (stmt.type !== AST_NODE_TYPES.ImportDeclaration) {
            continue;
          }

          if (typeof stmt.source.value === 'string' && creatorModules.has(stmt.source.value)) {
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

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
