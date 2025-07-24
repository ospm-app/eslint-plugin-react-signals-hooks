import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier } from 'estree';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/${name}`;
});

type Options = [
  {
    ignorePattern?: string | undefined;
  }?,
];

type MessageIds =
  | 'variableWithSignalSuffixNotSignal'
  | 'parameterWithSignalSuffixNotSignal'
  | 'propertyWithSignalSuffixNotSignal'
  | 'suggestRenameWithoutSuffix'
  | 'suggestConvertToSignal';

/**
 * ESLint rule: no-non-signal-with-signal-suffix
 *
 * Ensures that variables with 'Signal' suffix are actual signal instances
 * created by `signal()`, `useSignal()`, or other signal creation functions.
 */
export const noNonSignalWithSignalSuffixRule = createRule<Options, MessageIds>({
  name: 'no-non-signal-with-signal-suffix',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Enforce that variables with Signal suffix are actual signal instances',
      url: 'https://github.com/ospm-app/eslint-plugin-react-signals-hooks/docs/rules/no-non-signal-with-signal-suffix',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePattern: {
            type: 'string',
            description: 'Regex pattern for variable names to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [],
    messages: {
      variableWithSignalSuffixNotSignal:
        "Variable '{{ name }}' has 'Signal' suffix but is not a signal instance. Use a signal or rename to remove 'Signal' suffix.",
      parameterWithSignalSuffixNotSignal:
        "Parameter '{{ name }}' has 'Signal' suffix but is not typed as a signal. Add proper signal type or rename to remove 'Signal' suffix.",
      propertyWithSignalSuffixNotSignal:
        "Property '{{ name }}' has 'Signal' suffix but is not a signal. Use a signal or rename to remove 'Signal' suffix.",
      suggestRenameWithoutSuffix:
        "Rename '{{ name }}' to '{{ newName }}' to remove 'Signal' suffix",
      suggestConvertToSignal: "Convert '{{ name }}' to a signal using signal() or useSignal()",
    },
  },
  defaultOptions: [],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [options]) {
    const ignorePattern = options?.ignorePattern ? new RegExp(options.ignorePattern) : null;

    const signalImports = new Set<string>();

    let hasSignalsImport = false;

    function isSignalCreation(
      node:
        | TSESTree.ConstDeclaration
        | TSESTree.LetOrVarDeclaredDeclaration
        | TSESTree.LetOrVarNonDeclaredDeclaration
        | TSESTree.AssignmentPattern
        | TSESTree.TSEmptyBodyFunctionExpression
        | TSESTree.Expression
    ): boolean {
      if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
        return false;
      }

      if (node.callee.name === 'signal' || signalImports.has(node.callee.name)) {
        return true;
      }

      if (hasSignalsImport) {
        return [
          'useSignal',
          'useComputed',
          'useSignalEffect',
          'useSignalState',
          'useSignalRef',
        ].includes(node.callee.name);
      }

      return false;
    }

    function isSignalExpression(
      node:
        | TSESTree.ConstDeclaration
        | TSESTree.LetOrVarDeclaredDeclaration
        | TSESTree.LetOrVarNonDeclaredDeclaration
        | TSESTree.Expression
        | TSESTree.AssignmentPattern
        | TSESTree.TSEmptyBodyFunctionExpression
        | null
    ): boolean {
      if (node === null) {
        return false;
      }

      if (isSignalCreation(node)) {
        return true;
      }

      if (
        node.type === 'MemberExpression' &&
        node.property.type === 'Identifier' &&
        node.property.name.endsWith('Signal')
      ) {
        return true;
      }

      if (
        node.type === 'MemberExpression' &&
        node.property.type === 'Identifier' &&
        node.property.name.endsWith('Signal')
      ) {
        return true;
      }

      if (node.type === 'Identifier') {
        const variable = context.sourceCode.getScope(node).variables.find((v): boolean => {
          return v.name === node.name;
        });

        if (variable) {
          return variable.defs.some((def): boolean => {
            if ('init' in def.node) {
              return isSignalExpression(def.node.init);
            }

            return false;
          });
        }
      }

      return false;
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        if (node.source.value === '@preact/signals-react') {
          hasSignalsImport = true;

          node.specifiers.forEach(
            (
              specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
            ): void => {
              if (specifier.type === 'ImportSpecifier' && 'name' in specifier.imported) {
                signalImports.add(specifier.imported.name);
              }
            }
          );
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name;
        if (!varName.endsWith('Signal')) {
          return;
        }

        if (ignorePattern?.test(varName)) {
          return;
        }

        if (node.init !== null && isSignalExpression(node.init)) {
          return;
        }

        if ('typeAnnotation' in node.id && node.id.typeAnnotation) {
          return;
        }

        const newName = varName.replace(/Signal$/, '');

        context.report({
          node: node.id,
          messageId: 'variableWithSignalSuffixNotSignal',
          data: { name: varName },
          suggest: [
            {
              messageId: 'suggestRenameWithoutSuffix',
              data: {
                name: varName,
                newName: newName,
              },
              fix(fixer) {
                return fixer.replaceText(node.id, newName);
              },
            },
            {
              messageId: 'suggestConvertToSignal',
              data: { name: varName },
              fix(fixer) {
                const initText = node.init ? context.sourceCode.getText(node.init) : 'null';
                return fixer.replaceText(
                  node,
                  `${'name' in node.id ? node.id.name : node.id.type} = signal(${initText})`
                );
              },
            },
          ],
        });
      },

      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        node: TSESTree.Node
      ): void {
        if (!('params' in node) || !node.params || !Array.isArray(node.params)) {
          return;
        }

        node.params.forEach(
          (param: TSESTree.TSTypeParameter | TSESTree.Parameter | TSESTree.TypeNode): void => {
            if (param.type !== 'Identifier') {
              return;
            }

            if (!param.name.endsWith('Signal')) {
              return;
            }

            if (ignorePattern?.test(param.name)) {
              return;
            }

            if (
              'typeAnnotation' in param &&
              param !== null &&
              typeof param.typeAnnotation === 'object' &&
              param.typeAnnotation !== null &&
              'typeAnnotation' in param.typeAnnotation &&
              param.typeAnnotation.typeAnnotation !== null &&
              typeof param.typeAnnotation.typeAnnotation === 'object'
            ) {
              const typeAnnotation = param.typeAnnotation.typeAnnotation;

              if (
                'type' in typeAnnotation &&
                typeof typeAnnotation.type === 'string' &&
                typeAnnotation.type === 'TSTypeReference' &&
                'typeName' in typeAnnotation &&
                typeof typeAnnotation.typeName === 'object' &&
                typeAnnotation.typeName !== null &&
                'type' in typeAnnotation.typeName &&
                typeof typeAnnotation.typeName.type === 'string' &&
                typeAnnotation.typeName.type === 'Identifier' &&
                'name' in typeAnnotation.typeName &&
                typeof typeAnnotation.typeName.name === 'string' &&
                typeAnnotation.typeName.name.endsWith('Signal')
              ) {
                return;
              }
            }

            const newName = param.name.replace(/Signal$/, '');

            context.report({
              node: param as TSESTree.Node,
              messageId: 'parameterWithSignalSuffixNotSignal',
              data: { name: param.name },
              suggest: [
                {
                  messageId: 'suggestRenameWithoutSuffix',
                  data: {
                    name: param.name,
                    newName,
                  },
                  fix(fixer) {
                    return fixer.replaceText(param, newName);
                  },
                },
              ],
            });
          }
        );
      },

      Property(node: TSESTree.Property): void {
        if (node.key.type === 'Identifier' && node.key.name.endsWith('Signal') && !node.computed) {
          if (
            node.shorthand &&
            node.value.type === 'Identifier' &&
            isSignalExpression(node.value)
          ) {
            return;
          }

          if (ignorePattern?.test(node.key.name)) {
            return;
          }

          if (isSignalExpression(node.value)) {
            return;
          }

          const newName = node.key.name.replace(/Signal$/, '');

          context.report({
            node: node.key,
            messageId: 'propertyWithSignalSuffixNotSignal',
            data: { name: node.key.name },
            suggest: [
              {
                messageId: 'suggestRenameWithoutSuffix',
                data: {
                  name: node.key.name,
                  newName,
                },
                fix(fixer) {
                  return fixer.replaceText(node.key, newName);
                },
              },
            ],
          });
        }
      },
    };
  },
});
