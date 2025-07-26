import { ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier } from 'estree';
import {
  createPerformanceTracker,
  type PerformanceBudget,
  startPhase,
  endPhase,
  stopTracking,
  recordMetric,
  trackOperation,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import { getRuleDocUrl } from './utils/urls.js';

const createRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
});

type Option = {
  ignorePattern?: string | undefined;
  /** Custom signal function names to recognize (e.g., ['createSignal', 'customSignal']) */
  signalNames?: string[] | undefined;

  /** Patterns to ignore (regex as string) */
  ignorePatterns?: string[] | undefined;

  /** Severity levels for different violation types */
  severity?:
    | {
        variableWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off' | undefined;
        parameterWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off' | undefined;
        propertyWithSignalSuffixNotSignal?: 'error' | 'warn' | 'off' | undefined;
      }
    | undefined;

  /** Performance tuning options */
  performance?: PerformanceBudget | undefined;
};

type Options = [Option];

type MessageIds =
  | 'variableWithSignalSuffixNotSignal'
  | 'parameterWithSignalSuffixNotSignal'
  | 'propertyWithSignalSuffixNotSignal'
  | 'suggestRenameWithoutSuffix'
  | 'suggestConvertToSignal'
  | 'performanceLimitExceeded';

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
          ignorePatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Patterns to ignore (regex as string)',
            default: [],
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
              maxTime: {
                type: 'number',
                minimum: 1,
                default: 35,
                description: 'Maximum time in milliseconds the rule should take to process a file',
              },
              maxNodes: {
                type: 'number',
                minimum: 100,
                default: 1200,
                description: 'Maximum number of AST nodes the rule should process',
              },
              maxMemory: {
                type: 'number',
                minimum: 1024 * 1024, // 1MB
                default: 35 * 1024 * 1024, // 35MB
                description: 'Maximum memory in bytes the rule should use',
              },
              maxOperations: {
                type: 'object',
                properties: {
                  signalCheck: {
                    type: 'number',
                    minimum: 1,
                    default: 400,
                    description: 'Maximum number of signal checks',
                  },
                  identifierCheck: {
                    type: 'number',
                    minimum: 1,
                    default: 300,
                    description: 'Maximum number of identifier checks',
                  },
                  scopeLookup: {
                    type: 'number',
                    minimum: 1,
                    default: 250,
                    description: 'Maximum number of scope lookups',
                  },
                  typeCheck: {
                    type: 'number',
                    minimum: 1,
                    default: 200,
                    description: 'Maximum number of type checks',
                  },
                },
                additionalProperties: false,
              },
              enableMetrics: {
                type: 'boolean',
                default: false,
                description: 'Whether to enable detailed performance metrics',
              },
              logMetrics: {
                type: 'boolean',
                default: false,
                description: 'Whether to log performance metrics to console',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        ignorePattern: undefined,
        performance: {
          // Time and resource limits
          maxTime: 35, // ms
          maxNodes: 1200, // Maximum AST nodes to process
          maxMemory: 35 * 1024 * 1024, // 35MB

          // Operation-specific limits
          maxOperations: {
            signalCheck: 400, // Maximum number of signal checks
            identifierResolution: 300, // Maximum number of identifier resolutions
            scopeLookup: 250, // Maximum number of scope lookups
            typeCheck: 200, // Maximum number of type checks
          },

          // Metrics and logging
          enableMetrics: false, // Whether to enable detailed performance metrics
          logMetrics: false, // Whether to log performance metrics to console
        },
        signalNames: ['signal', 'useSignal', 'createSignal'],
        severity: {
          variableWithSignalSuffixNotSignal: 'error',
          parameterWithSignalSuffixNotSignal: 'error',
          propertyWithSignalSuffixNotSignal: 'error',
        },
        ignorePatterns: undefined,
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
      signalNames: undefined,
      ignorePatterns: [],
      severity: {
        variableWithSignalSuffixNotSignal: 'error',
        parameterWithSignalSuffixNotSignal: 'error',
        propertyWithSignalSuffixNotSignal: 'error',
      },
      performance: {
        maxTime: 35,
        maxNodes: 1200,
        maxMemory: 35 * 1024 * 1024,
        maxOperations: {
          signalCheck: 400,
          identifierResolution: 300,
          scopeLookup: 250,
          typeCheck: 200,
        },
        enableMetrics: false,
        logMetrics: false,
      },
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [options = {}]) {
    // Set up performance tracking for this rule with a unique key
    const perfKey = `no-non-signal-with-signal-suffix:${context.filename}`;

    // Initialize performance budget with defaults
    const perfBudget: PerformanceBudget = {
      // Time and resource limits
      maxTime: options.performance?.maxTime ?? 35, // ms
      maxNodes: options.performance?.maxNodes ?? 1200,
      maxMemory: options.performance?.maxMemory ?? 35 * 1024 * 1024, // 35MB

      // Operation-specific limits
      maxOperations: {
        [PerformanceOperations.signalCheck]: options.performance?.maxOperations?.signalCheck ?? 400,
        [PerformanceOperations.identifierResolution]:
          options.performance?.maxOperations?.identifierResolution ?? 300,
        [PerformanceOperations.scopeLookup]: options.performance?.maxOperations?.scopeLookup ?? 250,
        [PerformanceOperations.typeCheck]: options.performance?.maxOperations?.typeCheck ?? 200,
      },

      // Feature toggles
      enableMetrics: options.performance?.enableMetrics ?? false,
      logMetrics: options.performance?.logMetrics ?? false,
    };

    // Set up performance tracking
    const perf = createPerformanceTracker<Options>(perfKey, perfBudget, context);

    // Track if we've exceeded performance budget
    let performanceBudgetExceeded = false;

    // Helper function to check if we should continue processing
    const shouldContinue = (): boolean => {
      if (performanceBudgetExceeded) {
        return false;
      }

      // Track this operation
      trackOperation(perfKey, 'shouldContinueCheck');
      return true;
    };

    // Initialize rule
    try {
      startPhase(perfKey, 'rule-init');

      // Record initial metrics
      recordMetric(perfKey, 'signalNames', options.signalNames);
      recordMetric(perfKey, 'ignorePatterns', options.ignorePatterns);
      recordMetric(perfKey, 'performanceBudget', perfBudget);

      endPhase(perfKey, 'rule-init');
    } catch (error) {
      if (error instanceof PerformanceLimitExceededError) {
        performanceBudgetExceeded = true;
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'performanceLimitExceeded',
          data: { message: error.message },
        });
        return {};
      }
      throw error; // Re-throw unexpected errors
    }

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
      trackOperation(perfKey, 'isSignalCreation');

      if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
        return false;
      }

      const signalName = node.callee.name;

      if (signalName === 'signal' || signalImports.has(signalName)) {
        trackOperation(perfKey, 'signalCreationFound');
        return true;
      }

      if (hasSignalsImport) {
        const isSignalHook = [
          'useSignal',
          'useComputed',
          'useSignalEffect',
          'useSignalState',
          'useSignalRef',
        ].includes(signalName);

        if (isSignalHook) {
          trackOperation(perfKey, `signalHookFound:${signalName}`);
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
      '*': (node: TSESTree.Node): void => {
        try {
          perf.trackNode(node);
        } catch (error) {
          if (error instanceof PerformanceLimitExceededError) {
            trackOperation(perfKey, 'nodeTrackingSkipped');
          }
        }
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        startPhase(perfKey, 'import-declaration');

        if (node.source.value === '@preact/signals-react') {
          trackOperation(perfKey, 'signalsImportFound');
          hasSignalsImport = true;

          node.specifiers.forEach(
            (
              specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
            ): void => {
              if (specifier.type === 'ImportSpecifier' && 'name' in specifier.imported) {
                trackOperation(perfKey, `signalImport:${specifier.imported.name}`);
                signalImports.add(specifier.imported.name);
              }
            }
          );
        }

        endPhase(perfKey, 'import-declaration');
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        startPhase(perfKey, 'variable-declarator');
        trackOperation(perfKey, 'variableCheck');

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

          if (ignorePattern?.test(varName)) {
            trackOperation(perfKey, 'ignoredByPattern');
            endPhase(perfKey, 'variable-declarator');
            return;
          }

          if (node.init !== null && isSignalExpression(node.init)) {
            trackOperation(perfKey, 'validSignalFound');
            endPhase(perfKey, 'variable-declarator');
            return;
          }

          if ('typeAnnotation' in node.id && node.id.typeAnnotation) {
            trackOperation(perfKey, 'hasTypeAnnotation');
            endPhase(perfKey, 'variable-declarator');
            return;
          }

          const newName = varName.replace(/Signal$/, '');
          trackOperation(perfKey, 'reportingIssue');

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
        if (!shouldContinue()) {
          return;
        }

        perf.trackNode(node);

        startPhase(perfKey, 'function-declaration');
        trackOperation(perfKey, 'parameterCheck');

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

              if (ignorePattern?.test(param.name)) {
                trackOperation(perfKey, 'ignoredByPattern');
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
        if (!shouldContinue()) return;
        perf.trackNode(node);

        startPhase(perfKey, 'property');
        trackOperation(perfKey, 'propertyCheck');

        try {
          if (
            node.key.type === 'Identifier' &&
            node.key.name.endsWith('Signal') &&
            !node.computed
          ) {
            if (
              node.shorthand &&
              node.value.type === 'Identifier' &&
              isSignalExpression(node.value)
            ) {
              trackOperation(perfKey, 'validSignalFound');
              endPhase(perfKey, 'property');
              return;
            }

            if (ignorePattern?.test(node.key.name)) {
              trackOperation(perfKey, 'ignoredByPattern');
              endPhase(perfKey, 'property');
              return;
            }

            if (isSignalExpression(node.value)) {
              trackOperation(perfKey, 'validSignalFound');
              endPhase(perfKey, 'property');
              return;
            }

            const newName = node.key.name.replace(/Signal$/, '');
            trackOperation(perfKey, 'reportingIssue');

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

      'Program:exit'(): void {
        try {
          startPhase(perfKey, 'program-exit');

          if (perf) {
            perf['Program:exit']();
          }

          // Record final metrics
          recordMetric(perfKey, 'signalImports', Array.from(signalImports));
          recordMetric(perfKey, 'hasSignalsImport', hasSignalsImport);

          endPhase(perfKey, 'program-exit');
        } catch (error: unknown) {
          if (error instanceof PerformanceLimitExceededError) {
            performanceBudgetExceeded = true;

            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'performanceLimitExceeded',
              data: { message: error.message },
            });
          } else {
            throw error;
          }
        } finally {
          // End any remaining phases for this key
          try {
            // This will end all phases for the current key
            endPhase(perfKey, 'any');
          } catch {
            // Ignore any errors when ending phases
          }

          // Stop tracking and clean up
          try {
            stopTracking(perfKey);
          } catch (error: unknown) {
            // Ignore errors during stop tracking
            if (error instanceof PerformanceLimitExceededError) {
              trackOperation(perfKey, 'stopTrackingSkipped');
            }
          }
        }
      },
    };
  },
});
