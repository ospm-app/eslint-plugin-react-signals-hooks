/** biome-ignore-all assist/source/organizeImports: off */
import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier } from 'estree';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import {
  endPhase,
  startPhase,
  stopTracking,
  recordMetric,
  startTracking,
  trackOperation,
  createPerformanceTracker,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance.js';
import { getRuleDocUrl } from './utils/urls.js';
import type { PerformanceBudget } from './utils/types.js';
import { PerformanceOperations } from './utils/performance-constants.js';

type Option = {
  ignorePattern: string;
  /** Custom signal function names to recognize (e.g., ['createSignal', 'customSignal']) */
  signalNames: string[] | undefined;

  /** Severity levels for different violation types */
  severity: {
    variableWithSignalSuffixNotSignal: 'error' | 'warn' | 'off';
    parameterWithSignalSuffixNotSignal: 'error' | 'warn' | 'off';
    propertyWithSignalSuffixNotSignal: 'error' | 'warn' | 'off';
  };

  /** Performance tuning option */
  performance: PerformanceBudget;
};

type Options = [Option];

type MessageIds =
  | 'variableWithSignalSuffixNotSignal'
  | 'parameterWithSignalSuffixNotSignal'
  | 'propertyWithSignalSuffixNotSignal'
  | 'suggestRenameWithoutSuffix'
  | 'suggestConvertToSignal'
  | 'performanceLimitExceeded';

const signalImports = new Set<string>();

function isSignalCreation(
  node:
    | TSESTree.ConstDeclaration
    | TSESTree.LetOrVarDeclaredDeclaration
    | TSESTree.LetOrVarNonDeclaredDeclaration
    | TSESTree.AssignmentPattern
    | TSESTree.TSEmptyBodyFunctionExpression
    | TSESTree.Expression,
  hasSignalsImport: boolean,
  perfKey: string
): boolean {
  trackOperation(perfKey, PerformanceOperations.isSignalCreation);

  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
    return false;
  }

  if (node.callee.name === 'signal' || signalImports.has(node.callee.name)) {
    trackOperation(perfKey, PerformanceOperations.signalCreationFound);

    return true;
  }

  if (hasSignalsImport) {
    type SignalHookNames =
      | 'useSignal'
      | 'useComputed'
      | 'useSignalEffect'
      | 'useSignalState'
      | 'useSignalRef';

    const isSignalHook = [
      'useSignal',
      'useComputed',
      'useSignalEffect',
      'useSignalState',
      'useSignalRef',
    ].includes(node.callee.name);

    if (isSignalHook) {
      trackOperation(
        perfKey,
        PerformanceOperations[`signalHookFound:${node.callee.name as SignalHookNames}`]
      );
    }

    return isSignalHook;
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
    | null,
  context: RuleContext<MessageIds, Options>,
  hasSignalsImport: boolean,
  perfKey: string
): boolean {
  if (node === null) {
    return false;
  }

  if (isSignalCreation(node, hasSignalsImport, perfKey)) {
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
          return isSignalExpression(def.node.init, context, hasSignalsImport, perfKey);
        }

        return false;
      });
    }
  }

  return false;
}

let hasSignalsImport = false;

const ruleName = 'no-non-signal-with-signal-suffix';

export const noNonSignalWithSignalSuffixRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem', // Changed from 'suggestion' to 'problem' as it enforces critical type safety
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
            description: 'Pattern to ignore (regex as string)',
            default: '',
          },
          signalNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Custom signal function names to recognize (e.g., ["createSignal", "customSignal"])',
            default: ['signal', 'useSignal', 'createSignal'],
          },
          severity: {
            type: 'object',
            properties: {
              variableWithSignalSuffixNotSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              parameterWithSignalSuffixNotSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              propertyWithSignalSuffixNotSignal: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
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
        additionalProperties: false,
      },
    ],
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
      performanceLimitExceeded:
        'Performance limit exceeded for no-non-signal-with-signal-suffix rule {{ message }}',
    },
  },
  defaultOptions: [
    {
      ignorePattern: '',
      signalNames: undefined,
      severity: {
        variableWithSignalSuffixNotSignal: 'error',
        parameterWithSignalSuffixNotSignal: 'error',
        propertyWithSignalSuffixNotSignal: 'error',
      },
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker<Options>(perfKey, option.performance, context);

    if (option.performance?.enableMetrics === true) {
      startTracking(context, perfKey, option.performance, ruleName);
    }

    console.info(`${ruleName}: Initializing rule for file: ${context.filename}`);
    console.info(`${ruleName}: Rule configuration:`, option);

    recordMetric(perfKey, 'config', {
      performance: {
        enableMetrics: option.performance.enableMetrics,
        logMetrics: option.performance.logMetrics,
      },
    });

    trackOperation(perfKey, PerformanceOperations.ruleInit);

    endPhase(perfKey, 'ruleInit');

    let nodeCount = 0;

    function shouldContinue(): boolean {
      nodeCount++;

      if (nodeCount > (option.performance?.maxNodes ?? 2000)) {
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

          stopTracking(perfKey);

          return;
        }

        perf.trackNode(node);

        trackOperation(perfKey, PerformanceOperations[`${node.type}Processing`]);
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        startPhase(perfKey, 'import-declaration');

        if (node.source.value === '@preact/signals-react') {
          trackOperation(perfKey, PerformanceOperations.signalsImportFound);
          hasSignalsImport = true;

          node.specifiers.forEach(
            (
              specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
            ): void => {
              if (specifier.type === 'ImportSpecifier' && 'name' in specifier.imported) {
                type ImportSpecifierNames = 'signal' | 'useSignal';

                trackOperation(
                  perfKey,
                  PerformanceOperations[
                    `signalImport:${specifier.imported.name as ImportSpecifierNames}`
                  ]
                );

                signalImports.add(specifier.imported.name);
              }
            }
          );
        }

        endPhase(perfKey, 'import-declaration');
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        startPhase(perfKey, 'variable-declarator');

        trackOperation(perfKey, PerformanceOperations.variableCheck);

        try {
          if (node.id.type !== 'Identifier') {
            endPhase(perfKey, 'variable-declarator');

            return;
          }

          const varName = node.id.name;
          if (!varName.endsWith('Signal')) {
            endPhase(perfKey, 'variable-declarator');

            return;
          }

          if (new RegExp(option.ignorePattern).test(varName)) {
            trackOperation(perfKey, PerformanceOperations.ignoredByPattern);

            endPhase(perfKey, 'variable-declarator');

            return;
          }

          if (
            node.init !== null &&
            isSignalExpression(node.init, context, hasSignalsImport, perfKey)
          ) {
            trackOperation(perfKey, PerformanceOperations.validSignalFound);

            endPhase(perfKey, 'variable-declarator');

            return;
          }

          if ('typeAnnotation' in node.id && node.id.typeAnnotation) {
            trackOperation(perfKey, PerformanceOperations.hasTypeAnnotation);

            endPhase(perfKey, 'variable-declarator');

            return;
          }

          const newName = varName.replace(/Signal$/, '');
          trackOperation(perfKey, PerformanceOperations.reportingIssue);

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
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  return fixer.replaceText(node.id, newName);
                },
              },
              {
                messageId: 'suggestConvertToSignal',
                data: { name: varName },
                fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                  const initText = node.init ? context.sourceCode.getText(node.init) : 'null';
                  return fixer.replaceText(node, `const ${varName} = signal(${initText})`);
                },
              },
            ],
          });
        } finally {
          endPhase(perfKey, 'variable-declarator');
        }
      },

      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        node: TSESTree.Node
      ): void {
        startPhase(perfKey, 'function-declaration');
        trackOperation(perfKey, PerformanceOperations.parameterCheck);

        try {
          if (!('params' in node) || !node.params || !Array.isArray(node.params)) {
            endPhase(perfKey, 'function-declaration');

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

              if (new RegExp(option.ignorePattern)?.test(param.name)) {
                trackOperation(perfKey, PerformanceOperations.ignoredByPattern);
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
                    fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                      return fixer.replaceText(param, newName);
                    },
                  },
                ],
              });
            }
          );
        } finally {
          endPhase(perfKey, 'function-declaration');
        }
      },

      Property(node: TSESTree.Property): void {
        startPhase(perfKey, 'property');

        trackOperation(perfKey, PerformanceOperations.propertyCheck);

        try {
          if (
            node.key.type === 'Identifier' &&
            node.key.name.endsWith('Signal') &&
            !node.computed
          ) {
            if (
              node.shorthand &&
              node.value.type === 'Identifier' &&
              isSignalExpression(node.value, context, hasSignalsImport, perfKey)
            ) {
              trackOperation(perfKey, PerformanceOperations.validSignalFound);
              endPhase(perfKey, 'property');
              return;
            }

            if (new RegExp(option.ignorePattern)?.test(node.key.name)) {
              trackOperation(perfKey, PerformanceOperations.ignoredByPattern);
              endPhase(perfKey, 'property');
              return;
            }

            if (isSignalExpression(node.value, context, hasSignalsImport, perfKey)) {
              trackOperation(perfKey, PerformanceOperations.validSignalFound);
              endPhase(perfKey, 'property');
              return;
            }

            const newName = node.key.name.replace(/Signal$/, '');
            trackOperation(perfKey, PerformanceOperations.reportingIssue);

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
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    return fixer.replaceText(node.key, newName);
                  },
                },
              ],
            });
          }
        } finally {
          endPhase(perfKey, 'property');
        }
      },

      'Program:exit'(node: TSESTree.Program): void {
        if (!shouldContinue()) {
          return;
        }

        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
            const { exceededBudget, nodeCount, duration } = finalMetrics;
            const status = exceededBudget ? 'EXCEEDED' : 'OK';

            console.info(`\n[${ruleName}] Performance Metrics (${status}):`);
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${nodeCount}`);

            if (exceededBudget) {
              console.warn('\n⚠️  Performance budget exceeded!');
            }
          }
        } catch (error: unknown) {
          console.error('Error recording metrics:', error);
        } finally {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);
        }

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
