import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'preferForOverMap' | 'suggestForComponent' | 'addForImport';

type Options = [
  // biome-ignore lint/complexity/noBannedTypes: unused
  {
    // Future configuration options can be added here
  },
];

const REACT_HOOKS = new Set([
  'useEffect',
  'useLayoutEffect',
  'useCallback',
  'useMemo',
  'useImperativeHandle',
  'useState',
  'useReducer',
  'useRef',
  'useContext',
]);

function isSignalArrayMap(node: TSESTree.CallExpression): {
  signalName: string;
  hasValueAccess: boolean;
} | null {
  // Check for signalName.value.map(...)
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map' &&
    node.callee.object.type === 'MemberExpression' &&
    node.callee.object.property.type === 'Identifier' &&
    node.callee.object.property.name === 'value' &&
    node.callee.object.object.type === 'Identifier' &&
    node.callee.object.object.name.endsWith('Signal')
  ) {
    return {
      signalName: node.callee.object.object.name,
      hasValueAccess: true,
    };
  }

  // Check for direct signal.map() (without .value)
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name.endsWith('Signal')
  ) {
    return {
      signalName: node.callee.object.name,
      hasValueAccess: false,
    };
  }

  return null;
}

function getForComponentReplacement(
  node: TSESTree.CallExpression,
  signalName: string,
  hasValueAccess: boolean,
  sourceCode: SourceCode
): { replacement: string; needsParens: boolean } | null {
  const mapCallback = node.arguments[0];

  if (!mapCallback) {
    return null;
  }

  const signalAccess = hasValueAccess ? `${signalName}.value` : signalName;

  // Handle different callback types
  if (mapCallback.type === 'ArrowFunctionExpression' || mapCallback.type === 'FunctionExpression') {
    const params = 'params' in mapCallback ? mapCallback.params : [];
    const itemParam = params[0]?.type === 'Identifier' ? params[0].name : 'item';

    // Get the body of the callback
    let bodyText = '';
    let needsParens = false;

    if ('body' in mapCallback) {
      if (mapCallback.body.type === 'BlockStatement') {
        // For block statements, we need to handle the return statement
        const returnStmt = mapCallback.body.body.find((stmt) => stmt.type === 'ReturnStatement') as
          | TSESTree.ReturnStatement
          | undefined;

        if (returnStmt?.argument) {
          bodyText = sourceCode.getText(returnStmt.argument);
        } else if (mapCallback.body.body.length > 0) {
          bodyText = sourceCode.getText(mapCallback.body);
        }
      } else {
        // For concise arrow functions, just get the expression
        bodyText = sourceCode.getText(mapCallback.body);
        needsParens =
          mapCallback.body.type !== 'JSXElement' && mapCallback.body.type !== 'JSXFragment';
      }
    }

    // Determine if we need to include the index parameter
    const hasIndexParam = params.length > 1;
    const paramList = hasIndexParam
      ? `(${itemParam}, ${params[1]?.type === 'Identifier' ? params[1].name : 'index'})`
      : `(${itemParam})`;

    // Format the replacement
    const replacement = hasIndexParam
      ? `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`
      : `<For each={${signalAccess}}>${paramList} => ${needsParens ? `(${bodyText})` : bodyText}</For>`;

    return { replacement, needsParens: false };
  }

  // For identifier callbacks, just use the identifier directly
  if (mapCallback.type === 'Identifier') {
    const callbackName = sourceCode.getText(mapCallback);

    return {
      replacement: `<For each={${signalAccess}}>{${callbackName}}</For>`,
      needsParens: false,
    };
  }

  // For member expressions or other call expressions
  const callbackText = sourceCode.getText(mapCallback);
  return {
    replacement: `<For each={${signalAccess}}>{${callbackText}}</For>`,
    needsParens: true,
  };
}

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`
);

/**
 * ESLint rule: prefer-for-over-map
 *
 * Prefers For component over .map() for rendering signal arrays.
 * This provides better performance for reactive array rendering.
 */
export const preferForOverMapRule = createRule<Options, MessageIds>({
  name: 'prefer-for-over-map',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Prefer For component over .map() for rendering signal arrays',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/prefer-for-over-map',
    },
    messages: {
      preferForOverMap:
        'Prefer using the `<For>` component instead of `.map()` for better performance with signal arrays.',
      suggestForComponent: 'Replace `.map()` with `<For>` component',
      addForImport: 'Add `For` import from @preact/signals-react',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Future configuration properties can be added here
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context /* , [options] */) {
    const sourceCode = context.sourceCode;
    let inJSX = false;
    let jsxDepth = 0;
    let inHook = false;
    let hookDepth = 0;
    let hasForImport = false;

    hasForImport = sourceCode.ast.body.some((node): boolean => {
      return (
        node.type === 'ImportDeclaration' &&
        node.source.value === '@preact/signals-react' &&
        node.specifiers.some((s): boolean => {
          return s.type === 'ImportSpecifier' && 'name' in s.imported && s.imported.name === 'For';
        })
      );
    });

    function isInHookContext(): boolean {
      return inHook || hookDepth > 0;
    }

    return {
      JSXElement() {
        inJSX = true;
        jsxDepth++;
      },
      JSXFragment() {
        inJSX = true;
        jsxDepth++;
      },
      'JSXElement:exit'() {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },
      'JSXFragment:exit'() {
        jsxDepth--;
        if (jsxDepth === 0) inJSX = false;
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Track hook usage
        if (node.callee.type === 'Identifier' && REACT_HOOKS.has(node.callee.name)) {
          hookDepth++;
          if (hookDepth === 1) {
            inHook = true;
          }
          return;
        }

        // Only apply the rule if we're in JSX and NOT in a hook
        if (!inJSX || isInHookContext()) {
          return;
        }

        const signalMapInfo = isSignalArrayMap(node);

        if (signalMapInfo === null) {
          return;
        }

        const replacement = getForComponentReplacement(
          node,
          signalMapInfo.signalName,
          signalMapInfo.hasValueAccess,
          sourceCode
        );

        if (!replacement) {
          return;
        }

        context.report({
          node,
          messageId: 'preferForOverMap',
          fix: (fixer) => {
            const replacementResult = getForComponentReplacement(
              node,
              signalMapInfo.signalName,
              signalMapInfo.hasValueAccess,
              sourceCode
            );

            if (!replacementResult) {
              return [];
            }

            const { replacement } = replacementResult;
            const fixes = [fixer.replaceText(node, replacement)];

            // Add For import if needed
            if (!hasForImport) {
              const forImport = "import { For } from '@preact/signals-react';\n";
              const firstImport = sourceCode.ast.body.find(
                (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                  return n.type === 'ImportDeclaration';
                }
              );

              if (firstImport) {
                fixes.push(fixer.insertTextBefore(firstImport, forImport));
              } else {
                fixes.push(fixer.insertTextBefore(sourceCode.ast.body[0], forImport));
              }
            }

            return fixes;
          },
          suggest: [
            {
              messageId: 'suggestForComponent',
              fix: (fixer) => {
                const replacementResult = getForComponentReplacement(
                  node,
                  signalMapInfo.signalName,
                  signalMapInfo.hasValueAccess,
                  sourceCode
                );

                if (!replacementResult) {
                  return [];
                }

                const { replacement } = replacementResult;

                const fixes = [fixer.replaceText(node, replacement)];

                // Add For import if needed
                if (!hasForImport) {
                  const forImport = "import { For } from '@preact/signals-react';\n";
                  const firstImport = sourceCode.ast.body.find(
                    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
                      return n.type === 'ImportDeclaration';
                    }
                  );

                  if (firstImport) {
                    fixes.push(fixer.insertTextBefore(firstImport, forImport));
                  } else {
                    fixes.push(fixer.insertTextBefore(sourceCode.ast.body[0], forImport));
                  }
                }

                return fixes;
              },
            },
          ],
        });
      },

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && REACT_HOOKS.has(node.callee.name)) {
          hookDepth = Math.max(0, hookDepth - 1);
          if (hookDepth === 0) {
            inHook = false;
          }
        }
      },
    };
  },
});
