/** biome-ignore-all assist/source/organizeImports: off */
import type { Scope, Variable, Reference, Definition } from '@typescript-eslint/scope-manager';
import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESLint,
  type TSESTree,
} from '@typescript-eslint/utils';
import type { RuleContext, SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';
import type { Pattern } from 'estree';

import { PerformanceOperations } from './utils/performance-constants.js';
import {
  endPhase,
  startPhase,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'missingDependencies'
  | 'missingDependency'
  | 'unnecessaryDependencies'
  | 'unnecessaryDependency'
  | 'duplicateDependencies'
  | 'duplicateDependency'
  | 'unknownDependencies'
  | 'asyncEffect'
  | 'missingEffectCallback'
  | 'staleAssignmentDependency'
  | 'staleAssignmentLiteral'
  | 'staleAssignmentExpression'
  | 'staleAssignmentUnstable'
  | 'spreadElementInDependencyArray'
  | 'useEffectEventInDependencyArray'
  | 'addAllDependencies'
  | 'addSingleDependency'
  | 'removeDependencyArray'
  | 'addDependencies'
  | 'removeDependency'
  | 'removeSingleDependency'
  | 'removeAllDuplicates'
  | 'removeAllUnnecessaryDependencies'
  | 'removeThisDuplicate'
  | 'dependencyWithoutSignal'
  | 'notArrayLiteral'
  | 'moveInsideEffect';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  additionalHooks?: string | undefined;
  unsafeAutofix?: boolean;
  experimental_autoDependenciesHooks?: Array<string>;
  requireExplicitEffectDeps?: boolean;
  enableAutoFixForMemoAndCallback?: boolean;
  performance?: PerformanceBudget;
  severity?: Severity;
  suffix?: string;
};

type Options = [Option?];

type DeclaredDependency = { key: string; node: TSESTree.Node };

type DependencyTreeNode = {
  isUsed: boolean;
  isSatisfiedRecursively: boolean;
  isSubtreeUsed: boolean;
  children: Map<string, DependencyTreeNode>;
};

type Dependency = {
  node:
    | TSESTree.Node
    | TSESTree.Expression
    | TSESTree.Super
    | TSESTree.Identifier
    | TSESTree.MemberExpression;
  references: Array<Reference>;
  hasReads: boolean;
  isStable: boolean;
  hasInnerScopeComputedProperty?: boolean | undefined;
  isComputedAssignmentOnly?: boolean | undefined;
  // Observed formatted variants of this dependency path based on actual code usage optional chaining
  observedFormatted?: Set<string>;
};

function getObservedFormatted(
  depKey: string,
  optionalChains: Map<string, boolean>,
  dependencies: Map<string, Dependency>
): string {
  const dep = dependencies.get(depKey);

  if (typeof dep !== 'undefined' && dep.observedFormatted && dep.observedFormatted.size > 0) {
    // Prefer the shortest formatted variant (fewer optionals are usually shorter)
    let best: string | null = null;

    dep.observedFormatted.forEach((v: string): void => {
      if (best === null || v.length < best.length) {
        best = v;
      }
    });

    if (typeof best === 'string') {
      return best;
    }
  }

  return formatDependency(depKey, optionalChains);
}

function projectOptionalChains(
  path: string,
  optionalChains: Map<string, boolean>
): Map<string, boolean> {
  const projected = new Map<string, boolean>();

  const members = path.split('.');

  let soFar = '';

  for (let i = 0; i < members.length; i++) {
    soFar =
      i === 0 && typeof members[0] === 'string'
        ? members[0]
        : // eslint-disable-next-line security/detect-object-injection
          `${soFar}.${members[i]}`;

    const val = optionalChains.get(soFar);

    if (typeof val !== 'undefined') {
      projected.set(soFar, val);
    }
  }

  return projected;
}

function memoizeWithWeakMap(
  fn: (resolved: Variable, componentScope: Scope | null, pureScopes: Set<Scope>) => boolean,
  map: WeakMap<Variable, boolean>
): (arg: Variable, componentScope: Scope | null, pureScopes: Set<Scope>) => boolean {
  return (arg: Variable, componentScope: Scope | null, pureScopes: Set<Scope>): boolean => {
    if (map.has(arg)) {
      return map.get(arg) ?? false;
    }

    const result = fn(arg, componentScope, pureScopes);

    map.set(arg, result);

    return result;
  };
}

function isUseEffectEventIdentifier(
  node: TSESTree.Node | TSESTree.Identifier,
  perfKey: string
): boolean {
  trackOperation(perfKey, PerformanceOperations.hookCheck);

  if (node.type !== AST_NODE_TYPES.Identifier) {
    return false;
  }

  const { name } = node;

  return name === 'useEffectEvent' || name === 'experimental_useEffectEvent';
}

function isSignalIdentifier(node: TSESTree.Node | TSESTree.Identifier, perfKey: string): boolean {
  trackOperation(perfKey, PerformanceOperations.signalCheck);

  // Match bare identifiers: signal, computed, effect
  if (node.type === AST_NODE_TYPES.Identifier) {
    const { name } = node;

    return ['signal', 'computed', 'effect'].includes(name);
  }

  // Match namespaced creators: e.g., signals.signal(), ReactSignals.computed(), etc.
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    return ['signal', 'computed', 'effect'].includes(node.property.name);
  }

  return false;
}

const suffixByPerfKey = new Map<string, RegExp>();

function isSignalVariable(node: TSESTree.Node | Pattern, perfKey: string): boolean {
  trackOperation(perfKey, PerformanceOperations.signalCheck);

  if (node.type !== AST_NODE_TYPES.Identifier) {
    return false;
  }

  const suffixRegex = suffixByPerfKey.get(perfKey) ?? buildSuffixRegex('Signal');

  return hasSignalSuffix(node.name, suffixRegex);
}

function isSignalDependency(dependency: string, perfKey: string): boolean {
  trackOperation(perfKey, PerformanceOperations.signalCheck);

  const suffixRegex = suffixByPerfKey.get(perfKey) ?? buildSuffixRegex('Signal');

  // Treat names ending with the configured suffix as signals.
  // Handle both full path and the base identifier before the first '.'.
  if (hasSignalSuffix(dependency, suffixRegex)) {
    return true;
  }

  const base = dependency.split('.')[0] ?? '';

  return base !== '' && hasSignalSuffix(base, suffixRegex);
}

function isSignalValueAccess(
  node: TSESTree.Node | TSESTree.Identifier,
  context: Readonly<RuleContext<MessageIds, Options>>
): boolean {
  // Check if this is a direct signal.value access
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'value' &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    hasSignalSuffix(
      node.object.name,
      buildSuffixRegex(
        typeof context.options[0]?.suffix === 'string' && context.options[0].suffix.length > 0
          ? context.options[0].suffix
          : 'Signal'
      )
    )
  ) {
    const ancestors = context.sourceCode.getAncestors(node);

    const parent: TSESTree.Node | undefined = ancestors[ancestors.length - 1];

    // Check if this is part of an assignment operation (like countSignal.value++)
    if (typeof parent !== 'undefined') {
      if (
        parent.type === AST_NODE_TYPES.UpdateExpression ||
        (parent.type === AST_NODE_TYPES.AssignmentExpression &&
          ['=', '+=', '-=', '*=', '/=', '%='].includes(parent.operator))
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function isNodeLike(val: unknown): val is TSESTree.Node {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    'type' in val &&
    typeof val.type === 'string'
  );
}

function isSameIdentifier(
  a:
    | TSESTree.Node
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  b: TSESTree.Node | TSESTree.Identifier
): boolean {
  return (
    (a.type === AST_NODE_TYPES.Identifier || a.type === AST_NODE_TYPES.JSXIdentifier) &&
    a.type === b.type &&
    a.name === b.name &&
    // !!a.range &&
    // !!b.range &&
    a.range[0] === b.range[0] &&
    a.range[1] === b.range[1]
  );
}

function isAncestorNodeOf(
  a:
    | TSESTree.Node
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  b: TSESTree.Node | TSESTree.Identifier
): boolean {
  return /* !!a.range && !!b.range && */ a.range[0] <= b.range[0] && a.range[1] >= b.range[1];
}

function fastFindReferenceWithParent(
  start:
    | TSESTree.Node
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  target: TSESTree.Node | TSESTree.Identifier
):
  | TSESTree.Node
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | null {
  const queue = [start];

  let item:
    | TSESTree.Node
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration
    | undefined;

  while (queue.length) {
    item = queue.shift();

    if (!item) {
      continue;
    }

    if (isSameIdentifier(item, target)) {
      return item;
    }

    if (!isAncestorNodeOf(item, target)) {
      continue;
    }

    for (const key in item) {
      if (key === 'parent') {
        continue;
      }

      const value = item[key as keyof typeof item];

      if (isNodeLike(value) && isNodeLike(item)) {
        value.parent = item;

        queue.push(value);
      } else if (Array.isArray(value) && isNodeLike(item)) {
        for (const val of value) {
          if (isNodeLike(val)) {
            val.parent = item;

            queue.push(val);
          }
        }
      }
    }
  }

  return null;
}

function analyzePropertyChain(
  node:
    | TSESTree.Node
    | TSESTree.Identifier
    | TSESTree.Expression
    | TSESTree.Super
    | TSESTree.PrivateIdentifier,
  optionalChains: Map<string, boolean> | null,
  context: Readonly<RuleContext<MessageIds, Options>>,
  perfKey: string
): string {
  try {
    trackOperation(perfKey, PerformanceOperations.nodeProcessing);

    if (node.type === AST_NODE_TYPES.Identifier || node.type === AST_NODE_TYPES.JSXIdentifier) {
      const result = node.name;

      if (optionalChains) {
        optionalChains.set(result, false);
      }

      return result;
    }

    if (node.type === AST_NODE_TYPES.MemberExpression) {
      if (!node.computed) {
        // If this member expression is a method call (e.g., obj.method(...)),
        // we should NOT include the method name itself in the dependency path.
        // Only the object (`obj`) should be tracked as the dependency.
        // Example: matrixSignal.value[rowIndex]?.reduce(...) -> track up to matrixSignal.value[rowIndex]
        const isCalleeMethodCall =
          typeof node.parent !== 'undefined' &&
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          node.parent.callee === node;

        const objectPath = analyzePropertyChain(node.object, optionalChains, context, perfKey);

        if (isCalleeMethodCall) {
          markNode(node, optionalChains, objectPath, perfKey);

          return objectPath;
        }

        const result = `${objectPath}.${analyzePropertyChain(
          node.property,
          null,
          context,
          perfKey
        )}`;

        markNode(node, optionalChains, result, perfKey);

        return result;
      }

      const object = analyzePropertyChain(node.object, optionalChains, context, perfKey);

      let computedResult: string | undefined;

      // Handle different types of computed properties
      if (
        node.property.type === AST_NODE_TYPES.Literal &&
        typeof node.property.value === 'string'
      ) {
        computedResult = node.property.value;
      } else if (
        node.property.type === AST_NODE_TYPES.TemplateLiteral &&
        node.property.quasis.length === 1
      ) {
        computedResult =
          node.property.quasis[0]?.value.cooked ?? node.property.quasis[0]?.value.raw;
      } else {
        return context.sourceCode.getText(node);
      }
      // Handle computed property access result
      const result = `${object}[${computedResult}]`;

      markNode(node, optionalChains, result, perfKey);

      return result;
    }

    const fallback = context.sourceCode.getText(node);

    return fallback;
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      trackOperation(perfKey, PerformanceOperations.analyzePropertyChainFailed);

      return error instanceof Error ? error.message : JSON.stringify(error);
    }

    throw error;
  }
}

function formatDependency(path: string, optionalChains: Map<string, boolean>): string {
  // eslint-disable-next-line optimize-regex/optimize-regex
  path = path.replace(/\[\*\]/g, '');

  const members = path.split('.');

  let finalPath = '';

  for (let i = 0; i < members.length; i++) {
    if (i !== 0) {
      const pathSoFar = members.slice(0, i + 1).join('.');

      const isOptional = optionalChains.get(pathSoFar) === true;

      finalPath += isOptional ? '?.' : '.';
    }

    // eslint-disable-next-line security/detect-object-injection
    finalPath += members[i];
  }

  return finalPath;
}

// Returns true if every computed segment in a dependency path is a numeric literal index, e.g.,
// "arr[0]", "matrix[1].x", "a[2][3]". Dynamic indices (identifiers/expressions) return false.
function hasOnlyNumericComputed(path: string): boolean {
  // Quick reject
  if (!path.includes('[')) {
    return false;
  }

  // Match all bracketed segments
  // eslint-disable-next-line optimize-regex/optimize-regex
  const matches = path.match(/\[[^\]]+\]/g);

  if (!matches || matches.length === 0) {
    return false;
  }

  // All segments must be strictly digits
  return matches.every((seg: string): boolean => {
    // eslint-disable-next-line optimize-regex/optimize-regex
    return /^\[(?:\d+)\]$/.test(seg);
  });
}

function joinEnglish(arr: Array<string>): string {
  let s = '';

  for (let i = 0; i < arr.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    s += arr[i];

    if (i === 0 && arr.length === 2) {
      s += ' and ';
    } else if (i === arr.length - 2 && arr.length > 2) {
      s += ', and ';
    } else if (i < arr.length - 1) {
      s += ', ';
    }
  }

  return s;
}

function scanTreeRecursively(
  node: DependencyTreeNode,
  missingPaths: Set<string>,
  satisfyingPaths: Set<string>,
  keyToPath: (key: string) => string,
  perfKey: string
): void {
  node.children.forEach((child: DependencyTreeNode, key: string): void => {
    const path = keyToPath(key);

    const isSignalPath = isSignalDependency(path, perfKey) || isSignalDependency(key, perfKey);

    const hasValueAccess = path.endsWith('.value') || key.endsWith('.value');

    const isAnySignalType = isSignalPath || hasValueAccess;

    if (child.isSatisfiedRecursively) {
      if (child.isSubtreeUsed || child.isUsed) {
        satisfyingPaths.add(path);
      }

      if (isAnySignalType) {
        return;
      }
    } else if (
      child.isUsed ||
      (isAnySignalType && child.isSubtreeUsed) ||
      (!isAnySignalType && child.isSubtreeUsed && child.children.size === 0)
    ) {
      // If a root signal base is missing but its .value is used, prefer not to add the base
      if (!path.includes('.') && isSignalDependency(path, perfKey)) {
        const valueChild = child.children.get('value');
        if (valueChild && (valueChild.isUsed || valueChild.isSubtreeUsed)) {
          return;
        }
      }

      missingPaths.add(path);

      return;
    }

    scanTreeRecursively(
      child,
      missingPaths,
      satisfyingPaths,
      (childKey: string): string => `${path}.${childKey}`,
      perfKey
    );
  });
}

function getWarningMessage(
  deps: Set<string>,
  singlePrefix: string,
  label: string,
  fixVerb: string,
  optionalChains: Map<string, boolean>,
  dependencies: Map<string, Dependency>
): string | null {
  if (deps.size === 0) {
    return null;
  }

  return `${
    (deps.size > 1 ? '' : `${singlePrefix} `) + label
  } ${deps.size > 1 ? 'dependencies' : 'dependency'}: ${joinEnglish(
    Array.from(deps)
      .sort()
      .map((name: string): string => {
        return `'${getObservedFormatted(name, optionalChains, dependencies)}'`;
      })
  )}. Either ${fixVerb} ${deps.size > 1 ? 'them' : 'it'} or remove the dependency array.`;
}

function collectRecommendations({
  dependencies,
  declaredDependencies,
  stableDependencies,
  externalDependencies,
  isEffect,
  reactiveHookName,
  context,
  perfKey,
}: {
  dependencies: Map<string, Dependency>;
  declaredDependencies: Array<DeclaredDependency>;
  stableDependencies: Set<string>;
  externalDependencies: Set<string>;
  isEffect: boolean;
  reactiveHookName: string;
  context: TSESLint.RuleContext<MessageIds, Options>;
  perfKey: string;
}): {
  suggestedDependencies: Array<string>;
  unnecessaryDependencies: Set<string>;
  duplicateDependencies: Set<string>;
  missingDependencies: Set<string>;
} {
  const depTree = createDepTree();

  function createDepTree(): DependencyTreeNode {
    return {
      isUsed: false,
      isSatisfiedRecursively: false,
      isSubtreeUsed: false,
      children: new Map(),
    };
  }

  dependencies.forEach(({ isStable, references }: Dependency, key: string): void => {
    if (isStable) {
      stableDependencies.add(key);
    }

    for (const reference of references) {
      if (reference.writeExpr) {
        const staleAssignments = new Set<string>();

        staleAssignments.add(key);

        if (getSeverity('useEffectEventInDependencyArray', context.options[0]) !== 'off') {
          context.report({
            node: reference.writeExpr ?? reference.identifier,
            data: {
              eventName: key,
              hookName: reactiveHookName,
            },
            messageId: 'useEffectEventInDependencyArray',
            suggest: [
              {
                messageId: 'removeDependency',
                data: { dependency: key },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const [start, end] = reference.identifier.range;

                  return fixer.removeRange([start, end + 1]);
                },
              },
            ],
          });
        }
      }
    }
  });

  dependencies.forEach((_, key: string): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (isSignalDependency(signalName, perfKey)) {
        externalDependencies.delete(signalName);

        externalDependencies.delete(key);
      }
    } else if (key.includes('.value[')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (isSignalDependency(signalName, perfKey)) {
          externalDependencies.delete(signalName);

          externalDependencies.delete(key);
        }
      }
    } else if (isSignalDependency(key, perfKey)) {
      externalDependencies.delete(key);
    }
  });

  dependencies.forEach((_, key): void => {
    if (isSignalDependency(key, perfKey)) {
      return;
    }

    // Skip dynamic computed members only when the base is a signal.
    // Always allow static numeric indices like arr[0]. For non-signal bases, allow dynamic too.
    if (key.includes('[') && key.includes(']') && !hasOnlyNumericComputed(key)) {
      const base = key.split('.')[0] ?? '';
      if (base !== '' && isSignalDependency(base, perfKey)) {
        return;
      }
    }

    const parts = key.split('.');

    if (parts.length > 2 && parts[1] === 'value') {
      const signalName = parts[0];

      if (typeof signalName === 'undefined') {
        return;
      }

      if (!isSignalDependency(signalName, perfKey)) {
        return;
      }

      const dependency = dependencies.get(key);

      const isAssignmentOnly = dependency && dependency.hasReads === false;

      const hasInnerScopeComputedProperty =
        dependency && dependency.hasInnerScopeComputedProperty === true;

      if (
        !declaredDependencies.some(
          ({ key: depKey }: DeclaredDependency): boolean => depKey === `${signalName}.value`
        ) &&
        (isAssignmentOnly === true || hasInnerScopeComputedProperty === true)
      ) {
        dependencies.delete(key);
      }
    }
  });

  dependencies.forEach((_, key): void => {
    getOrCreateNodeByPath(depTree, key).isUsed = true;

    markAllParentsByPath(depTree, key, (parent): void => {
      parent.isSubtreeUsed = true;
    });
  });

  for (const { key } of declaredDependencies) {
    // Do not normalize optional chaining here; tree splitting handles both '.' and '?.'
    getOrCreateNodeByPath(depTree, key).isSatisfiedRecursively = true;
    // Also mark all parents as satisfied to avoid reporting intermediate segments as missing
    markAllParentsByPath(depTree, key, (parent): void => {
      parent.isSatisfiedRecursively = true;
    });
  }

  for (const key of stableDependencies) {
    getOrCreateNodeByPath(depTree, key).isSatisfiedRecursively = true;
  }

  function getOrCreateNodeByPath(rootNode: DependencyTreeNode, path: string): DependencyTreeNode {
    const keys = splitPathMembers(path);

    let node = rootNode;

    for (const key of keys) {
      let child = node.children.get(key);

      if (!child) {
        child = createDepTree();

        node.children.set(key, child);
      }

      node = child;
    }
    return node;
  }

  function markAllParentsByPath(
    rootNode: DependencyTreeNode,
    path: string,
    fn: (node: DependencyTreeNode) => void
  ): void {
    const keys = splitPathMembers(path);

    let node = rootNode;

    for (const key of keys) {
      const child = node.children.get(key);

      if (!child) {
        return;
      }

      fn(child);

      node = child;
    }
  }

  const importedSignals = new Set<string>();

  dependencies.forEach((_, key): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (isSignalDependency(signalName, perfKey)) {
        importedSignals.add(key);

        externalDependencies.delete(signalName);

        externalDependencies.delete(key);
      }
    } else if (key.includes('.value[')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (isSignalDependency(signalName, perfKey)) {
          importedSignals.add(key);

          externalDependencies.delete(signalName);

          externalDependencies.delete(key);
        }
      }
    } else if (isSignalDependency(key, perfKey)) {
      const valueKey = `${key}.value`;

      const isBaseValueDeclared = declaredDependencies.some(
        ({ key: depKey }: DeclaredDependency): boolean => {
          return depKey === valueKey;
        }
      );

      const dependency = dependencies.get(valueKey);

      const isAssignmentOnly = dependency && dependency.hasReads === false;

      const hasInnerScopeComputedProperty =
        dependency && dependency.hasInnerScopeComputedProperty === true;

      if (
        !isBaseValueDeclared &&
        (isAssignmentOnly === true || hasInnerScopeComputedProperty === true)
      ) {
        dependencies.delete(valueKey);
      }

      const node = getOrCreateNodeByPath(depTree, key);

      node.isSatisfiedRecursively = true;

      externalDependencies.delete(key);
    }
  });

  dependencies.forEach((_, key): void => {
    if (isSignalDependency(key, perfKey)) {
      return;
    }
    // Skip dynamic computed members only when the base is a signal.
    // Always allow static numeric indices like arr[0]. For non-signal bases, allow dynamic too.
    if (key.includes('[') && key.includes(']') && !hasOnlyNumericComputed(key)) {
      const base = key.split('.')[0] ?? '';
      if (base !== '' && isSignalDependency(base, perfKey)) {
        return;
      }
    }
    const parts = key.split('.');

    if (parts.length > 2 && parts[1] === 'value') {
      const signalName = parts[0];

      if (typeof signalName !== 'string') {
        return;
      }

      if (!isSignalDependency(signalName, perfKey)) {
        return;
      }

      const baseValueKey = `${signalName}.value`;

      const isBaseValueDeclared = declaredDependencies.some(
        ({ key: depKey }: DeclaredDependency): boolean => {
          return depKey === baseValueKey;
        }
      );

      const dependency = dependencies.get(key);

      const isAssignmentOnly = dependency && dependency.hasReads === false;

      const hasInnerScopeComputedProperty =
        dependency && dependency.hasInnerScopeComputedProperty === true;

      if (
        !isBaseValueDeclared &&
        (isAssignmentOnly === true || hasInnerScopeComputedProperty === true)
      ) {
        dependencies.delete(key);
      }
    }
  });

  const missingDependencies = new Set<string>();

  const satisfyingDependencies = new Set<string>();

  dependencies.forEach((_, key): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (isSignalDependency(signalName, perfKey)) {
        const node = getOrCreateNodeByPath(depTree, signalName);

        node.isSatisfiedRecursively = true;

        externalDependencies.delete(signalName);

        externalDependencies.delete(key);
      }
    } else if (key.includes('.value[')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (isSignalDependency(signalName, perfKey)) {
          const node = getOrCreateNodeByPath(depTree, signalName);

          node.isSatisfiedRecursively = true;

          externalDependencies.delete(signalName);

          externalDependencies.delete(key);
        }
      }
    } else if (isSignalDependency(key, perfKey)) {
      const node = getOrCreateNodeByPath(depTree, key);

      node.isSatisfiedRecursively = true;

      externalDependencies.delete(key);
    }
  });

  dependencies.forEach((_, key): void => {
    if (!isSignalDependency(key, perfKey)) {
      if (key.includes('[') && key.includes(']')) {
        return;
      }
      const parts = key.split('.');

      if (parts.length > 2 && parts[1] === 'value') {
        const signalName = parts[0];

        if (typeof signalName !== 'string') {
          return;
        }

        if (!isSignalDependency(signalName, perfKey)) {
          return;
        }

        const baseValueKey = `${signalName}.value`;

        const isBaseValueDeclared = declaredDependencies.some(
          ({ key: depKey }: DeclaredDependency): boolean => {
            return depKey === baseValueKey;
          }
        );

        const dependency = dependencies.get(key);

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;

        if (
          !isBaseValueDeclared &&
          (isAssignmentOnly === true || hasInnerScopeComputedProperty === true)
        ) {
          dependencies.delete(key);
        }
      }
    }
  });

  const declaredSignals = new Set<string>();

  declaredDependencies.forEach(({ key }: { key: string }): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (isSignalDependency(signalName, perfKey)) {
        declaredSignals.add(signalName);
      }
    } else if (key.includes('.value[')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (isSignalDependency(signalName, perfKey)) {
          declaredSignals.add(signalName);
        }
      }
    } else if (isSignalDependency(key, perfKey)) {
      declaredSignals.add(key);
    }
  });

  importedSignals.forEach((signal: string): void => {
    if (signal.includes('.value[')) {
      const isComputedPropertyDeclared = declaredDependencies.some(
        ({ key: depKey }: DeclaredDependency): boolean => {
          return depKey === signal;
        }
      );

      if (!isComputedPropertyDeclared) {
        const dependency = dependencies.get(signal);

        // const hasInnerScopeComputedProperty =
        //   dependency && dependency.hasInnerScopeComputedProperty === true;
        const isAssignmentOnly = dependency && dependency.hasReads === false;

        // If it's a read, require it even if it involves inner-scope computed property
        if (isAssignmentOnly !== true) {
          missingDependencies.add(signal);
        }

        const valueIndex = signal.indexOf('.value[');

        if (valueIndex !== -1) {
          const signalName = signal.slice(0, valueIndex);

          if (!isSignalDependency(signalName, perfKey)) {
            return;
          }

          const valueNode = getOrCreateNodeByPath(depTree, signalName);

          valueNode.isUsed = true;

          valueNode.isSubtreeUsed = true;

          if (signal.includes('.', valueIndex + 7)) {
            const baseSignalSatisfied = getOrCreateNodeByPath(depTree, signalName);

            baseSignalSatisfied.isSatisfiedRecursively = true;
          }
        }
      }

      return;
    } else if (signal.endsWith('.value')) {
      const isValueDeclared = declaredDependencies.some(({ key }: { key: string }): boolean => {
        return key === signal;
      });

      if (!isValueDeclared) {
        const dependency = dependencies.get(signal);

        // const hasInnerScopeComputedProperty =
        //   dependency && dependency.hasInnerScopeComputedProperty === true;

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        // If it's a read of .value, require it regardless of inner-scope computed property
        if (isAssignmentOnly !== true) {
          missingDependencies.add(signal);
        }

        const valueNode = getOrCreateNodeByPath(depTree, signal);

        valueNode.isUsed = true;

        valueNode.isSubtreeUsed = true;
      }

      return;
    }

    const valueAccessKey = `${signal}.value`;

    const hasValueAccess = dependencies.has(valueAccessKey);

    if (hasValueAccess) {
      const isValueDeclared = declaredDependencies.some(({ key }: DeclaredDependency): boolean => {
        return key === valueAccessKey || key.startsWith(`${valueAccessKey}[`);
      });

      if (!isValueDeclared) {
        // Check if this dependency is only used for assignments
        const dependency = dependencies.get(valueAccessKey);

        // const hasInnerScopeComputedProperty =
        //   dependency && dependency.hasInnerScopeComputedProperty === true;

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        // Require base .value when it's read, even if there are inner-scope computed members
        if (isAssignmentOnly !== true) {
          missingDependencies.add(valueAccessKey);
        }

        const valueNode = getOrCreateNodeByPath(depTree, valueAccessKey);

        valueNode.isUsed = true;

        valueNode.isSubtreeUsed = true;
      }

      return;
    }

    const node = getOrCreateNodeByPath(depTree, signal);

    node.isUsed = true;

    node.isSubtreeUsed = true;

    const isDeclared =
      declaredDependencies.some(({ key }: DeclaredDependency): boolean => {
        return key === signal;
      }) || declaredSignals.has(signal);

    if (!isDeclared) {
      const dependency = dependencies.get(signal);

      const isAssignmentOnly =
        dependency &&
        (dependency.hasReads === false || dependency.isComputedAssignmentOnly === true);

      let hasAssignmentOnlyComputedMembers = false;

      let hasDeepPropertyChains = false;

      if (isSignalDependency(signal, perfKey)) {
        const deepPropertyChains = Array.from(dependencies.keys()).filter(
          (key: string): boolean => {
            return key.startsWith(`${signal}.value[`) && key.includes('.neighbors.');
          }
        );

        hasDeepPropertyChains = deepPropertyChains.length > 0;

        const computedMembers = Array.from(dependencies.keys()).filter((key: string): boolean => {
          return key.startsWith(`${signal}.value[`);
        });

        hasAssignmentOnlyComputedMembers = computedMembers.every((key: string): boolean => {
          const dep = dependencies.get(key);

          return typeof dep !== 'undefined' && dep.hasReads === false;
        });
      }

      if (
        isAssignmentOnly !== true &&
        hasAssignmentOnlyComputedMembers !== true &&
        !hasDeepPropertyChains
      ) {
        missingDependencies.add(signal);
      }
    }
  });

  dependencies.forEach((depInfo: Dependency, index: string): void => {
    if (index.includes('.value[') && isSignalDependency(index.split('.')[0] ?? '', perfKey)) {
      const valueIndex = index.indexOf('.value[');

      if (valueIndex !== -1) {
        const isComputedPropertyDeclared = declaredDependencies.some(
          ({ key }: DeclaredDependency): boolean => key === index
        );

        if (
          !isComputedPropertyDeclared &&
          depInfo.hasInnerScopeComputedProperty !== true &&
          depInfo.hasReads !== false
        ) {
          missingDependencies.add(index);
        }
      }
    }
  });

  const depDump = Array.from(dependencies.entries()).map(
    ([k, v]: [string, Dependency]): {
      key: string;
      hasReads: boolean;
      isStable: boolean;
      isSignal: boolean;
    } => {
      return {
        key: k,
        hasReads: v.hasReads === true,
        isStable: v.isStable === true,
        isSignal: isSignalDependency(k, perfKey),
      };
    }
  );

  const bases = new Set<string>(
    depDump
      .map(
        (d: {
          key: string;
          hasReads: boolean;
          isStable: boolean;
          isSignal: boolean;
        }): string | undefined => {
          return d.key.split('.')[0];
        }
      )
      .filter(Boolean)
  );

  const treeDump: Record<string, Array<string>> = {};

  bases.forEach((b: string): void => {
    const node = getOrCreateNodeByPath(depTree, b);

    // eslint-disable-next-line security/detect-object-injection
    treeDump[b] = Array.from(node.children.keys());
  });

  scanTreeRecursively(
    depTree,
    missingDependencies,
    satisfyingDependencies,
    (key: string): string => {
      return key;
    },
    perfKey
  );

  // Drop false positives: if a missing path is already declared (optionals treated as equal)
  if (missingDependencies.size > 0 && declaredDependencies.length > 0) {
    for (const m of Array.from(missingDependencies)) {
      if (declaredDependencies.some(({ key }): boolean => pathsEquivalent(key, m))) {
        missingDependencies.delete(m);
      }
    }
  }

  // Prune missing dependencies that are unsafe to suggest:
  // - dynamic/computed indexing (e.g., foo.value[bar])
  // - dependencies marked with hasInnerScopeComputedProperty
  {
    const toRemove: Array<string> = [];
    missingDependencies.forEach((m: string): void => {
      // Keep static numeric indices like arr[0]. For dynamic indices, only drop when base is a signal.
      if (m.includes('[') && !hasOnlyNumericComputed(m)) {
        const base = m.split('.')[0] ?? '';

        if (base !== '' && isSignalDependency(base, perfKey)) {
          toRemove.push(m);

          return;
        }
      }

      const dep = dependencies.get(m);

      if (dep && dep.hasInnerScopeComputedProperty === true) {
        const base = m.split('.')[0];

        if (typeof base === 'string' && base !== '' && isSignalDependency(base, perfKey)) {
          toRemove.push(m);
        }
      }
    });
    for (const m of toRemove) {
      missingDependencies.delete(m);
    }
  }

  // Accumulators for dependency recommendations
  const suggestedDependencies: Array<string> = [];
  const addedPaths = new Set<string>();
  const addedRootPaths = new Set<string>();

  for (const base of Array.from(missingDependencies)) {
    if (!base.includes('.') && !isSignalDependency(base, perfKey)) {
      const hasDeeperMissing = Array.from(missingDependencies).some((d: string): boolean => {
        return d.startsWith(`${base}.`);
      });

      const hasAnyDeclaredDeeper = declaredDependencies.some(
        ({ key }: DeclaredDependency): boolean => {
          return key.startsWith(`${base}.`);
        }
      );

      if (hasDeeperMissing || hasAnyDeclaredDeeper) {
        const hasExistingDeepMissing = Array.from(missingDependencies).some(
          (m: string): boolean => {
            return m.startsWith(`${base}.`);
          }
        );

        if (!hasExistingDeepMissing) {
          const deepReadKeys: Array<string> = [];

          dependencies.forEach((depInfo: Dependency, depKey: string): void => {
            if (
              depKey.startsWith(`${base}.`) &&
              depInfo.hasReads === true &&
              depInfo.hasInnerScopeComputedProperty !== true &&
              // allow static numeric indices like base[0].x; for dynamic, allow if base is not a signal
              !(
                depKey.includes('[') &&
                !hasOnlyNumericComputed(depKey) &&
                (() => {
                  const root = depKey.split('.')[0];

                  return (
                    typeof root === 'string' && root !== '' && isSignalDependency(root, perfKey)
                  );
                })()
              )
            ) {
              deepReadKeys.push(depKey);
            }
          });

          for (const dk of deepReadKeys) {
            if (!addedPaths.has(dk) && !addedRootPaths.has(dk)) {
              suggestedDependencies.push(dk);

              addedPaths.add(dk);

              const dkRoot = dk.split('.')[0];

              if (dk.includes('.') && typeof dkRoot === 'string' && dkRoot !== '') {
                addedRootPaths.add(dkRoot);
              }
            }
          }
        }

        missingDependencies.delete(base);
      }
    }
  }

  /* suggestedDependencies declared above */
  const unnecessaryDependencies = new Set<string>();
  const duplicateDependencies = new Set<string>();
  const incompleteDependencies = new Set<string>();
  const redundantDependencies = new Set<string>();

  const declaredDepsMap = new Map<string, boolean>();

  declaredDependencies.forEach(({ key }: { key: string }): void => {
    declaredDepsMap.set(key, true);
  });

  for (const { key } of declaredDependencies) {
    if (!isSignalDependency(key, perfKey) && key.includes('.')) {
      const baseKey = key.replace(/\?\./g, '.');

      const depInfo = dependencies.get(baseKey);
      const node = getOrCreateNodeByPath(depTree, baseKey);

      const isUsed =
        (typeof depInfo !== 'undefined' && depInfo.hasReads) || node.isUsed || node.isSubtreeUsed;

      if (isUsed) {
        satisfyingDependencies.add(key);
        // Also satisfy the base key used internally by the dep tree so it doesn't get marked missing
        satisfyingDependencies.add(baseKey);
      }
    }
  }

  declaredDependencies.forEach(({ key }: { key: string }): void => {
    if (isSignalDependency(key, perfKey) && !key.includes('.')) {
      const valueKey = `${key}.value`;

      if (missingDependencies.has(valueKey)) {
        incompleteDependencies.add(key);

        satisfyingDependencies.delete(key);
      } else if (declaredDepsMap.has(valueKey)) {
        redundantDependencies.add(key);

        satisfyingDependencies.delete(key);
      }
    }

    if (key.includes('.value[') && isSignalDependency(key.split('.')[0] ?? '', perfKey)) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const closingBracket = key.indexOf(']', valueIndex);

        if (closingBracket !== -1) {
          const baseComputedExpression = key.slice(0, closingBracket + 1);

          if (declaredDepsMap.has(baseComputedExpression) && baseComputedExpression !== key) {
            const isDeepPropertyChain =
              key.length > baseComputedExpression.length && key.charAt(closingBracket + 1) === '.';

            if (isDeepPropertyChain) {
              const hasOtherDeepPropertyChains = Array.from(declaredDepsMap.keys()).some(
                (declaredKey: string): boolean => {
                  return (
                    declaredKey.startsWith(baseComputedExpression) &&
                    declaredKey !== baseComputedExpression &&
                    declaredKey !== key
                  );
                }
              );

              if (hasOtherDeepPropertyChains) {
                // Only mark as redundant if the base computed expression is not directly read
                const baseDependency = dependencies.get(baseComputedExpression);

                const isDirectlyUsed = baseDependency && baseDependency.hasReads === true;
                if (isDirectlyUsed !== true) {
                  redundantDependencies.add(baseComputedExpression);

                  satisfyingDependencies.delete(baseComputedExpression);
                }
              }
            }
          }
        }
      }
    }

    if (!key.includes('.') && !isSignalDependency(key, perfKey)) {
      const hasDeepPropertyUsage = Array.from(missingDependencies).some((dep: string): boolean => {
        return dep.startsWith(`${key}.`) && dep !== key;
      });

      if (hasDeepPropertyUsage) {
        // If the base is directly used (e.g., in guards like `if (x == null || x === 'loading') return ...`),
        // allow listing the base dependency without requiring deep property chains.
        const baseDependency = dependencies.get(key);

        if ((typeof baseDependency !== 'undefined' && baseDependency.hasReads === true) !== true) {
          incompleteDependencies.add(key);

          satisfyingDependencies.delete(key);
        }
      } else if (
        Array.from(declaredDepsMap.keys()).some((declaredKey: string): boolean => {
          return declaredKey.startsWith(`${key}.`) && declaredKey !== key;
        })
      ) {
        // Check if the base dependency is directly used (not just through deeper properties)
        const baseDependency = dependencies.get(key);

        if (!(typeof baseDependency !== 'undefined' && baseDependency.hasReads === true)) {
          redundantDependencies.add(key);
          satisfyingDependencies.delete(key);
        }
      }
    }
  });

  declaredDependencies.forEach(({ key }: { key: string }): void => {
    if (satisfyingDependencies.has(key)) {
      if (suggestedDependencies.includes(key)) {
        duplicateDependencies.add(key);
      } else {
        suggestedDependencies.push(key);
      }

      return;
    }

    const isSignalDep = isSignalDependency(key, perfKey) || key.endsWith('.value');

    const dependency = dependencies.get(key);

    const isAssignmentOnly = isSignalDep && dependency && dependency.hasReads === false;

    if (isAssignmentOnly === true) {
      unnecessaryDependencies.add(key);
    } else if (incompleteDependencies.has(key) || redundantDependencies.has(key)) {
      unnecessaryDependencies.add(key);
    } else if (
      (isEffect && !key.endsWith('.current') && !externalDependencies.has(key)) ||
      isSignalDep ||
      (!isEffect && !externalDependencies.has(key))
    ) {
      if (!suggestedDependencies.includes(key)) {
        suggestedDependencies.push(key);
      }
    } else {
      unnecessaryDependencies.add(key);
    }
  });

  if (missingDependencies.size > 0) {
    const toDelete: Array<string> = [];

    missingDependencies.forEach((m: string): void => {
      if (!m.includes('.')) {
        return;
      }

      const base = m.split('.')[0] ?? '';

      if (base === '' || isSignalDependency(base, perfKey)) {
        return;
      }

      const baseDep = dependencies.get(base);

      const isBaseDeclared = declaredDepsMap.has(base);

      if (isBaseDeclared && baseDep && baseDep.hasReads === true) {
        toDelete.push(m);

        satisfyingDependencies.add(base);

        incompleteDependencies.delete(base);
      }
    });

    for (const m of toDelete) {
      missingDependencies.delete(m);
    }
  }

  const missingDepsArray = Array.from(missingDependencies);

  missingDepsArray.sort((a: string, b: string): number => {
    return b.length - a.length;
  });

  const baseMissing = Array.from(missingDependencies).filter((m: string): boolean => {
    return !m.includes('.') && !isSignalDependency(m, perfKey);
  });

  if (baseMissing.length > 0) {
    // Helper to collect leaf usage from dep tree
    const collectUsedLeaves = (
      node: DependencyTreeNode,
      path: string,
      acc: Array<{ path: string; isUsed: boolean; isSubtreeUsed: boolean }>
    ): void => {
      if (node.children.size === 0) {
        acc.push({
          path,
          isUsed: node.isUsed === true,
          isSubtreeUsed: node.isSubtreeUsed === true,
        });
        return;
      }
      node.children.forEach((child: DependencyTreeNode, key: string): void => {
        collectUsedLeaves(child, `${path}.${key}`, acc);
      });
    };

    for (const base of baseMissing) {
      const deepReads: Array<string> = [];

      dependencies.forEach((dep: Dependency, key: string): void => {
        if (key.startsWith(`${base}.`) && dep.hasReads === true) deepReads.push(key);
      });

      const leafUsage: Array<{
        path: string;
        isUsed: boolean;
        isSubtreeUsed: boolean;
      }> = [];

      const baseNode = getOrCreateNodeByPath(depTree, base);

      baseNode.children.forEach((child, key) => {
        collectUsedLeaves(child, `${base}.${key}`, leafUsage);
      });
    }
  }

  for (const key of missingDepsArray) {
    const rootPath = key.split('.')[0];

    const isChildPath = key.includes('.');

    if (
      !isSignalDependency(key, perfKey) &&
      !key.endsWith('.value') &&
      !isChildPath &&
      declaredDependencies.some(({ key: depKey }: DeclaredDependency): boolean => {
        return depKey.startsWith(`${key}.`);
      }) &&
      missingDepsArray.some((dep: string): boolean => {
        return dep.startsWith(`${key}.`);
      })
    ) {
      const hasExistingDeepMissing = missingDepsArray.some((m: string): boolean => {
        return m.startsWith(`${key}.`);
      });

      if (!hasExistingDeepMissing) {
        const deepReadKeys: Array<string> = [];

        dependencies.forEach((depInfo: Dependency, depKey: string): void => {
          if (depKey.startsWith(`${key}.`) && depInfo.hasReads === true) {
            deepReadKeys.push(depKey);
          }
        });

        for (const dk of deepReadKeys) {
          if (!addedPaths.has(dk) && !addedRootPaths.has(dk)) {
            suggestedDependencies.push(dk);

            addedPaths.add(dk);

            const dkRoot = dk.split('.')[0];

            if (dk.includes('.') && typeof dkRoot === 'string' && dkRoot !== '') {
              addedRootPaths.add(dkRoot);
            }
          }
        }
      }

      continue;
    }

    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (isSignalDependency(signalName, perfKey)) {
        addedRootPaths.add(signalName);

        suggestedDependencies.push(key);

        addedPaths.add(key);

        continue;
      }
    }

    // Avoid suggesting any dynamic or inner-scope-computed dependency
    const keyDep = dependencies.get(key);
    if (
      !addedPaths.has(key) &&
      !addedRootPaths.has(key) &&
      // allow static numeric indices like base[0].x; for dynamic, allow if base is not a signal
      !(
        key.includes('[') &&
        !hasOnlyNumericComputed(key) &&
        (() => {
          const root = key.split('.')[0];

          return typeof root === 'string' && root !== '' && isSignalDependency(root, perfKey);
        })()
      ) &&
      !(keyDep && keyDep.hasInnerScopeComputedProperty === true)
    ) {
      suggestedDependencies.push(key);

      addedPaths.add(key);

      if (isChildPath && typeof rootPath === 'string' && rootPath !== '') {
        addedRootPaths.add(rootPath);
      }
    }
  }

  // Normalize: replace non-signal base suggestions with deep properties if present
  {
    const toRemove = new Set<string>();

    const toAdd: Array<string> = [];

    for (const s of suggestedDependencies) {
      if (!s.includes('.') && !s.endsWith('.value') && !isSignalDependency(s, perfKey)) {
        const deepMissingDependencies = Array.from(missingDependencies).filter(
          (m: string): boolean => {
            return m.startsWith(`${s}.`);
          }
        );

        const deepReads: Array<string> = [];

        if (deepMissingDependencies.length === 0) {
          dependencies.forEach((depInfo: Dependency, depKey: string): void => {
            if (
              depKey.startsWith(`${s}.`) &&
              depInfo.hasReads === true &&
              depInfo.hasInnerScopeComputedProperty !== true &&
              // allow static numeric indices like base[0].x; for dynamic, allow if base is not a signal
              !(
                depKey.includes('[') &&
                !hasOnlyNumericComputed(depKey) &&
                (() => {
                  const root = depKey.split('.')[0];

                  return (
                    typeof root === 'string' && root !== '' && isSignalDependency(root, perfKey)
                  );
                })()
              )
            ) {
              deepReads.push(depKey);
            }
          });
        }

        const replacements =
          deepMissingDependencies.length > 0 ? deepMissingDependencies : deepReads;

        if (replacements.length > 0) {
          toRemove.add(s);

          for (const r of replacements) {
            if (!suggestedDependencies.includes(r)) {
              toAdd.push(r);
            }
          }
        }
      }
    }

    if (toRemove.size > 0 || toAdd.length > 0) {
      const filtered = suggestedDependencies.filter((s: string): boolean => {
        return !toRemove.has(s);
      });

      suggestedDependencies.length = 0;

      suggestedDependencies.push(...filtered, ...toAdd);
    }
  }

  return {
    suggestedDependencies,
    unnecessaryDependencies,
    duplicateDependencies,
    missingDependencies,
  };
}

function getConstructionExpressionType(node: TSESTree.Expression): string | null {
  switch (node.type) {
    case AST_NODE_TYPES.ObjectExpression: {
      return 'object';
    }

    case AST_NODE_TYPES.ArrayExpression: {
      return 'array';
    }

    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression: {
      return 'function';
    }

    case AST_NODE_TYPES.ClassExpression: {
      return 'class';
    }

    case AST_NODE_TYPES.ConditionalExpression: {
      if (
        getConstructionExpressionType(node.consequent) != null ||
        getConstructionExpressionType(node.alternate) != null
      ) {
        return 'conditional';
      }

      return null;
    }

    case AST_NODE_TYPES.LogicalExpression: {
      if (
        getConstructionExpressionType(node.left) != null ||
        getConstructionExpressionType(node.right) != null
      ) {
        return 'logical expression';
      }

      return null;
    }

    case AST_NODE_TYPES.JSXFragment: {
      return 'JSX fragment';
    }

    case AST_NODE_TYPES.JSXElement: {
      return 'JSX element';
    }

    case AST_NODE_TYPES.AssignmentExpression: {
      if (getConstructionExpressionType(node.right) != null) {
        return 'assignment expression';
      }

      return null;
    }

    case AST_NODE_TYPES.NewExpression: {
      return 'object construction';
    }

    case AST_NODE_TYPES.Literal: {
      if (node.value instanceof RegExp) {
        return 'regular expression';
      }

      return null;
    }

    case AST_NODE_TYPES.TSAsExpression: {
      return getConstructionExpressionType(node.expression);
    }
  }

  return null;
}

function scanForConstructions({
  declaredDependencies,
  declaredDependenciesNode,
  componentScope,
  scope,
}: {
  declaredDependencies: Array<DeclaredDependency>;
  declaredDependenciesNode: TSESTree.Node;
  componentScope: Scope | null;
  scope: Scope;
}): Array<{
  construction: Definition;
  depType: string;
  isUsedOutsideOfHook: boolean;
}> {
  const constructions = declaredDependencies
    .map(({ key }: DeclaredDependency): [Variable, string] | null => {
      const ref = componentScope?.variables.find((v: Variable): boolean => {
        return v.name === key;
      });

      if (typeof ref === 'undefined') {
        return null;
      }

      const def: Definition | undefined = ref.defs[0];

      if (typeof def === 'undefined') {
        return null;
      }

      if (
        def.type === 'Variable' &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        def.node.type === AST_NODE_TYPES.VariableDeclarator &&
        def.node.id.type === AST_NODE_TYPES.Identifier &&
        def.node.init != null
      ) {
        const constantExpressionType = getConstructionExpressionType(def.node.init);

        if (constantExpressionType !== null && constantExpressionType !== '') {
          return [ref, constantExpressionType];
        }
      }

      if (def.type === 'FunctionName' && def.node.type === AST_NODE_TYPES.FunctionDeclaration) {
        return [ref, 'function'];
      }

      if (def.type === 'ClassName' && def.node.type === AST_NODE_TYPES.ClassDeclaration) {
        return [ref, 'class'];
      }

      return null;
    })
    .filter(Boolean);

  function isUsedOutsideOfHook(ref: Variable): boolean {
    let foundWriteExpr = false;

    for (const reference of ref.references) {
      if (reference.writeExpr) {
        if (foundWriteExpr) {
          return true;
        }

        foundWriteExpr = true;

        continue;
      }

      let currentScope: Scope | null = reference.from;

      while (currentScope !== scope && currentScope != null) {
        currentScope = currentScope.upper;
      }

      if (
        currentScope !== scope &&
        !isAncestorNodeOf(declaredDependenciesNode, reference.identifier)
      ) {
        return true;
      }
    }

    return false;
  }

  return constructions
    .map(
      ([ref, depType]): {
        construction: Definition;
        depType: string;
        isUsedOutsideOfHook: boolean;
      } | null => {
        const def = ref.defs[0];

        if (typeof def === 'undefined') {
          return null;
        }

        return {
          construction: def,
          depType,
          isUsedOutsideOfHook: isUsedOutsideOfHook(ref),
        };
      }
    )
    .filter(Boolean);
}

function getDependency(
  node:
    | TSESTree.Node
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.Expression
    | TSESTree.Super,
  optionalChains: Map<string, boolean> | null = null,
  perfKey: string
): TSESTree.MemberExpression | TSESTree.Identifier | TSESTree.Node {
  try {
    trackOperation(perfKey, PerformanceOperations.dependencyCheck);

    if (node.type === AST_NODE_TYPES.MemberExpression) {
      if (
        !node.computed &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        node.property.name === 'value' &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        isSignalDependency(node.object.name, perfKey)
      ) {
        return node;
      }

      return node;
    }

    if (node.type === AST_NODE_TYPES.Identifier && isSignalVariable(node, perfKey)) {
      return node;
    }

    if (node.type === AST_NODE_TYPES.Identifier && isSignalDependency(node.name, perfKey)) {
      return node;
    }

    if (node.type === AST_NODE_TYPES.JSXExpressionContainer) {
      return getDependency(node.expression, optionalChains, perfKey);
    }

    if (node.type === AST_NODE_TYPES.CallExpression) {
      return getDependency(node.callee, optionalChains, perfKey);
    }

    if (node.type === AST_NODE_TYPES.ChainExpression) {
      return getDependency(node.expression, optionalChains, perfKey);
    }

    if (node.type === AST_NODE_TYPES.TSNonNullExpression) {
      return getDependency(node.expression, optionalChains, perfKey);
    }

    return node;
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      trackOperation(perfKey, PerformanceOperations.getDependencyFailed);

      return node;
    }

    throw error;
  }
}

function markNode(
  node: TSESTree.Node | TSESTree.MemberExpression,
  optionalChains: Map<string, boolean> | null,
  result: string,
  perfKey: string
): void {
  try {
    trackOperation(perfKey, PerformanceOperations.nodeProcessing);

    if (optionalChains) {
      // Only mark as optional if this MemberExpression actually uses optional chaining (?.)
      // Some parsers include the 'optional' property even when it's false; check for === true.
      if ('optional' in node && node.optional === true) {
        optionalChains.set(result, true);
      } else {
        optionalChains.set(result, false);
      }
    }
  } catch (error: unknown) {
    if (error instanceof PerformanceLimitExceededError) {
      trackOperation(perfKey, PerformanceOperations.markNodeFailed);
    } else {
      throw error;
    }
  }
}

function getNodeWithoutReactNamespace(
  node: TSESTree.Expression | TSESTree.Super
): TSESTree.Expression | TSESTree.Identifier | TSESTree.Super {
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'React' &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    !node.computed
  ) {
    return node.property;
  }

  return node;
}

function getReactiveHookCallbackIndex(
  calleeNode: TSESTree.Expression | TSESTree.Super,
  context: TSESLint.RuleContext<MessageIds, Options>,
  options: {
    additionalHooks?: RegExp | undefined;
    unsafeAutofix?: boolean | undefined;
  },
  perfKey: string
): 0 | -1 | 1 {
  const node = getNodeWithoutReactNamespace(calleeNode);

  if (node.type !== AST_NODE_TYPES.Identifier) {
    return -1;
  }

  switch (node.name) {
    case 'useEffect':
    case 'useLayoutEffect':
    case 'useCallback':
    case 'useMemo': {
      return 0;
    }

    case 'useImperativeHandle': {
      return 1;
    }

    default: {
      if (node === calleeNode && typeof options.additionalHooks !== 'undefined') {
        let name: string | undefined;

        try {
          name = analyzePropertyChain(node, null, context, perfKey);
        } catch (error: unknown) {
          if (error instanceof Error && /Unsupported node type/.test(error.message)) {
            return 0;
          }

          throw error;
        }

        return options.additionalHooks.test(name) ? 0 : -1;
      }

      return -1;
    }
  }
}

function isInsideEffectCleanup(reference: Reference, node: TSESTree.Node): boolean {
  let curScope: Scope | null = reference.from;

  let isInReturnedFunction = false;

  while (curScope !== null && curScope.block !== node) {
    if (curScope.type === 'function') {
      isInReturnedFunction =
        curScope.block.parent != null &&
        curScope.block.parent.type === AST_NODE_TYPES.ReturnStatement;
    }

    curScope = curScope.upper;
  }

  return isInReturnedFunction;
}

function areDeclaredDepsAlphabetized(declaredDependencies: Array<DeclaredDependency>): boolean {
  if (declaredDependencies.length === 0) {
    return true;
  }

  const declaredDepKeys = declaredDependencies.map((dep: DeclaredDependency): string => {
    return dep.key;
  });

  const sortedDeclaredDepKeys = declaredDepKeys.slice().sort();

  return declaredDepKeys.join(',') === sortedDeclaredDepKeys.join(',');
}

// Split a dependency path into members, treating optional access (?.) the same as dot (.)
function splitPathMembers(path: string): Array<string> {
  // Split by either '?.' or '.' while preserving member names
  return path.split(/(?:\?\.)|\./g);
}

// Compare two paths for equivalence under optional chaining ('.' vs '?.')
function pathsEquivalent(a: string, b: string): boolean {
  const aa = splitPathMembers(a);

  const bb = splitPathMembers(b);

  if (aa.length !== bb.length) {
    return false;
  }

  for (let i = 0; i < aa.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    if (aa[i] !== bb[i]) {
      return false;
    }
  }

  return true;
}

const setStateCallSites = new WeakMap<
  TSESTree.Expression | TSESTree.Super | TSESTree.Identifier | TSESTree.JSXIdentifier,
  Pattern | TSESTree.DestructuringPattern | null | undefined
>();

const stableKnownValueCache = new WeakMap<Variable, boolean>();

const functionWithoutCapturedValueCache = new WeakMap<Variable, boolean>();

const useEffectEventVariables = new WeakSet<
  TSESTree.Expression | TSESTree.Identifier | TSESTree.JSXIdentifier
>();

// Track object property accesses to detect patterns like obj.prop1.prop2
const objectPropertyAccesses = new Map<string, Set<string>>();

function visitFunctionWithDependencies(
  node:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression,
  declaredDependenciesNode: TSESTree.Node | undefined,
  reactiveHook: TSESTree.Node,
  reactiveHookName: string,
  isEffect: boolean,
  isAutoDepsHook: boolean | undefined,
  context: TSESLint.RuleContext<MessageIds, Options>,
  perfKey: string
): void {
  startPhase(perfKey, 'function-analysis');
  trackOperation(perfKey, PerformanceOperations.hookCheck);

  try {
    if (isEffect && node.async === true) {
      trackOperation(perfKey, PerformanceOperations.effectCheck);

      if (getSeverity('asyncEffect', context.options[0]) === 'off') {
        return;
      }

      context.report({
        node,
        data: {
          message: `TODO!!!`,
        },
        messageId: 'asyncEffect',
        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
          return fixer.replaceText(node, `async () => { ${context.sourceCode.getText(node)}; }`);
        },
      });
    }

    // Track scope analysis
    startPhase(perfKey, 'scope-analysis');
    trackOperation(perfKey, PerformanceOperations.scopeLookup);

    const scope = context.sourceCode.scopeManager?.acquire(node);

    if (!scope) {
      recordMetric(perfKey, 'error', 'scope-acquisition-failed');

      throw new Error(
        'Unable to acquire scope for the current node. This is a bug in eslint-plugin-react-hooks, please file an issue.'
      );
    }

    endPhase(perfKey, 'scope-analysis');

    const pureScopes = new Set<Scope>();

    // Track component scope analysis
    startPhase(perfKey, 'component-scope-analysis');
    trackOperation(perfKey, PerformanceOperations.componentCheck);

    let componentScope: Scope | null = null;
    let componentScopeDepth = 0;

    {
      let currentScope = scope.upper;

      while (currentScope) {
        trackOperation(perfKey, PerformanceOperations.scopeLookup);
        pureScopes.add(currentScope);
        componentScopeDepth++;

        if (['function', 'hook', 'component'].includes(currentScope.type)) {
          componentScope = currentScope;
          break;
        }

        currentScope = currentScope.upper;
      }

      // Record component scope metrics
      recordMetric(perfKey, 'componentScopeDepth', componentScopeDepth);
      recordMetric(perfKey, 'hasComponentScope', componentScope !== null ? 1 : 0);
    }

    endPhase(perfKey, 'component-scope-analysis');

    // Ensure we end the function analysis phase even if an error occurs
  } catch (error: unknown) {
    recordMetric(perfKey, 'error', error instanceof Error ? error.message : JSON.stringify(error));

    throw error;
  } finally {
    // Ensure we always end the function analysis phase
    // End the function analysis phase if it's still active
    try {
      endPhase(perfKey, 'function-analysis');
    } catch (error: unknown) {
      console.error(error);
      // Ignore errors when ending phase that wasn't started
    }
  }

  function isStableKnownHookValue(resolved: Variable, componentScope: Scope | null): boolean {
    if (!Array.isArray(resolved.defs)) {
      return false;
    }

    const def: Definition | undefined = resolved.defs[0];

    if (typeof def === 'undefined') {
      return false;
    }

    if (def.node.type !== 'VariableDeclarator') {
      return false;
    }

    let init = def.node.init;

    if (init === null) {
      return false;
    }

    while (init.type === 'TSAsExpression') {
      init = init.expression;
    }

    let declaration: TSESTree.VariableDeclaration | TSESTree.Node | null | undefined =
      def.node.parent;

    if (componentScope !== null) {
      if ('id' in def.node) {
        fastFindReferenceWithParent(componentScope.block, def.node.id);

        declaration = def.node.parent;
      }

      if (typeof declaration === 'undefined') {
        return false;
      }
    }

    if (
      'kind' in declaration &&
      declaration.kind === 'const' &&
      init.type === 'Literal' &&
      (typeof init.value === 'string' || typeof init.value === 'number' || init.value === null)
    ) {
      return true;
    }

    if (init.type !== 'CallExpression') {
      return false;
    }

    let callee: TSESTree.Expression | TSESTree.PrivateIdentifier | TSESTree.Super = init.callee;

    if (
      callee.type === 'MemberExpression' &&
      'name' in callee.object &&
      callee.object.name === 'React' &&
      !callee.computed
    ) {
      callee = callee.property;
    }

    if (callee.type !== 'Identifier') {
      return false;
    }

    if (callee.name === 'useRef' && def.node.id.type === 'Identifier') {
      return true;
    }

    if (
      (isSignalIdentifier(callee, perfKey) || isSignalVariable(def.node.id, perfKey)) &&
      def.node.id.type === 'Identifier'
    ) {
      return false;
    }

    if (isUseEffectEventIdentifier(callee, perfKey) && def.node.id.type === 'Identifier') {
      for (const ref of resolved.references) {
        if (ref.identifier !== def.node.id) {
          useEffectEventVariables.add(ref.identifier);
        }
      }

      return true;
    }

    if (['useState', 'useReducer', 'useActionState'].includes(callee.name)) {
      if (
        def.node.id.type === 'ArrayPattern' &&
        def.node.id.elements.length === 2 &&
        Array.isArray(resolved.identifiers)
      ) {
        if (def.node.id.elements[1] === resolved.identifiers[0]) {
          if (callee.name === 'useState') {
            const references = resolved.references;

            let writeCount = 0;

            for (const reference of references) {
              if (reference.isWrite()) {
                writeCount++;
              }

              if (writeCount > 1) {
                return false;
              }

              setStateCallSites.set(reference.identifier, def.node.id.elements[0]);
            }
          }

          return true;
        }

        if (def.node.id.elements[0] === resolved.identifiers[0]) {
          return false;
        }
      }
    } else if (
      callee.name === 'useTransition' &&
      def.node.id.type === 'ArrayPattern' &&
      def.node.id.elements.length === 2 &&
      Array.isArray(resolved.identifiers) &&
      def.node.id.elements[1] === resolved.identifiers[0]
    ) {
      return true;
    }

    return false;
  }

  const memoizedIsStableKnownHookValue = memoizeWithWeakMap(
    isStableKnownHookValue,
    stableKnownValueCache
  );

  function isFunctionWithoutCapturedValues(
    resolved: Variable,
    componentScope: Scope | null,
    pureScopes: Set<Scope>
  ): boolean {
    if (!Array.isArray(resolved.defs)) {
      return false;
    }

    const def: Definition | undefined = resolved.defs[0];

    if (typeof def === 'undefined') {
      return false;
    }

    if (!('id' in def.node) || def.node.id == null) {
      return false;
    }

    let fnScope = null;

    for (const childScope of componentScope?.childScopes || []) {
      if (
        (def.node.type === 'FunctionDeclaration' && childScope.block === def.node) ||
        (def.node.type === 'VariableDeclarator' && childScope.block.parent === def.node)
      ) {
        fnScope = childScope;

        break;
      }
    }

    if (fnScope == null) {
      return false;
    }

    for (const ref of fnScope.through) {
      if (ref.resolved == null) {
        continue;
      }

      if (
        pureScopes.has(ref.resolved.scope) &&
        !memoizedIsStableKnownHookValue(ref.resolved, componentScope, pureScopes)
      ) {
        return false;
      }
    }

    return true;
  }

  const currentRefsInEffectCleanup = new Map<
    string,
    {
      reference: Reference;
      dependencyNode: TSESTree.Identifier;
    }
  >();

  const dependencies = new Map<string, Dependency>();

  const optionalChains = new Map<string, boolean>();

  const externalDependencies = new Set<string>();

  // Track scope analysis
  startPhase(perfKey, 'scope-analysis');
  trackOperation(perfKey, PerformanceOperations.scopeLookup);

  const scope = context.sourceCode.scopeManager?.acquire(node);

  if (!scope) {
    const error = new Error(
      'Unable to acquire scope for the current node. This is a bug in eslint-plugin-react-hooks, please file an issue.'
    );
    recordMetric(perfKey, 'error', 'scope-acquisition-failed');
    throw error;
  }

  endPhase(perfKey, 'scope-analysis');

  const pureScopes = new Set<Scope>();

  // Track component scope analysis
  startPhase(perfKey, 'component-scope-analysis');
  trackOperation(perfKey, PerformanceOperations.componentCheck);

  let componentScope: Scope | null = null;
  let componentScopeDepth = 0;

  {
    let currentScope = scope.upper;

    while (currentScope) {
      trackOperation(perfKey, PerformanceOperations.scopeLookup);

      pureScopes.add(currentScope);

      componentScopeDepth++;

      if (['function', 'hook', 'component'].includes(currentScope.type)) {
        componentScope = currentScope;
        break;
      }

      currentScope = currentScope.upper;
    }

    // Record component scope metrics
    recordMetric(perfKey, 'componentScopeDepth', componentScopeDepth);
    recordMetric(perfKey, 'hasComponentScope', componentScope !== null ? 1 : 0);
  }

  endPhase(perfKey, 'component-scope-analysis');

  // Now that we have the scope, we can gather dependencies
  gatherDependenciesRecursively(scope, pureScopes);

  function isOnlyAssignmentReference(reference: Reference): boolean {
    if (
      reference.identifier.parent.type === AST_NODE_TYPES.MemberExpression &&
      reference.identifier.parent.object === reference.identifier &&
      reference.identifier.parent.property.type === AST_NODE_TYPES.Identifier &&
      reference.identifier.parent.property.name === 'value'
    ) {
      if (
        reference.identifier.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
        reference.identifier.parent.parent.left === reference.identifier.parent
      ) {
        return true;
      }

      if (
        reference.identifier.parent.parent.type === AST_NODE_TYPES.MemberExpression &&
        reference.identifier.parent.parent.object === reference.identifier.parent &&
        reference.identifier.parent.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
        reference.identifier.parent.parent.parent.left === reference.identifier.parent.parent
      ) {
        return true;
      }

      if (
        isSignalDependency(reference.identifier.name, perfKey) &&
        reference.identifier.parent.object === reference.identifier
      ) {
        if (
          reference.identifier.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
          reference.identifier.parent.parent.left === reference.identifier.parent
        ) {
          return true;
        }

        if (
          reference.identifier.parent.parent.type === AST_NODE_TYPES.MemberExpression &&
          reference.identifier.parent.parent.object === reference.identifier.parent &&
          reference.identifier.parent.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
          reference.identifier.parent.parent.parent.left === reference.identifier.parent.parent
        ) {
          return true;
        }
      }
    }

    if (
      reference.identifier.name === 'value' &&
      reference.identifier.parent.type === AST_NODE_TYPES.MemberExpression &&
      reference.identifier.parent.property === reference.identifier &&
      reference.identifier.parent.object.type === AST_NODE_TYPES.Identifier &&
      isSignalDependency(reference.identifier.parent.object.name, perfKey)
    ) {
      if (
        reference.identifier.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
        reference.identifier.parent.parent.left === reference.identifier.parent
      ) {
        return true;
      }

      if (
        reference.identifier.parent.parent.type === AST_NODE_TYPES.MemberExpression &&
        reference.identifier.parent.parent.object === reference.identifier.parent &&
        reference.identifier.parent.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
        reference.identifier.parent.parent.parent.left === reference.identifier.parent.parent
      ) {
        return true;
      }
    }

    return false;
  }

  function gatherDependenciesRecursively(currentScope: Scope, pureScopes: Set<Scope>): void {
    // Bases to skip for effects due to inner-scope computed indexing somewhere in the chain
    const skipEffectBases = new Set<string>();

    for (const reference of currentScope.references) {
      const isSignalReference =
        reference.identifier.type === AST_NODE_TYPES.Identifier &&
        (isSignalDependency(reference.identifier.name, perfKey) ||
          (reference.resolved != null
            ? isSignalDependency(reference.resolved.name, perfKey)
            : false));

      if (reference.resolved == null) {
        continue;
      }

      // biome-ignore format: because
      if (
    reference.identifier.parent.type === AST_NODE_TYPES.MemberExpression &&
    !reference.identifier.parent.computed &&
    reference.identifier.parent.property.type === AST_NODE_TYPES.Identifier &&
    reference.identifier.parent.property.name === 'value' &&
    'object' in reference.identifier &&
    reference.identifier.object === reference.identifier
  ) {
    const objectName = reference.identifier.name;

    const propertyName = reference.identifier.parent.property.name;


    if (!objectPropertyAccesses.has(objectName)) {
      objectPropertyAccesses.set(objectName, new Set<string>());
    }

    let currentNode: TSESTree.MemberExpressionComputedName | TSESTree.MemberExpressionNonComputedName = reference.identifier.parent;

    let fullPath = `${objectName}.${propertyName}`;

    while (
      currentNode.parent.type === AST_NODE_TYPES.MemberExpression
    ) {
      if (currentNode.parent.object === currentNode) {

        if (!currentNode.parent.computed) {
          if (currentNode.parent.property.type === AST_NODE_TYPES.Identifier) {
            fullPath += `.${currentNode.parent.property.name}`;

            currentNode = currentNode.parent;
          } else {
            break;
          }
        } else {
          try {
            const computedPath = analyzePropertyChain(currentNode.parent, null, context, perfKey);

            fullPath = computedPath;

            currentNode = currentNode.parent;
          } catch (error: unknown) {
            console.error(error instanceof Error ? error.message : JSON.stringify(error));

            break;
          }
        }
      } else {
        break;
      }
    }

    const objectPropertyAccessesSet = objectPropertyAccesses.get(objectName);

    if (typeof objectPropertyAccessesSet !== 'undefined') {
      objectPropertyAccessesSet.add(fullPath);
    }
  }

      let isComputedMemberAssignmentOnly = false;

      if (
        reference.identifier.type === AST_NODE_TYPES.Identifier &&
        isSignalDependency(reference.identifier.name, perfKey) &&
        reference.identifier.parent.type === AST_NODE_TYPES.MemberExpression &&
        reference.identifier.parent.object === reference.identifier &&
        'name' in reference.identifier.parent.property &&
        reference.identifier.parent.property.name === 'value' &&
        reference.identifier.parent.parent.type === AST_NODE_TYPES.MemberExpression &&
        reference.identifier.parent.parent.object === reference.identifier.parent &&
        reference.identifier.parent.parent.parent.type === AST_NODE_TYPES.AssignmentExpression &&
        reference.identifier.parent.parent.parent.left === reference.identifier.parent.parent
      ) {
        isComputedMemberAssignmentOnly = true;

        // @ts-expect-error adding isComputedAssignmentOnly to Reference
        reference.isComputedAssignmentOnly = true;

        for (const ref of currentScope.references) {
          if (ref.identifier.name === reference.identifier.name) {
            // @ts-expect-error adding isComputedAssignmentOnly to Reference
            ref.isComputedAssignmentOnly = true;
          }
        }
      }

      if (
        ((!pureScopes.has(reference.resolved.scope) && !isSignalReference) ||
          reference.resolved.scope === scope) &&
        !isComputedMemberAssignmentOnly
      ) {
        continue;
      }

      if (
        reference.identifier.type === AST_NODE_TYPES.Identifier &&
        isSignalDependency(reference.identifier.name, perfKey)
      ) {
        let allReferencesAreComputedAssignments = true;

        for (const ref of currentScope.references) {
          if (
            ref.identifier.name === reference.identifier.name &&
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            ref.isComputedAssignmentOnly !== true
          ) {
            allReferencesAreComputedAssignments = false;
            break;
          }
        }

        if (allReferencesAreComputedAssignments) {
          continue;
        }
      }

      const referenceNode = fastFindReferenceWithParent(node, reference.identifier);

      if (referenceNode == null) {
        continue;
      }

      let currentNode:
        | TSESTree.Identifier
        | TSESTree.JSXIdentifier
        | TSESTree.MemberExpressionComputedName
        | TSESTree.MemberExpressionNonComputedName = reference.identifier;

      while (
        currentNode.parent.type === AST_NODE_TYPES.MemberExpression &&
        currentNode.parent.object === currentNode
      ) {
        currentNode = currentNode.parent;
      }

      let dependencyNode = getDependency(referenceNode, optionalChains, perfKey);

      try {
        let currentNode = referenceNode;

        while (
          currentNode.parent &&
          currentNode.parent.type === AST_NODE_TYPES.MemberExpression &&
          currentNode.parent.object === currentNode
        ) {
          currentNode = currentNode.parent;
        }
      } catch (error: unknown) {
        console.error(`Property chain analysis failed:`, error);
      }

      if (
        dependencyNode.type === AST_NODE_TYPES.Identifier &&
        !isSignalDependency(dependencyNode.name, perfKey) &&
        'parent' in dependencyNode &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
        dependencyNode.parent &&
        dependencyNode.parent.type === AST_NODE_TYPES.MemberExpression &&
        dependencyNode.parent.object === dependencyNode
      ) {
        let outermost: TSESTree.Node | TSESTree.MemberExpression = dependencyNode.parent;

        while (
          'parent' in outermost &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          outermost.parent &&
          outermost.parent.type === AST_NODE_TYPES.MemberExpression &&
          outermost.parent.object === outermost
        ) {
          outermost = outermost.parent;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (outermost.type === AST_NODE_TYPES.MemberExpression) {
          dependencyNode = outermost;
        }
      }

      if (
        dependencyNode.type === AST_NODE_TYPES.Identifier &&
        isSignalDependency(dependencyNode.name, perfKey) &&
        referenceNode.parent?.type === AST_NODE_TYPES.MemberExpression &&
        referenceNode.parent.object === referenceNode &&
        referenceNode.parent.property.type === AST_NODE_TYPES.Identifier &&
        referenceNode.parent.property.name === 'value'
      ) {
        if (
          referenceNode.parent.parent.type === AST_NODE_TYPES.MemberExpression &&
          referenceNode.parent.parent.object === referenceNode.parent
        ) {
          let isAssignmentOnly = false;

          let outermostNode = referenceNode.parent.parent;

          while (
            outermostNode.parent.type === AST_NODE_TYPES.MemberExpression &&
            outermostNode.parent.object === outermostNode
          ) {
            outermostNode = outermostNode.parent;
          }

          if (
            outermostNode.parent.type === AST_NODE_TYPES.AssignmentExpression &&
            outermostNode.parent.left === outermostNode
          ) {
            isAssignmentOnly = true;
          }

          dependencyNode = outermostNode;

          if (referenceNode.parent.parent.computed) {
            const propertyNode = referenceNode.parent.parent.property;

            let propertyName = null;

            if (propertyNode.type === AST_NODE_TYPES.Identifier) {
              propertyName = propertyNode.name;
            } else if (
              propertyNode.type === AST_NODE_TYPES.TSAsExpression &&
              propertyNode.expression.type === AST_NODE_TYPES.Identifier
            ) {
              propertyName = propertyNode.expression.name;
            }

            if (typeof propertyName === 'string' && propertyName !== '') {
              let isInnerScopeProperty = false;

              let propertyRef = null;

              let searchScope: Scope | null = currentScope;

              while (searchScope && searchScope !== scope?.upper) {
                propertyRef = searchScope.references.find((ref: Reference): boolean => {
                  return ref.identifier.name === propertyName;
                });

                if (propertyRef) {
                  break;
                }

                searchScope = searchScope.upper;
              }

              if (propertyRef?.resolved) {
                let checkScope: Scope | null = propertyRef.resolved.scope;

                while (checkScope) {
                  if (checkScope === scope) {
                    isInnerScopeProperty = true;

                    break;
                  }

                  checkScope = checkScope.upper;
                }

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                reference.isInnerScopeComputedProperty = isInnerScopeProperty;

                const baseValueKey = `${reference.identifier.name}.value`;

                const baseValueDep = dependencies.get(baseValueKey);

                if (baseValueDep) {
                  baseValueDep.hasInnerScopeComputedProperty = isInnerScopeProperty;
                }
              }
            }
          }

          if (isAssignmentOnly) {
            // @ts-expect-error passing isComputedAssignmentOnly to Reference
            reference.isComputedAssignmentOnly = true;
          }
        } else {
          dependencyNode = referenceNode.parent;
        }
      }

      if (
        dependencyNode.type === AST_NODE_TYPES.MemberExpression &&
        dependencyNode.computed === true
      ) {
        const prop = dependencyNode.property;

        let propertyName: string | null = null;

        if (prop.type === AST_NODE_TYPES.Identifier) {
          propertyName = prop.name;
        } else if (
          prop.type === AST_NODE_TYPES.TSAsExpression &&
          prop.expression.type === AST_NODE_TYPES.Identifier
        ) {
          propertyName = prop.expression.name;
        }

        if (typeof propertyName === 'string' && propertyName !== '') {
          let isInnerScopeProperty = false;

          let propertyRef: Reference | null = null;

          let searchScope: Scope | null = currentScope;

          while (searchScope && searchScope !== scope?.upper) {
            propertyRef =
              searchScope.references.find((ref: Reference): boolean => {
                return ref.identifier.name === propertyName;
              }) ?? null;

            if (propertyRef) {
              break;
            }

            searchScope = searchScope.upper;
          }

          if (propertyRef?.resolved) {
            let checkScope: Scope | null = propertyRef.resolved.scope;

            while (checkScope) {
              if (checkScope === scope) {
                isInnerScopeProperty = true;

                break;
              }

              checkScope = checkScope.upper;
            }

            // @ts-expect-error extending Reference shape
            reference.isInnerScopeComputedProperty = isInnerScopeProperty;
          }
        }
      }

      if (dependencyNode.type === AST_NODE_TYPES.MemberExpression) {
        let cursor: TSESTree.Node | null = dependencyNode;

        while (cursor.type === AST_NODE_TYPES.MemberExpression) {
          if (cursor.computed === true) {
            let propIdent: TSESTree.Identifier | null = null;

            if (cursor.property.type === AST_NODE_TYPES.Identifier) {
              propIdent = cursor.property;
            } else if (
              cursor.property.type === AST_NODE_TYPES.TSAsExpression &&
              cursor.property.expression.type === AST_NODE_TYPES.Identifier
            ) {
              propIdent = cursor.property.expression;
            }

            if (propIdent !== null) {
              let isInner = false;

              let propertyRef: Reference | null = null;

              let search: Scope | null = currentScope;

              while (search && search !== scope?.upper) {
                propertyRef =
                  search.references.find((ref: Reference): boolean => {
                    return ref.identifier.name === propIdent.name;
                  }) ?? null;

                if (propertyRef) {
                  break;
                }

                search = search.upper;
              }

              if (propertyRef?.resolved) {
                let s: Scope | null = propertyRef.resolved.scope;

                while (s) {
                  if (s === scope) {
                    isInner = true;

                    break;
                  }

                  s = s.upper;
                }
              }

              if (isInner) {
                // @ts-expect-error annotate reference for later normalization
                reference.isInnerScopeComputedProperty = true;
              }

              if (isEffect === true && isInner === true) {
                let left: TSESTree.Node | null = cursor.object;

                while (left.type === AST_NODE_TYPES.MemberExpression) {
                  left = left.object;
                }

                if (left.type === AST_NODE_TYPES.Identifier) {
                  skipEffectBases.add(left.name);
                }
              }
            }
          }

          cursor = cursor.object;
        }
      }

      const dependency = analyzePropertyChain(dependencyNode, optionalChains, context, perfKey);

      let depKey: string = dependency;

      if (
        'parent' in dependencyNode &&
        typeof dependencyNode.parent === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        dependencyNode.parent !== null &&
        'type' in dependencyNode.parent &&
        dependencyNode.type === AST_NODE_TYPES.Identifier &&
        dependencyNode.parent.type === AST_NODE_TYPES.MemberExpression &&
        !dependencyNode.parent.computed &&
        dependencyNode.parent.property.type === AST_NODE_TYPES.Identifier &&
        dependencyNode.parent.property.name === 'current' &&
        isInsideEffectCleanup(reference, node)
      ) {
        currentRefsInEffectCleanup.set(dependency, {
          reference,
          dependencyNode,
        });
      }

      if (
        dependencyNode.parent?.type === AST_NODE_TYPES.TSTypeQuery ||
        dependencyNode.parent?.type === AST_NODE_TYPES.TSTypeReference
      ) {
        continue;
      }

      const def: Definition | undefined = reference.resolved.defs[0];

      if (def == null) {
        continue;
      }

      // @ts-expect-error We don't have flow types
      if (def.type === 'TypeParameter') {
        continue;
      }

      const isComputedAssignmentOnly =
        // @ts-expect-error reading isComputedAssignmentOnly to Reference
        reference.isComputedAssignmentOnly === true;

      function isUseRefVariable(definition: Definition | undefined): boolean {
        if (!definition || definition.type !== 'Variable') {
          return false;
        }

        let init: TSESTree.Expression | null = definition.node.init;

        if (init === null) {
          return false;
        }

        while (init.type === AST_NODE_TYPES.TSAsExpression) {
          init = init.expression;
        }

        if (init.type === AST_NODE_TYPES.CallExpression) {
          if (init.callee.type === AST_NODE_TYPES.Identifier) {
            return init.callee.name === 'useRef';
          }

          if (
            init.callee.type === AST_NODE_TYPES.MemberExpression &&
            !init.callee.computed &&
            init.callee.property.type === AST_NODE_TYPES.Identifier &&
            init.callee.property.name === 'useRef' &&
            init.callee.object.type === AST_NODE_TYPES.Identifier &&
            init.callee.object.name === 'React'
          ) {
            return true;
          }
        }

        return false;
      }

      if (
        typeof depKey === 'string' &&
        (isUseRefVariable(def) ||
          isRefTypeAnnotated(def) ||
          /(?:Ref|ref)$/.test(reference.identifier.name)) &&
        (depKey.startsWith(`${reference.identifier.name}.current`) ||
          depKey.startsWith(`${reference.identifier.name}?.current`) ||
          depKey === reference.identifier.name)
      ) {
        continue;
      }

      if (
        // @ts-expect-error reading isInnerScopeComputedProperty to Reference
        reference.isInnerScopeComputedProperty === true
      ) {
        if (isEffect === true) {
          continue;
        }

        if (typeof depKey === 'string') {
          const bracketIdx = depKey.indexOf('[');

          if (bracketIdx > 0) {
            depKey = depKey.slice(0, bracketIdx);
          }
        }
      }

      if (
        typeof depKey === 'string' &&
        depKey === reference.identifier.name &&
        (isUseRefVariable(def) || isRefTypeAnnotated(def))
      ) {
        continue;
      }

      function isRefTypeAnnotated(definition: Definition | undefined): boolean {
        if (!definition) {
          return false;
        }

        if (definition.type === 'Variable') {
          const typeNode =
            definition.node.id.type === AST_NODE_TYPES.Identifier
              ? definition.node.id.typeAnnotation
              : null;

          if (typeNode) {
            return /(?:\b|\.)RefObject\b|\bMutableRefObject\b|\bRef\b/.test(
              context.sourceCode.getText(typeNode)
            );
          }
        }

        if (definition.type === 'Parameter') {
          return /(?:\b|\.)RefObject\b|\bMutableRefObject\b|\bRef\b/.test(
            context.sourceCode.getText(definition.node)
          );
        }

        return false;
      }

      if (dependencies.has(depKey)) {
        dependencies.get(depKey)?.references.push(reference);

        if (!isOnlyAssignmentReference(reference) && !isComputedAssignmentOnly) {
          const dep = dependencies.get(depKey);

          if (dep) {
            dep.hasReads = true;
          }
        }
      } else {
        const isImportedSignal =
          typeof depKey === 'string' &&
          (isSignalDependency(depKey, perfKey) ||
            (depKey.includes('.') && isSignalDependency(depKey.split('.')[0] ?? '', perfKey)));

        const isSignalValueAccessBool = isSignalValueAccess(reference.identifier, context);

        if (isImportedSignal === true) {
          const toDelete = depKey.includes('.') ? depKey.split('.')[0] : depKey;

          if (typeof toDelete === 'string' && toDelete !== '') {
            externalDependencies.delete(toDelete);
          }
        }
        if (
          isSignalValueAccessBool === true &&
          typeof depKey === 'string' &&
          depKey.endsWith('.value')
        ) {
          externalDependencies.delete(depKey.slice(0, -'.value'.length));
        }

        const existing = dependencies.get(depKey);

        if (typeof existing?.observedFormatted !== 'undefined') {
          existing.observedFormatted.add(
            formatDependency(depKey, projectOptionalChains(depKey, optionalChains))
          );
        }

        dependencies.set(depKey, {
          node: dependencyNode,
          isStable:
            isSignalValueAccessBool ||
            isSignalDependency(depKey, perfKey) ||
            isImportedSignal === true
              ? false
              : typeof depKey === 'string' &&
                  !depKey.includes('.') &&
                  !isSignalDependency(depKey, perfKey) &&
                  reference.resolved.defs.length > 0 &&
                  !memoizedIsStableKnownHookValue(reference.resolved, componentScope, pureScopes)
                ? false
                : memoizedIsStableKnownHookValue(reference.resolved, componentScope, pureScopes) ||
                  memoizeWithWeakMap(
                    isFunctionWithoutCapturedValues,
                    functionWithoutCapturedValueCache
                  )(reference.resolved, componentScope, pureScopes),
          references: [reference],
          hasReads: !isOnlyAssignmentReference(reference) && !isComputedAssignmentOnly,
          hasInnerScopeComputedProperty:
            // @ts-expect-error reading isInnerScopeComputedProperty from Reference
            reference.isInnerScopeComputedProperty === true,
        });
      }
    }

    for (const childScope of currentScope.childScopes) {
      gatherDependenciesRecursively(childScope, pureScopes);
    }
  }

  currentRefsInEffectCleanup.forEach(({ reference, dependencyNode }): void => {
    let foundCurrentAssignment = false;

    for (const ref of reference.resolved?.references ?? []) {
      if (
        'parent' in ref.identifier &&
        typeof ref.identifier.parent === 'object' &&
        'type' in ref.identifier.parent &&
        ref.identifier.parent.type === 'MemberExpression' &&
        (!('computed' in ref.identifier.parent) || !ref.identifier.parent.computed) &&
        'property' in ref.identifier.parent &&
        typeof ref.identifier.parent.property === 'object' &&
        'type' in ref.identifier.parent.property &&
        ref.identifier.parent.property.type === 'Identifier' &&
        'name' in ref.identifier.parent.property &&
        ref.identifier.parent.property.name === 'current' &&
        'parent' in ref.identifier.parent &&
        typeof ref.identifier.parent.parent === 'object' &&
        'type' in ref.identifier.parent.parent &&
        ref.identifier.parent.parent.type === 'AssignmentExpression' &&
        'left' in ref.identifier.parent.parent &&
        ref.identifier.parent.parent.left === ref.identifier.parent
      ) {
        foundCurrentAssignment = true;

        break;
      }
    }

    if (foundCurrentAssignment) {
      return;
    }

    if (getSeverity('staleAssignmentDependency', context.options[0]) === 'off') {
      return;
    }

    context.report({
      messageId: 'staleAssignmentDependency',
      data: {
        dependency: dependencyNode.name,
        hookName: reactiveHookName,
      },
      node: 'property' in dependencyNode.parent ? dependencyNode.parent.property : dependencyNode,
    });
  });

  const staleAssignments = new Set<string>();

  const stableDependencies = new Set<string>();

  const declaredDependencies: Array<DeclaredDependency> = [];

  dependencies.forEach(({ isStable, references }: Dependency, key: string): void => {
    if (isStable) {
      stableDependencies.add(key);
    }

    for (const reference of references) {
      if (reference.writeExpr) {
        if (staleAssignments.has(key)) {
          return;
        }

        staleAssignments.add(key);

        if (getSeverity('useEffectEventInDependencyArray', context.options[0]) === 'off') return;

        context.report({
          node: reference.writeExpr ?? reference.identifier,
          data: {
            eventName: key,
            hookName: reactiveHookName,
          },
          messageId: 'useEffectEventInDependencyArray',
          suggest: [
            {
              messageId: 'removeDependency',
              data: {
                dependency: key,
              },
              fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                const [start, end] = reference.identifier.range;

                return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
              },
            },
          ],
        });
      }
    }
  });

  if (staleAssignments.size > 0) {
    return;
  }

  if (!declaredDependenciesNode) {
    if (isAutoDepsHook === true) {
      return;
    }

    let setStateInsideEffectWithoutDeps: string | null = null;

    dependencies.forEach(({ references }: Dependency, key: string): void => {
      if (setStateInsideEffectWithoutDeps !== null && setStateInsideEffectWithoutDeps !== '') {
        return;
      }

      for (const reference of references) {
        if (setStateInsideEffectWithoutDeps !== null && setStateInsideEffectWithoutDeps !== '') {
          return;
        }

        if (!setStateCallSites.has(reference.identifier)) {
          return;
        }

        let fnScope: Scope | null = reference.from;

        while (fnScope != null && fnScope.type !== 'function') {
          fnScope = fnScope.upper;
        }

        if (fnScope?.block === node) {
          setStateInsideEffectWithoutDeps = key;
        }
      }
    });

    const { suggestedDependencies } = collectRecommendations({
      dependencies,
      declaredDependencies: [],
      stableDependencies,
      externalDependencies: new Set<string>(),
      isEffect: true,
      reactiveHookName,
      context,
      perfKey,
    });

    // Final guard: filter out suggestions that are equivalent to declared deps under optional chaining
    const filteredSuggestedForReport = suggestedDependencies.filter((dep: string): boolean => {
      return !declaredDependencies.some(({ key }: DeclaredDependency): boolean => {
        return pathsEquivalent(dep, key);
      });
    });

    const depsText = filteredSuggestedForReport.join(', ');

    const hasDependencies = filteredSuggestedForReport.length > 0;

    if (
      typeof setStateInsideEffectWithoutDeps === 'string' &&
      setStateInsideEffectWithoutDeps !== ''
    ) {
      if (getSeverity('missingDependency', context.options[0]) === 'off') {
        return;
      }

      context.report({
        node: reactiveHook,
        messageId: 'missingDependency',
        data: {
          hookName: context.sourceCode.getText(
            'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
          ),
          dependency: setStateInsideEffectWithoutDeps,
          dependencies: depsText,
          missingMessage: `\n  - '${setStateInsideEffectWithoutDeps}' is updated inside the effect but not listed in the dependency array\n  - This can lead to an infinite loop of re-renders`,
        },
        suggest: [
          {
            messageId: 'addDependencies',
            data: { dependencies: depsText, count: suggestedDependencies.length },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              const insertPosition = (
                'arguments' in reactiveHook
                  ? reactiveHook.arguments[reactiveHook.arguments.length - 1]
                  : null
              )?.range[1];

              if (typeof insertPosition !== 'number') {
                return null;
              }

              return fixer.insertTextAfterRange(
                [insertPosition, insertPosition],
                /\n/.test(context.sourceCode.text.slice(insertPosition, reactiveHook.range[1]))
                  ? `,\n${' '.repeat(reactiveHook.loc.start.column + 2)}[${depsText}]`
                  : `, [${depsText}]`
              );
            },
          },
        ],
      });
    } else if (hasDependencies) {
      const messageId =
        filteredSuggestedForReport.length > 1 ? 'missingDependencies' : 'missingDependency';

      if (getSeverity(messageId, context.options[0]) === 'off') {
        return;
      }

      context.report({
        node: reactiveHook,
        messageId:
          filteredSuggestedForReport.length > 1 ? 'missingDependencies' : 'missingDependency',
        data: {
          hookName: context.sourceCode.getText(
            'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
          ),
          dependencies: depsText,
          // Provide count for the pluralized missingDependencies message template
          dependenciesCount: filteredSuggestedForReport.length,
          dependency: filteredSuggestedForReport[0],
          reason:
            '\n  - The following values are used in the effect but not listed in the dependency array:' +
            filteredSuggestedForReport
              .map((dep: string): string => {
                return `\n    - '${dep}'`;
              })
              .join(''),
        },
        suggest: [
          {
            messageId: 'addDependencies',
            data: { dependencies: depsText, count: filteredSuggestedForReport.length },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              const insertPosition = (
                'arguments' in reactiveHook
                  ? reactiveHook.arguments[reactiveHook.arguments.length - 1]
                  : null
              )?.range[1];

              if (typeof insertPosition !== 'number') {
                return null;
              }

              return fixer.insertTextAfterRange(
                [insertPosition, insertPosition],
                /\n/.test(context.sourceCode.text.slice(insertPosition, reactiveHook.range[1]))
                  ? `,\n${' '.repeat(reactiveHook.loc.start.column + 2)}[${depsText}]`
                  : `, [${depsText}]`
              );
            },
          },
        ],
      });
    } else {
      // No deps array and no suggested deps: still offer inserting an empty array as a suggestion
      if (getSeverity('missingDependency', context.options[0]) === 'off') {
        return;
      }

      context.report({
        node: reactiveHook,
        messageId: 'missingDependency',
        data: {
          hookName: context.sourceCode.getText(
            'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
          ),
          dependency: '',
          dependencies: '',
          reason:
            '\n  - This effect has no dependency array. Add [] to make the dependency intent explicit.',
        },
        suggest: [
          {
            messageId: 'addDependencies',
            data: { dependencies: '', count: 0 },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              const insertPosition = (
                'arguments' in reactiveHook
                  ? reactiveHook.arguments[reactiveHook.arguments.length - 1]
                  : null
              )?.range[1];

              if (typeof insertPosition !== 'number') {
                return null;
              }

              return fixer.insertTextAfterRange(
                [insertPosition, insertPosition],
                /\n/.test(context.sourceCode.text.slice(insertPosition, reactiveHook.range[1]))
                  ? `,\n${' '.repeat(reactiveHook.loc.start.column + 2)}[]`
                  : `, []`
              );
            },
          },
        ],
      });
    }

    return;
  }

  if (
    isAutoDepsHook === true &&
    declaredDependenciesNode.type === 'Literal' &&
    declaredDependenciesNode.value === null
  ) {
    return;
  }

  const isTSAsArrayExpression =
    declaredDependenciesNode.type === 'TSAsExpression' &&
    declaredDependenciesNode.expression.type === 'ArrayExpression';

  if (declaredDependenciesNode.type !== 'ArrayExpression' && !isTSAsArrayExpression) {
    const suggestedDeps = Array.from(dependencies.entries())
      .filter(([_, dep]): boolean => {
        return dep.hasReads && dep.isComputedAssignmentOnly !== true;
      })
      .map(([key]): string => {
        return key;
      });

    if (getSeverity('notArrayLiteral', context.options[0]) === 'off') {
      return;
    }

    context.report({
      node: declaredDependenciesNode,
      messageId: 'notArrayLiteral',
      data: {
        hookName: context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        ),
        dependencies: suggestedDeps.join(', '),
        dependency: suggestedDeps[0] ?? '',
      },
      suggest: [
        {
          messageId: 'addDependencies',
          data: {
            dependencies: suggestedDeps.join(', '),
            count: suggestedDeps.length,
          },
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            return fixer.insertTextAfter(node, `, [${suggestedDeps.join(', ')}]`);
          },
        },
      ],
    });
  } else {
    const arrayExpression = isTSAsArrayExpression
      ? declaredDependenciesNode.expression
      : declaredDependenciesNode;

    if ('elements' in arrayExpression) {
      arrayExpression.elements.forEach((declaredDependencyNode): void => {
        if (declaredDependencyNode === null) {
          return;
        }

        if (declaredDependencyNode.type === AST_NODE_TYPES.SpreadElement) {
          if (getSeverity('spreadElementInDependencyArray', context.options[0]) === 'off') {
            return;
          }

          const spreadSource = context.sourceCode.getText(declaredDependencyNode.argument);

          context.report({
            node: declaredDependencyNode,
            messageId: 'spreadElementInDependencyArray',
            data: {
              hookName: context.sourceCode.getText(
                'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
              ),
              source: spreadSource,
            },
            suggest: [
              {
                messageId: 'removeDependency',
                data: { dependency: `...${spreadSource}` },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const [start, end] = declaredDependencyNode.range;

                  const prevToken = context.sourceCode.getTokenBefore(declaredDependencyNode);
                  const nextToken = context.sourceCode.getTokenAfter(declaredDependencyNode);

                  // Handle removing with surrounding commas if needed
                  let removeStart = start;
                  let removeEnd = end;

                  if (prevToken?.value === ',') {
                    removeStart = prevToken.range[0];
                  } else if (nextToken?.value === ',') {
                    removeEnd = nextToken.range[1];
                  }

                  return fixer.removeRange([removeStart, removeEnd]);
                },
              },
            ],
          });

          return;
        }

        if (
          'property' in declaredDependencyNode &&
          useEffectEventVariables.has(declaredDependencyNode)
        ) {
          if (getSeverity('useEffectEventInDependencyArray', context.options[0]) === 'off') {
            return;
          }

          const eventName = context.sourceCode.getText(declaredDependencyNode);

          context.report({
            node: declaredDependencyNode,
            messageId: 'useEffectEventInDependencyArray',
            data: {
              hookName: context.sourceCode.getText(
                'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
              ),
              eventName,
            },
            suggest: [
              {
                messageId: 'removeDependency',
                data: { dependency: eventName },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const [start, end] = declaredDependencyNode.range;

                  const prevToken = context.sourceCode.getTokenBefore(declaredDependencyNode);

                  const nextToken = context.sourceCode.getTokenAfter(declaredDependencyNode);

                  // Handle removing with surrounding commas if needed
                  let removeStart = start;
                  let removeEnd = end;

                  if (prevToken?.value === ',') {
                    removeStart = prevToken.range[0];
                  } else if (nextToken?.value === ',') {
                    removeEnd = nextToken.range[1];
                  }

                  return fixer.removeRange([removeStart, removeEnd]);
                },
              },
            ],
          });
        }

        let declaredDependency: string | undefined;

        try {
          const hookName = context.sourceCode.getText(
            'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
          );

          // Check for function calls or complex expressions
          if (
            declaredDependencyNode.type === AST_NODE_TYPES.CallExpression ||
            declaredDependencyNode.type === AST_NODE_TYPES.NewExpression ||
            (declaredDependencyNode.type === AST_NODE_TYPES.MemberExpression &&
              declaredDependencyNode.property.type === AST_NODE_TYPES.Identifier &&
              declaredDependencyNode.property.name === 'bind')
          ) {
            let message = '';
            let suggestion: SuggestionReportDescriptor<MessageIds> | null = null;

            if (declaredDependencyNode.type === AST_NODE_TYPES.CallExpression) {
              const calleeText = context.sourceCode.getText(declaredDependencyNode.callee);

              message =
                `Function call '${calleeText}()' in dependency array of '${hookName}'. ` +
                'This will cause the effect to re-run on every render. ' +
                'Move the function call inside the effect or memoize the result with useMemo.';

              // Suggest moving the call inside the effect
              suggestion = {
                messageId: 'moveInsideEffect',
                data: { call: `${calleeText}()` },
                fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                  if (node.body.type !== AST_NODE_TYPES.BlockStatement) {
                    return null;
                  }

                  const range = declaredDependencyNode.range;

                  const prevToken = context.sourceCode.getTokenBefore(declaredDependencyNode);

                  const nextToken = context.sourceCode.getTokenAfter(declaredDependencyNode);

                  // Handle removing with surrounding commas if needed
                  let removeStart = range[0];
                  let removeEnd = range[1];

                  if (prevToken?.value === ',') {
                    removeStart = prevToken.range[0];
                  } else if (nextToken?.value === ',') {
                    removeEnd = nextToken.range[1];
                  }

                  const removeFix = fixer.removeRange([removeStart, removeEnd]);

                  const insertFix = fixer.insertTextBefore(
                    node.body,
                    `\n  const result = ${context.sourceCode.getText(declaredDependencyNode)};\n`
                  );

                  return [removeFix, insertFix];
                },
              };
            } else if (declaredDependencyNode.type === AST_NODE_TYPES.NewExpression) {
              const constructorName = context.sourceCode.getText(declaredDependencyNode.callee);

              message =
                `Constructor call 'new ${constructorName}()' in dependency array of '${hookName}'. ` +
                'This will create a new instance on every render. ' +
                'Move the instantiation inside the effect or memoize it with useMemo.';
            } else if (
              declaredDependencyNode.property.type === AST_NODE_TYPES.Identifier &&
              declaredDependencyNode.property.name === 'bind'
            ) {
              const boundFunction = context.sourceCode.getText(declaredDependencyNode.object);

              message =
                `'.bind()' call on '${boundFunction}' in dependency array of '${hookName}'. ` +
                'This will create a new function on every render. ' +
                'Move the bind call outside the component or use useCallback.';
            }

            if (getSeverity('dependencyWithoutSignal', context.options[0]) === 'off') {
              return;
            }

            context.report({
              node: declaredDependencyNode,
              messageId: 'dependencyWithoutSignal',
              data: {
                message,
              },
              suggest: suggestion !== null ? [suggestion] : [],
            });

            return;
          }
        } catch (error: unknown) {
          console.error(`Error getting dependency text:`, error);
        }

        try {
          declaredDependency = analyzePropertyChain(declaredDependencyNode, null, context, perfKey);
        } catch (error: unknown) {
          if (error instanceof Error && /Unsupported node type/.test(error.message)) {
            if (declaredDependencyNode.type === AST_NODE_TYPES.Literal) {
              if (
                typeof declaredDependencyNode.value === 'string' &&
                dependencies.has(declaredDependencyNode.value)
              ) {
                if (getSeverity('staleAssignmentLiteral', context.options[0]) === 'off') {
                  return;
                }

                context.report({
                  node: declaredDependencyNode,
                  data: {
                    dependency: declaredDependencyNode.raw,
                    hookName: reactiveHookName,
                  },
                  messageId: 'staleAssignmentLiteral',
                  suggest: [
                    {
                      messageId: 'removeDependency',
                      data: {
                        dependency: declaredDependencyNode.raw,
                      },
                      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                        const [start, end] = declaredDependencyNode.range;
                        return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
                      },
                    },
                  ],
                });
              } else {
                if (getSeverity('staleAssignmentUnstable', context.options[0]) === 'off') {
                  return;
                }

                context.report({
                  messageId: 'staleAssignmentUnstable',
                  node: declaredDependencyNode,
                  data: {
                    dependency: declaredDependencyNode.raw,
                    hookName: reactiveHookName,
                  },
                  suggest: [
                    {
                      messageId: 'removeDependency',
                      data: {
                        dependency: declaredDependencyNode.raw,
                      },
                      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                        const [start, end] = declaredDependencyNode.range;
                        return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
                      },
                    },
                  ],
                });
              }
            } else {
              const nodeText = context.sourceCode.getText(declaredDependencyNode);

              if (getSeverity('staleAssignmentExpression', context.options[0]) === 'off') {
                return;
              }

              context.report({
                node: declaredDependencyNode,
                data: {
                  dependency: nodeText,
                  hookName: reactiveHookName,
                },
                messageId: 'staleAssignmentExpression',
                suggest: [
                  {
                    messageId: 'removeDependency',
                    data: {
                      dependency: nodeText,
                    },
                    fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                      const [start, end] = declaredDependencyNode.range;
                      return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
                    },
                  },
                ],
              });
            }

            return;
          }

          throw error;
        }

        let maybeID = declaredDependencyNode;

        while (
          [AST_NODE_TYPES.MemberExpression, AST_NODE_TYPES.ChainExpression].includes(maybeID.type)
        ) {
          maybeID =
            'object' in maybeID
              ? maybeID.object
              : 'expression' in maybeID
                ? typeof maybeID.expression === 'object' && 'object' in maybeID.expression
                  ? maybeID.expression.object
                  : maybeID
                : maybeID;
        }

        const isDeclaredInComponent =
          componentScope === null ||
          !componentScope.through.some((ref: Reference): boolean => {
            return ref.identifier === maybeID;
          });

        declaredDependencies.push({
          key: declaredDependency,
          node: declaredDependencyNode,
        });

        if (!isDeclaredInComponent) {
          externalDependencies.add(declaredDependency);
        }
      });
    }
  }

  const {
    suggestedDependencies,
    unnecessaryDependencies,
    missingDependencies,
    duplicateDependencies,
  } = collectRecommendations({
    dependencies,
    declaredDependencies,
    stableDependencies,
    externalDependencies,
    isEffect,
    reactiveHookName,
    context,
    perfKey,
  });

  let suggestedDeps = suggestedDependencies;

  // Ensure computed member signal reads are considered before any early return
  // This prevents the early-return path below from skipping legitimate missing deps
  // like piecePosMapSignal.value[id] when base .value is not explicitly declared.
  dependencies.forEach((dep: Dependency, key: string): void => {
    if (key.includes('.value[') && isSignalDependency(key.split('.')[0] ?? '', perfKey)) {
      const valueIndex = key.indexOf('.value[');

      if (
        valueIndex !== -1 &&
        !declaredDependencies.some(
          ({ key: depKey }: DeclaredDependency): boolean => depKey === key
        ) &&
        dep.hasReads !== false
      ) {
        if (key.includes('.') && isSignalDependency(key.split('.')[0] ?? '', perfKey)) {
          const parts = key.split('.');

          if (
            parts.length > 2 &&
            parts[1] === 'value' &&
            declaredDependencies.some(({ key }) => key === `${parts[0]}.value`)
          ) {
            return;
          }
        }

        if (
          !(
            dep.hasInnerScopeComputedProperty === true &&
            declaredDependencies.some(({ key: depKey }: DeclaredDependency): boolean => {
              return depKey === key.slice(0, valueIndex + 6);
            })
          )
        ) {
          if (
            !key.includes('.') &&
            !key.endsWith('.value') &&
            !isSignalDependency(key, perfKey) &&
            (declaredDependencies.some(({ key: dKey }: DeclaredDependency): boolean =>
              dKey.startsWith(`${key}.`)
            ) ||
              Array.from(missingDependencies).some((d: string): boolean => d.startsWith(`${key}.`)))
          ) {
            return;
          }

          missingDependencies.add(key);
        }
      }
    }
  });

  // Also include non-computed nested .value paths like fooSignal.value.bar when base .value is missing
  dependencies.forEach((_dep: Dependency, key: string): void => {
    if (!(isSignalDependency(key.split('.')[0] ?? '', perfKey) && key.includes('.'))) {
      return;
    }

    if (key.includes('[') && key.includes(']')) {
      return;
    }

    const parts = key.split('.');

    if (parts.length > 2 && parts[1] === 'value') {
      const dependency = dependencies.get(key);

      if (
        !declaredDependencies.some(({ key }) => key === `${parts[0]}.value`) &&
        (dependency && dependency.hasReads === false) !== true &&
        (dependency && dependency.hasInnerScopeComputedProperty === true) !== true
      ) {
        if (
          !key.includes('.') &&
          !key.endsWith('.value') &&
          !isSignalDependency(key, perfKey) &&
          (declaredDependencies.some(({ key: dKey }) => dKey.startsWith(`${key}.`)) ||
            Array.from(missingDependencies).some((d) => d.startsWith(`${key}.`)))
        ) {
          return;
        }

        missingDependencies.add(key);
      }
    }
  });

  if (duplicateDependencies.size + missingDependencies.size + unnecessaryDependencies.size === 0) {
    scanForConstructions({
      declaredDependencies,
      declaredDependenciesNode,
      componentScope,
      scope,
    }).forEach(
      ({
        construction,
        isUsedOutsideOfHook,
        depType,
      }: {
        construction: Definition;
        depType: string;
        isUsedOutsideOfHook: boolean;
      }): void => {
        const wrapperHook = depType === 'function' ? 'useCallback' : 'useMemo';

        const defaultAdvice = `wrap the ${depType === 'function' ? 'definition' : 'initialization'} of '${'name' in construction.name ? construction.name.name : construction.name.type}' in its own ${wrapperHook}() Hook.`;

        const message =
          `The '${'name' in construction.name ? construction.name.name : construction.name.type}' ${depType} ${depType === 'conditional' || depType === 'logical expression' ? 'could make' : 'makes'} the dependencies of ` +
          `${reactiveHookName} Hook (at line ${declaredDependenciesNode.loc.start.line}) ` +
          `change on every render. ${
            isUsedOutsideOfHook
              ? `To fix this, ${defaultAdvice}`
              : `Move it inside the ${reactiveHookName} callback. Alternatively, ${defaultAdvice}`
          }`;

        if (getSeverity('missingDependencies', context.options[0]) === 'off') {
          return;
        }

        // Filter missing dependencies by optional-chaining equivalence before reporting
        const filteredMissing = Array.from(missingDependencies).filter((dep: string): boolean => {
          return !declaredDependencies.some(({ key }: DeclaredDependency): boolean => {
            return pathsEquivalent(dep, key);
          });
        });

        if (filteredMissing.length === 0) {
          return;
        }

        context.report({
          node: construction.node,
          data: {
            hookName: reactiveHookName,
            dependencies: filteredMissing.join(', '),
            dependenciesCount: filteredMissing.length,
            message,
          },
          messageId: 'missingDependencies',
          suggest:
            isUsedOutsideOfHook && construction.type === 'Variable' && depType === 'function'
              ? [
                  {
                    messageId: 'missingDependencies',
                    data: {
                      hookName: reactiveHookName,
                      dependencies: filteredMissing.join(', '),
                      dependenciesCount: filteredMissing.length,
                      message,
                    },
                    fix(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> | null {
                      const [before, after] =
                        wrapperHook === 'useMemo'
                          ? ['useMemo(() => { return ', '; })']
                          : ['useCallback(', ')'];

                      if (construction.node.init == null) {
                        return null;
                      }

                      return [
                        fixer.insertTextBefore(construction.node.init, before),
                        fixer.insertTextAfter(construction.node.init, after),
                      ];
                    },
                  },
                ]
              : [],
        });
      }
    );

    return;
  }

  if (!isEffect && missingDependencies.size > 0) {
    const { suggestedDependencies } = collectRecommendations({
      dependencies,
      declaredDependencies,
      stableDependencies,
      externalDependencies,
      isEffect,
      reactiveHookName,
      context,
      perfKey,
    });

    suggestedDeps = suggestedDependencies;
  }

  if (areDeclaredDepsAlphabetized(declaredDependencies)) {
    suggestedDeps.sort();
  }

  let extraWarning = '';

  const unnecessaryDepsList = Array.from(unnecessaryDependencies);

  if (unnecessaryDepsList.length > 0) {
    const badRef = unnecessaryDepsList.find((key) => key.endsWith('.current'));

    const externalDep = externalDependencies.size > 0 ? Array.from(externalDependencies)[0] : null;

    if (typeof badRef !== 'undefined') {
      extraWarning = ` Mutable values like '${badRef}' aren't valid dependencies because mutating them doesn't re-render the component.`;
    } else if (
      typeof externalDep !== 'undefined' &&
      externalDep !== null &&
      !scope.set.has(externalDep)
    ) {
      extraWarning = ` Outer scope values like '${externalDep}' aren't valid dependencies because mutating them doesn't re-render the component.`;
    }

    unnecessaryDepsList.forEach((depKey: string): void => {
      const depNode = dependencies.get(depKey)?.node;

      if (typeof depNode === 'undefined') {
        return;
      }

      const messageId =
        unnecessaryDepsList.length > 1 ? 'unnecessaryDependencies' : 'unnecessaryDependency';

      if (getSeverity(messageId, context.options[0]) === 'off') {
        return;
      }

      context.report({
        node: depNode,
        messageId,
        data: {
          hookName: context.sourceCode.getText(
            'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
          ),
          dependencies: unnecessaryDepsList.join(', '),
          dependency: depKey,
          count: unnecessaryDepsList.length,
          message:
            getWarningMessage(
              unnecessaryDependencies,
              'an',
              'unnecessary',
              'exclude',
              optionalChains,
              dependencies
            ) ?? '',
        },
        suggest: [
          {
            messageId: 'removeDependency',
            data: { dependency: depKey },
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              const [start, end] = depNode.range;
              // const text = sourceCode.getText(depNode);
              const prevToken = context.sourceCode.getTokenBefore(depNode);
              const nextToken = context.sourceCode.getTokenAfter(depNode);

              // Handle removing with surrounding commas if needed
              let removeStart = start;
              let removeEnd = end;

              if (prevToken?.value === ',') {
                removeStart = prevToken.range[0];
              } else if (nextToken?.value === ',') {
                removeEnd = nextToken.range[1];
              }

              return fixer.removeRange([removeStart, removeEnd]);
            },
          },
        ],
      });
    });
  }

  if (!extraWarning && missingDependencies.has('props')) {
    const propDep = dependencies.get('props');

    if (typeof propDep === 'undefined') {
      return;
    }

    if (!Array.isArray(propDep.references)) {
      return;
    }

    let isPropsOnlyUsedInMembers = true;

    for (const ref of propDep.references) {
      if (componentScope == null) {
        isPropsOnlyUsedInMembers = false;

        break;
      }

      const id = fastFindReferenceWithParent(componentScope.block, ref.identifier);

      if (id === null) {
        isPropsOnlyUsedInMembers = false;

        break;
      }

      if (id.parent == null) {
        isPropsOnlyUsedInMembers = false;

        break;
      }

      if (id.parent.type !== 'MemberExpression') {
        isPropsOnlyUsedInMembers = false;

        break;
      }
    }

    if (isPropsOnlyUsedInMembers) {
      extraWarning = ` However, 'props' will change when *any* prop changes, so the preferred fix is to destructure the 'props' object outside of the ${reactiveHookName} call and refer to those specific props inside ${context.sourceCode.getText(reactiveHook)}.`;
    }
  }

  if (!extraWarning && missingDependencies.size > 0) {
    let missingCallbackDep: string | null = null;

    missingDependencies.forEach((missingDep: string): void => {
      if (missingCallbackDep !== null && missingCallbackDep !== '') {
        return;
      }

      const topScopeRef = componentScope?.set.get(missingDep);

      if (typeof topScopeRef === 'undefined') {
        return;
      }

      const usedDep = dependencies.get(missingDep);

      if (!usedDep?.references || usedDep.references[0]?.resolved !== topScopeRef) {
        return;
      }

      const def: Definition | undefined = topScopeRef.defs[0];

      if (def?.name == null || def.type !== 'Parameter') {
        return;
      }

      let isFunctionCall = false;

      for (const reference of usedDep.references) {
        if (
          reference.identifier.parent.type === 'CallExpression' &&
          reference.identifier.parent.callee === reference.identifier
        ) {
          isFunctionCall = true;

          break;
        }
      }

      if (!isFunctionCall) {
        return;
      }

      missingCallbackDep = missingDep;
    });

    if (typeof missingCallbackDep === 'string' && missingCallbackDep !== '') {
      extraWarning = ` If '${missingCallbackDep}' changes too often, find the parent component that defines it and wrap that definition in useCallback.`;
    }
  }

  if (!extraWarning && missingDependencies.size > 0) {
    dependencies.forEach((dep: Dependency, key: string): void => {
      if (key.includes('.value[') && isSignalDependency(key.split('.')[0] ?? '', perfKey)) {
        const valueIndex = key.indexOf('.value[');

        if (
          valueIndex !== -1 &&
          !declaredDependencies.some(({ key: depKey }: DeclaredDependency): boolean => {
            return depKey === key;
          }) &&
          dep.hasReads !== false
        ) {
          if (key.includes('.') && isSignalDependency(key.split('.')[0] ?? '', perfKey)) {
            const parts = key.split('.');

            if (
              parts.length > 2 &&
              parts[1] === 'value' &&
              declaredDependencies.some(({ key }) => {
                return key === `${parts[0]}.value`;
              })
            ) {
              return;
            }
          }

          if (
            !(
              dep.hasInnerScopeComputedProperty === true &&
              declaredDependencies.some(({ key: depKey }: DeclaredDependency): boolean => {
                return depKey === key.slice(0, valueIndex + 6);
              })
            )
          ) {
            if (
              !key.includes('.') &&
              !key.endsWith('.value') &&
              !isSignalDependency(key, perfKey) &&
              (declaredDependencies.some(({ key: dKey }: DeclaredDependency): boolean => {
                return dKey.startsWith(`${key}.`);
              }) ||
                Array.from(missingDependencies).some((d: string): boolean => {
                  return d.startsWith(`${key}.`);
                }))
            ) {
              return;
            }

            missingDependencies.add(key);
          }
        }
      }
    });
  }

  if (!extraWarning && missingDependencies.size > 0) {
    dependencies.forEach((_dep: Dependency, key: string): void => {
      if (!(isSignalDependency(key.split('.')[0] ?? '', perfKey) && key.includes('.'))) {
        return;
      }

      if (key.includes('[') && key.includes(']')) {
        return;
      }

      const parts = key.split('.');

      if (parts.length > 2 && parts[1] === 'value') {
        const dependency = dependencies.get(key);

        if (
          !declaredDependencies.some(({ key }) => {
            return key === `${parts[0]}.value`;
          }) &&
          (dependency && dependency.hasReads === false) !== true &&
          (dependency && dependency.hasInnerScopeComputedProperty === true) !== true
        ) {
          if (
            !key.includes('.') &&
            !key.endsWith('.value') &&
            !isSignalDependency(key, perfKey) &&
            (declaredDependencies.some(({ key: dKey }) => dKey.startsWith(`${key}.`)) ||
              Array.from(missingDependencies).some((d) => d.startsWith(`${key}.`)))
          ) {
            return;
          }

          missingDependencies.add(key);
        }
      }
    });
  }

  // Report each duplicate dependency
  if (duplicateDependencies.size > 0) {
    const duplicateDepsList = Array.from(duplicateDependencies);

    // Group duplicate dependencies by their base name to find all occurrences
    const duplicatesByKey = new Map<string, Array<TSESTree.Node>>();

    for (const depKey of duplicateDepsList) {
      const depNode = dependencies.get(depKey)?.node;

      if (depNode) {
        const baseKey = depKey.split('.')[0]; // Get the base key without property access

        if (typeof baseKey === 'undefined') {
          continue;
        }

        if (!duplicatesByKey.has(baseKey)) {
          duplicatesByKey.set(baseKey, []);
        }

        duplicatesByKey.get(baseKey)?.push(depNode);
      }
    }

    // Report each group of duplicates
    for (const [baseKey, nodes] of duplicatesByKey.entries()) {
      if (nodes.length > 1) {
        // Report all but the first occurrence as duplicates
        for (let i = 1; i < nodes.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const node = nodes[i];

          if (typeof node === 'undefined') {
            continue;
          }

          const messageId =
            duplicateDepsList.length > 1 ? 'duplicateDependencies' : 'duplicateDependency';

          if (getSeverity(messageId, context.options[0]) === 'off') {
            return;
          }

          context.report({
            node,
            messageId,
            data: {
              hookName: context.sourceCode.getText(
                'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
              ),
              dependencies: baseKey,
              dependency: baseKey,
            },
            suggest: [
              {
                messageId: 'removeDependency',
                data: { dependency: baseKey },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const [start, end] = node.range;

                  const prevToken = context.sourceCode.getTokenBefore(node);
                  const nextToken = context.sourceCode.getTokenAfter(node);

                  // Handle removing with surrounding commas if needed
                  let removeStart = start;
                  let removeEnd = end;

                  if (prevToken?.value === ',') {
                    removeStart = prevToken.range[0];
                  } else if (nextToken?.value === ',') {
                    removeEnd = nextToken.range[1];
                  }

                  return fixer.removeRange([removeStart, removeEnd]);
                },
              },
            ],
          });
        }
      }
    }
  }

  // Do not report a missing dependency if it is exactly declared already (no normalization)
  declaredDependencies.forEach(({ key }: DeclaredDependency): void => {
    if (missingDependencies.has(key)) {
      missingDependencies.delete(key);
    }
  });

  // Also remove missing deps that are equivalent under optional chaining to any declared dep
  // e.g., treat obj.value?.a?.b and obj.value.a.b as the same path for reporting
  if (missingDependencies.size > 0 && declaredDependencies.length > 0) {
    Array.from(missingDependencies).forEach((m: string): void => {
      const hasEquivalent = declaredDependencies.some(({ key }: DeclaredDependency): boolean => {
        return pathsEquivalent(m, key);
      });

      if (hasEquivalent) {
        missingDependencies.delete(m);
      }
    });
  }

  const missingDepsList = Array.from(missingDependencies);

  // Report missing dependencies if any
  if (missingDepsList.length > 0) {
    const isEffect = /use(Effect|LayoutEffect|InsertionEffect|ImperativeHandle)/.test(
      reactiveHookName
    );

    const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

    // Suggestion 1: Add all missing dependencies
    if (suggestedDependencies.length > 0) {
      suggestions.push({
        messageId: 'addAllDependencies',
        data: {
          count: missingDepsList.length,
          dependencies: missingDepsList
            .map((d: string): string => {
              return `'${d}'`;
            })
            .join(', '),
        },
        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
          const sourceText = context.sourceCode.getText(declaredDependenciesNode);

          // eslint-disable-next-line optimize-regex/optimize-regex
          const hasTrailingComma = /,\s*\]$/.test(sourceText.trim());

          const innerIndent = ' '.repeat(declaredDependenciesNode.loc.start.column + 2);

          const items = suggestedDependencies.map((d: string): string => {
            return formatDependency(d, optionalChains);
          });

          return fixer.replaceText(
            declaredDependenciesNode,
            /\n/.test(sourceText)
              ? `[\n${innerIndent}${items.join(`,\n${innerIndent}`)}${hasTrailingComma ? ',' : ''}\n${' '.repeat(declaredDependenciesNode.loc.start.column)}]`
              : `[${items.join(', ')}${hasTrailingComma ? ',' : ''}]`
          );
        },
      });
    }

    // Suggestion 2: Add each missing dependency individually
    missingDepsList.forEach((dep: string): void => {
      const newDeps = new Set(declaredDependencies.map((d) => d.key));

      newDeps.add(dep);

      suggestions.push({
        messageId: 'addSingleDependency',
        data: {
          dependency: dep,
        },
        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
          const depsArray = Array.from(newDeps).map((d: string): string => {
            return formatDependency(d, optionalChains);
          });

          const sourceText = context.sourceCode.getText(declaredDependenciesNode);

          // eslint-disable-next-line optimize-regex/optimize-regex
          const hasTrailingComma = /,\s*\]$/.test(sourceText.trim());

          const innerIndent = ' '.repeat(declaredDependenciesNode.loc.start.column + 2);

          return fixer.replaceText(
            declaredDependenciesNode,
            /\n/.test(sourceText)
              ? `[\n${innerIndent}${depsArray.join(`,\n${innerIndent}`)}${hasTrailingComma ? ',' : ''}\n${' '.repeat(declaredDependenciesNode.loc.start.column)}]`
              : `[${depsArray.join(', ')}${hasTrailingComma ? ',' : ''}]`
          );
        },
      });
    });

    // Suggestion 3: If it's an effect, suggest removing dependency array
    if (isEffect) {
      suggestions.push({
        messageId: 'removeDependencyArray',
        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
          const [start] = declaredDependenciesNode.range;
          const prevToken = context.sourceCode.getTokenBefore(declaredDependenciesNode);

          return fixer.removeRange([
            prevToken?.value === ',' ? prevToken.range[0] : start,
            declaredDependenciesNode.range[1],
          ]);
        },
      });
    }

    // Main report
    const messageId = missingDepsList.length > 1 ? 'missingDependencies' : 'missingDependency';

    // Format dependencies with optional chaining exactly as used in code
    const formattedMissing = missingDepsList.map((d: string): string => {
      return getObservedFormatted(d, optionalChains, dependencies);
    });

    if (getSeverity(messageId, context.options[0]) === 'off') {
      return;
    }

    context.report({
      node: declaredDependenciesNode,
      messageId,
      data: {
        hookName: reactiveHookName,
        dependencies: formattedMissing.join(', '),
        dependency: formattedMissing[0] ?? '',
        count: missingDepsList.length,
        dependenciesCount: missingDepsList.length,
        missingMessage:
          getWarningMessage(
            missingDependencies,
            'a',
            'missing',
            'include',
            optionalChains,
            dependencies
          ) ?? '',
      },
      // Non-suggest autofix for memo/callback when explicitly enabled
      fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
        const opts = context.options[0];

        if (isEffect || opts?.enableAutoFixForMemoAndCallback !== true) {
          return null;
        }

        // Only autofix when we have suggestions we can confidently apply
        if (suggestedDependencies.length === 0) {
          return null;
        }

        const sourceText = context.sourceCode.getText(declaredDependenciesNode);
        // eslint-disable-next-line optimize-regex/optimize-regex
        const hasTrailingComma = /,\s*\]$/.test(sourceText.trim());
        const innerIndent = ' '.repeat(declaredDependenciesNode.loc.start.column + 2);
        const items = suggestedDependencies.map((d: string): string => {
          return formatDependency(d, optionalChains);
        });

        return fixer.replaceText(
          declaredDependenciesNode,
          /\n/.test(sourceText)
            ? `[\n${innerIndent}${items.join(`,\n${innerIndent}`)}${hasTrailingComma ? ',' : ''}\n${' '.repeat(declaredDependenciesNode.loc.start.column)}]`
            : `[${items.join(', ')}${hasTrailingComma ? ',' : ''}]`
        );
      },
      suggest: suggestions,
    });
  }

  // Report unnecessary dependencies if any
  if (unnecessaryDependencies.size > 0) {
    const unnecessaryDepsList = Array.from(unnecessaryDependencies);

    const allDeps = Array.from(dependencies.keys());

    // Get the text of the entire dependency array for more precise replacements
    const depsText = context.sourceCode.getText(declaredDependenciesNode);

    const unnecessaryMessage = getWarningMessage(
      unnecessaryDependencies,
      'an',
      'unnecessary',
      'exclude',
      optionalChains,
      dependencies
    );

    // Add a summary message as the first report
    if (typeof unnecessaryMessage === 'string' && unnecessaryMessage !== '') {
      const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];

      // Only suggest removing all if we can safely do so
      if (
        depsText.startsWith('[') &&
        depsText.endsWith(']') &&
        allDeps.length > unnecessaryDepsList.length
      ) {
        suggestions.push({
          messageId: 'removeAllUnnecessaryDependencies',
          data: {
            count: unnecessaryDepsList.length,
            dependencies: unnecessaryDepsList.map((d) => `'${d}'`).join(', '),
          },
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            const kept = allDeps
              .filter((key: string): boolean => {
                return !unnecessaryDependencies.has(key);
              })
              .map((key: string): string => {
                return formatDependency(key, optionalChains);
              });

            const sourceText = context.sourceCode.getText(declaredDependenciesNode);

            // eslint-disable-next-line optimize-regex/optimize-regex
            const hasTrailingComma = /,\s*\]$/.test(sourceText.trim());

            const innerIndent = ' '.repeat(declaredDependenciesNode.loc.start.column + 2);

            return fixer.replaceText(
              declaredDependenciesNode,
              /\n/.test(sourceText)
                ? `[\n${innerIndent}${kept.join(`,\n${innerIndent}`)}${hasTrailingComma ? ',' : ''}\n${' '.repeat(declaredDependenciesNode.loc.start.column)}]`
                : `[${kept.join(', ')}${hasTrailingComma ? ',' : ''}]`
            );
          },
        });
      }

      const messageId =
        unnecessaryDepsList.length > 1 ? 'unnecessaryDependencies' : 'unnecessaryDependency';

      if (getSeverity(messageId, context.options[0]) !== 'off') {
        context.report({
          node: declaredDependenciesNode,
          messageId,
          data: {
            hookName: context.sourceCode.getText(
              'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
            ),
            dependencies: unnecessaryDepsList.join(', '),
            dependency: unnecessaryDepsList[0] ?? '',
            count: unnecessaryDepsList.length,
            message: unnecessaryMessage,
          },
          suggest: suggestions,
        });
      }
    }

    // Report each unnecessary dependency individually with precise fixes
    unnecessaryDepsList.forEach((depKey: string): void => {
      const depNode = dependencies.get(depKey)?.node;

      if (typeof depNode === 'undefined') {
        return;
      }

      const suggestions: Array<SuggestionReportDescriptor<MessageIds>> = [];
      // const nodeText = sourceCode.getText(depNode);

      // Find the exact range of this dependency in the source
      const depIndex = allDeps.indexOf(depKey);

      // Calculate the exact range to remove, including surrounding commas and whitespace
      let removeStart = depNode.range[0];
      let removeEnd = depNode.range[1];

      // Get the tokens around this dependency
      const tokens = context.sourceCode.getTokens(declaredDependenciesNode);

      const depTokenIndex = tokens.findIndex((t: TSESTree.Token): boolean => {
        return t.range[0] === depNode.range[0];
      });

      // Include leading comma if not the first item
      if (depIndex !== 0 && depTokenIndex > 0) {
        const prevToken = tokens[depTokenIndex - 1];

        if (prevToken?.value === ',') {
          removeStart = prevToken.range[0];
        }

        // Include any whitespace before the dependency
        const prevTokenEnd = depTokenIndex > 1 ? tokens[depTokenIndex - 1]?.range[1] : 0;

        if (
          typeof prevTokenEnd === 'number' &&
          /^\s+$/.test(context.sourceCode.text.slice(prevTokenEnd, removeStart))
        ) {
          removeStart = prevTokenEnd;
        }
      }

      // Include trailing comma if not the last item
      if (depIndex !== allDeps.length - 1 && depTokenIndex < tokens.length - 1) {
        const nextToken = tokens[depTokenIndex + 1];

        if (nextToken?.value === ',') {
          removeEnd = nextToken.range[1];
        }
      }

      // Add suggestion to remove this specific dependency
      suggestions.push({
        messageId: 'removeSingleDependency',
        data: { dependency: depKey },
        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
          return fixer.removeRange([removeStart, removeEnd]);
        },
      });

      // Add the main report for this dependency
      const messageId = 'unnecessaryDependency';

      if (getSeverity(messageId, context.options[0]) !== 'off') {
        context.report({
          node: depNode,
          messageId,
          data: {
            hookName: context.sourceCode.getText(
              'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
            ),
            dependency: depKey,
            message: unnecessaryMessage ?? '',
          },
          suggest: suggestions,
        });
      }
    });
  }

  // Report duplicate dependencies if any
  if (duplicateDependencies.size <= 0) {
    return;
  }

  // Cache for normalized keys to avoid repeated string operations
  const keyCache = new Map<string, string>();

  function normalizeKey(key: string): string | undefined {
    if (!keyCache.has(key)) {
      // Remove array indices and whitespace in one pass
      // eslint-disable-next-line optimize-regex/optimize-regex
      const normalized = key.replace(/\s+|\[\d+\]/g, '');

      keyCache.set(key, normalized);
    }

    return keyCache.get(key);
  }

  // Single pass to collect all dependencies and their normalized keys
  const allDeps = Array.from(dependencies.entries());

  const normalizedMap = new Map<string, Array<{ original: string; node: TSESTree.Node }>>();

  for (const [depKey, dep] of allDeps) {
    const normalizedKey = normalizeKey(depKey);

    if (typeof normalizedKey === 'undefined' || normalizedKey === '') {
      continue;
    }

    if (!normalizedMap.has(normalizedKey)) {
      normalizedMap.set(normalizedKey, []);
    }

    normalizedMap.get(normalizedKey)?.push({ original: depKey, node: dep.node });
  }

  // Filter to only include duplicates (more than one entry per normalized key)
  const duplicates = Array.from(normalizedMap.entries())
    .filter(([_, entries]) => {
      return entries.length > 1;
    })
    .flatMap(([_, entries]) => {
      return entries;
    });

  if (duplicates.length <= 0) {
    return;
  }

  // Group by original key for reporting
  const duplicateGroups = new Map<string, Array<(typeof duplicates)[number]>>();

  for (const entry of duplicates) {
    if (!duplicateGroups.has(entry.original)) {
      duplicateGroups.set(entry.original, []);
    }

    duplicateGroups.get(entry.original)?.push(entry);
  }

  // Get unique duplicate keys for the summary message
  const uniqueDuplicateKeys = Array.from(duplicateGroups.keys());

  // Report the summary
  const messageId =
    uniqueDuplicateKeys.length === 1 ? 'duplicateDependency' : 'duplicateDependencies';

  if (getSeverity(messageId, context.options[0]) !== 'off') {
    context.report({
      node: declaredDependenciesNode,
      messageId,
      data: {
        hookName: context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        ),
        dependencies: uniqueDuplicateKeys.join(', '),
        dependency: uniqueDuplicateKeys[0],
        count: uniqueDuplicateKeys.length,
      },
      suggest: [
        {
          messageId: 'removeAllDuplicates',
          data: { count: uniqueDuplicateKeys.length },
          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
            // Create a set of all original dependency keys to keep (first occurrence of each normalized key)
            const seen = new Set<string>();

            const depsToKeep: Array<string> = [];

            for (const [depKey] of allDeps) {
              const normalized = normalizeKey(depKey);

              if (typeof normalized === 'undefined' || normalized === '') {
                continue;
              }

              if (!seen.has(normalized)) {
                seen.add(normalized);

                depsToKeep.push(depKey);
              }
            }

            const replaced = depsToKeep.map((depKey: string): string => {
              return formatDependency(depKey, optionalChains);
            });

            const sourceText = context.sourceCode.getText(declaredDependenciesNode);

            // eslint-disable-next-line optimize-regex/optimize-regex
            const hasTrailingComma = /,\s*\]$/.test(sourceText.trim());

            const innerIndent = ' '.repeat(declaredDependenciesNode.loc.start.column + 2);

            return fixer.replaceText(
              declaredDependenciesNode,
              /\n/.test(sourceText)
                ? `[\n${innerIndent}${replaced.join(`,\n${innerIndent}`)}${hasTrailingComma ? ',' : ''}\n${' '.repeat(declaredDependenciesNode.loc.start.column)}]`
                : `[${replaced.join(', ')}${hasTrailingComma ? ',' : ''}]`
            );
          },
        },
      ],
    });
  }
}

function getSeverity(messageId: MessageIds, option: Option | undefined): 'error' | 'warn' | 'off' {
  if (!option?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'missingDependencies': {
      return option.severity.missingDependencies ?? 'error';
    }

    case 'missingDependency': {
      return option.severity.missingDependency ?? 'error';
    }

    case 'unnecessaryDependencies': {
      return option.severity.unnecessaryDependencies ?? 'error';
    }

    case 'unnecessaryDependency': {
      return option.severity.unnecessaryDependency ?? 'error';
    }

    case 'duplicateDependency': {
      return option.severity.duplicateDependency ?? 'error';
    }

    case 'duplicateDependencies': {
      return option.severity.duplicateDependencies ?? 'error';
    }

    case 'unknownDependencies': {
      return option.severity.unknownDependencies ?? 'error';
    }

    case 'asyncEffect': {
      return option.severity.asyncEffect ?? 'error';
    }

    case 'missingEffectCallback': {
      return option.severity.missingEffectCallback ?? 'error';
    }

    case 'staleAssignmentDependency': {
      return option.severity.staleAssignmentDependency ?? 'error';
    }

    case 'staleAssignmentLiteral': {
      return option.severity.staleAssignmentLiteral ?? 'error';
    }

    case 'staleAssignmentExpression': {
      return option.severity.staleAssignmentExpression ?? 'error';
    }

    case 'staleAssignmentUnstable': {
      return option.severity.staleAssignmentUnstable ?? 'error';
    }

    case 'spreadElementInDependencyArray': {
      return option.severity.spreadElementInDependencyArray ?? 'error';
    }

    case 'useEffectEventInDependencyArray': {
      return option.severity.useEffectEventInDependencyArray ?? 'error';
    }

    case 'addAllDependencies': {
      return option.severity.addAllDependencies ?? 'error';
    }

    case 'addSingleDependency': {
      return option.severity.addSingleDependency ?? 'error';
    }

    case 'removeDependencyArray': {
      return option.severity.removeDependencyArray ?? 'error';
    }

    case 'removeDependency': {
      return option.severity.removeDependency ?? 'error';
    }

    case 'removeSingleDependency': {
      return option.severity.removeSingleDependency ?? 'error';
    }

    case 'removeAllDuplicates': {
      return option.severity.removeAllDuplicates ?? 'error';
    }

    case 'removeAllUnnecessaryDependencies': {
      return option.severity.removeAllUnnecessaryDependencies ?? 'error';
    }

    case 'removeThisDuplicate': {
      return option.severity.removeThisDuplicate ?? 'error';
    }

    case 'dependencyWithoutSignal': {
      return option.severity.dependencyWithoutSignal ?? 'error';
    }

    case 'notArrayLiteral': {
      return option.severity.notArrayLiteral ?? 'error';
    }

    case 'moveInsideEffect': {
      return option.severity.moveInsideEffect ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

const ruleName = 'exhaustive-deps';

export const exhaustiveDepsRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Ensures that all dependencies used in React Hooks are properly specified in their dependency arrays. This rule helps prevent bugs caused by missing or incorrect dependencies in useEffect, useMemo, useCallback, and other React Hooks.',
      url: getRuleDocUrl(ruleName),
    },
    messages: {
      missingDependencies:
        "React Hook {{hookName}} is missing {{dependenciesCount}} dependencies: '{{dependencies}}'. " +
        'Including all dependencies ensures your effect runs when expected. ' +
        'Either add the missing dependencies or remove the dependency array if this effect should run on every render.\n' +
        '\n' +
        'Why this matters:\n' +
        '• Missing dependencies can cause your effect to use stale values from previous renders\n' +
        "• This can lead to bugs where your UI doesn't update when expected\n" +
        '• The effect may run more or less often than intended',

      missingDependency:
        "React Hook '{{hookName}}' is missing the dependency: '{{dependency}}'. " +
        'This dependency is used inside the effect but not listed in the dependency array.\n' +
        '\n' +
        'Impact:\n' +
        '• The effect might not re-run when this value changes\n' +
        '• The effect could use stale values from previous renders\n' +
        '• This can lead to UI inconsistencies\n' +
        '\n' +
        "'{{missingMessage}}'",

      unnecessaryDependencies:
        "React Hook '{{hookName}}' has {{count}} unnecessary dependencies: '{{dependencies}}'. " +
        'These values are either constants or defined outside the component and will never change.\n' +
        '\n' +
        'Recommendation:\n' +
        '• Remove these dependencies to make the effect more maintainable\n' +
        '• This helps React optimize re-renders\n' +
        '\n' +
        "'{{message}}'",

      unnecessaryDependency:
        "React Hook '{{hookName}}' has an unnecessary dependency: '{{dependency}}'. " +
        'This value is either a constant or defined outside the component and will never change.\n' +
        '\n' +
        'Why remove it?\n' +
        '• Makes the dependency array more accurate\n' +
        '• Helps React optimize re-renders\n' +
        '• Reduces unnecessary effect re-runs\n' +
        '\n' +
        "'{{message}}'",

      duplicateDependencies:
        "React Hook '{{hookName}}' has {{count}} duplicate dependencies: '{{dependencies}}'. " +
        'This can cause unexpected behavior and unnecessary re-renders.\n' +
        '\n' +
        'Impact:\n' +
        '• The effect may run more times than necessary\n' +
        '• Can lead to performance issues\n' +
        '• Makes the code harder to reason about',

      duplicateDependency:
        "React Hook '{{hookName}}' has a duplicate dependency: '{{dependency}}' ({{position}} of {{total}}) " +
        'This can cause unexpected behavior and unnecessary re-renders.\n' +
        '\n' +
        'Why remove duplicates?\n' +
        '• Ensures the effect runs only when necessary\n' +
        '• Improves performance\n' +
        '• Makes the code more maintainable',

      unknownDependencies:
        "React Hook '{{hookName}}' has dependencies that cannot be statically analyzed. " +
        'This can happen when using dynamic property access or function calls in the dependency array.\n' +
        '\n' +
        'How to fix:\n' +
        '• Use static, direct references in dependency arrays\n' +
        '• Extract dynamic values to variables before using them in the effect\n' +
        '• Consider using useCallback or useMemo for dynamic values',

      asyncEffect:
        "React Hook '{{hookName}}' has an async effect callback. " +
        'Async effects can lead to race conditions and memory leaks.\n' +
        '\n' +
        'Recommended pattern:\n' +
        'useEffect(() => {\n' +
        '  let isMounted = true;\n' +
        '  const fetchData = async () => {\n' +
        '    try {\n' +
        '      const result = await someAsyncOperation();\n' +
        '      if (isMounted) {\n' +
        '        setData(result);\n' +
        '      }\n' +
        '    } catch (error) {\n' +
        '      // Handle error\n' +
        '    }\n' +
        '  };\n' +
        '  \n' +
        '  fetchData();\n' +
        '  \n' +
        '  return () => { isMounted = false; };\n' +
        '}, [/* dependencies */]);',

      missingEffectCallback:
        "React Hook '{{hookName}}' is missing its effect callback function. " +
        'The first argument must be a function that contains the effect logic.\n' +
        '\n' +
        'Correct usage:\n' +
        'useEffect(() => {\n' +
        '  // Your effect logic here\n' +
        '  return () => {\n' +
        '    // Cleanup logic (optional)\n' +
        '  };\n' +
        '}, [dependencies]);',

      staleAssignmentDependency:
        "The variable '{{dependency}}' is used in the dependency array for '{{hookName}}' but may not be properly tracked.\n\n" +
        'Why this is problematic:\n' +
        '• The effect might use outdated values\n' +
        '• Changes to this variable might not trigger effect re-runs\n\n' +
        'Solution: Ensure the variable is properly included in the dependency array or wrap it with useMemo/useCallback.',

      staleAssignmentLiteral:
        "The literal value '{{dependency}}' is used in the dependency array for '{{hookName}}'.\n\n" +
        'Why this is problematic:\n' +
        '• Literal values create new references on each render\n' +
        '• This can cause the effect to re-run on every render\n\n' +
        'Solution: Move the value outside the component or memoize it with useMemo if needed.',

      staleAssignmentUnstable:
        "The value '{{dependency}}' is used in the dependency array for '{{hookName}}' but may change on every render.\n\n" +
        'Why this is problematic:\n' +
        '• This can cause the effect to re-run on every render\n' +
        '• May lead to performance issues\n\n' +
        'Solution: Move the value outside the component or memoize it with useMemo.',

      staleAssignmentExpression:
        "The expression '{{dependency}}' is used in the dependency array for '{{hookName}}'.\n\n" +
        'Why this is problematic:\n' +
        '• Complex expressions are re-evaluated on every render\n' +
        '• This can lead to unnecessary effect re-runs\n\n' +
        'Solution: Extract the expression to a variable outside the dependency array or memoize it with useMemo.',

      spreadElementInDependencyArray:
        'Spread elements ("...") are not allowed in dependency arrays. ' +
        'They can cause the effect to re-run more often than necessary.\n' +
        '\n' +
        'Instead of:\n' +
        'useEffect(() => { ... }, [...deps, extraDep]);\n' +
        '\n' +
        'Try:\n' +
        'useEffect(() => { ... }, [...deps, extraDep]); // Explicitly list all dependencies',

      useEffectEventInDependencyArray:
        "The useEffectEvent function '{{eventName}}' should not be included in the dependency array. " +
        'useEffectEvent functions are stable and never change between re-renders.\n' +
        '\n' +
        'Correct usage:\n' +
        'const onEvent = useEffectEvent(() => {\n' +
        '  // Event handler logic\n' +
        '});\n' +
        '\n' +
        'useEffect(() => {\n' +
        '  // No need to include onEvent in dependencies\n' +
        '  const subscription = someObservable.subscribe(onEvent);\n' +
        '  return () => subscription.unsubscribe();\n' +
        '}, []); // No need to include onEvent here',

      addDependencies: "Add '{{count}}' missing dependencies {{dependencies}}",
      addAllDependencies: "Add all '{{count}}' missing dependencies {{dependencies}}",
      addSingleDependency: "Add missing dependency: '{{dependency}}'",
      removeDependencyArray: 'Remove dependency array to run effect on every render',

      removeDependency: "Remove the '{{dependency}}' dependency from the dependency array. ",
      removeSingleDependency: "Remove the '{{dependency}}' dependency",
      removeAllUnnecessaryDependencies:
        "Remove all '{{count}}' unnecessary dependencies {{dependencies}}",
      removeThisDuplicate: "Remove this duplicate '{{dependency}}'",
      removeAllDuplicates: "Remove all '{{count}}' duplicate dependencies",

      dependencyWithoutSignal: "'{{message}}'",

      moveInsideEffect: "Move '{{call}}' inside the effect",

      notArrayLiteral:
        'React Hook {{hookName}} expects an array literal as its dependency array. ' +
        'The provided value is not an array literal.\n\n' +
        'Expected: {{hookName}}(() => { ... }, [{{dependencies}}])\n\n' +
        'Why this matters:\n' +
        '• Array literals allow React to properly track dependencies\n' +
        "• Non-array values won't trigger effect re-runs correctly\n" +
        '• This can lead to stale closures and unexpected behavior',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          additionalHooks: {
            type: 'string',
            description: 'Pattern for additional hooks that should be checked',
          },
          unsafeAutofix: {
            type: 'boolean',
            description: 'Enable potentially dangerous autofixes that might cause infinite loops',
          },
          experimental_autoDependenciesHooks: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Experimental: List of hooks that should have dependencies automatically determined',
          },
          requireExplicitEffectDeps: {
            type: 'boolean',
            description: 'Require explicit dependency arrays for all effects',
          },
          enableAutoFixForMemoAndCallback: {
            type: 'boolean',
            description: 'Enable autofix for useMemo and useCallback hooks',
          },
          suffix: { type: 'string', minLength: 1 },
          severity: {
            type: 'object',
            properties: {
              addDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addAllDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              addSingleDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeDependencyArray: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeSingleDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeAllDuplicates: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeAllUnnecessaryDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              removeThisDuplicate: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              missingDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              missingDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              unnecessaryDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              unnecessaryDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              duplicateDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              duplicateDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              unknownDependencies: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              asyncEffect: { type: 'string', enum: ['error', 'warn', 'off'] },
              missingEffectCallback: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              staleAssignmentDependency: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              staleAssignmentLiteral: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              staleAssignmentExpression: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              staleAssignmentUnstable: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              spreadElementInDependencyArray: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              useEffectEventInDependencyArray: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              dependencyWithoutSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              notArrayLiteral: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
              },
              moveInsideEffect: {
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
        },
      },
    ],
  },
  defaultOptions: [
    {
      unsafeAutofix: false,
      additionalHooks: undefined,
      experimental_autoDependenciesHooks: [],
      requireExplicitEffectDeps: false,
      enableAutoFixForMemoAndCallback: false,

      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    // Initialize the signal suffix regex for this run from options (defaults to "Signal")
    try {
      const configuredSuffix =
        typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal';

      suffixByPerfKey.set(perfKey, buildSuffixRegex(configuredSuffix));
    } catch {
      // Fallback on any unexpected error to default behavior
      suffixByPerfKey.set(perfKey, buildSuffixRegex('Signal'));
    }

    const perf = createPerformanceTracker(perfKey, option?.performance);

    if (option?.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    if (option?.performance?.enableMetrics === true && option.performance.logMetrics === true) {
      console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
      console.info(`${ruleName}: Rule configuration:`, option);
    }

    recordMetric(perfKey, 'config', {
      additionalHooks:
        typeof option?.additionalHooks !== 'undefined' && option.additionalHooks !== ''
          ? 'custom'
          : 'default',
      experimental_autoDependenciesHooks: option?.experimental_autoDependenciesHooks?.length ?? 0,
      requireExplicitEffectDeps: option?.requireExplicitEffectDeps ?? false,
      enableAutoFixForMemoAndCallback: option?.enableAutoFixForMemoAndCallback ?? false,
    });

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (nodeCount > (option?.performance?.maxNodes ?? 2_000)) {
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

        trackOperation(
          perfKey,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`${node.type}Processing`] ?? PerformanceOperations.nodeProcessing
        );
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        perf.trackNode(node);

        const callbackIndex = getReactiveHookCallbackIndex(
          node.callee,
          context,
          {
            unsafeAutofix: option?.unsafeAutofix,
            additionalHooks:
              typeof option?.additionalHooks !== 'undefined' && option.additionalHooks !== ''
                ? // User provided regex pattern
                  // eslint-disable-next-line security/detect-non-literal-regexp
                  new RegExp(option.additionalHooks)
                : undefined,
          },
          perfKey
        );

        if (callbackIndex === -1) {
          return;
        }

        let callback: TSESTree.CallExpressionArgument | undefined =
          // eslint-disable-next-line security/detect-object-injection
          node.arguments[callbackIndex];

        const nodeWithoutNamespace = getNodeWithoutReactNamespace(node.callee);

        const maybeNode = node.arguments[callbackIndex + 1];

        const declaredDependenciesNode: TSESTree.CallExpressionArgument | undefined =
          maybeNode &&
          !(maybeNode.type === AST_NODE_TYPES.Identifier && maybeNode.name === 'undefined')
            ? maybeNode
            : undefined;

        const isEffect = /Effect($|[^a-z])/g.test(
          'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : ''
        );

        if (typeof callback === 'undefined') {
          const messageId = 'missingEffectCallback';

          if (getSeverity(messageId, context.options[0]) !== 'off') {
            context.report({
              messageId,
              node: node.callee,
              data: {
                hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
              },
            });
          }

          return;
        }

        if (
          typeof maybeNode === 'undefined' &&
          isEffect &&
          option?.requireExplicitEffectDeps === true
        ) {
          const messageId = 'missingEffectCallback';

          if (getSeverity(messageId, context.options[0]) !== 'off') {
            context.report({
              node: node.callee,
              data: {
                hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
              },
              messageId,
              suggest: [
                {
                  messageId: 'addDependencies',
                  data: { dependencies: '', count: 0 },
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    // Insert an empty dependency array, preserving formatting of multi-line calls
                    const lastArg = node.arguments[node.arguments.length - 1];
                    const insertPosition = lastArg ? lastArg.range[1] : node.range[1] - 1; // before ')'

                    if (typeof insertPosition !== 'number') {
                      return null;
                    }

                    return fixer.insertTextAfterRange(
                      [insertPosition, insertPosition],
                      /\n/.test(context.sourceCode.text.slice(insertPosition, node.range[1]))
                        ? `,\n${' '.repeat(node.loc.start.column + 2)}[]`
                        : `, []`
                    );
                  },
                },
              ],
            });
          }
        }

        const isAutoDepsHook = option?.experimental_autoDependenciesHooks?.includes(
          'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : ''
        );

        if (
          (!declaredDependenciesNode ||
            (isAutoDepsHook === true &&
              declaredDependenciesNode.type === AST_NODE_TYPES.Literal &&
              declaredDependenciesNode.value === null)) &&
          !isEffect
        ) {
          if (
            ('name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '') === 'useMemo' ||
            ('name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '') === 'useCallback'
          ) {
            const messageId = 'missingDependencies';

            if (getSeverity(messageId, context.options[0]) !== 'off') {
              context.report({
                node: node.callee,
                messageId,
                data: {
                  hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
                },
              });
            }
          }

          return;
        }

        while (callback.type === AST_NODE_TYPES.TSAsExpression) {
          callback = callback.expression;
        }

        switch (callback.type) {
          case AST_NODE_TYPES.FunctionExpression:
          case AST_NODE_TYPES.ArrowFunctionExpression: {
            visitFunctionWithDependencies(
              callback,
              declaredDependenciesNode,
              node.callee,
              'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
              isEffect,
              isAutoDepsHook,
              context,
              perfKey
            );

            return;
          }

          case AST_NODE_TYPES.Identifier: {
            if (
              !declaredDependenciesNode ||
              (isAutoDepsHook === true &&
                declaredDependenciesNode.type === AST_NODE_TYPES.Literal &&
                declaredDependenciesNode.value === null)
            ) {
              return;
            }

            if (
              'elements' in declaredDependenciesNode &&
              declaredDependenciesNode.elements.some(
                (
                  el:
                    | TSESTree.SpreadElement
                    | TSESTree.Expression
                    | TSESTree.DestructuringPattern
                    | null
                ): boolean => {
                  return (
                    el !== null &&
                    el.type === AST_NODE_TYPES.Identifier &&
                    el.name === callback.name
                  );
                }
              )
            ) {
              return;
            }

            const variable = context.sourceCode.getScope(callback).set.get(callback.name);

            if (typeof variable?.defs === 'undefined') {
              return;
            }

            const def: Definition | undefined = variable.defs[0];

            if (typeof def === 'undefined') {
              break;
            }

            if (def.type === 'Parameter') {
              const messageId = 'missingEffectCallback';

              if (getSeverity(messageId, context.options[0]) !== 'off') {
                context.report({
                  node: node.callee,
                  data: {
                    name: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
                  },
                  messageId,
                });
              }

              return;
            }

            if (def.type !== 'Variable' && def.type !== 'FunctionName') {
              break;
            }

            switch (def.node.type) {
              case AST_NODE_TYPES.FunctionDeclaration: {
                visitFunctionWithDependencies(
                  def.node,
                  declaredDependenciesNode,
                  node.callee,
                  'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
                  isEffect,
                  isAutoDepsHook,
                  context,
                  perfKey
                );

                return;
              }

              case AST_NODE_TYPES.VariableDeclarator: {
                const init = def.node.init;

                if (init === null) {
                  break; // Unhandled
                }

                switch (init.type) {
                  case AST_NODE_TYPES.ArrowFunctionExpression:
                  case AST_NODE_TYPES.FunctionExpression: {
                    visitFunctionWithDependencies(
                      init,
                      declaredDependenciesNode,
                      node.callee,
                      'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
                      isEffect,
                      isAutoDepsHook,
                      context,
                      perfKey
                    );

                    return;
                  }
                }

                break;
              }
            }

            break;
          }

          default: {
            const messageId = 'missingDependency';

            if (getSeverity(messageId, context.options[0]) !== 'off') {
              context.report({
                node: node.callee,
                messageId,
                data: {
                  hookName:
                    node.callee.type === AST_NODE_TYPES.Identifier ? node.callee.name : 'Hook',
                  dependency: 'name' in callback ? callback.name : callback.type,
                  missingMessage: `The dependency '${'name' in callback ? callback.name : callback.type}' is used inside the effect but not listed in the dependency array.`,
                },
                suggest: [
                  {
                    messageId: 'addSingleDependency',
                    data: {
                      dependency: 'name' in callback ? callback.name : callback.type,
                    },
                    fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                      if (!declaredDependenciesNode) {
                        return null;
                      }

                      return fixer.replaceText(
                        declaredDependenciesNode,
                        `[${'name' in callback ? callback.name : callback.type}]`
                      );
                    },
                  },
                ],
              });
            }
          }
        }

        if (getSeverity('missingDependency', context.options[0]) !== 'off') {
          context.report({
            node: node.callee,
            messageId: 'missingDependency',
            data: {
              hookName: node.callee.type === AST_NODE_TYPES.Identifier ? node.callee.name : 'Hook',
              dependency: 'name' in callback ? callback.name : callback.type,
              missingMessage: `The dependency '${'name' in callback ? callback.name : callback.type}' is used inside the effect but not listed in the dependency array.`,
            },
            suggest: [
              {
                messageId: 'addSingleDependency',
                data: {
                  dependency: 'name' in callback ? callback.name : callback.type,
                },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  if (!declaredDependenciesNode) {
                    return null;
                  }

                  return fixer.replaceText(
                    declaredDependenciesNode,
                    `[${'name' in callback ? callback.name : callback.type}]`
                  );
                },
              },
            ],
          });
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        // cleanup stored suffix regex for this run
        suffixByPerfKey.delete(perfKey);

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
