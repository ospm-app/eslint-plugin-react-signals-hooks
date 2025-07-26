import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'propDrillingDetected';

type Options = [
  {
    maxDepth?: number | undefined;
    ignoreComponents?: string[] | undefined;
    allowProps?: string[] | undefined;
  },
];

const createRule = ESLintUtils.RuleCreator(
  (name: string): string =>
    `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`
);

// Type guards
function isIdentifier(node: unknown): node is TSESTree.Identifier {
  return (
    node !== null &&
    typeof node === 'object' &&
    'type' in node &&
    (node as { type: string }).type === 'Identifier'
  );
}

function isJSXIdentifier(node: unknown): node is TSESTree.JSXIdentifier {
  return (
    node !== null && typeof node === 'object' && 'type' in node && node.type === 'JSXIdentifier'
  );
}

type ComponentNode = {
  name: string;
  depth: number;
  props: Set<string>;
  parent?: ComponentNode;
};

// Track component hierarchy
const componentStack: ComponentNode[] = [];
// Track prop definitions and their depth
const propDefinitions = new Map<string, { node: TSESTree.Node; depth: number }>();
// Track prop usages and their depth
const propUsages = new Map<string, { node: TSESTree.Node; depth: number; component: string }[]>();

export const noPropDrilling = createRule<Options, MessageIds>({
  name: 'no-prop-drilling',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevent prop drilling by enforcing a maximum depth for prop passing',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-prop-drilling',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'number',
            minimum: 1,
            default: 3,
          },
          ignoreComponents: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          allowProps: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      propDrillingDetected:
        'Prop drilling detected: {{propName}} passed through {{depth}} components. Consider using context or composition instead.',
    },
  },
  defaultOptions: [
    {
      maxDepth: 3,
      ignoreComponents: [],
      allowProps: [],
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    function isIgnoredComponent(name: string | null): boolean {
      return name ? new Set(option.ignoreComponents).has(name) : false;
    }

    function isAllowedProp(name: string): boolean {
      return new Set(option.allowProps).has(name);
    }

    function getComponentName(node: TSESTree.Node | null | undefined): string | null {
      if (!node) return null;

      if (node.type === 'JSXIdentifier') {
        return node.name;
      }

      if (node.type === 'Identifier') {
        return node.name;
      }

      if (node.type === 'JSXMemberExpression') {
        return `${getComponentName(node.object)}.${getComponentName(node.property)}`;
      }

      if (node.type === 'JSXOpeningElement') {
        return getComponentName(node.name);
      }

      return null;
    }

    function getPropName(prop: TSESTree.Node | null | undefined): string | null {
      if (!prop) return null;

      if (prop.type === 'Property' && isIdentifier(prop.key)) {
        return prop.key.name;
      }

      if (prop.type === 'JSXAttribute' && isJSXIdentifier(prop.name)) {
        return prop.name.name;
      }

      return null;
    }

    function enterComponent(node: TSESTree.Node): void {
      if (!node) return;

      let name: string | null = null;

      if ('id' in node && node.id) {
        name = getComponentName(node.id);
      } else if ('key' in node && node.key) {
        name = getComponentName(node.key);
      } else if ('name' in node && typeof node.name !== 'string') {
        name = getComponentName(node.name);
      } else if ('name' in node && typeof node.name === 'string') {
        name = node.name;
      }

      if (isIgnoredComponent(name)) {
        return;
      }

      const componentInfo: ComponentNode = {
        name: name || 'AnonymousComponent',
        depth: componentStack.length,
        props: new Set<string>(),
        parent: componentStack[componentStack.length - 1],
      };

      componentStack.push(componentInfo);

      // Collect props from component parameters
      if ('params' in node && node.params?.[0]?.type === 'ObjectPattern') {
        node.params[0].properties.forEach((prop) => {
          if (prop.type !== 'RestElement') {
            const propName = getPropName(prop);

            if (propName && !isAllowedProp(propName)) {
              componentInfo.props.add(propName);

              propDefinitions.set(propName, {
                node: prop,
                depth: componentStack.length - 1,
              });
            }
          }
        });
      }
    }

    function exitComponent(): void {
      componentStack.pop();
    }

    function checkPropUsage(node: TSESTree.Node, propName: string): void {
      if (componentStack.length === 0 || isAllowedProp(propName)) {
        return;
      }

      const currentComponent = componentStack[componentStack.length - 1];
      if (!currentComponent) {
        return;
      }

      if (!propUsages.has(propName)) {
        propUsages.set(propName, []);
      }

      propUsages.get(propName)?.push({
        node,
        depth: componentStack.length - 1,
        component: currentComponent.name,
      });
    }

    function reportPropDrilling(): void {
      propUsages.forEach((usages, propName) => {
        const definition = propDefinitions.get(propName);
        if (!definition) return;

        // Find the deepest usage of this prop
        const deepestUsage = usages.reduce(
          (deepest, usage) => (usage.depth > deepest.depth ? usage : deepest),
          { depth: -1, node: null as TSESTree.Node | null, component: '' }
        );

        if (!deepestUsage.node) return;

        const propDrillingDepth = deepestUsage.depth - definition.depth;

        if (propDrillingDepth > option.maxDepth) {
          context.report({
            node: definition.node,
            messageId: 'propDrillingDetected',
            data: {
              propName,
              depth: `${propDrillingDepth}`,
            },
          });
        }
      });
    }

    return {
      // Component definitions
      FunctionDeclaration: enterComponent,
      'FunctionDeclaration:exit': exitComponent,
      ArrowFunctionExpression: enterComponent,
      'ArrowFunctionExpression:exit': exitComponent,
      FunctionExpression: enterComponent,
      'FunctionExpression:exit': exitComponent,
      ClassDeclaration: enterComponent,
      'ClassDeclaration:exit': exitComponent,

      // JSX elements
      JSXOpeningElement: (node: TSESTree.JSXOpeningElement) => {
        const componentName = getComponentName(node.name);
        if (isIgnoredComponent(componentName)) return;

        node.attributes.forEach((attr) => {
          const propName = getPropName(attr);
          if (propName) {
            checkPropUsage(attr, propName);
          }
        });
      },

      // Handle props in function calls (for HOCs)
      CallExpression: (node: TSESTree.CallExpression) => {
        if (node.callee.type !== 'Identifier' || !node.arguments.length) return;

        const firstArg = node.arguments[0];
        if (firstArg.type === 'ObjectExpression') {
          firstArg.properties.forEach((prop) => {
            if (prop.type === 'SpreadElement') return;
            const propName = getPropName(prop);
            if (propName) {
              checkPropUsage(prop, propName);
            }
          });
        }
      },

      // Program exit - report all prop drilling issues
      'Program:exit': reportPropDrilling,
    };
  },
});
