import type { Rule } from 'eslint';
import type {
  CallExpression,
  Node,
  FunctionDeclaration,
  ArrowFunctionExpression,
  FunctionExpression,
  MethodDefinition,
  ClassDeclaration,
} from 'estree';

function debug(message: string, data?: unknown): void {
  console.info(`[no-signal-creation-in-component] ${message}`, data ?? '');
}

type NodeWithParent = Node & {
  parent?: Node | undefined;
};

type FunctionNode = FunctionDeclaration | ArrowFunctionExpression | FunctionExpression;

function getParentNode(node: Node): Node | undefined {
  const parent = (node as NodeWithParent).parent;

  debug('Getting parent node', {
    nodeType: node.type,
    parentType: parent?.type,
    nodeText: 'code' in node ? node.code : 'N/A',
  });
  return parent;
}

/**
 * ESLint rule: no-signal-creation-in-component
 *
 * Prevents direct signal creation inside React components, hooks, or effects.
 * Signals should be created at the module level or in custom hooks.
 */
export const noSignalCreationInComponentRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'prevent signal creation inside React components, hooks, or effects',
      recommended: true,
    },
    schema: [],
    messages: {
      noSignalInComponent:
        'Avoid creating signals inside React components. Move signal creation to module level or custom hooks.',
    },
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const filename = context.filename ?? 'unknown';

    debug(`Initializing rule for file: ${filename}`);
    debug('Rule configuration:', context.options);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    debug('Parser services:', context.parserServices);

    let inComponent = false;
    let inHook = false;
    let inEffect = false;

    const functionStack: Array<{ isComponent: boolean; isHook: boolean }> = [];

    function getNodeText(node: Node): string {
      try {
        return sourceCode.getText(node);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        return `[${node.type}]`;
      }
    }

    // Check if a node is a signal creation call (signal() or computed())
    function isSignalCreation(node: Node): boolean {
      const isSignal =
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'signal' || node.callee.name === 'computed');

      debug('Checking if node is signal creation', {
        nodeType: node.type,
        calleeType: node.type === 'CallExpression' ? node.callee.type : 'N/A',
        calleeName:
          node.type === 'CallExpression' && node.callee.type === 'Identifier'
            ? node.callee.name
            : 'N/A',
        isSignal,
        nodeText: getNodeText(node),
      });

      return isSignal;
    }

    // Check if a function is a React component
    function isReactComponent(node: FunctionNode, parent: Node | undefined): boolean {
      // For function declarations, check the name directly first
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      if (node.type === 'FunctionDeclaration' && node.id) {
        const isComp = isReactComponentName(node.id.name);

        debug('Checking function declaration for React component', {
          name: node.id.name,
          isComponent: isComp,
          nodeText: getNodeText(node),
        });

        return isComp;
      }

      if (parent?.type === 'VariableDeclarator') {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (parent.id?.type === 'Identifier') {
          const isComp = isReactComponentName(parent.id.name);

          debug('Checking variable declaration for React component', {
            name: parent.id.name,
            isComponent: isComp,
            nodeText: getNodeText(node),
          });

          return isComp;
        }
      }

      return false;
    }

    // Helper to check if a name follows component naming convention
    function isReactComponentName(name: string): boolean {
      const isComp = /^[A-Z]/.test(name);

      debug('Checking if name is a React component', { name, isComponent: isComp });

      return isComp;
    }

    // Check if a function is a React hook
    function isHookFunction(node: Node): boolean {
      if (
        node.type !== 'FunctionDeclaration' &&
        node.type !== 'ArrowFunctionExpression' &&
        node.type !== 'FunctionExpression'
      ) {
        debug('Not a function node', { nodeType: node.type });
        return false;
      }

      // For function declarations, check the name directly first
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      if (node.type === 'FunctionDeclaration' && node.id) {
        const isHook = isHookName(node.id.name);

        debug('Checking function declaration for hook', {
          name: node.id.name,
          isHook,
          nodeText: getNodeText(node),
        });

        return isHook;
      }

      // Check for hook naming patterns in variable declarations
      const parent = getParentNode(node);

      if (parent?.type === 'VariableDeclarator') {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (parent.id?.type === 'Identifier') {
          const isHook = isHookName(parent.id.name);

          debug('Checking variable declaration for hook', {
            name: parent.id.name,
            isHook,
            nodeText: getNodeText(node),
          });

          return isHook;
        }
      }

      return false;
    }

    function isHookName(name: string): boolean {
      return name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase();
    }

    function isInHookCall(node: Node): boolean {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        return ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(
          node.callee.name
        );
      }

      return false;
    }

    return {
      // Track component and hook boundaries
      'FunctionDeclaration, ArrowFunctionExpression, FunctionExpression'(node: FunctionNode): void {
        const parent = getParentNode(node);

        const isComponent = isReactComponent(node, parent);

        const isHook = isHookFunction(node);

        debug('Entering function', {
          type: node.type,
          isComponent,
          isHook,
          parentType: parent?.type,
          nodeText: `${getNodeText(node).substring(0, 100)}...`,
        });

        functionStack.push({ isComponent, isHook });

        if (isComponent) {
          inComponent = true;

          debug('Entering component function', { nodeType: node.type });
        } else if (isHook) {
          inHook = true;

          debug('Entering hook function', { nodeType: node.type });
        }
      },
      'FunctionDeclaration:exit, ArrowFunctionExpression:exit, FunctionExpression:exit'(
        node: FunctionNode
      ): void {
        const state = functionStack.pop();

        if (!state) {
          debug('No function state found on exit', { nodeType: node.type });
          return;
        }

        debug('Exiting function', {
          type: node.type,
          wasComponent: state.isComponent,
          wasHook: state.isHook,
          nodeText: `${getNodeText(node).substring(0, 100)}...`,
        });

        if (state.isComponent) {
          inComponent = false;

          debug('Exiting component function', { nodeType: node.type });
        } else if (state.isHook) {
          inHook = false;

          debug('Exiting hook function', { nodeType: node.type });
        }
      },

      CallExpression(node: CallExpression & Rule.NodeParentExtension): void {
        const wasInEffect = inEffect;

        if (isInHookCall(node)) {
          inEffect = true;
        }

        if (isSignalCreation(node) && (inComponent || inHook || wasInEffect)) {
          context.report({
            node,
            messageId: 'noSignalInComponent',
          });
        }

        if (isInHookCall(node)) {
          inEffect = wasInEffect;
        }
      },

      ClassDeclaration(_node: ClassDeclaration): void {
        inComponent = true;
      },
      'ClassDeclaration:exit'() {
        inComponent = false;
      },
      MethodDefinition(_node: MethodDefinition): void {
        if (inComponent) {
          functionStack.push({ isComponent: true, isHook: false });
        }
      },
      'MethodDefinition:exit'(): void {
        if (inComponent) {
          functionStack.pop();
        }
      },
    };
  },
} satisfies Rule.RuleModule;

export default noSignalCreationInComponentRule;
