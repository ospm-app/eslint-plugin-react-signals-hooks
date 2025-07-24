import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { Definition, Reference, Scope, Variable } from '@typescript-eslint/scope-manager';

import type { Pattern } from 'estree';
import type { RuleContext, SuggestionReportDescriptor } from '@typescript-eslint/utils/ts-eslint';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

type Options = [
  {
    additionalHooks?: string | undefined;
    enableDangerousAutofixThisMayCauseInfiniteLoops?: boolean | undefined;
    experimental_autoDependenciesHooks?: string[] | undefined;
    requireExplicitEffectDeps?: boolean | undefined;
    enableAutoFixForMemoAndCallback?: boolean | undefined;
  },
];

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
  | 'staleAssignmentDependency' // When a dependency is assigned a new value but not included in deps
  | 'staleAssignmentLiteral' // When a literal value is used in deps but not stable
  | 'staleAssignmentExpression' // When a complex expression is used in deps
  | 'staleAssignmentUnstable' // When a value that changes on every render is used in deps
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

type DeclaredDependency = { key: string; node: TSESTree.Node };

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
};

type DependencyTreeNode = {
  isUsed: boolean;
  isSatisfiedRecursively: boolean;
  isSubtreeUsed: boolean;
  children: Map<string, DependencyTreeNode>;
};

export const exhaustiveDepsRule = createRule<Options, MessageIds>({
  name: 'exhaustive-deps',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Verifies the list of dependencies for Hooks like useEffect and similar',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/exhaustive-deps',
    },
    messages: {
      missingDependencies:
        'React Hook {{hookName}} is missing {{dependenciesCount}} dependencies: {{dependencies}}. ' +
        'Including all dependencies ensures your effect runs when expected. ' +
        'Either add the missing dependencies or remove the dependency array if this effect should run on every render.\n' +
        '\n' +
        'Why this matters:\n' +
        '• Missing dependencies can cause your effect to use stale values from previous renders\n' +
        "• This can lead to bugs where your UI doesn't update when expected\n" +
        '• The effect may run more or less often than intended',

      missingDependency:
        'React Hook {{hookName}} is missing the dependency: {{dependency}}. ' +
        'This dependency is used inside the effect but not listed in the dependency array.\n' +
        '\n' +
        'Impact:\n' +
        '• The effect might not re-run when this value changes\n' +
        '• The effect could use stale values from previous renders\n' +
        '• This can lead to UI inconsistencies\n' +
        '\n' +
        '{{missingMessage}}',

      unnecessaryDependencies:
        'React Hook {{hookName}} has {{count}} unnecessary dependencies: {{dependencies}}. ' +
        'These values are either constants or defined outside the component and will never change.\n' +
        '\n' +
        'Recommendation:\n' +
        '• Remove these dependencies to make the effect more maintainable\n' +
        '• This helps React optimize re-renders\n' +
        '\n' +
        '{{message}}',

      unnecessaryDependency:
        'React Hook {{hookName}} has an unnecessary dependency: {{dependency}}. ' +
        'This value is either a constant or defined outside the component and will never change.\n' +
        '\n' +
        'Why remove it?\n' +
        '• Makes the dependency array more accurate\n' +
        '• Helps React optimize re-renders\n' +
        '• Reduces unnecessary effect re-runs\n' +
        '\n' +
        '{{message}}',

      duplicateDependencies:
        'React Hook {{hookName}} has {{count}} duplicate dependencies: {{dependencies}}. ' +
        'This can cause unexpected behavior and unnecessary re-renders.\n' +
        '\n' +
        'Impact:\n' +
        '• The effect may run more times than necessary\n' +
        '• Can lead to performance issues\n' +
        '• Makes the code harder to reason about',

      duplicateDependency:
        'React Hook {{hookName}} has a duplicate dependency: {{dependency}} ({{position}} of {{total}}). ' +
        'This can cause unexpected behavior and unnecessary re-renders.\n' +
        '\n' +
        'Why remove duplicates?\n' +
        '• Ensures the effect runs only when necessary\n' +
        '• Improves performance\n' +
        '• Makes the code more maintainable',

      unknownDependencies:
        'React Hook {{hookName}} has dependencies that cannot be statically analyzed. ' +
        'This can happen when using dynamic property access or function calls in the dependency array.\n' +
        '\n' +
        'How to fix:\n' +
        '• Use static, direct references in dependency arrays\n' +
        '• Extract dynamic values to variables before using them in the effect\n' +
        '• Consider using useCallback or useMemo for dynamic values',

      asyncEffect:
        'React Hook {{hookName}} has an async effect callback. ' +
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
        'React Hook {{hookName}} is missing its effect callback function. ' +
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
        'The variable "{{dependency}}" is used in the dependency array for {{hookName}} but may not be properly tracked.\n\n' +
        'Why this is problematic:\n' +
        '• The effect might use outdated values\n' +
        '• Changes to this variable might not trigger effect re-runs\n\n' +
        'Solution: Ensure the variable is properly included in the dependency array or wrap it with useMemo/useCallback.',

      staleAssignmentLiteral:
        'The literal value {{dependency}} is used in the dependency array for {{hookName}}.\n\n' +
        'Why this is problematic:\n' +
        '• Literal values create new references on each render\n' +
        '• This can cause the effect to re-run on every render\n\n' +
        'Solution: Move the value outside the component or memoize it with useMemo if needed.',

      staleAssignmentUnstable:
        'The value {{dependency}} is used in the dependency array for {{hookName}} but may change on every render.\n\n' +
        'Why this is problematic:\n' +
        '• This can cause the effect to re-run on every render\n' +
        '• May lead to performance issues\n\n' +
        'Solution: Move the value outside the component or memoize it with useMemo.',

      staleAssignmentExpression:
        'The expression "{{dependency}}" is used in the dependency array for {{hookName}}.\n\n' +
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
        'The useEffectEvent function "{{eventName}}" should not be included in the dependency array. ' +
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

      addDependencies: 'Add {{count}} missing dependencies ({{dependencies}})',
      addAllDependencies: 'Add all {{count}} missing dependencies ({{dependencies}})',
      addSingleDependency: 'Add missing dependency: {{dependency}}',
      removeDependencyArray: 'Remove dependency array to run effect on every render',

      removeDependency: 'Remove the "{{dependency}}" dependency from the dependency array.',
      removeSingleDependency: 'Remove the "{{dependency}}" dependency',
      removeAllUnnecessaryDependencies:
        'Remove all {{count}} unnecessary dependencies ({{dependencies}})',
      removeThisDuplicate: 'Remove this duplicate "{{dependency}}"',
      removeAllDuplicates: 'Remove all {{count}} duplicate dependencies',

      dependencyWithoutSignal: '{{message}}',

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
  defaultOptions: [{}],
  create(context, [rawFirstOption = {}]) {
    const {
      additionalHooks,
      enableDangerousAutofixThisMayCauseInfiniteLoops = false,
      experimental_autoDependenciesHooks = [],
      requireExplicitEffectDeps = false,
      enableAutoFixForMemoAndCallback = false,
    } = rawFirstOption;

    console.info('context.options', context.options);

    const additionalHooksRegex =
      typeof additionalHooks === 'string' ? new RegExp(additionalHooks) : undefined;

    const options = {
      additionalHooks: additionalHooksRegex,
      experimental_autoDependenciesHooks,
      enableDangerousAutofixThisMayCauseInfiniteLoops,
      requireExplicitEffectDeps,
      enableAutoFixForMemoAndCallback,
    };

    const setStateCallSites = new WeakMap<
      TSESTree.Expression | TSESTree.Super | TSESTree.Identifier | TSESTree.JSXIdentifier,
      Pattern | TSESTree.DestructuringPattern | null | undefined
    >();

    const stateVariables = new WeakSet<TSESTree.Identifier | TSESTree.JSXIdentifier>();

    const stableKnownValueCache = new WeakMap<Variable, boolean>();

    const functionWithoutCapturedValueCache = new WeakMap<Variable, boolean>();

    const useEffectEventVariables = new WeakSet<
      TSESTree.Expression | TSESTree.Identifier | TSESTree.JSXIdentifier
    >();

    const signalVariables = new WeakSet<TSESTree.Identifier | TSESTree.JSXIdentifier>();

    function memoizeWithWeakMap(
      fn: (resolved: Variable) => boolean,
      map: WeakMap<Variable, boolean>
    ): (arg: Variable) => boolean {
      return (arg: Variable): boolean => {
        if (map.has(arg)) {
          return map.get(arg) ?? false;
        }

        const result = fn(arg);

        map.set(arg, result);

        return result;
      };
    }

    function visitFunctionWithDependencies(
      node:
        | TSESTree.ArrowFunctionExpression
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression,
      declaredDependenciesNode: TSESTree.Node | undefined,
      reactiveHook: TSESTree.Node,
      reactiveHookName: string,
      isEffect: boolean,
      isAutoDepsHook: boolean
    ): void {
      const objectPropertyAccesses = new Map<string, Set<string>>();

      if (isEffect && node.async === true) {
        context.report({
          node,
          data: {
            message: `TODO!!!`,
          },
          messageId: 'asyncEffect',
          fix(fixer) {
            return fixer.replaceText(node, `async () => { ${context.sourceCode.getText(node)}; }`);
          },
        });
      }

      const scope = context.sourceCode.scopeManager?.acquire(node);

      if (!scope) {
        throw new Error(
          'Unable to acquire scope for the current node. This is a bug in eslint-plugin-react-hooks, please file an issue.'
        );
      }

      const pureScopes = new Set<Scope>();

      let componentScope: Scope | null = null;

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

      function isStableKnownHookValue(resolved: Variable): boolean {
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

        if (declaration == null && componentScope !== null) {
          if ('id' in def.node && def.node.id !== null) {
            fastFindReferenceWithParent(componentScope.block, def.node.id);

            declaration = def.node.parent;
          }

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

        let callee: TSESTree.Expression | TSESTree.PrivateIdentifier | TSESTree.Super = init.callee;

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

        const definitionNode = def.node as TSESTree.VariableDeclarator;

        if (callee.name === 'useRef' && definitionNode.id.type === 'Identifier') {
          return true;
        }

        if (
          (isSignalIdentifier(callee) || isSignalVariable(definitionNode.id)) &&
          definitionNode.id.type === 'Identifier'
        ) {
          for (const ref of resolved.references) {
            if (ref.identifier !== definitionNode.id) {
              signalVariables.add(ref.identifier);
            }
          }

          return false;
        }

        if (isUseEffectEventIdentifier(callee) && definitionNode.id.type === 'Identifier') {
          for (const ref of resolved.references) {
            if (ref.identifier !== definitionNode.id) {
              useEffectEventVariables.add(ref.identifier);
            }
          }

          return true;
        }

        if (['useState', 'useReducer', 'useActionState'].includes(callee.name)) {
          if (
            definitionNode.id.type === 'ArrayPattern' &&
            definitionNode.id.elements.length === 2 &&
            Array.isArray(resolved.identifiers)
          ) {
            if (definitionNode.id.elements[1] === resolved.identifiers[0]) {
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

                  setStateCallSites.set(reference.identifier, definitionNode.id.elements[0]);
                }
              }

              return true;
            }

            if (definitionNode.id.elements[0] === resolved.identifiers[0]) {
              if (callee.name === 'useState') {
                const references = resolved.references;

                for (const reference of references) {
                  stateVariables.add(reference.identifier);
                }
              }

              return false;
            }
          }
        } else if (callee.name === 'useTransition') {
          if (
            definitionNode.id.type === 'ArrayPattern' &&
            definitionNode.id.elements.length === 2 &&
            Array.isArray(resolved.identifiers)
          ) {
            if (definitionNode.id.elements[1] === resolved.identifiers[0]) {
              return true;
            }
          }
        }

        return false;
      }

      const memoizedIsStableKnownHookValue = memoizeWithWeakMap(
        isStableKnownHookValue,
        stableKnownValueCache
      );

      function isFunctionWithoutCapturedValues(resolved: Variable): boolean {
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

        const fnNode: TSESTree.Node = def.node;

        const childScopes = componentScope?.childScopes || [];

        let fnScope = null;

        for (const childScope of childScopes) {
          const childScopeBlock = childScope.block;

          if (
            (fnNode.type === 'FunctionDeclaration' && childScopeBlock === fnNode) ||
            (fnNode.type === 'VariableDeclarator' && childScopeBlock.parent === fnNode)
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

      const memoizedIsFunctionWithoutCapturedValues = memoizeWithWeakMap(
        isFunctionWithoutCapturedValues,
        functionWithoutCapturedValueCache
      );

      const currentRefsInEffectCleanup = new Map<
        string,
        {
          reference: Reference;
          dependencyNode: TSESTree.Identifier;
        }
      >();

      function isInsideEffectCleanup(reference: Reference): boolean {
        let curScope: Scope | null = reference.from;

        let isInReturnedFunction = false;

        while (curScope !== null && curScope.block !== node) {
          if (curScope.type === 'function') {
            isInReturnedFunction =
              curScope.block.parent != null && curScope.block.parent?.type === 'ReturnStatement';
          }

          curScope = curScope.upper;
        }

        return isInReturnedFunction;
      }

      const dependencies = new Map<string, Dependency>();

      const optionalChains = new Map<string, boolean>();

      const externalDependencies = new Set<string>();

      gatherDependenciesRecursively(scope);

      function isOnlyAssignmentReference(reference: Reference): boolean {
        const { identifier } = reference;

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

      function gatherDependenciesRecursively(currentScope: Scope): void {
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
            reference.identifier.parent.type === "MemberExpression" &&
            !reference.identifier.parent.computed &&
            reference.identifier.parent.property.type === "Identifier" &&
            reference.identifier.parent.object === reference.identifier
          ) {
            const objectName = reference.identifier.name;

            const propertyName = reference.identifier.parent.property.name;

            if (propertyName !== "current") {
              if (!objectPropertyAccesses.has(objectName)) {
                objectPropertyAccesses.set(objectName, new Set<string>());
              }

              let currentNode: TSESTree.MemberExpressionComputedName | TSESTree.MemberExpressionNonComputedName = reference.identifier.parent;

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
          }

          let isComputedMemberAssignmentOnly = false;

          if (
            reference.identifier.type === 'Identifier' &&
            reference.identifier.name.endsWith('Signal')
          ) {
            const parent = reference.identifier.parent;

            if (
              parent.type === 'MemberExpression' &&
              parent.object === reference.identifier &&
              'name' in parent.property &&
              parent.property.name === 'value' &&
              parent.parent.type === 'MemberExpression' &&
              parent.parent.object === parent &&
              parent.parent.parent.type === 'AssignmentExpression' &&
              parent.parent.parent.left === parent.parent
            ) {
              isComputedMemberAssignmentOnly = true;

              // @ts-expect-error adding isComputedAssignmentOnly to Reference
              reference.isComputedAssignmentOnly = true;

              const baseSignalName = reference.identifier.name;

              for (const ref of currentScope.references) {
                if (ref.identifier.name === baseSignalName) {
                  // @ts-expect-error adding isComputedAssignmentOnly to Reference
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
                // @ts-expect-error reading isComputedAssignmentOnly from Reference
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

          let currentNode:
            | TSESTree.Identifier
            | TSESTree.JSXIdentifier
            | TSESTree.MemberExpressionComputedName
            | TSESTree.MemberExpressionNonComputedName = reference.identifier;

          while (
            currentNode.parent.type === 'MemberExpression' &&
            currentNode.parent.object === currentNode
          ) {
            currentNode = currentNode.parent;
          }

          // Skip function calls, but still track function references as dependencies
          if (
            currentNode.parent.type === 'CallExpression' &&
            currentNode.parent.callee === currentNode
          ) {
            // Don't continue - let it fall through to process the function reference as a dependency
          }

          let dependencyNode = getDependency(referenceNode);

          try {
            let currentNode = referenceNode;

            while (
              currentNode.parent &&
              currentNode.parent.type === 'MemberExpression' &&
              currentNode.parent.object === currentNode
            ) {
              currentNode = currentNode.parent;
            }
          } catch (error) {
            console.error(`Property chain analysis failed:`, error);
          }

          if (dependencyNode.type === 'Identifier' && dependencyNode.name.endsWith('Signal')) {
            if (
              referenceNode.parent?.type === 'MemberExpression' &&
              referenceNode.parent.object === referenceNode &&
              referenceNode.parent.property?.type === 'Identifier' &&
              referenceNode.parent.property.name === 'value'
            ) {
              if (
                referenceNode.parent.parent?.type === 'MemberExpression' &&
                referenceNode.parent.parent.object === referenceNode.parent
              ) {
                let isAssignmentOnly = false;

                let outermostNode = referenceNode.parent.parent;

                while (
                  outermostNode.parent?.type === 'MemberExpression' &&
                  outermostNode.parent.object === outermostNode
                ) {
                  outermostNode = outermostNode.parent;
                }

                if (
                  outermostNode.parent?.type === 'AssignmentExpression' &&
                  outermostNode.parent.left === outermostNode
                ) {
                  isAssignmentOnly = true;
                }

                dependencyNode = outermostNode;

                if (referenceNode.parent.parent.computed && referenceNode.parent.parent.property) {
                  const propertyNode = referenceNode.parent.parent.property;

                  let propertyName = null;
                  if (propertyNode.type === 'Identifier') {
                    propertyName = propertyNode.name;
                  } else if (
                    propertyNode.type === 'TSAsExpression' ||
                    // @ts-expect-error
                    propertyNode.type === 'AsExpression'
                  ) {
                    const expr = propertyNode.expression;
                    if (expr && expr.type === 'Identifier') {
                      propertyName = expr.name;
                    }
                  }

                  if (propertyName) {
                    let isInnerScopeProperty = false;
                    let propertyRef = null;
                    let searchScope: Scope | null = currentScope;

                    while (searchScope && searchScope !== scope?.upper) {
                      propertyRef = searchScope.references.find(
                        (ref) => ref.identifier.name === propertyName
                      );

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
          }

          // Always use analyzePropertyChain to avoid duplication issues
          const dependency = analyzePropertyChain(dependencyNode, optionalChains);

          if (
            'parent' in dependencyNode &&
            dependencyNode.parent &&
            isSignalValueAccess(dependencyNode.parent, context) &&
            dependencyNode.type === 'Identifier' &&
            !signalVariables.has(dependencyNode) &&
            isSignalVariable(dependencyNode)
          ) {
            signalVariables.add(dependencyNode);
          }

          if (
            isEffect &&
            'parent' in dependencyNode &&
            typeof dependencyNode.parent === 'object' &&
            dependencyNode.parent !== null &&
            'type' in dependencyNode.parent &&
            dependencyNode.type === 'Identifier' &&
            dependencyNode.parent.type === 'MemberExpression' &&
            !dependencyNode.parent.computed &&
            dependencyNode.parent.property.type === 'Identifier' &&
            dependencyNode.parent.property.name === 'current' &&
            isInsideEffectCleanup(reference)
          ) {
            currentRefsInEffectCleanup.set(dependency, {
              reference,
              dependencyNode,
            });
          }

          if (
            dependencyNode.parent?.type === 'TSTypeQuery' ||
            dependencyNode.parent?.type === 'TSTypeReference'
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

          let isAssignment = isOnlyAssignmentReference(reference);

          // @ts-expect-error reading isComputedAssignmentOnly to Reference
          const isComputedAssignmentOnly = reference.isComputedAssignmentOnly === true;

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
            const isImportedSignal =
              dependency.endsWith('Signal') ||
              (dependency.includes('.') && dependency.split('.')[0].endsWith('Signal'));

            const isSignalValueAccessBool = dependency.endsWith('.value');

            if (isImportedSignal || isSignalValueAccessBool) {
              if (isImportedSignal && !isSignalValueAccessBool) {
                externalDependencies.delete(
                  dependency.includes('.') ? dependency.split('.')[0] : dependency
                );
              }

              if (isSignalValueAccessBool) {
                externalDependencies.delete(dependency.replace('.value', ''));
              }

              if (
                // @ts-expect-error
                reference.identifier.type === 'MemberExpression' &&
                // @ts-expect-error
                reference.identifier.property.type === 'Identifier' &&
                // @ts-expect-error
                reference.identifier.property.name === 'value' &&
                // @ts-expect-error
                reference.identifier.object.type === 'Identifier'
              ) {
                // @ts-expect-error
                externalDependencies.delete(reference.identifier.object.name);
              }
            }

            dependencies.set(dependency, {
              node: dependencyNode,
              isStable:
                isSignalValueAccess(reference.identifier, context) ||
                isSignalDependency(dependency) ||
                isImportedSignal ||
                isSignalValueAccessBool
                  ? false
                  : typeof dependency === 'string' &&
                      !dependency.includes('.') &&
                      !dependency.endsWith('Signal') &&
                      reference.resolved.defs.length > 0 &&
                      !memoizedIsStableKnownHookValue(reference.resolved)
                    ? false // Function dependencies should not be marked as stable
                    : memoizedIsStableKnownHookValue(reference.resolved) ||
                      memoizedIsFunctionWithoutCapturedValues(reference.resolved),
              references: [reference],
              hasReads: !isAssignment && !isComputedAssignmentOnly,
              // @ts-expect-error reading isInnerScopeComputedProperty from Reference
              hasInnerScopeComputedProperty: reference.isInnerScopeComputedProperty === true,
            });
          }
        }

        for (const childScope of currentScope.childScopes) {
          gatherDependenciesRecursively(childScope);
        }
      }

      currentRefsInEffectCleanup.forEach(({ reference, dependencyNode }): void => {
        const references = reference.resolved?.references ?? [];

        let foundCurrentAssignment = false;

        for (const ref of references) {
          if (
            'parent' in ref.identifier &&
            ref.identifier.parent != null &&
            typeof ref.identifier.parent === 'object' &&
            'type' in ref.identifier.parent &&
            ref.identifier.parent.type === 'MemberExpression' &&
            (!('computed' in ref.identifier.parent) || !ref.identifier.parent.computed) &&
            'property' in ref.identifier.parent &&
            ref.identifier.parent.property != null &&
            typeof ref.identifier.parent.property === 'object' &&
            'type' in ref.identifier.parent.property &&
            ref.identifier.parent.property.type === 'Identifier' &&
            'name' in ref.identifier.parent.property &&
            ref.identifier.parent.property.name === 'current' &&
            'parent' in ref.identifier.parent &&
            ref.identifier.parent.parent != null &&
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

        context.report({
          messageId: 'staleAssignmentDependency',
          data: {
            dependency: dependencyNode.name,
            hookName: reactiveHookName,
          },
          node:
            'property' in dependencyNode.parent ? dependencyNode.parent.property : dependencyNode,
        });
      });

      const staleAssignments = new Set<string>();

      const stableDependencies = new Set<string>();

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
                  fix(fixer) {
                    // const sourceCode = context.sourceCode;
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
        if (isAutoDepsHook) {
          return;
        }

        let setStateInsideEffectWithoutDeps: string | null = null;

        dependencies.forEach(({ references }: Dependency, key: string): void => {
          if (setStateInsideEffectWithoutDeps !== null && setStateInsideEffectWithoutDeps !== '') {
            return;
          }

          for (const reference of references) {
            if (
              setStateInsideEffectWithoutDeps !== null &&
              setStateInsideEffectWithoutDeps !== ''
            ) {
              return;
            }

            if (!setStateCallSites.has(reference.identifier)) {
              return;
            }

            let fnScope: Scope | null = reference.from;

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

        const { suggestedDependencies } = collectRecommendations({
          dependencies,
          declaredDependencies: [],
          stableDependencies,
          externalDependencies: new Set<string>(),
          isEffect: true,
        });

        const hookName = context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );

        const depsText = suggestedDependencies.join(', ');

        const hasDependencies = suggestedDependencies.length > 0;

        if (
          typeof setStateInsideEffectWithoutDeps === 'string' &&
          setStateInsideEffectWithoutDeps !== ''
        ) {
          // Report a more specific error when setState is used without dependencies
          context.report({
            node: reactiveHook,
            messageId: 'missingDependency',
            data: {
              hookName,
              dependency: setStateInsideEffectWithoutDeps,
              dependencies: depsText,
              reason: `\n  - '${setStateInsideEffectWithoutDeps}' is updated inside the effect but not listed in the dependency array\n  - This can lead to an infinite loop of re-renders`,
            },
            suggest: hasDependencies
              ? [
                  {
                    messageId: 'addDependencies',
                    data: { dependencies: depsText },
                    fix(fixer) {
                      const lastArg =
                        'arguments' in reactiveHook
                          ? reactiveHook.arguments[reactiveHook.arguments.length - 1]
                          : null;

                      const insertPosition = lastArg?.range[1];

                      if (typeof insertPosition !== 'number') {
                        return null;
                      }

                      return fixer.insertTextAfterRange(
                        [insertPosition, insertPosition],
                        `, [${depsText}]`
                      );
                    },
                  },
                ]
              : [],
          });
        } else if (hasDependencies) {
          // Report a general missing dependencies error
          context.report({
            node: reactiveHook,
            messageId:
              suggestedDependencies.length > 1 ? 'missingDependencies' : 'missingDependency',
            data: {
              hookName,
              dependencies: depsText,
              dependency: suggestedDependencies[0],
              reason:
                '\n  - The following values are used in the effect but not listed in the dependency array:' +
                suggestedDependencies.map((dep) => `\n    - '${dep}'`).join(''),
            },
            suggest: [
              {
                messageId: 'addDependencies',
                data: { dependencies: depsText },
                fix(fixer) {
                  const lastArg =
                    'arguments' in reactiveHook
                      ? reactiveHook.arguments[reactiveHook.arguments.length - 1]
                      : null;
                  const insertPosition = lastArg?.range[1];

                  if (typeof insertPosition !== 'number') {
                    return null;
                  }

                  return fixer.insertTextAfterRange(
                    [insertPosition, insertPosition],
                    `, [${depsText}]`
                  );
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

      const declaredDependencies: Array<DeclaredDependency> = [];

      const isTSAsArrayExpression =
        declaredDependenciesNode.type === 'TSAsExpression' &&
        declaredDependenciesNode.expression.type === 'ArrayExpression';

      if (!(declaredDependenciesNode.type === 'ArrayExpression') && !isTSAsArrayExpression) {
        const hookName = context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );

        const suggestedDeps = Array.from(dependencies.entries())
          .filter(([_, dep]) => dep.hasReads && !dep.isComputedAssignmentOnly)
          .map(([key]) => key);

        context.report({
          node: declaredDependenciesNode,
          messageId: 'notArrayLiteral',
          data: {
            hookName,
            dependencies: suggestedDeps.join(', '),
            dependency: suggestedDeps[0] || '',
          },
          suggest: [
            {
              messageId: 'addDependencies',
              data: {
                dependencies: suggestedDeps.join(', '),
              },
              fix(fixer) {
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
          arrayExpression.elements.forEach(
            (
              declaredDependencyNode:
                | TSESTree.SpreadElement
                | TSESTree.Expression
                | TSESTree.DestructuringPattern
                | null
            ) => {
              if (declaredDependencyNode === null) {
                return;
              }

              if (declaredDependencyNode.type === 'SpreadElement') {
                const hookName = context.sourceCode.getText(
                  'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
                );

                const spreadSource = context.sourceCode.getText(declaredDependencyNode.argument);

                context.report({
                  node: declaredDependencyNode,
                  messageId: 'spreadElementInDependencyArray',
                  data: {
                    hookName,
                    source: spreadSource,
                  },
                  suggest: [
                    {
                      messageId: 'removeDependency',
                      data: { dependency: `...${spreadSource}` },
                      fix(fixer) {
                        const sourceCode = context.sourceCode;
                        const [start, end] = declaredDependencyNode.range;
                        const prevToken = sourceCode.getTokenBefore(declaredDependencyNode);
                        const nextToken = sourceCode.getTokenAfter(declaredDependencyNode);

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

              if (useEffectEventVariables.has(declaredDependencyNode as TSESTree.Expression)) {
                const hookName = context.sourceCode.getText(
                  'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
                );

                const eventName = context.sourceCode.getText(declaredDependencyNode);

                context.report({
                  node: declaredDependencyNode,
                  messageId: 'useEffectEventInDependencyArray',
                  data: {
                    hookName,
                    eventName,
                  },
                  suggest: [
                    {
                      messageId: 'removeDependency',
                      data: { dependency: eventName },
                      fix(fixer) {
                        const sourceCode = context.sourceCode;
                        const [start, end] = declaredDependencyNode.range;
                        const prevToken = sourceCode.getTokenBefore(declaredDependencyNode);
                        const nextToken = sourceCode.getTokenAfter(declaredDependencyNode);

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
                  declaredDependencyNode.type === 'CallExpression' ||
                  declaredDependencyNode.type === 'NewExpression' ||
                  (declaredDependencyNode.type === 'MemberExpression' &&
                    declaredDependencyNode.property.type === 'Identifier' &&
                    declaredDependencyNode.property.name === 'bind')
                ) {
                  let message = '';
                  let suggestion: SuggestionReportDescriptor<MessageIds> | null = null;

                  if (declaredDependencyNode.type === 'CallExpression') {
                    const calleeText = context.sourceCode.getText(declaredDependencyNode.callee);
                    message =
                      `Function call '${calleeText}()' in dependency array of '${hookName}'. ` +
                      'This will cause the effect to re-run on every render. ' +
                      'Move the function call inside the effect or memoize the result with useMemo.';

                    // Suggest moving the call inside the effect
                    suggestion = {
                      messageId: 'moveInsideEffect',
                      data: { call: `${calleeText}()` },
                      fix(fixer) {
                        const effectBody = node.body;
                        if (effectBody.type !== 'BlockStatement') return null;

                        const sourceCode = context.sourceCode;
                        const callText = sourceCode.getText(declaredDependencyNode);
                        const range = declaredDependencyNode.range;
                        const prevToken = sourceCode.getTokenBefore(declaredDependencyNode);
                        const nextToken = sourceCode.getTokenAfter(declaredDependencyNode);

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
                          effectBody,
                          `\n  const result = ${callText};\n`
                        );

                        return [removeFix, insertFix];
                      },
                    };
                  } else if (declaredDependencyNode.type === 'NewExpression') {
                    const constructorName = context.sourceCode.getText(
                      declaredDependencyNode.callee
                    );
                    message =
                      `Constructor call 'new ${constructorName}()' in dependency array of '${hookName}'. ` +
                      'This will create a new instance on every render. ' +
                      'Move the instantiation inside the effect or memoize it with useMemo.';
                  } else if (
                    declaredDependencyNode.type === 'MemberExpression' &&
                    declaredDependencyNode.property.type === 'Identifier' &&
                    declaredDependencyNode.property.name === 'bind'
                  ) {
                    const boundFunction = context.sourceCode.getText(declaredDependencyNode.object);
                    message =
                      `'.bind()' call on '${boundFunction}' in dependency array of '${hookName}'. ` +
                      'This will create a new function on every render. ' +
                      'Move the bind call outside the component or use useCallback.';
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
                declaredDependency = analyzePropertyChain(declaredDependencyNode, null);
              } catch (error: unknown) {
                if (error instanceof Error && /Unsupported node type/.test(error.message)) {
                  if (declaredDependencyNode.type === 'Literal') {
                    if (
                      declaredDependencyNode.value != null &&
                      dependencies.has(declaredDependencyNode.value as string)
                    ) {
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
                            fix(fixer) {
                              const [start, end] = declaredDependencyNode.range;
                              return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
                            },
                          },
                        ],
                      });
                    } else {
                      context.report({
                        node: declaredDependencyNode,
                        data: {
                          dependency: declaredDependencyNode.raw,
                          hookName: reactiveHookName,
                        },
                        messageId: 'staleAssignmentUnstable',
                        suggest: [
                          {
                            messageId: 'removeDependency',
                            data: {
                              dependency: declaredDependencyNode.raw,
                            },
                            fix(fixer) {
                              const [start, end] = declaredDependencyNode.range;
                              return fixer.removeRange([start, end + 1]); // +1 to remove the following comma if any
                            },
                          },
                        ],
                      });
                    }
                  } else {
                    const nodeText = context.sourceCode.getText(declaredDependencyNode);
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
                          fix(fixer) {
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
                ['MemberExpression', 'OptionalMemberExpression', 'ChainExpression'].includes(
                  maybeID.type
                )
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

              const isDeclaredInComponent = !componentScope.through.some(
                (ref: Reference): boolean => {
                  return ref.identifier === maybeID;
                }
              );

              declaredDependencies.push({
                key: declaredDependency,
                node: declaredDependencyNode,
              });

              if (!isDeclaredInComponent) {
                externalDependencies.add(declaredDependency);
              }
            }
          );
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

        constructions.forEach(
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

            const constructionType = depType === 'function' ? 'definition' : 'initialization';

            const defaultAdvice = `wrap the ${constructionType} of '${'name' in construction.name ? construction.name.name : construction.name.type}' in its own ${wrapperHook}() Hook.`;

            const advice = isUsedOutsideOfHook
              ? `To fix this, ${defaultAdvice}`
              : `Move it inside the ${reactiveHookName} callback. Alternatively, ${defaultAdvice}`;

            const causation =
              depType === 'conditional' || depType === 'logical expression'
                ? 'could make'
                : 'makes';

            const message =
              `The '${'name' in construction.name ? construction.name.name : construction.name.type}' ${depType} ${causation} the dependencies of ` +
              `${reactiveHookName} Hook (at line ${declaredDependenciesNode.loc?.start.line}) ` +
              `change on every render. ${advice}`;

            context.report({
              node: construction.node,
              data: {
                message,
              },
              messageId: 'missingDependencies',
              suggest:
                isUsedOutsideOfHook && construction.type === 'Variable' && depType === 'function'
                  ? [
                      {
                        messageId: 'missingDependencies',
                        fix(fixer) {
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
                    ]
                  : [],
            });
          }
        );
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

          finalPath += members[i];
        }

        return finalPath;
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
      const unnecessaryDepsList = Array.from(unnecessaryDependencies);

      if (unnecessaryDepsList.length > 0) {
        const badRef = unnecessaryDepsList.find((key) => key.endsWith('.current'));
        const externalDep =
          externalDependencies.size > 0 ? Array.from(externalDependencies)[0] : null;

        if (badRef) {
          extraWarning = ` Mutable values like '${badRef}' aren't valid dependencies because mutating them doesn't re-render the component.`;
        } else if (externalDep && !scope.set.has(externalDep)) {
          extraWarning = ` Outer scope values like '${externalDep}' aren't valid dependencies because mutating them doesn't re-render the component.`;
        }

        // Report each unnecessary dependency
        const hookName = context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );

        unnecessaryDepsList.forEach((depKey: string): void => {
          const depNode = dependencies.get(depKey)?.node;
          if (depNode) {
            context.report({
              node: depNode,
              messageId:
                unnecessaryDepsList.length > 1
                  ? 'unnecessaryDependencies'
                  : 'unnecessaryDependency',
              data: {
                hookName,
                dependencies: unnecessaryDepsList.join(', '),
                dependency: depKey,
              },
              suggest: [
                {
                  messageId: 'removeDependency',
                  data: { dependency: depKey },
                  fix(fixer) {
                    const sourceCode = context.sourceCode;
                    const [start, end] = depNode.range;
                    // const text = sourceCode.getText(depNode);
                    const prevToken = sourceCode.getTokenBefore(depNode);
                    const nextToken = sourceCode.getTokenAfter(depNode);

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
        });
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

          if (id.parent == null) {
            isPropsOnlyUsedInMembers = false;

            break;
          }

          if (
            id.parent.type !== 'MemberExpression' &&
            // @ts-expect-error
            id.parent.type !== 'OptionalMemberExpression'
          ) {
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

          const topScopeRef = componentScope.set.get(missingDep);

          const usedDep = dependencies.get(missingDep);

          if (!usedDep?.references || usedDep?.references[0]?.resolved !== topScopeRef) {
            return;
          }

          const def: Definition | undefined = topScopeRef?.defs[0];

          if (def?.name == null || def.type !== 'Parameter') {
            return;
          }

          let isFunctionCall = false;

          for (const reference of usedDep.references) {
            if (
              reference.identifier.parent != null &&
              (reference.identifier.parent.type === 'CallExpression' ||
                // @ts-expect-error
                reference.identifier.parent.type === 'OptionalCallExpression') &&
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

        if (missingCallbackDep !== null) {
          extraWarning = ` If '${missingCallbackDep}' changes too often, find the parent component that defines it and wrap that definition in useCallback.`;
        }
      }

      if (!extraWarning && missingDependencies.size > 0) {
        dependencies.forEach((dep: Dependency, key: string): void => {
          if (key.includes('.value[') && key.includes('Signal')) {
            const valueIndex = key.indexOf('.value[');

            if (valueIndex !== -1) {
              const baseValueKey = key.slice(0, valueIndex + 6);

              const isBaseValueDeclared = declaredDependencies.some(({ key: depKey }) => {
                return depKey === baseValueKey;
              });

              const isComputedPropertyDeclared = declaredDependencies.some(({ key: depKey }) => {
                return depKey === key;
              });

              const isInnerScopeComputed = dep.hasInnerScopeComputedProperty === true;

              if (!isComputedPropertyDeclared) {
                const isAssignmentOnly = dep.hasReads === false;

                if (!isAssignmentOnly) {
                  if (key.includes('Signal') && key.includes('.')) {
                    const parts = key.split('.');

                    if (parts.length > 2 && parts[1] === 'value') {
                      const signalName = parts[0];

                      const baseValueKey = `${signalName}.value`;

                      const isBaseValueDeclared = declaredDependencies.some(({ key }) => {
                        return key === baseValueKey;
                      });

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

              const isBaseValueDeclared = declaredDependencies.some(({ key }) => {
                return key === baseValueKey;
              });

              const dependency = dependencies.get(key);

              const isAssignmentOnly = dependency && dependency.hasReads === false;

              const hasInnerScopeComputedProperty =
                dependency && dependency.hasInnerScopeComputedProperty === true;

              if (
                !isBaseValueDeclared &&
                isAssignmentOnly !== true &&
                hasInnerScopeComputedProperty !== true
              ) {
                missingDependencies.add(key);
              }
            }
          }
        });
      }

      // Report each duplicate dependency
      if (duplicateDependencies.size > 0) {
        const hookName = context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );

        const duplicateDepsList = Array.from(duplicateDependencies);

        // Group duplicate dependencies by their base name to find all occurrences
        const duplicatesByKey = new Map<string, Array<TSESTree.Node>>();

        for (const depKey of duplicateDepsList) {
          const depNode = dependencies.get(depKey)?.node;

          if (depNode) {
            const baseKey = depKey.split('.')[0]; // Get the base key without property access

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
              const node = nodes[i];

              context.report({
                node,
                messageId:
                  duplicateDepsList.length > 1 ? 'duplicateDependencies' : 'duplicateDependency',
                data: {
                  hookName,
                  dependencies: baseKey,
                  dependency: baseKey,
                },
                suggest: [
                  {
                    messageId: 'removeDependency',
                    data: { dependency: baseKey },
                    fix(fixer) {
                      const sourceCode = context.sourceCode;
                      const [start, end] = node.range;
                      const prevToken = sourceCode.getTokenBefore(node);
                      const nextToken = sourceCode.getTokenAfter(node);

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

      const missingDepsList = Array.from(missingDependencies);

      // Generate summary messages for missing and unnecessary dependencies
      const missingMessage = getWarningMessage(missingDependencies, 'a', 'missing', 'include');

      const unnecessaryMessage = getWarningMessage(
        unnecessaryDependencies,
        'an',
        'unnecessary',
        'exclude'
      );

      // Report missing dependencies if any
      if (missingDepsList.length > 0) {
        const isEffect = /use(Effect|LayoutEffect|InsertionEffect|ImperativeHandle)/.test(
          reactiveHookName
        );
        const suggestions: SuggestionReportDescriptor<MessageIds>[] = [];

        // Suggestion 1: Add all missing dependencies
        if (suggestedDependencies.length > 0) {
          suggestions.push({
            messageId: 'addAllDependencies',
            data: {
              count: missingDepsList.length,
              dependencies: missingDepsList.map((d) => `'${d}'`).join(', '),
            },
            fix(fixer) {
              return fixer.replaceText(
                declaredDependenciesNode,
                `[${suggestedDependencies.map(formatDependency).join(', ')}]`
              );
            },
          });
        }

        // Suggestion 2: Add each missing dependency individually
        missingDepsList.forEach((dep) => {
          const newDeps = new Set(declaredDependencies.map((d) => d.key));
          newDeps.add(dep);

          suggestions.push({
            messageId: 'addSingleDependency',
            data: {
              dependency: dep,
            },
            fix(fixer) {
              const depsArray = Array.from(newDeps).map((d) => formatDependency(d));
              return fixer.replaceText(declaredDependenciesNode, `[${depsArray.join(', ')}]`);
            },
          });
        });

        // Suggestion 3: If it's an effect, suggest removing dependency array
        if (isEffect) {
          suggestions.push({
            messageId: 'removeDependencyArray',
            fix(fixer) {
              const sourceCode = context.sourceCode;
              const [start] = declaredDependenciesNode.range;
              const prevToken = sourceCode.getTokenBefore(declaredDependenciesNode);
              const startPos = prevToken?.value === ',' ? prevToken.range[0] : start;

              return fixer.removeRange([startPos, declaredDependenciesNode.range[1]]);
            },
          });
        }

        // Main report
        context.report({
          node: declaredDependenciesNode,
          messageId: missingDepsList.length > 1 ? 'missingDependencies' : 'missingDependency',
          data: {
            hookName: reactiveHookName,
            dependencies: missingDepsList.join(', '),
            dependency: missingDepsList[0] || '',
            count: missingDepsList.length,
            missingMessage: missingMessage || '',
          },
          suggest: suggestions,
        });
      }

      // Report unnecessary dependencies if any
      if (unnecessaryDependencies.size > 0) {
        const unnecessaryDepsList = Array.from(unnecessaryDependencies);
        const hookName = context.sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );
        const sourceCode = context.sourceCode;
        const allDeps = Array.from(dependencies.keys());

        // Get the text of the entire dependency array for more precise replacements
        const depsText = sourceCode.getText(declaredDependenciesNode);
        const isArrayLiteral = depsText.startsWith('[') && depsText.endsWith(']');

        // Add a summary message as the first report
        if (unnecessaryMessage) {
          const suggestions: SuggestionReportDescriptor<MessageIds>[] = [];

          // Only suggest removing all if we can safely do so
          if (isArrayLiteral && allDeps.length > unnecessaryDepsList.length) {
            suggestions.push({
              messageId: 'removeAllUnnecessaryDependencies',
              data: {
                count: unnecessaryDepsList.length,
                dependencies: unnecessaryDepsList.map((d) => `'${d}'`).join(', '),
              },
              fix(fixer) {
                const depsToKeep = allDeps
                  .filter((key) => !unnecessaryDependencies.has(key))
                  .map(formatDependency);
                return fixer.replaceText(declaredDependenciesNode, `[${depsToKeep.join(', ')}]`);
              },
            });
          }

          context.report({
            node: declaredDependenciesNode,
            messageId:
              unnecessaryDepsList.length > 1 ? 'unnecessaryDependencies' : 'unnecessaryDependency',
            data: {
              hookName,
              dependencies: unnecessaryDepsList.join(', '),
              dependency: unnecessaryDepsList[0] || '',
              count: unnecessaryDepsList.length,
              message: unnecessaryMessage,
            },
            suggest: suggestions,
          });
        }

        // Report each unnecessary dependency individually with precise fixes
        unnecessaryDepsList.forEach((depKey: string): void => {
          const depNode = dependencies.get(depKey)?.node;
          if (!depNode) return;

          const suggestions: SuggestionReportDescriptor<MessageIds>[] = [];
          // const nodeText = sourceCode.getText(depNode);

          // Find the exact range of this dependency in the source
          const depIndex = allDeps.indexOf(depKey);
          const isFirst = depIndex === 0;
          const isLast = depIndex === allDeps.length - 1;

          // Calculate the exact range to remove, including surrounding commas and whitespace
          let removeStart = depNode.range[0];
          let removeEnd = depNode.range[1];

          // Get the tokens around this dependency
          const tokens = sourceCode.getTokens(declaredDependenciesNode);
          const depTokenIndex = tokens.findIndex((t) => t.range[0] === depNode.range[0]);

          // Include leading comma if not the first item
          if (!isFirst && depTokenIndex > 0) {
            const prevToken = tokens[depTokenIndex - 1];
            if (prevToken.value === ',') {
              removeStart = prevToken.range[0];
            }
            // Include any whitespace before the dependency
            const prevTokenEnd = depTokenIndex > 1 ? tokens[depTokenIndex - 1].range[1] : 0;
            const whitespaceBefore = sourceCode.text.slice(prevTokenEnd, removeStart);
            if (/^\s+$/.test(whitespaceBefore)) {
              removeStart = prevTokenEnd;
            }
          }

          // Include trailing comma if not the last item
          if (!isLast && depTokenIndex < tokens.length - 1) {
            const nextToken = tokens[depTokenIndex + 1];
            if (nextToken.value === ',') {
              removeEnd = nextToken.range[1];
            }
          }

          // Add suggestion to remove this specific dependency
          suggestions.push({
            messageId: 'removeSingleDependency',
            data: { dependency: depKey },
            fix(fixer) {
              return fixer.removeRange([removeStart, removeEnd]);
            },
          });

          // Add the main report for this dependency
          context.report({
            node: depNode,
            messageId: 'unnecessaryDependency',
            data: {
              hookName,
              dependency: depKey,
              message: unnecessaryMessage ?? '',
            },
            suggest: suggestions,
          });
        });
      }

      // Report duplicate dependencies if any
      if (duplicateDependencies.size > 0) {
        const sourceCode = context.sourceCode;
        const hookName = sourceCode.getText(
          'callee' in reactiveHook ? reactiveHook.callee : reactiveHook
        );

        // Cache for normalized keys to avoid repeated string operations
        const keyCache = new Map<string, string>();
        function normalizeKey(key: string): string | undefined {
          if (!keyCache.has(key)) {
            // Remove array indices and whitespace in one pass
            const normalized = key.replace(/\s+|\[\d+\]/g, '');
            keyCache.set(key, normalized);
          }
          return keyCache.get(key);
        }

        // Single pass to collect all dependencies and their normalized keys
        const allDeps = Array.from(dependencies.entries());
        const normalizedMap = new Map<string, { original: string; node: TSESTree.Node }[]>();

        for (const [depKey, dep] of allDeps) {
          if (!dep.node) continue;

          const normalizedKey = normalizeKey(depKey);

          if (!normalizedKey) {
            continue;
          }

          if (!normalizedMap.has(normalizedKey)) {
            normalizedMap.set(normalizedKey, []);
          }

          normalizedMap.get(normalizedKey)?.push({ original: depKey, node: dep.node });
        }

        // Filter to only include duplicates (more than one entry per normalized key)
        const duplicates = Array.from(normalizedMap.entries())
          .filter(([_, entries]) => entries.length > 1)
          .flatMap(([_, entries]) => entries);

        if (duplicates.length > 0) {
          // Group by original key for reporting
          const duplicateGroups = new Map<string, (typeof duplicates)[number][]>();

          for (const entry of duplicates) {
            if (!duplicateGroups.has(entry.original)) {
              duplicateGroups.set(entry.original, []);
            }

            duplicateGroups.get(entry.original)?.push(entry);
          }

          // Get unique duplicate keys for the summary message
          const uniqueDuplicateKeys = Array.from(duplicateGroups.keys());
          const isSingleDuplicate = uniqueDuplicateKeys.length === 1;

          // Report the summary
          context.report({
            node: declaredDependenciesNode,
            messageId: isSingleDuplicate ? 'duplicateDependency' : 'duplicateDependencies',
            data: {
              hookName,
              dependencies: uniqueDuplicateKeys.join(', '),
              dependency: uniqueDuplicateKeys[0],
              count: uniqueDuplicateKeys.length,
            },
            suggest: [
              {
                messageId: 'removeAllDuplicates',
                data: { count: uniqueDuplicateKeys.length },
                fix(fixer) {
                  // Create a set of all original dependency keys to keep (first occurrence of each normalized key)
                  const seen = new Set<string>();
                  const depsToKeep: string[] = [];

                  for (const [depKey] of allDeps) {
                    const normalized = normalizeKey(depKey);

                    if (!normalized) {
                      continue;
                    }

                    if (!seen.has(normalized)) {
                      seen.add(normalized);

                      depsToKeep.push(depKey);
                    }
                  }

                  return fixer.replaceText(
                    declaredDependenciesNode,
                    `[${depsToKeep.map(formatDependency).join(', ')}]`
                  );
                },
              },
            ],
          });
        }
      }
    }

    function visitCallExpression(node: TSESTree.CallExpression): void {
      const callbackIndex = getReactiveHookCallbackIndex(node.callee, options);

      if (callbackIndex === -1) {
        return;
      }

      let callback: TSESTree.CallExpressionArgument | undefined = node.arguments[callbackIndex];

      const nodeWithoutNamespace = getNodeWithoutReactNamespace(node.callee);

      const maybeNode = node.arguments[callbackIndex + 1];

      const declaredDependenciesNode: TSESTree.CallExpressionArgument | undefined =
        maybeNode && !(maybeNode.type === 'Identifier' && maybeNode.name === 'undefined')
          ? maybeNode
          : undefined;

      const isEffect = /Effect($|[^a-z])/g.test(
        'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : ''
      );

      if (!callback) {
        context.report({
          messageId: 'missingEffectCallback',
          node: node.callee,
          data: {
            hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
          },
        });

        return;
      }

      if (!maybeNode && isEffect && options.requireExplicitEffectDeps) {
        context.report({
          node: node.callee,
          data: {
            hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
          },
          messageId: 'missingEffectCallback',
        });
      }

      const isAutoDepsHook = options.experimental_autoDependenciesHooks.includes(
        'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : ''
      );

      if (
        (!declaredDependenciesNode ||
          (isAutoDepsHook &&
            declaredDependenciesNode.type === 'Literal' &&
            declaredDependenciesNode.value === null)) &&
        !isEffect
      ) {
        if (
          ('name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '') === 'useMemo' ||
          ('name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '') === 'useCallback'
        ) {
          // TODO: Can this have a suggestion?
          context.report({
            node: node.callee,
            messageId: 'missingDependencies',
            data: {
              hookName: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
            },
          });
        }

        return;
      }

      while (callback.type === 'TSAsExpression') {
        callback = callback.expression;
      }

      switch (callback.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          visitFunctionWithDependencies(
            callback,
            declaredDependenciesNode,
            node.callee,
            'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
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
            declaredDependenciesNode.elements.some(
              (
                el:
                  | TSESTree.SpreadElement
                  | TSESTree.Expression
                  | TSESTree.DestructuringPattern
                  | null
              ): boolean => {
                return el !== null && el.type === 'Identifier' && el.name === callback.name;
              }
            )
          ) {
            return;
          }

          const variable = context.sourceCode.getScope(callback).set.get(callback.name);

          if (variable?.defs == null) {
            return;
          }

          const def: Definition | undefined = variable.defs[0];

          if (!def || !def.node) {
            break;
          }

          if (def.type === 'Parameter') {
            context.report({
              node: node.callee,
              data: {
                name: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
              },
              messageId: 'missingEffectCallback',
            });

            return;
          }

          if (def.type !== 'Variable' && def.type !== 'FunctionName') {
            break;
          }

          switch (def.node.type) {
            case 'FunctionDeclaration': {
              visitFunctionWithDependencies(
                def.node as TSESTree.FunctionDeclaration,
                declaredDependenciesNode,
                node.callee,
                'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
                isEffect,
                isAutoDepsHook
              );

              return;
            }

            case 'VariableDeclarator': {
              const init = def.node.init;

              if (init === null) {
                break; // Unhandled
              }

              switch (init.type) {
                case 'ArrowFunctionExpression':
                case 'FunctionExpression': {
                  visitFunctionWithDependencies(
                    init as TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
                    declaredDependenciesNode,
                    node.callee,
                    'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
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
          context.report({
            node: node.callee,
            data: {
              name: 'name' in nodeWithoutNamespace ? nodeWithoutNamespace.name : '',
            },
            messageId: 'missingDependency',
          });

          return;
        }
      }

      context.report({
        node: node.callee,
        messageId: 'missingDependency',
        data: {
          name: callback.name,
        },
        suggest: [
          {
            messageId: 'addDependencies',
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
});

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

  dependencies.forEach((_dep: Dependency, key: string): void => {
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

        const baseValueKey = key.slice(0, valueIndex + 6);

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
      const hasDeepPropertyChains = Array.from(dependencies.keys()).some(
        (depKey: string): boolean => {
          // Look for patterns like signal.value[key].someProperty
          return (
            depKey.startsWith(`${key}.value[`) &&
            depKey.includes('.', depKey.indexOf('.value[') + 7) // Has property access after computed member
          );
        }
      );

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

  dependencies.forEach((_dep: Dependency, key: string): void => {
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

  declaredDependencies.forEach(({ key }: { key: string }): void => {
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

  importedSignals.forEach((signal: string): void => {
    if (signal.includes('.value[') && signal.includes('Signal')) {
      const isComputedPropertyDeclared = declaredDependencies.some(
        ({ key: depKey }) => depKey === signal
      );

      if (!isComputedPropertyDeclared) {
        const dependency = dependencies.get(signal);

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;
        const isAssignmentOnly = dependency && dependency.hasReads === false;

        if (isAssignmentOnly !== true && hasInnerScopeComputedProperty !== true) {
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
      const isValueDeclared = declaredDependencies.some(({ key }: { key: string }): boolean => {
        return key === signal;
      });

      if (!isValueDeclared) {
        const dependency = dependencies.get(signal);

        const hasInnerScopeComputedProperty =
          dependency && dependency.hasInnerScopeComputedProperty === true;

        const isAssignmentOnly = dependency && dependency.hasReads === false;

        if (isAssignmentOnly !== true && hasInnerScopeComputedProperty !== true) {
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

        if (isAssignmentOnly !== true && hasInnerScopeComputedProperty !== true) {
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

      if (isAssignmentOnly !== true && hasAssignmentOnlyComputedMembers !== true) {
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
          ({ key }: DeclaredDependency): boolean => key === index
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

  scanTreeRecursively(
    depTree,
    missingDependencies,
    satisfyingDependencies,
    (key: string): string => {
      return key;
    }
  );

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

      scanTreeRecursively(child, missingPaths, satisfyingPaths, (childKey: string): string => {
        return `${path}.${childKey}`;
      });
    });
  }

  const suggestedDependencies: Array<string> = [];
  const unnecessaryDependencies = new Set<string>();
  const duplicateDependencies = new Set<string>();
  const incompleteDependencies = new Set<string>();
  const redundantDependencies = new Set<string>();

  const declaredDepsMap = new Map<string, boolean>();

  declaredDependencies.forEach(({ key }: { key: string }): void => {
    declaredDepsMap.set(key, true);
  });

  declaredDependencies.forEach(({ key }: { key: string }): void => {
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

          if (isDirectlyUsed !== true) {
            redundantDependencies.add(key);
            satisfyingDependencies.delete(key);
          }
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

    const isSignalDep = key.endsWith('Signal') || key.includes('Signal.') || key.endsWith('.value');

    const dependency = dependencies.get(key);

    const isAssignmentOnly = isSignalDep && dependency && dependency.hasReads === false;

    if (isAssignmentOnly === true) {
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

function getConstructionExpressionType(node: TSESTree.Expression): string | null {
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

    case 'JSXFragment': {
      return 'JSX fragment';
    }

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

    case 'TSAsExpression': {
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
  componentScope: Scope;
  scope: Scope;
}): Array<{ construction: Definition; depType: string; isUsedOutsideOfHook: boolean }> {
  const constructions = declaredDependencies
    .map(({ key }) => {
      const ref = componentScope.variables.find((v) => v.name === key);

      if (ref == null) {
        return null;
      }

      const node: Definition | undefined = ref.defs[0];

      if (typeof node === 'undefined') {
        return null;
      }

      if (
        node.type === 'Variable' &&
        node.node.type === 'VariableDeclarator' &&
        node.node.id.type === 'Identifier' &&
        node.node.init != null
      ) {
        const constantExpressionType = getConstructionExpressionType(
          node.node.init as TSESTree.Expression
        );

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
    .filter(Boolean) as Array<[Variable, string]>;

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

      if (currentScope !== scope) {
        if (!isAncestorNodeOf(declaredDependenciesNode, reference.identifier)) {
          return true;
        }
      }
    }

    return false;
  }

  return constructions.map(
    ([ref, depType]): {
      construction: Definition;
      depType: string;
      isUsedOutsideOfHook: boolean;
    } => {
      return {
        construction: ref.defs[0],
        depType,
        isUsedOutsideOfHook: isUsedOutsideOfHook(ref),
      };
    }
  );
}

function getDependency(
  node:
    | TSESTree.Node
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.Expression
    | TSESTree.Super
): TSESTree.MemberExpression | TSESTree.Identifier | TSESTree.Node {
  // @ts-expect-error
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
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

  if (node.type === 'JSXExpressionContainer') {
    return getDependency(node.expression);
  }

  if (node.type === 'CallExpression') {
    return getDependency(node.callee);
  }

  if (node.type === 'ChainExpression') {
    return getDependency(node.expression);
  }

  if (node.type === 'TSNonNullExpression') {
    return getDependency(node.expression);
  }

  return node;
}

function markNode(
  node: TSESTree.Node | TSESTree.MemberExpression,
  optionalChains: Map<string, boolean> | null,
  result: string
): void {
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

function analyzePropertyChain(
  node:
    | TSESTree.Node
    | TSESTree.Identifier
    | TSESTree.Expression
    | TSESTree.Super
    | TSESTree.PrivateIdentifier,
  optionalChains: Map<string, boolean> | null
): string {
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
      } catch (error) {
        console.error(error);

        if (node.property.type === 'TSAsExpression') {
          const expr = node.property.expression;

          if (expr && expr.type === 'Identifier') {
            computedResult = `${object}[${expr.name}]`;
          } else {
            computedResult = `${object}[*]`;
          }
        } else {
          computedResult = `${object}[*]`;
        }
      }
    }

    let currentNode:
      | TSESTree.MemberExpressionComputedName
      | TSESTree.MemberExpressionNonComputedName = node;

    let finalResult = computedResult;

    if (node.type === 'MemberExpression' && node.computed) {
      currentNode = node;
    } else {
      while (
        'parent' in currentNode &&
        currentNode.parent &&
        currentNode.parent.type === 'MemberExpression' &&
        !currentNode.parent.computed &&
        currentNode.parent.object === currentNode &&
        currentNode.parent.property?.type === 'Identifier'
      ) {
        const propertyName = currentNode.parent.property.name;

        if (!finalResult.endsWith(`.${propertyName}`)) {
          finalResult += `.${propertyName}`;
        }

        currentNode = currentNode.parent;
      }
    }

    markNode(currentNode, optionalChains, finalResult);

    return finalResult;
  }

  // @ts-expect-error
  console.info('node.type', node.type, 'node.computed', node.computed);

  // @ts-expect-error
  if (node.type === 'OptionalMemberExpression' && !node.computed) {
    // @ts-expect-error
    console.info('node.object', node.object);
    // @ts-expect-error
    console.info('node.property', node.property);
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

    const object =
      'object' in expression ? analyzePropertyChain(expression.object, optionalChains) : '';

    const property =
      'property' in expression ? analyzePropertyChain(expression.property, null) : '';

    const result = `${object === '' ? 'unknownObject' : object}.${property === '' ? 'unknownProperty' : property}`;

    markNode(expression, optionalChains, result);

    return result;
  }

  throw new Error(`Unsupported node type: ${node.type}`);
}

function getNodeWithoutReactNamespace(
  node: TSESTree.Expression | TSESTree.Super
): TSESTree.Expression | TSESTree.Identifier | TSESTree.Super {
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
  calleeNode: TSESTree.Expression | TSESTree.Super,
  options?:
    | {
        additionalHooks: RegExp | undefined;
        enableDangerousAutofixThisMayCauseInfiniteLoops?: boolean;
      }
    | undefined
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

    for (const [key, value] of Object.entries(item)) {
      if (key === 'parent') {
        continue;
      }

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
    (a.type === 'Identifier' || a.type === 'JSXIdentifier') &&
    a.type === b.type &&
    a.name === b.name &&
    !!a.range &&
    !!b.range &&
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
  return !!a.range && !!b.range && a.range[0] <= b.range[0] && a.range[1] >= b.range[1];
}

function isUseEffectEventIdentifier(node: TSESTree.Node | TSESTree.Identifier): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  const { name } = node;

  return name === 'useEffectEvent' || name === 'experimental_useEffectEvent';
}

function isSignalIdentifier(node: TSESTree.Node | TSESTree.Identifier): boolean {
  if (node.type !== 'Identifier') {
    return false;
  }

  const { name } = node;

  return ['signal', 'computed', 'effect'].includes(name);
}

function isSignalVariable(node: TSESTree.Node | Pattern): boolean {
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

function isSignalValueAccess(
  node: TSESTree.Node | TSESTree.Identifier,
  context: Readonly<RuleContext<MessageIds, Options>>
): boolean {
  // Check if this is a direct signal.value access
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'value' &&
    node.object.type === 'Identifier' &&
    node.object.name.endsWith('Signal')
  ) {
    const ancestors = context.sourceCode.getAncestors(node);

    const parent: TSESTree.Node | undefined = ancestors[ancestors.length - 1];

    // Check if this is part of an assignment operation (like countSignal.value++)
    if (typeof parent !== 'undefined') {
      if (
        parent.type === 'UpdateExpression' ||
        (parent.type === 'AssignmentExpression' &&
          ['=', '+=', '-=', '*=', '/=', '%='].includes(parent.operator))
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}
