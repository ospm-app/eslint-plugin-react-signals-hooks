import type { Rule, Scope, SourceCode } from 'eslint';

import type {
  ArrayExpression,
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
  Pattern,
  PrivateIdentifier,
  Super,
  VariableDeclarator,
} from 'estree';

type ExtendedRuleContext = Rule.RuleContext & {
  sourceCode: SourceCode & {
    getScope: (node: Node) => Scope.Scope;
  };
  getScope?: () => Scope.Scope;
};

type DeclaredDependency = {
  key: string;
  node: Node;
};

type Dependency = {
  node: Node;
  references: Array<Scope.Reference>;
  hasReads: boolean;
  isStable: boolean;
  hasInnerScopeComputedProperty?: boolean;
};

type DependencyTreeNode = {
  isUsed: boolean;
  isSatisfiedRecursively: boolean;
  isSubtreeUsed: boolean;
  children: Map<string, DependencyTreeNode>;
};

export const exhaustiveDepsRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'verifies the list of dependencies for Hooks like useEffect and similar',
      recommended: true,
      url: 'https://github.com/facebook/react/issues/14920',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        enableDangerousAutofixThisMayCauseInfiniteLoops: false,
        properties: {
          additionalHooks: {
            type: 'string',
          },
          enableDangerousAutofixThisMayCauseInfiniteLoops: {
            type: 'boolean',
          },
          experimental_autoDependenciesHooks: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          requireExplicitEffectDeps: {
            type: 'boolean',
          },
          enableAutoFixForMemoAndCallback: {
            type: 'boolean',
          },
        },
      },
    ],
  },
  create(context: ExtendedRuleContext) {
    const rawOptions = context.options?.[0];

    const additionalHooks = rawOptions?.additionalHooks
      ? new RegExp(rawOptions.additionalHooks)
      : undefined;

    const enableDangerousAutofixThisMayCauseInfiniteLoops: boolean =
      rawOptions?.enableDangerousAutofixThisMayCauseInfiniteLoops || false;

    const experimental_autoDependenciesHooks: ReadonlyArray<string> =
      rawOptions && Array.isArray(rawOptions.experimental_autoDependenciesHooks)
        ? rawOptions.experimental_autoDependenciesHooks
        : [];

    const requireExplicitEffectDeps: boolean = rawOptions?.requireExplicitEffectDeps || false;

    const enableAutoFixForMemoAndCallback: boolean =
      rawOptions?.enableAutoFixForMemoAndCallback || false;

    const options = {
      additionalHooks,
      experimental_autoDependenciesHooks,
      enableDangerousAutofixThisMayCauseInfiniteLoops,
      requireExplicitEffectDeps,
      enableAutoFixForMemoAndCallback,
    };

    function reportProblem(problem: Rule.ReportDescriptor) {
      const hasAutofix = !!(
        problem.fix ||
        (enableDangerousAutofixThisMayCauseInfiniteLoops &&
          Array.isArray(problem.suggest) &&
          problem.suggest.length > 0)
      );

      const hasSuggestions = Array.isArray(problem.suggest) && problem.suggest.length > 0;

      if (hasAutofix || hasSuggestions) {
        let indicator = '';

        if (hasAutofix) {
          indicator = ' [AUTOFIXABLE]';
        } else if (hasSuggestions) {
          indicator = ' [SUGGESTIONS AVAILABLE]';
        }

        if ('message' in problem && typeof problem.message === 'string') {
          problem.message += indicator;
        }
      }

      if (enableDangerousAutofixThisMayCauseInfiniteLoops) {
        if (Array.isArray(problem.suggest) && problem.suggest.length > 0 && problem.suggest[0]) {
          problem.fix = problem.suggest[0].fix;
        }
      }

      context.report(problem);
    }

    const getSourceCode =
      typeof context.getSourceCode === 'function'
        ? () => {
            return context.getSourceCode();
          }
        : () => {
            return context.sourceCode;
          };

    const getScope = (node: Node) => {
      if (typeof context.getScope === 'function') {
        return context.getScope();
      }
      return context.sourceCode.getScope(node);
    };

    const scopeManager = getSourceCode().scopeManager;

    const setStateCallSites = new WeakMap<Expression | Super, Pattern | null | undefined>();

    const stateVariables = new WeakSet<Identifier>();

    const stableKnownValueCache = new WeakMap<Scope.Variable, boolean>();

    const functionWithoutCapturedValueCache = new WeakMap<Scope.Variable, boolean>();

    const useEffectEventVariables = new WeakSet<Expression>();

    const signalVariables = new WeakSet<Identifier>();

    function memoizeWithWeakMap(
      fn: (resolved: Scope.Variable) => boolean,
      map: WeakMap<Scope.Variable, boolean>
    ) {
      return (arg: Scope.Variable): boolean => {
        if (map.has(arg)) {
          return !!map.get(arg);
        }

        const result = fn(arg);

        map.set(arg, result);

        return result;
      };
    }

    function visitFunctionWithDependencies(
      node: ArrowFunctionExpression | FunctionDeclaration | FunctionExpression,
      declaredDependenciesNode: Node | undefined,
      reactiveHook: Node,
      reactiveHookName: string,
      isEffect: boolean,
      isAutoDepsHook: boolean
    ): void {
      const objectPropertyAccesses = new Map<string, Set<string>>();

      if (isEffect && node.async) {
        reportProblem({
          node,
          message: `Effect callbacks are synchronous to prevent race conditions. Put the async function inside:\n\nuseEffect(() => {\n  async function fetchData() {\n    // You can await here\n    const response = await MyAPI.getData(someId);\n    // ...\n  }\n  fetchData();\n}, [someId]); // Or [] if effect doesn't need props or state\n\nLearn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching`,
        });
      }

      const scope = scopeManager.acquire(node);

      if (!scope) {
        throw new Error(
          'Unable to acquire scope for the current node. This is a bug in eslint-plugin-react-hooks, please file an issue.'
        );
      }

      const pureScopes = new Set();

      let componentScope: Scope.Scope | null = null;

      {
        let currentScope = scope.upper;

        while (currentScope) {
          pureScopes.add(currentScope);

          if (['function', 'hook', 'component'].includes(currentScope.type)) {
            break;
          }

          currentScope = currentScope.upper;
        }

        if (!currentScope) {
          return;
        }

        componentScope = currentScope;
      }

      const isArray = Array.isArray;

      function isStableKnownHookValue(resolved: Scope.Variable): boolean {
        if (!isArray(resolved.defs)) {
          return false;
        }
        const def = resolved.defs[0];

        if (def == null) {
          return false;
        }

        const defNode: VariableDeclarator = def.node;

        if (defNode.type !== 'VariableDeclarator') {
          return false;
        }

        let init = defNode.init;

        if (init == null) {
          return false;
        }

        // @ts-expect-error
        while (init.type === 'TSAsExpression' || init.type === 'AsExpression') {
          // @ts-expect-error
          init = init.expression;
        }

        // @ts-expect-error
        let declaration = defNode.parent;

        if (declaration == null && componentScope != null) {
          fastFindReferenceWithParent(componentScope.block, def.node.id);

          declaration = def.node.parent;

          if (declaration == null) {
            return false;
          }
        }

        if (
          declaration != null &&
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
        let callee: Expression | PrivateIdentifier | Super = init.callee;
        if (
          callee.type === 'MemberExpression' &&
          'name' in callee.object &&
          callee.object.name === 'React' &&
          callee.property != null &&
          !callee.computed
        ) {
          callee = callee.property;
        }
        if (callee.type !== 'Identifier') {
          return false;
        }

        const definitionNode: VariableDeclarator = def.node;
        const id = definitionNode.id;
        const { name } = callee;
        if (name === 'useRef' && id.type === 'Identifier') {
          return true;
        }

        if ((isSignalIdentifier(callee) || isSignalVariable(id)) && id.type === 'Identifier') {
          for (const ref of resolved.references) {
            // @ts-expect-error
            if (ref !== id) {
              signalVariables.add(ref.identifier);
            }
          }

          return false;
        }

        if (isUseEffectEventIdentifier(callee) && id.type === 'Identifier') {
          for (const ref of resolved.references) {
            // @ts-expect-error
            if (ref !== id) {
              useEffectEventVariables.add(ref.identifier);
            }
          }

          return true;
        }

        if (['useState', 'useReducer', 'useActionState'].includes(name)) {
          if (
            id.type === 'ArrayPattern' &&
            id.elements.length === 2 &&
            isArray(resolved.identifiers)
          ) {
            if (id.elements[1] === resolved.identifiers[0]) {
              if (name === 'useState') {
                const references = resolved.references;

                let writeCount = 0;

                for (const reference of references) {
                  if (reference.isWrite()) {
                    writeCount++;
                  }

                  if (writeCount > 1) {
                    return false;
                  }

                  setStateCallSites.set(reference.identifier, id.elements[0]);
                }
              }

              return true;
            }

            if (id.elements[0] === resolved.identifiers[0]) {
              if (name === 'useState') {
                const references = resolved.references;

                for (const reference of references) {
                  stateVariables.add(reference.identifier);
                }
              }

              return false;
            }
          }
        } else if (name === 'useTransition') {
          if (
            id.type === 'ArrayPattern' &&
            id.elements.length === 2 &&
            Array.isArray(resolved.identifiers)
          ) {
            if (id.elements[1] === resolved.identifiers[0]) {
              return true;
            }
          }
        }

        return false;
      }

      function isFunctionWithoutCapturedValues(resolved: Scope.Variable): boolean {
        if (!isArray(resolved.defs)) {
          return false;
        }

        const def = resolved.defs[0];

        if (def == null) {
          return false;
        }

        if (def.node?.id == null) {
          return false;
        }

        const fnNode: Node = def.node;

        const childScopes = componentScope?.childScopes || [];

        let fnScope = null;

        for (const childScope of childScopes) {
          const childScopeBlock = childScope.block;
          if (
            (fnNode.type === 'FunctionDeclaration' && childScopeBlock === fnNode) ||
            (fnNode.type === 'VariableDeclarator' &&
              // @ts-expect-error
              childScopeBlock.parent === fnNode)
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

          if (pureScopes.has(ref.resolved.scope) && !memoizedIsStableKnownHookValue(ref.resolved)) {
            return false;
          }
        }

        return true;
      }

      const memoizedIsStableKnownHookValue = memoizeWithWeakMap(
        isStableKnownHookValue,
        stableKnownValueCache
      );

      const memoizedIsFunctionWithoutCapturedValues = memoizeWithWeakMap(
        isFunctionWithoutCapturedValues,
        functionWithoutCapturedValueCache
      );

      const currentRefsInEffectCleanup = new Map<
        string,
        {
          reference: Scope.Reference;
          dependencyNode: Identifier;
        }
      >();

      function isInsideEffectCleanup(reference: Scope.Reference): boolean {
        let curScope: Scope.Scope | null = reference.from;

        let isInReturnedFunction = false;

        while (curScope != null && curScope.block !== node) {
          if (curScope.type === 'function') {
            isInReturnedFunction =
              // @ts-expect-error
              curScope.block.parent != null &&
              // @ts-expect-error
              curScope.block.parent.type === 'ReturnStatement';
          }

          curScope = curScope.upper;
        }

        return isInReturnedFunction;
      }

      const dependencies = new Map<string, Dependency>();

      const optionalChains = new Map<string, boolean>();

      const externalDependencies = new Set<string>();

      gatherDependenciesRecursively(scope);

      function isOnlyAssignmentReference(reference: Scope.Reference): boolean {
        const { identifier } = reference;

        // @ts-expect-error
        const { parent } = identifier;

        if (
          parent != null &&
          parent.type === 'MemberExpression' &&
          parent.object === identifier &&
          parent.property?.type === 'Identifier' &&
          parent.property.name === 'value'
        ) {
          if (parent.parent?.type === 'AssignmentExpression' && parent.parent.left === parent) {
            return true;
          }

          if (
            parent.parent?.type === 'MemberExpression' &&
            parent.parent.object === parent &&
            parent.parent.parent?.type === 'AssignmentExpression' &&
            parent.parent.parent.left === parent.parent
          ) {
            return true;
          }

          if (identifier.name.endsWith('Signal')) {
            if (
              parent?.type === 'MemberExpression' &&
              parent.object === identifier &&
              parent.property?.name === 'value'
            ) {
              if (parent.parent?.type === 'AssignmentExpression' && parent.parent.left === parent) {
                return true;
              }

              if (
                parent.parent?.type === 'MemberExpression' &&
                parent.parent.object === parent &&
                parent.parent.parent?.type === 'AssignmentExpression' &&
                parent.parent.parent.left === parent.parent
              ) {
                return true;
              }
            }
          }
        }

        if (
          identifier.name === 'value' &&
          parent?.type === 'MemberExpression' &&
          parent.property === identifier &&
          parent.object?.type === 'Identifier' &&
          parent.object.name.endsWith('Signal')
        ) {
          if (parent.parent?.type === 'AssignmentExpression' && parent.parent.left === parent) {
            return true;
          }

          if (
            parent.parent?.type === 'MemberExpression' &&
            parent.parent.object === parent &&
            parent.parent.parent?.type === 'AssignmentExpression' &&
            parent.parent.parent.left === parent.parent
          ) {
            return true;
          }
        }

        return false;
      }

      function gatherDependenciesRecursively(currentScope: Scope.Scope): void {
        for (const reference of currentScope.references) {
          const isSignalReference =
            reference.identifier.type === 'Identifier' &&
            (reference.identifier.name.endsWith('Signal') ||
              reference.identifier.name.endsWith('signal') ||
              (reference.resolved?.name?.endsWith('Signal') ?? false));

          if (reference.resolved == null) {
            continue;
          }

          // biome-ignore format: because
          if (
            // @ts-expect-error
            reference.identifier.parent?.type === "MemberExpression" &&
            // @ts-expect-error
            !reference.identifier.parent.computed &&
            // @ts-expect-error
            reference.identifier.parent.property?.type === "Identifier" &&
            // @ts-expect-error
            reference.identifier.parent.object === reference.identifier
          ) {
            const objectName = reference.identifier.name;
            // @ts-expect-error
            const propertyName = reference.identifier.parent.property.name;

            if (propertyName !== "current") {
              if (!objectPropertyAccesses.has(objectName)) {
                objectPropertyAccesses.set(objectName, new Set<string>());
              }

              // @ts-expect-error
              let currentNode = reference.identifier.parent;
              let fullPath = `${objectName}.${propertyName}`;

              while (
                currentNode.parent?.type === "MemberExpression"
              ) {
                if (currentNode.parent.object === currentNode) {
                  if (!currentNode.parent.computed) {
                    if (currentNode.parent.property?.type === "Identifier") {
                      fullPath += `.${currentNode.parent.property.name}`;

                      currentNode = currentNode.parent;
                    } else {
                      break;
                    }
                  } else {
                    try {
                      const computedPath = analyzePropertyChain(currentNode.parent, null);

                      fullPath = computedPath;

                      currentNode = currentNode.parent;
                    } catch (error) {
                      console.error(error instanceof Error ? error.message : JSON.stringify(error))
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
          }

          let isComputedMemberAssignmentOnly = false;

          if (
            reference.identifier.type === 'Identifier' &&
            reference.identifier.name.endsWith('Signal')
          ) {
            // @ts-expect-error
            const parent = reference.identifier.parent;
            if (
              parent?.type === 'MemberExpression' &&
              parent.object === reference.identifier &&
              parent.property?.name === 'value' &&
              parent.parent?.type === 'MemberExpression' &&
              parent.parent.object === parent &&
              parent.parent.parent?.type === 'AssignmentExpression' &&
              parent.parent.parent.left === parent.parent
            ) {
              isComputedMemberAssignmentOnly = true;
              // @ts-expect-error
              reference.isComputedAssignmentOnly = true;

              const baseSignalName = reference.identifier.name;

              for (const ref of currentScope.references) {
                if (ref.identifier.name === baseSignalName) {
                  // @ts-expect-error
                  ref.isComputedAssignmentOnly = true;
                }
              }
            }
          }

          const shouldSkip =
            ((!pureScopes.has(reference.resolved.scope) && !isSignalReference) ||
              reference.resolved.scope === scope) &&
            !isComputedMemberAssignmentOnly;

          if (shouldSkip) {
            continue;
          }

          if (
            reference.identifier.type === 'Identifier' &&
            reference.identifier.name.endsWith('Signal')
          ) {
            let allReferencesAreComputedAssignments = true;

            for (const ref of currentScope.references) {
              if (ref.identifier.name === reference.identifier.name) {
                // @ts-expect-error
                if (!ref.isComputedAssignmentOnly) {
                  allReferencesAreComputedAssignments = false;
                  break;
                }
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

          let currentNode = reference.identifier;

          while (
            // @ts-expect-error
            currentNode.parent &&
            // @ts-expect-error
            (currentNode.parent.type === 'MemberExpression' ||
              // @ts-expect-error
              currentNode.parent.type === 'OptionalMemberExpression') &&
            // @ts-expect-error
            currentNode.parent.object === currentNode
          ) {
            // @ts-expect-error
            currentNode = currentNode.parent;
          }

          // biome-ignore format: because
          // Skip function calls, but still track function references as dependencies
          if (
         // @ts-expect-error
        currentNode.parent &&
         // @ts-expect-error
        currentNode.parent.type === "CallExpression" &&
        // @ts-expect-error
        currentNode.parent.callee === currentNode
      ) {
        // Don't continue - let it fall through to process the function reference as a dependency
      }
          let dependencyNode = getDependency(referenceNode);

          try {
            let currentNode = referenceNode;

            while (
              // @ts-expect-error
              currentNode.parent &&
              // @ts-expect-error
              (currentNode.parent.type === 'MemberExpression' ||
                // @ts-expect-error
                currentNode.parent.type === 'OptionalMemberExpression') &&
              // @ts-expect-error
              currentNode.parent.object === currentNode
            ) {
              // @ts-expect-error
              currentNode = currentNode.parent;
            }
          } catch (error) {
            console.error(`Property chain analysis failed:`, error);
          }

          if (dependencyNode.type === 'Identifier' && dependencyNode.name.endsWith('Signal')) {
            // biome-ignore format: because
            if (
              // @ts-expect-error
              referenceNode.parent?.type === "MemberExpression" &&
              // @ts-expect-error
              referenceNode.parent.object === referenceNode &&
              // @ts-expect-error
              referenceNode.parent.property?.type === "Identifier" &&
              // @ts-expect-error
              referenceNode.parent.property.name === "value"
            ) {
              if (
                // @ts-expect-error
                referenceNode.parent.parent?.type === "MemberExpression" &&
                // @ts-expect-error
                referenceNode.parent.parent.object === referenceNode.parent
              ) {
                let isAssignmentOnly = false;

                // @ts-expect-error
                let outermostNode = referenceNode.parent.parent;

                while (
                  outermostNode.parent?.type === "MemberExpression" &&
                  outermostNode.parent.object === outermostNode
                ) {
                  outermostNode = outermostNode.parent;
                }

                if (
                  outermostNode.parent?.type === "AssignmentExpression" &&

                  outermostNode.parent.left === outermostNode
                ) {
                  isAssignmentOnly = true;
                }

                dependencyNode = outermostNode;

                // @ts-expect-error
                if (referenceNode.parent.parent.computed && referenceNode.parent.parent.property) {
                  // @ts-expect-error
                  const propertyNode = referenceNode.parent.parent.property;

                  let propertyName = null;
                  if (propertyNode.type === "Identifier") {
                    propertyName = propertyNode.name;
                  } else if (propertyNode.type === "TSAsExpression" || propertyNode.type === "AsExpression") {
                    const expr = propertyNode.expression;
                    if (expr && expr.type === "Identifier") {
                      propertyName = expr.name;
                    }
                  }

                  if (propertyName) {

                    let isInnerScopeProperty = false;
                    let propertyRef = null;
                    let searchScope: Scope.Scope | null = currentScope;

                    while (searchScope && searchScope !== scope?.upper) {
                      propertyRef = searchScope.references.find(
                        ref => ref.identifier.name === propertyName
                      );

                      if (propertyRef) {
                        break;
                      }

                        searchScope = searchScope.upper;
                    }

                    if (propertyRef?.resolved) {
                        let checkScope: Scope.Scope | null = propertyRef.resolved.scope;

                        while (checkScope) {
                            if (checkScope === scope) {
                                isInnerScopeProperty = true;

                                break;
                            }
                            checkScope = checkScope.upper;
                        }

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
                  // @ts-expect-error
                  reference.isComputedAssignmentOnly = true;
                }
              } else {
                // @ts-expect-error
                dependencyNode = referenceNode.parent;
              }
            }
          }

          // Always use analyzePropertyChain to avoid duplication issues
          const dependency = analyzePropertyChain(dependencyNode, optionalChains);

          if (
            // @ts-expect-error
            dependencyNode.parent &&
            // @ts-expect-error
            isSignalValueAccess(dependencyNode.parent) &&
            dependencyNode.type === 'Identifier' &&
            !signalVariables.has(dependencyNode) &&
            isSignalVariable(dependencyNode)
          ) {
            signalVariables.add(dependencyNode);
          }

          if (
            isEffect &&
            dependencyNode.type === 'Identifier' &&
            // @ts-expect-error
            (dependencyNode.parent?.type === 'MemberExpression' ||
              // @ts-expect-error
              dependencyNode.parent?.type === 'OptionalMemberExpression') &&
            // @ts-expect-error
            !dependencyNode.parent.computed &&
            // @ts-expect-error
            dependencyNode.parent.property.type === 'Identifier' &&
            // @ts-expect-error
            dependencyNode.parent.property.name === 'current' &&
            isInsideEffectCleanup(reference)
          ) {
            currentRefsInEffectCleanup.set(dependency, {
              reference,
              dependencyNode,
            });
          }

          if (
            // @ts-expect-error
            dependencyNode.parent?.type === 'TSTypeQuery' ||
            // @ts-expect-error
            dependencyNode.parent?.type === 'TSTypeReference'
          ) {
            continue;
          }

          const def = reference.resolved.defs[0];

          if (def == null) {
            continue;
          }

          // @ts-expect-error We don't have flow types
          if (def.type === 'TypeParameter') {
            continue;
          }

          let isAssignment = isOnlyAssignmentReference(reference);

          const isComputedAssignmentOnly =
            // @ts-expect-error
            reference.isComputedAssignmentOnly === true;

          if (isComputedAssignmentOnly) {
            isAssignment = true;
          }

          if (dependencies.has(dependency)) {
            dependencies.get(dependency)?.references.push(reference);

            if (!isAssignment && !isComputedAssignmentOnly) {
              const dep = dependencies.get(dependency);

              if (dep) {
                dep.hasReads = true;
              }
            }
          } else {
            const resolved = reference.resolved;

            const isSignalValueRef = isSignalValueAccess(reference.identifier);

            const isImportedSignal =
              dependency.endsWith('Signal') ||
              (dependency.includes('.') && dependency.split('.')[0].endsWith('Signal'));

            const isSignalValueAccessBool = dependency.endsWith('.value');

            // For now, treat all function dependencies as non-stable to fix the context function issue
            // But exclude useRef variables which should be treated as stable
            const isFunctionDependency =
              typeof dependency === 'string' &&
              !dependency.includes('.') &&
              !dependency.endsWith('Signal') &&
              resolved &&
              resolved.defs &&
              resolved.defs.length > 0 &&
              !memoizedIsStableKnownHookValue(resolved); // Exclude useRef and other stable hook values

            const isStable =
              isSignalValueRef ||
              isSignalDependency(dependency) ||
              isImportedSignal ||
              isSignalValueAccessBool
                ? false
                : isFunctionDependency
                  ? false // Function dependencies should not be marked as stable
                  : memoizedIsStableKnownHookValue(resolved) ||
                    memoizedIsFunctionWithoutCapturedValues(resolved);

            if (isImportedSignal || isSignalValueAccessBool) {
              if (isImportedSignal && !isSignalValueAccessBool) {
                const signalName = dependency.includes('.') ? dependency.split('.')[0] : dependency;

                externalDependencies.delete(signalName);
              }

              if (isSignalValueAccessBool) {
                const signalName = dependency.replace('.value', '');
                externalDependencies.delete(signalName);
              }

              // biome-ignore format: because
              if (
                // @ts-expect-error
                reference.identifier.type === "MemberExpression" &&
                // @ts-expect-error
                reference.identifier.property.type === "Identifier" &&
                // @ts-expect-error
                reference.identifier.property.name === "value" &&
                // @ts-expect-error
                reference.identifier.object.type === "Identifier"
              ) {
                // @ts-expect-error
                const signalName = reference.identifier.object.name;

                externalDependencies.delete(signalName);
              }
            }

            const hasInnerScopeComputedProperty =
              // @ts-expect-error
              reference.isInnerScopeComputedProperty === true;

            dependencies.set(dependency, {
              node: dependencyNode,
              isStable,
              references: [reference],
              hasReads: !isAssignment && !isComputedAssignmentOnly,
              hasInnerScopeComputedProperty,
            });
          }
        }

        for (const childScope of currentScope.childScopes) {
          gatherDependenciesRecursively(childScope);
        }
      }

      currentRefsInEffectCleanup.forEach(({ reference, dependencyNode }, dependency) => {
        const references = reference.resolved?.references || [];
        let foundCurrentAssignment = false;

        for (const ref of references) {
          const { identifier } = ref;

          // @ts-expect-error
          const { parent } = identifier;

          if (
            parent != null &&
            parent.type === 'MemberExpression' &&
            !parent.computed &&
            parent.property.type === 'Identifier' &&
            parent.property.name === 'current' &&
            parent.parent?.type === 'AssignmentExpression' &&
            parent.parent.left === parent
          ) {
            foundCurrentAssignment = true;
            break;
          }
        }

        if (foundCurrentAssignment) {
          return;
        }
        reportProblem({
          // @ts-expect-error
          node: dependencyNode.parent.property,
          message: `The ref value '${dependency}.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy '${dependency}.current' to a variable inside the effect, and use that variable in the cleanup function.`,
        });
      });

      const staleAssignments = new Set<string>();

      function reportStaleAssignment(writeExpr: Node, key: string): void {
        if (staleAssignments.has(key)) {
          return;
        }

        staleAssignments.add(key);

        reportProblem({
          node: writeExpr,
          message: `Assignments to the '${key}' variable from inside React Hook ${getSourceCode().getText(reactiveHook)} will be lost after each render. To preserve the value over time, store it in a useRef Hook and keep the mutable value in the '.current' property. Otherwise, you can move this variable directly inside ${getSourceCode().getText(reactiveHook)}.`,
        });
      }

      const stableDependencies = new Set<string>();

      dependencies.forEach(({ isStable, references }, key) => {
        if (isStable) {
          stableDependencies.add(key);
        }

        for (const reference of references) {
          if (reference.writeExpr) {
            reportStaleAssignment(reference.writeExpr, key);
          }
        }
      });

      if (staleAssignments.size > 0) {
        return;
      }

      if (!declaredDependenciesNode) {
        if (isAutoDepsHook) {
          return;
        }

        let setStateInsideEffectWithoutDeps: string | null = null;

        dependencies.forEach(({ references }, key) => {
          if (setStateInsideEffectWithoutDeps) {
            return;
          }

          for (const reference of references) {
            if (setStateInsideEffectWithoutDeps) {
              return;
            }

            const id = reference.identifier;

            const isSetState = setStateCallSites.has(id);

            if (!isSetState) {
              return;
            }

            let fnScope: Scope.Scope | null = reference.from;

            while (fnScope != null && fnScope.type !== 'function') {
              fnScope = fnScope.upper;
            }

            const isDirectlyInsideEffect = fnScope?.block === node;

            if (isDirectlyInsideEffect) {
              // TODO: we could potentially ignore early returns.
              setStateInsideEffectWithoutDeps = key;
            }
          }
        });

        if (setStateInsideEffectWithoutDeps) {
          const { suggestedDependencies } = collectRecommendations({
            dependencies,
            declaredDependencies: [],
            stableDependencies,
            externalDependencies: new Set<string>(),
            isEffect: true,
          });

          reportProblem({
            node: reactiveHook,
            message: `React Hook ${reactiveHookName} contains a call to '${setStateInsideEffectWithoutDeps}'. Without a list of dependencies, this can lead to an infinite chain of updates. To fix this, pass [${suggestedDependencies.join(', ')}] as a second argument to the ${reactiveHookName} Hook.`,
            suggest: [
              {
                desc: `Add dependencies array: [${suggestedDependencies.join(', ')}]`,
                fix(fixer) {
                  return fixer.insertTextAfter(node, `, [${suggestedDependencies.join(', ')}]`);
                },
              },
            ],
          });
        }

        return;
      }

      if (
        isAutoDepsHook &&
        declaredDependenciesNode.type === 'Literal' &&
        declaredDependenciesNode.value === null
      ) {
        return;
      }

      const declaredDependencies: Array<{ key: string; node: Node }> = [];

      const isArrayExpression = declaredDependenciesNode.type === 'ArrayExpression';

      const isTSAsArrayExpression =
        // @ts-expect-error
        declaredDependenciesNode.type === 'TSAsExpression' &&
        // @ts-expect-error
        declaredDependenciesNode.expression.type === 'ArrayExpression';

      if (!isArrayExpression && !isTSAsArrayExpression) {
        reportProblem({
          node: declaredDependenciesNode,
          message: `React Hook ${getSourceCode().getText(reactiveHook)} was passed a dependency list that is not an array literal. This means we can't statically verify whether you've passed the correct dependencies.`,
        });
      } else {
        const arrayExpression = isTSAsArrayExpression
          ? // @ts-expect-error
            declaredDependenciesNode.expression
          : declaredDependenciesNode;

        (arrayExpression as ArrayExpression).elements.forEach((declaredDependencyNode) => {
          if (declaredDependencyNode === null) {
            return;
          }

          if (declaredDependencyNode.type === 'SpreadElement') {
            reportProblem({
              node: declaredDependencyNode,
              message: `React Hook ${getSourceCode().getText(reactiveHook)} has a spread element in its dependency array. This means we can't statically verify whether you've passed the correct dependencies.`,
            });

            return;
          }

          if (useEffectEventVariables.has(declaredDependencyNode)) {
            reportProblem({
              node: declaredDependencyNode,
              message: `Functions returned from \`useEffectEvent\` must not be included in the dependency array. Remove \`${getSourceCode().getText(
                declaredDependencyNode
              )}\` from the list.`,
              suggest: [
                {
                  desc: `Remove the dependency \`${getSourceCode().getText(
                    declaredDependencyNode
                  )}\``,
                  fix(fixer) {
                    if (typeof declaredDependencyNode.range === 'undefined') {
                      return [];
                    }

                    return fixer.removeRange(declaredDependencyNode.range);
                  },
                },
              ],
            });
          }

          let declaredDependency: string | undefined;

          let dependencyText = '';

          try {
            dependencyText = getSourceCode().getText(declaredDependencyNode);

            const arrayMethods = [
              '.some',
              '.map',
              '.filter',
              '.forEach',
              '.find',
              '.every',
              '.reduce',
              '.reduceRight',
              '.findIndex',
              '.includes',
              '.indexOf',
              '.lastIndexOf',
            ];

            const isArrayMethod = arrayMethods.some((method) => {
              return dependencyText.endsWith(method);
            });

            const hasParentheses = dependencyText.includes('(') && dependencyText.includes(')');

            if (hasParentheses || isArrayMethod) {
              return;
            }
          } catch (error) {
            console.error(`Error getting dependency text:`, error);
          }

          try {
            declaredDependency = analyzePropertyChain(declaredDependencyNode, null);
          } catch (error: unknown) {
            if (error instanceof Error && /Unsupported node type/.test(error.message)) {
              if (declaredDependencyNode.type === 'Literal') {
                if (
                  declaredDependencyNode.value &&
                  dependencies.has(declaredDependencyNode.value as string)
                ) {
                  reportProblem({
                    node: declaredDependencyNode,
                    message: `The ${declaredDependencyNode.raw} literal is not a valid dependency because it never changes. Did you mean to include ${declaredDependencyNode.value} in the array instead?`,
                  });
                } else {
                  reportProblem({
                    node: declaredDependencyNode,
                    message: `The ${declaredDependencyNode.raw} literal is not a valid dependency because it never changes. You can safely remove it.`,
                  });
                }
              } else {
                reportProblem({
                  node: declaredDependencyNode,
                  message: `React Hook ${getSourceCode().getText(reactiveHook)} has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.`,
                });
              }

              return;
            }

            throw error;
          }

          let maybeID = declaredDependencyNode;

          while (
            ['MemberExpression', 'OptionalMemberExpression', 'ChainExpression'].includes(
              maybeID.type
            )
          ) {
            // @ts-expect-error This can be done better
            maybeID = maybeID.object || maybeID.expression.object;
          }
          const isDeclaredInComponent = !componentScope.through.some(
            (ref) => ref.identifier === maybeID
          );

          declaredDependencies.push({
            key: declaredDependency,
            node: declaredDependencyNode,
          });

          if (!isDeclaredInComponent) {
            externalDependencies.add(declaredDependency);
          }
        });
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
      });

      let suggestedDeps = suggestedDependencies;

      const problemCount =
        duplicateDependencies.size + missingDependencies.size + unnecessaryDependencies.size;

      if (problemCount === 0) {
        const constructions = scanForConstructions({
          declaredDependencies,
          declaredDependenciesNode,
          componentScope,
          scope,
        });

        constructions.forEach(({ construction, isUsedOutsideOfHook, depType }) => {
          const wrapperHook = depType === 'function' ? 'useCallback' : 'useMemo';

          const constructionType = depType === 'function' ? 'definition' : 'initialization';

          const defaultAdvice = `wrap the ${constructionType} of '${construction.name.name}' in its own ${wrapperHook}() Hook.`;

          const advice = isUsedOutsideOfHook
            ? `To fix this, ${defaultAdvice}`
            : `Move it inside the ${reactiveHookName} callback. Alternatively, ${defaultAdvice}`;

          const causation =
            depType === 'conditional' || depType === 'logical expression' ? 'could make' : 'makes';

          const message =
            `The '${construction.name.name}' ${depType} ${causation} the dependencies of ` +
            `${reactiveHookName} Hook (at line ${declaredDependenciesNode.loc?.start.line}) ` +
            `change on every render. ${advice}`;

          let suggest: Rule.ReportDescriptor['suggest'];
          if (isUsedOutsideOfHook && construction.type === 'Variable' && depType === 'function') {
            suggest = [
              {
                desc: `Wrap the ${constructionType} of '${construction.name.name}' in its own ${wrapperHook}() Hook.`,
                fix(fixer: Rule.RuleFixer): Array<Rule.Fix> {
                  const [before, after] =
                    wrapperHook === 'useMemo'
                      ? ['useMemo(() => { return ', '; })']
                      : ['useCallback(', ')'];

                  if (construction.node.init == null) {
                    return [];
                  }

                  return [
                    fixer.insertTextBefore(construction.node.init, before),

                    fixer.insertTextAfter(construction.node.init, after),
                  ];
                },
              },
            ];
          }

          reportProblem({
            node: construction.node,
            message,
            suggest,
          });
        });
        return;
      }

      if (!isEffect && missingDependencies.size > 0) {
        suggestedDeps = collectRecommendations({
          dependencies,
          declaredDependencies,
          stableDependencies,
          externalDependencies,
          isEffect,
        }).suggestedDependencies;
      }

      function areDeclaredDepsAlphabetized(): boolean {
        if (declaredDependencies.length === 0) {
          return true;
        }

        const declaredDepKeys = declaredDependencies.map((dep) => dep.key);

        const sortedDeclaredDepKeys = declaredDepKeys.slice().sort();

        return declaredDepKeys.join(',') === sortedDeclaredDepKeys.join(',');
      }

      if (areDeclaredDepsAlphabetized()) {
        suggestedDeps.sort();
      }

      function formatDependency(path: string): string {
        path = path.replace(/\[\*\]/g, '');

        const members = path.split('.');

        let finalPath = '';

        for (let i = 0; i < members.length; i++) {
          if (i !== 0) {
            const pathSoFar = members.slice(0, i + 1).join('.');

            const isOptional = optionalChains.get(pathSoFar) === true;

            finalPath += isOptional ? '?.' : '.';
          }

          finalPath += members[i];
        }

        return finalPath;
      }

      function reportProblem(descriptor: Rule.ReportDescriptor) {
        const hasAutofix = !!(
          descriptor.fix ||
          (enableDangerousAutofixThisMayCauseInfiniteLoops &&
            Array.isArray(descriptor.suggest) &&
            descriptor.suggest.length > 0)
        );

        const hasSuggestions = Array.isArray(descriptor.suggest) && descriptor.suggest.length > 0;

        if (
          (hasAutofix || hasSuggestions) &&
          'message' in descriptor &&
          typeof descriptor.message === 'string'
        ) {
          let indicator = '';

          if (hasAutofix) {
            indicator = ' [AUTOFIXABLE]';
          } else if (hasSuggestions) {
            indicator = ' [SUGGESTIONS AVAILABLE]';
          }

          descriptor.message += indicator;
        }

        if ('message' in descriptor && descriptor.message?.includes('unnecessary dependency')) {
          const match = descriptor.message?.match(/unnecessary dependency: '([^']+)'/i);

          if (match?.[1]) {
            const depKey = match[1];

            if (depKey.includes('.value[')) {
              const valueIndex = depKey.indexOf('.value[');
              if (valueIndex !== -1) {
                const closingBracket = depKey.indexOf(']', valueIndex);
                if (closingBracket !== -1 && !depKey.includes('.', valueIndex + 7)) {
                  if (
                    descriptor.message.includes('redundant') ||
                    descriptor.message.includes('unnecessary')
                  ) {
                    // Skip the autofix to prevent circular fixes
                    context.report({
                      node,
                      message: descriptor.message,
                      // Don't include fix or suggest
                    });

                    return;
                  }
                }
              }
            }

            if (depKey.includes('.') && !depKey.includes('.value[')) {
              if (
                ('message' in descriptor && descriptor.message.includes('redundant')) ||
                descriptor.message.includes('unnecessary')
              ) {
                const parts = depKey.split('.');

                if (parts.length === 2) {
                  context.report({
                    node,
                    message: descriptor.message,
                    // Don't include fix or suggest
                  });

                  return;
                }
              }
            }
          }
        }

        context.report(descriptor);
      }

      function getWarningMessage(
        deps: Set<string>,
        singlePrefix: string,
        label: string,
        fixVerb: string
      ): string | null {
        if (deps.size === 0) {
          return null;
        }

        return `${
          (deps.size > 1 ? '' : `${singlePrefix} `) + label
        } ${deps.size > 1 ? 'dependencies' : 'dependency'}: ${joinEnglish(
          Array.from(deps)
            .sort()
            .map((name) => `'${formatDependency(name)}'`)
        )}. Either ${fixVerb} ${deps.size > 1 ? 'them' : 'it'} or remove the dependency array.`;
      }

      let extraWarning = '';
      if (unnecessaryDependencies.size > 0) {
        let badRef: string | null = null;

        Array.from(unnecessaryDependencies.keys()).forEach((key) => {
          if (badRef !== null) {
            return;
          }

          if (key.endsWith('.current')) {
            badRef = key;
          }
        });

        if (badRef !== null) {
          extraWarning = ` Mutable values like '${badRef}' aren't valid dependencies because mutating them doesn't re-render the component.`;
        } else if (externalDependencies.size > 0) {
          const dep = Array.from(externalDependencies)[0];

          if (!scope.set.has(dep)) {
            extraWarning = ` Outer scope values like '${dep}' aren't valid dependencies because mutating them doesn't re-render the component.`;
          }
        }
      }

      if (!extraWarning && missingDependencies.has('props')) {
        const propDep = dependencies.get('props');

        if (propDep == null) {
          return;
        }

        const refs = propDep.references;

        if (!Array.isArray(refs)) {
          return;
        }

        let isPropsOnlyUsedInMembers = true;

        for (const ref of refs) {
          const id = fastFindReferenceWithParent(componentScope.block, ref.identifier);

          if (!id) {
            isPropsOnlyUsedInMembers = false;

            break;
          }

          // @ts-expect-error
          const parent = id.parent;

          if (parent == null) {
            isPropsOnlyUsedInMembers = false;

            break;
          }
          if (parent.type !== 'MemberExpression' && parent.type !== 'OptionalMemberExpression') {
            isPropsOnlyUsedInMembers = false;

            break;
          }
        }

        if (isPropsOnlyUsedInMembers) {
          extraWarning = ` However, 'props' will change when *any* prop changes, so the preferred fix is to destructure the 'props' object outside of the ${reactiveHookName} call and refer to those specific props inside ${getSourceCode().getText(reactiveHook)}.`;
        }
      }

      if (!extraWarning && missingDependencies.size > 0) {
        let missingCallbackDep: string | null = null;

        missingDependencies.forEach((missingDep: string): void => {
          if (missingCallbackDep) {
            return;
          }

          const topScopeRef = componentScope.set.get(missingDep);

          const usedDep = dependencies.get(missingDep);

          if (!usedDep?.references || usedDep?.references[0]?.resolved !== topScopeRef) {
            return;
          }

          const def = topScopeRef?.defs[0];

          if (def?.name == null || def.type !== 'Parameter') {
            return;
          }

          let isFunctionCall = false;

          let id: Identifier | undefined;

          for (const reference of usedDep.references) {
            id = reference.identifier;

            if (
              // @ts-expect-error
              id.parent != null &&
              // @ts-expect-error
              (id.parent.type === 'CallExpression' ||
                // @ts-expect-error
                id.parent.type === 'OptionalCallExpression') &&
              // @ts-expect-error
              id.parent.callee === id
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

        if (missingCallbackDep !== null) {
          extraWarning = ` If '${missingCallbackDep}' changes too often, find the parent component that defines it and wrap that definition in useCallback.`;
        }
      }

      if (!extraWarning && missingDependencies.size > 0) {
        dependencies.forEach((dep, key) => {
          if (key.includes('.value[') && key.includes('Signal')) {
            const valueIndex = key.indexOf('.value[');
            if (valueIndex !== -1) {
              const baseValueKey = key.slice(0, valueIndex + 6); // Include ".value"

              const isBaseValueDeclared = declaredDependencies.some(
                ({ key: depKey }) => depKey === baseValueKey
              );

              const isComputedPropertyDeclared = declaredDependencies.some(
                ({ key: depKey }) => depKey === key
              );

              const isInnerScopeComputed = dep.hasInnerScopeComputedProperty === true;

              if (!isComputedPropertyDeclared) {
                const isAssignmentOnly = dep.hasReads === false;

                if (!isAssignmentOnly) {
                  if (key.includes('Signal') && key.includes('.')) {
                    const parts = key.split('.');

                    if (parts.length > 2 && parts[1] === 'value') {
                      const signalName = parts[0];

                      const baseValueKey = `${signalName}.value`;

                      const isBaseValueDeclared = declaredDependencies.some(
                        ({ key }) => key === baseValueKey
                      );

                      if (isBaseValueDeclared) {
                        return;
                      }
                    }
                  }

                  if (!(isInnerScopeComputed && isBaseValueDeclared)) {
                    missingDependencies.add(key);
                  }
                }
              }
            }
          }
        });
      }

      if (!extraWarning && missingDependencies.size > 0) {
        dependencies.forEach((_dep, key) => {
          if (key.includes('Signal') && key.includes('.')) {
            if (key.includes('[') && key.includes(']')) {
              return;
            }
            const parts = key.split('.');

            if (parts.length > 2 && parts[1] === 'value') {
              const signalName = parts[0];

              const baseValueKey = `${signalName}.value`;

              const isBaseValueDeclared = declaredDependencies.some(
                ({ key }) => key === baseValueKey
              );

              const dependency = dependencies.get(key);

              const isAssignmentOnly = dependency && dependency.hasReads === false;

              const hasInnerScopeComputedProperty =
                dependency && dependency.hasInnerScopeComputedProperty === true;

              if (!isBaseValueDeclared && !isAssignmentOnly && !hasInnerScopeComputedProperty) {
                missingDependencies.add(key);
              }
            }
          }
        });
      }

      const missingMessage = getWarningMessage(missingDependencies, 'a', 'missing', 'include');

      const unnecessaryMessage = getWarningMessage(
        unnecessaryDependencies,
        'an',
        'unnecessary',
        'exclude'
      );

      const duplicateMessage = getWarningMessage(duplicateDependencies, 'a', 'duplicate', 'omit');

      const messages = [missingMessage, unnecessaryMessage, duplicateMessage]
        .filter(Boolean)
        .join('');

      const problemReport: Rule.ReportDescriptor = {
        node: declaredDependenciesNode,
        message: `React Hook ${getSourceCode().getText(reactiveHook)} has ${messages}${extraWarning}`,
        suggest: [
          {
            desc: `Update the dependencies array to be: [${suggestedDependencies
              .map(formatDependency)
              .join(', ')}]`,
            fix(fixer) {
              return fixer.replaceText(
                declaredDependenciesNode,
                `[${suggestedDependencies.map(formatDependency).join(', ')}]`
              );
            },
          },
        ],
      };

      if (enableAutoFixForMemoAndCallback) {
        problemReport.fix = problemReport.suggest?.[0].fix;
      }

      reportProblem(problemReport);
    }

    function visitCallExpression(node: CallExpression): void {
      const callbackIndex = getReactiveHookCallbackIndex(node.callee, options);

      if (callbackIndex === -1) {
        return;
      }

      let callback = node.arguments[callbackIndex];

      const reactiveHook = node.callee;

      const nodeWithoutNamespace = getNodeWithoutReactNamespace(reactiveHook);

      const reactiveHookName = 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '';

      const maybeNode = node.arguments[callbackIndex + 1];

      const declaredDependenciesNode =
        maybeNode && !(maybeNode.type === 'Identifier' && maybeNode.name === 'undefined')
          ? maybeNode
          : undefined;

      const isEffect = /Effect($|[^a-z])/g.test(reactiveHookName);

      if (!callback) {
        reportProblem({
          node: reactiveHook,
          message: `React Hook ${reactiveHookName} requires an effect callback. Did you forget to pass a callback to the hook?`,
        });

        return;
      }

      if (!maybeNode && isEffect && options.requireExplicitEffectDeps) {
        reportProblem({
          node: reactiveHook,
          message: `React Hook ${reactiveHookName} always requires dependencies. Please add a dependency array or an explicit \`undefined\``,
        });
      }

      const isAutoDepsHook = options.experimental_autoDependenciesHooks.includes(reactiveHookName);

      if (
        (!declaredDependenciesNode ||
          (isAutoDepsHook &&
            declaredDependenciesNode.type === 'Literal' &&
            declaredDependenciesNode.value === null)) &&
        !isEffect
      ) {
        if (reactiveHookName === 'useMemo' || reactiveHookName === 'useCallback') {
          // TODO: Can this have a suggestion?
          reportProblem({
            node: reactiveHook,
            message: `React Hook ${reactiveHookName} does nothing when called with only one argument. Did you forget to pass an array of dependencies?`,
          });
        }

        return;
      }

      while (
        // @ts-expect-error
        callback.type === 'TSAsExpression' ||
        // @ts-expect-error
        callback.type === 'AsExpression'
      ) {
        // @ts-expect-error
        callback = callback.expression;
      }

      switch (callback.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          visitFunctionWithDependencies(
            callback,
            declaredDependenciesNode,
            reactiveHook,
            reactiveHookName,
            isEffect,
            isAutoDepsHook
          );

          return;
        }
        case 'Identifier': {
          if (
            !declaredDependenciesNode ||
            (isAutoDepsHook &&
              declaredDependenciesNode.type === 'Literal' &&
              declaredDependenciesNode.value === null)
          ) {
            return;
          }

          if (
            'elements' in declaredDependenciesNode &&
            declaredDependenciesNode.elements &&
            declaredDependenciesNode.elements.some(
              (el) => el && el.type === 'Identifier' && el.name === callback.name
            )
          ) {
            return;
          }

          const variable = getScope(callback).set.get(callback.name);

          if (variable == null || variable.defs == null) {
            return;
          }

          const def = variable.defs[0];

          if (!def || !def.node) {
            break;
          }

          if (def.type === 'Parameter') {
            reportProblem({
              node: reactiveHook,
              message: getUnknownDependenciesMessage(reactiveHookName),
            });

            return;
          }

          if (def.type !== 'Variable' && def.type !== 'FunctionName') {
            break;
          }

          switch (def.node.type) {
            case 'FunctionDeclaration': {
              visitFunctionWithDependencies(
                def.node,
                declaredDependenciesNode,
                reactiveHook,
                reactiveHookName,
                isEffect,
                isAutoDepsHook
              );

              return;
            }
            case 'VariableDeclarator': {
              const init = def.node.init;

              if (!init) {
                break; // Unhandled
              }

              switch (init.type) {
                case 'ArrowFunctionExpression':
                case 'FunctionExpression': {
                  visitFunctionWithDependencies(
                    init,
                    declaredDependenciesNode,
                    reactiveHook,
                    reactiveHookName,
                    isEffect,
                    isAutoDepsHook
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
          reportProblem({
            node: reactiveHook,
            message: getUnknownDependenciesMessage(reactiveHookName),
          });

          return;
        }
      }

      reportProblem({
        node: reactiveHook,
        message: `React Hook ${reactiveHookName} has a missing dependency: '${callback.name}'. Either include it or remove the dependency array.`,
        suggest: [
          {
            desc: `Update the dependencies array to be: [${callback.name}]`,
            fix(fixer) {
              return fixer.replaceText(declaredDependenciesNode, `[${callback.name}]`);
            },
          },
        ],
      });
    }

    return {
      CallExpression: visitCallExpression,
    };
  },
} satisfies Rule.RuleModule;

function collectRecommendations({
  dependencies,
  declaredDependencies,
  stableDependencies,
  externalDependencies,
  isEffect,
}: {
  dependencies: Map<string, Dependency>;
  declaredDependencies: Array<DeclaredDependency>;
  stableDependencies: Set<string>;
  externalDependencies: Set<string>;
  isEffect: boolean;
}): {
  suggestedDependencies: string[];
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

  dependencies.forEach((_dep, key): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (signalName.endsWith('Signal')) {
        externalDependencies.delete(signalName);
      }
    }
  });

  dependencies.forEach((_, key): void => {
    const node = getOrCreateNodeByPath(depTree, key);

    node.isUsed = true;

    markAllParentsByPath(depTree, key, (parent): void => {
      parent.isSubtreeUsed = true;
    });
  });

  for (const { key } of declaredDependencies) {
    const node = getOrCreateNodeByPath(depTree, key);

    node.isSatisfiedRecursively = true;
  }

  for (const key of stableDependencies) {
    const node = getOrCreateNodeByPath(depTree, key);

    node.isSatisfiedRecursively = true;
  }

  function getOrCreateNodeByPath(rootNode: DependencyTreeNode, path: string): DependencyTreeNode {
    const keys = path.split('.');

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
    const keys = path.split('.');

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

  dependencies.forEach((_dep, key): void => {
    if (key.endsWith('.value')) {
      const baseName = key.slice(0, -6);

      if (baseName.endsWith('Signal')) {
        importedSignals.add(key);

        externalDependencies.delete(baseName);

        externalDependencies.delete(key);
      }
    } else if (key.includes('.value[') && key.includes('Signal')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const baseName = key.slice(0, valueIndex);

        const baseValueKey = key.slice(0, valueIndex + 6); // Include ".value"

        if (baseName.endsWith('Signal')) {
          importedSignals.add(key);

          externalDependencies.delete(baseName);

          externalDependencies.delete(baseValueKey);

          externalDependencies.delete(key);
        }
      }
    } else if (key.endsWith('Signal')) {
      const valueKey = `${key}.value`;

      // Check if there are any deeper property chains beyond just .value[]
      const hasDeepPropertyChains = Array.from(dependencies.keys()).some((depKey) => {
        // Look for patterns like signal.value[key].someProperty
        return (
          depKey.startsWith(`${key}.value[`) && depKey.includes('.', depKey.indexOf('.value[') + 7) // Has property access after computed member
        );
      });

      if (!dependencies.has(valueKey) && !hasDeepPropertyChains) {
        const hasDeepChains = Array.from(importedSignals).some((sig: string): boolean => {
          return sig.startsWith(`${key}.value[`) && sig.includes('.', sig.indexOf('.value[') + 7);
        });

        if (!hasDeepChains) {
          importedSignals.add(key);

          externalDependencies.delete(key);
        }
      }
    }
  });

  [...dependencies.keys()].forEach((depKey: string): void => {
    if (depKey.includes('Signal') && !importedSignals.has(depKey)) {
      if (depKey.endsWith('.value')) {
        const baseName = depKey.slice(0, -6);

        if (baseName.endsWith('Signal')) {
          importedSignals.add(depKey);

          externalDependencies.delete(baseName);

          externalDependencies.delete(depKey);
        }
      }
    }
  });

  const missingDependencies = new Set<string>();

  const satisfyingDependencies = new Set<string>();

  dependencies.forEach((_, key): void => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (signalName.endsWith('Signal')) {
        const node = getOrCreateNodeByPath(depTree, signalName);

        node.isSatisfiedRecursively = true;

        externalDependencies.delete(signalName);

        externalDependencies.delete(key);
      }
    } else if (key.includes('.value[') && key.includes('Signal')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (signalName.endsWith('Signal')) {
          const node = getOrCreateNodeByPath(depTree, signalName);

          node.isSatisfiedRecursively = true;

          externalDependencies.delete(signalName);

          externalDependencies.delete(key);
        }
      }
    } else if (key.endsWith('Signal')) {
      const node = getOrCreateNodeByPath(depTree, key);

      node.isSatisfiedRecursively = true;

      externalDependencies.delete(key);
    }
  });

  const declaredSignals = new Set<string>();

  declaredDependencies.forEach(({ key }) => {
    if (key.endsWith('.value')) {
      const signalName = key.slice(0, -6);

      if (signalName.endsWith('Signal')) {
        declaredSignals.add(signalName);
      }
    } else if (key.includes('.value[') && key.includes('Signal')) {
      const valueIndex = key.indexOf('.value[');

      if (valueIndex !== -1) {
        const signalName = key.slice(0, valueIndex);

        if (signalName.endsWith('Signal')) {
          declaredSignals.add(signalName);
        }
      }
    } else if (key.endsWith('Signal')) {
      declaredSignals.add(key);
    }
  });

  importedSignals.forEach((signal) => {
    if (signal.includes('.value[') && signal.includes('Signal')) {
      const isComputedPropertyDeclared = declaredDependencies.some(
        ({ key: depKey }) => depKey === signal
      );

      if (!isComputedPropertyDeclared) {
        const dependency = dependencies.get(signal);

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;
        const isAssignmentOnly = dependency && dependency.hasReads === false;

        if (!isAssignmentOnly && !hasInnerScopeComputedProperty) {
          missingDependencies.add(signal);
        }

        const valueIndex = signal.indexOf('.value[');

        if (valueIndex !== -1) {
          const signalName = signal.slice(0, valueIndex);

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
      const isValueDeclared = declaredDependencies.some(({ key }) => key === signal);

      if (!isValueDeclared) {
        const dependency = dependencies.get(signal);

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        if (!isAssignmentOnly && !hasInnerScopeComputedProperty) {
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
        return (
          key === valueAccessKey || (key.startsWith(`${valueAccessKey}[`) && key.includes('Signal'))
        );
      });

      if (!isValueDeclared) {
        // Check if this dependency is only used for assignments
        const dependency = dependencies.get(valueAccessKey);

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        if (!isAssignmentOnly && !hasInnerScopeComputedProperty) {
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
      declaredDependencies.some(({ key }) => key === signal) || declaredSignals.has(signal);

    if (!isDeclared) {
      const dependency = dependencies.get(signal);

      const isAssignmentOnly =
        dependency &&
        (dependency.hasReads === false ||
          // @ts-expect-error
          dependency.isComputedAssignmentOnly === true);

      let hasAssignmentOnlyComputedMembers = false;

      let hasDeepPropertyChains = false;

      if (signal.endsWith('Signal')) {
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

      if (!isAssignmentOnly && !hasAssignmentOnlyComputedMembers) {
        if (!hasDeepPropertyChains) {
          missingDependencies.add(signal);
        }
      }
    }
  });

  dependencies.forEach((dep: Dependency, index: string): void => {
    if (index.includes('.value[') && index.includes('Signal')) {
      const valueIndex = index.indexOf('.value[');

      if (valueIndex !== -1) {
        const isComputedPropertyDeclared = declaredDependencies.some(
          ({ key: depKey }) => depKey === index
        );

        if (
          !isComputedPropertyDeclared &&
          dep.hasInnerScopeComputedProperty !== true &&
          dep.hasReads !== false
        ) {
          missingDependencies.add(index);
        }
      }
    }
  });

  scanTreeRecursively(depTree, missingDependencies, satisfyingDependencies, (key) => key);

  function scanTreeRecursively(
    node: DependencyTreeNode,
    missingPaths: Set<string>,
    satisfyingPaths: Set<string>,
    keyToPath: (key: string) => string
  ): void {
    node.children.forEach((child, key) => {
      const path = keyToPath(key);

      const isSignalPath = isSignalDependency(path) || isSignalDependency(key);

      const isImportedSignal =
        path.endsWith('Signal') ||
        key.endsWith('Signal') ||
        (path.includes('.') && path.split('.')[0].endsWith('Signal')) ||
        (key.includes('.') && key.split('.')[0].endsWith('Signal'));

      const hasValueAccess = path.endsWith('.value') || key.endsWith('.value');

      const isAnySignalType = isSignalPath || isImportedSignal || hasValueAccess;

      if (child.isSatisfiedRecursively) {
        if (child.isSubtreeUsed) {
          satisfyingPaths.add(path);
        }

        return;
      }

      if (child.isUsed || (isAnySignalType && (child.isSubtreeUsed || child.isUsed))) {
        if (path.endsWith('Signal') && !path.includes('.')) {
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
        (childKey) => `${path}.${childKey}`
      );
    });
  }

  const suggestedDependencies: Array<string> = [];
  const unnecessaryDependencies = new Set<string>();
  const duplicateDependencies = new Set<string>();
  const incompleteDependencies = new Set<string>();
  const redundantDependencies = new Set<string>();

  const declaredDepsMap = new Map<string, boolean>();

  declaredDependencies.forEach(({ key }) => {
    declaredDepsMap.set(key, true);
  });

  declaredDependencies.forEach(({ key }) => {
    if (key.endsWith('Signal') && !key.includes('.')) {
      const valueKey = `${key}.value`;

      if (missingDependencies.has(valueKey)) {
        incompleteDependencies.add(key);

        satisfyingDependencies.delete(key);
      } else if (declaredDepsMap.has(valueKey)) {
        redundantDependencies.add(key);

        satisfyingDependencies.delete(key);
      }
    }

    if (key.includes('.value[') && key.includes('Signal')) {
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

                if (!isDirectlyUsed) {
                  redundantDependencies.add(baseComputedExpression);
                  satisfyingDependencies.delete(baseComputedExpression);
                }
              }
            }
          }
        }
      }
    }

    if (!key.includes('.') && !key.endsWith('Signal')) {
      const hasDeepPropertyUsage = Array.from(missingDependencies).some((dep: string): boolean => {
        return dep.startsWith(`${key}.`) && dep !== key;
      });

      if (hasDeepPropertyUsage) {
        incompleteDependencies.add(key);

        satisfyingDependencies.delete(key);
      } else {
        const hasPropertyAlsoDeclared = Array.from(declaredDepsMap.keys()).some(
          (declaredKey: string): boolean => {
            return declaredKey.startsWith(`${key}.`) && declaredKey !== key;
          }
        );

        if (hasPropertyAlsoDeclared) {
          // Check if the base dependency is directly used (not just through deeper properties)
          const baseDependency = dependencies.get(key);
          const isDirectlyUsed = baseDependency && baseDependency.hasReads === true;

          if (!isDirectlyUsed) {
            redundantDependencies.add(key);
            satisfyingDependencies.delete(key);
          }
        }
      }
    }
  });

  declaredDependencies.forEach(({ key }): void => {
    if (satisfyingDependencies.has(key)) {
      if (suggestedDependencies.includes(key)) {
        duplicateDependencies.add(key);
      } else {
        suggestedDependencies.push(key);
      }

      return;
    }

    const isSignalDep = key.endsWith('Signal') || key.includes('Signal.') || key.endsWith('.value');

    const dependency = dependencies.get(key);

    const isAssignmentOnly = isSignalDep && dependency && dependency.hasReads === false;

    if (isAssignmentOnly) {
      unnecessaryDependencies.add(key);
    } else if (incompleteDependencies.has(key) || redundantDependencies.has(key)) {
      unnecessaryDependencies.add(key);
    } else if (
      (isEffect && !key.endsWith('.current') && !externalDependencies.has(key)) ||
      isSignalDep
    ) {
      if (!suggestedDependencies.includes(key)) {
        suggestedDependencies.push(key);
      }
    } else {
      unnecessaryDependencies.add(key);
    }
  });

  const missingDepsArray = Array.from(missingDependencies);

  missingDepsArray.sort((a, b) => b.length - a.length);

  const addedPaths = new Set<string>();

  const addedRootPaths = new Set<string>();

  for (const key of missingDepsArray) {
    const rootPath = key.split('.')[0];

    const isChildPath = key.includes('.');

    if (key.endsWith('.value') && key.slice(0, -6).endsWith('Signal')) {
      const signalName = key.slice(0, -6);

      addedRootPaths.add(signalName);

      suggestedDependencies.push(key);

      addedPaths.add(key);

      continue;
    }

    if (!addedPaths.has(key) && !addedRootPaths.has(key)) {
      suggestedDependencies.push(key);

      addedPaths.add(key);

      if (isChildPath) {
        addedRootPaths.add(rootPath);
      }
    }
  }

  return {
    suggestedDependencies,
    unnecessaryDependencies,
    duplicateDependencies,
    missingDependencies,
  };
}

function getConstructionExpressionType(node: Node): string | null {
  switch (node.type) {
    case 'ObjectExpression': {
      return 'object';
    }

    case 'ArrayExpression': {
      return 'array';
    }

    case 'ArrowFunctionExpression':
    case 'FunctionExpression': {
      return 'function';
    }

    case 'ClassExpression': {
      return 'class';
    }

    case 'ConditionalExpression': {
      if (
        getConstructionExpressionType(node.consequent) != null ||
        getConstructionExpressionType(node.alternate) != null
      ) {
        return 'conditional';
      }

      return null;
    }

    case 'LogicalExpression': {
      if (
        getConstructionExpressionType(node.left) != null ||
        getConstructionExpressionType(node.right) != null
      ) {
        return 'logical expression';
      }

      return null;
    }

    // @ts-expect-error
    case 'JSXFragment': {
      return 'JSX fragment';
    }

    // @ts-expect-error
    case 'JSXElement': {
      return 'JSX element';
    }

    case 'AssignmentExpression': {
      if (getConstructionExpressionType(node.right) != null) {
        return 'assignment expression';
      }

      return null;
    }

    case 'NewExpression': {
      return 'object construction';
    }

    case 'Literal': {
      if (node.value instanceof RegExp) {
        return 'regular expression';
      }

      return null;
    }

    // @ts-expect-error
    case 'TypeCastExpression':
    // @ts-expect-error
    case 'AsExpression':
    // @ts-expect-error
    case 'TSAsExpression': {
      // @ts-expect-error
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
  declaredDependenciesNode: Node;
  componentScope: Scope.Scope;
  scope: Scope.Scope;
}) {
  const constructions = declaredDependencies
    .map(({ key }) => {
      const ref = componentScope.variables.find((v) => v.name === key);

      if (ref == null) {
        return null;
      }

      const node = ref.defs[0];

      if (node == null) {
        return null;
      }

      if (
        node.type === 'Variable' &&
        node.node.type === 'VariableDeclarator' &&
        node.node.id.type === 'Identifier' && // Ensure this is not destructed assignment
        node.node.init != null
      ) {
        const constantExpressionType = getConstructionExpressionType(node.node.init);

        if (constantExpressionType) {
          return [ref, constantExpressionType];
        }
      }

      if (node.type === 'FunctionName' && node.node.type === 'FunctionDeclaration') {
        return [ref, 'function'];
      }

      if (node.type === 'ClassName' && node.node.type === 'ClassDeclaration') {
        return [ref, 'class'];
      }

      return null;
    })
    .filter(Boolean) as Array<[Scope.Variable, string]>;

  function isUsedOutsideOfHook(ref: Scope.Variable): boolean {
    let foundWriteExpr = false;

    for (const reference of ref.references) {
      if (reference.writeExpr) {
        if (foundWriteExpr) {
          return true;
        }

        foundWriteExpr = true;

        continue;
      }

      let currentScope: Scope.Scope | null = reference.from;

      while (currentScope !== scope && currentScope != null) {
        currentScope = currentScope.upper;
      }

      if (currentScope !== scope) {
        if (!isAncestorNodeOf(declaredDependenciesNode, reference.identifier)) {
          return true;
        }
      }
    }

    return false;
  }

  return constructions.map(([ref, depType]) => ({
    construction: ref.defs[0] as Scope.Definition,
    depType,
    isUsedOutsideOfHook: isUsedOutsideOfHook(ref),
  }));
}

function getDependency(node: Node): Node {
  if (
    node.type === 'MemberExpression' ||
    // @ts-expect-error
    node.type === 'OptionalMemberExpression'
  ) {
    if (node.type === 'MemberExpression' && !node.computed) {
      if (
        node.property.type === 'Identifier' &&
        node.property.name === 'value' &&
        node.object.type === 'Identifier' &&
        node.object.name.endsWith('Signal')
      ) {
        return node;
      }
    }
    return node;
  }

  if (node.type === 'Identifier' && isSignalVariable(node)) {
    return node;
  }

  if (node.type === 'Identifier' && node.name.endsWith('Signal')) {
    return node;
  }

  // @ts-expect-error
  if (node.type === 'JSXExpressionContainer') {
    // @ts-expect-error
    return getDependency(node.expression);
  }

  if (node.type === 'CallExpression') {
    return getDependency(node.callee);
  }

  if (node.type === 'ChainExpression') {
    return getDependency(node.expression);
  }

  // @ts-expect-error
  if (node.type === 'TSNonNullExpression') {
    // @ts-expect-error
    return getDependency(node.expression);
  }

  return node;
}

function markNode(node: Node, optionalChains: Map<string, boolean> | null, result: string): void {
  if (optionalChains) {
    if ('optional' in node && node.optional) {
      if (!optionalChains.has(result)) {
        optionalChains.set(result, true);
      }
    } else {
      optionalChains.set(result, false);
    }
  }
}

function analyzePropertyChain(node: Node, optionalChains: Map<string, boolean> | null): string {
  // @ts-expect-error
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
    const result = node.name;

    if (optionalChains) {
      optionalChains.set(result, false);
    }

    return result;
  }

  if (node.type === 'MemberExpression') {
    if (!node.computed) {
      const object = analyzePropertyChain(node.object, optionalChains);

      const property = analyzePropertyChain(node.property, null);

      const result = `${object}.${property}`;

      markNode(node, optionalChains, result);

      return result;
    }

    const object = analyzePropertyChain(node.object, optionalChains);

    let computedResult: string;

    if (node.property.type === 'Identifier') {
      computedResult = `${object}[${node.property.name}]`;
    } else if (node.property.type === 'Literal') {
      const literal =
        typeof node.property.value === 'string'
          ? `"${node.property.value}"`
          : String(node.property.value);

      computedResult = `${object}[${literal}]`;
    } else {
      try {
        const property = analyzePropertyChain(node.property, null);

        computedResult = `${object}[${property}]`;
        // oxlint-disable-next-line no-unused-vars
      } catch (_error) {
        // biome-ignore format: because
        // @ts-expect-error - TypeScript AST node types not in estree
        if (node.property.type === "TSAsExpression" || node.property.type === "AsExpression") {
          // @ts-expect-error
          const expr = node.property.expression;

          if (expr && expr.type === "Identifier") {
            computedResult = `${object}[${expr.name}]`;
          } else {
            computedResult = `${object}[*]`;
          }
        } else {
          computedResult = `${object}[*]`;
        }
      }
    }

    let currentNode = node;
    let finalResult = computedResult;

    if (node.type === 'MemberExpression' && node.computed) {
      currentNode = node;
    } else {
      // biome-ignore format: because
      while (
        // @ts-expect-error
        currentNode.parent?.type === "MemberExpression" &&
        // @ts-expect-error
        !currentNode.parent.computed &&
        // @ts-expect-error
        currentNode.parent.object === currentNode &&
        // @ts-expect-error
        currentNode.parent.property?.type === "Identifier"
      ) {
        // @ts-expect-error
        const propertyName = currentNode.parent.property.name;

        if (!finalResult.endsWith(`.${propertyName}`)) {
          finalResult += `.${propertyName}`;
        }

        // @ts-expect-error
        currentNode = currentNode.parent;
      }
    }

    markNode(currentNode, optionalChains, finalResult);

    return finalResult;
  }

  // @ts-expect-error
  if (node.type === 'OptionalMemberExpression' && !node.computed) {
    // @ts-expect-error
    const object = analyzePropertyChain(node.object, optionalChains);

    // @ts-expect-error
    const property = analyzePropertyChain(node.property, null);

    const result = `${object}.${property}`;

    markNode(node, optionalChains, result);

    return result;
  }

  if (node.type === 'ChainExpression' && (!('computed' in node) || !node.computed)) {
    const expression = node.expression;

    if (expression.type === 'CallExpression') {
      throw new Error(`Unsupported node type: ${expression.type}`);
    }

    const object = analyzePropertyChain(expression.object, optionalChains);

    const property = analyzePropertyChain(expression.property, null);

    const result = `${object}.${property}`;

    markNode(expression, optionalChains, result);

    return result;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

function getNodeWithoutReactNamespace(node: Expression | Super): Expression | Identifier | Super {
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'React' &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return node.property;
  }

  return node;
}

function getReactiveHookCallbackIndex(
  calleeNode: Expression | Super,
  options?: {
    additionalHooks: RegExp | undefined;
    enableDangerousAutofixThisMayCauseInfiniteLoops?: boolean;
  }
): 0 | -1 | 1 {
  const node = getNodeWithoutReactNamespace(calleeNode);

  if (node.type !== 'Identifier') {
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
      if (node === calleeNode && options && options.additionalHooks) {
        let name: string | undefined;

        try {
          name = analyzePropertyChain(node, null);
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

function fastFindReferenceWithParent(start: Node, target: Node): Node | null {
  const queue = [start];

  let item: Node;

  while (queue.length) {
    item = queue.shift() as Node;

    if (isSameIdentifier(item, target)) {
      return item;
    }

    if (!isAncestorNodeOf(item, target)) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      if (key === 'parent') {
        continue;
      }

      if (isNodeLike(value)) {
        // @ts-expect-error
        value.parent = item;

        queue.push(value);
      } else if (Array.isArray(value)) {
        for (const val of value) {
          if (isNodeLike(val)) {
            // @ts-expect-error
            val.parent = item;

            queue.push(val);
          }
        }
      }
    }
  }

  return null;
}

function joinEnglish(arr: Array<string>): string {
  let s = '';

  for (let i = 0; i < arr.length; i++) {
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

function isNodeLike(val: unknown): val is Node {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    'type' in val &&
    typeof val.type === 'string'
  );
}

function isSameIdentifier(a: Node, b: Node): boolean {
  return (
    // @ts-expect-error
    (a.type === 'Identifier' || a.type === 'JSXIdentifier') &&
    a.type === b.type &&
    a.name === b.name &&
    !!a.range &&
    !!b.range &&
    a.range[0] === b.range[0] &&
    a.range[1] === b.range[1]
  );
}

function isAncestorNodeOf(a: Node, b: Node): boolean {
  return !!a.range && !!b.range && a.range[0] <= b.range[0] && a.range[1] >= b.range[1];
}

function isUseEffectEventIdentifier(node: Node): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  const { name } = node;

  return name === 'useEffectEvent' || name === 'experimental_useEffectEvent';
}

function isSignalIdentifier(node: Node): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  const { name } = node;

  return ['signal', 'computed', 'effect'].includes(name);
}

function isSignalVariable(node: Node): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  return node.name.endsWith('Signal');
}

function isSignalDependency(dependency: string): boolean {
  return (
    dependency.includes('Signal') || dependency.endsWith('.value') || dependency.includes('Signal.')
  );
}

function isSignalValueAccess(node: Node): boolean {
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    node.object.name.endsWith('Signal')
  ) {
    return true;
  }

  return false;
}

function getUnknownDependenciesMessage(reactiveHookName: string): string {
  return `React Hook ${reactiveHookName} received a function whose dependencies are unknown. Pass an inline function instead.`;
}
