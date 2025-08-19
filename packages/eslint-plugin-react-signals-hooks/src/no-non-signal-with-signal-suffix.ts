/* eslint-disable react-signals-hooks/no-non-signal-with-signal-suffix */
/** biome-ignore-all assist/source/organizeImports: off */
import type { Definition, ScopeVariable } from '@typescript-eslint/scope-manager';
import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
  AST_NODE_TYPES,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier } from 'estree';

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
import { buildSuffixRegex } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'variableWithSignalSuffixNotSignal'
  | 'parameterWithSignalSuffixNotSignal'
  | 'propertyWithSignalSuffixNotSignal'
  | 'suggestRenameWithoutSuffix'
  | 'suggestConvertToSignal';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  ignorePattern?: string;
  /** Custom signal function names to recognize (e.g., ['createSignal', 'customSignal']) */
  signalNames?: Array<string>;

  /** Suffix to detect (configurable); default 'Signal' */
  suffix?: string;

  /** Whether to validate object properties that end with the suffix */
  validateProperties?: boolean;

  /** Whether to validate exported variables (by default exported names are skipped) */
  validateExported?: boolean;

  /** Severity levels for different violation types */
  severity?: Severity;

  /** Performance tuning option */
  performance?: PerformanceBudget;
};

type Options = [Option?];

function getSeverity(messageId: MessageIds, option: Option | undefined): 'error' | 'warn' | 'off' {
  if (!option?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'variableWithSignalSuffixNotSignal': {
      return option.severity.variableWithSignalSuffixNotSignal ?? 'error';
    }

    case 'parameterWithSignalSuffixNotSignal': {
      return option.severity.parameterWithSignalSuffixNotSignal ?? 'error';
    }

    case 'propertyWithSignalSuffixNotSignal': {
      return option.severity.propertyWithSignalSuffixNotSignal ?? 'error';
    }

    case 'suggestRenameWithoutSuffix': {
      return option.severity.suggestRenameWithoutSuffix ?? 'error';
    }

    case 'suggestConvertToSignal': {
      return option.severity.suggestConvertToSignal ?? 'error';
    }

    default:
      return 'error';
  }
}

// moved into create() to avoid cross-file leakage

function isSignalCreation(
  node:
    | TSESTree.ConstDeclaration
    | TSESTree.LetOrVarDeclaredDeclaration
    | TSESTree.LetOrVarNonDeclaredDeclaration
    | TSESTree.AssignmentPattern
    | TSESTree.TSEmptyBodyFunctionExpression
    | TSESTree.Expression,
  hasSignalsImport: boolean,
  perfKey: string,
  creatorNames: ReadonlySet<string>,
  signalImports: ReadonlySet<string>,
  signalLocalNames: ReadonlySet<string>,
  signalsNamespaceImports: ReadonlySet<string>
): boolean {
  trackOperation(perfKey, PerformanceOperations.isSignalCreation);

  if (node.type !== AST_NODE_TYPES.CallExpression) {
    return false;
  }

  // Identifier callee: direct or locally aliased creator
  if (node.callee.type === AST_NODE_TYPES.Identifier) {
    const name = node.callee.name;
    if (
      name === 'signal' ||
      signalImports.has(name) ||
      signalLocalNames.has(name) ||
      creatorNames.has(name)
    ) {
      trackOperation(perfKey, PerformanceOperations.signalCreationFound);

      return true;
    }
  }

  // Namespaced call: e.g., Signals.signal(...)
  if (
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    !node.callee.computed &&
    node.callee.object.type === AST_NODE_TYPES.Identifier &&
    node.callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    const ns = node.callee.object.name;

    const prop = node.callee.property.name;

    if (signalsNamespaceImports.has(ns) && (prop === 'signal' || creatorNames.has(prop))) {
      trackOperation(perfKey, PerformanceOperations.signalCreationFound);
      return true;
    }
  }

  if (hasSignalsImport) {
    if (
      'name' in node.callee &&
      ['useSignal', 'useComputed', 'useSignalEffect', 'useSignalState', 'useSignalRef'].includes(
        node.callee.name
      )
    ) {
      const op =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        PerformanceOperations[
          `signalHookFound:${node.callee.name as 'useSignal' | 'useComputed' | 'useSignalEffect' | 'useSignalState' | 'useSignalRef'}`
        ] ?? PerformanceOperations.nodeProcessing;

      trackOperation(perfKey, op);
    }

    return (
      'name' in node.callee &&
      ['useSignal', 'useComputed', 'useSignalEffect', 'useSignalState', 'useSignalRef'].includes(
        node.callee.name
      )
    );
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
  perfKey: string,
  creatorNames: ReadonlySet<string>,
  signalImports: ReadonlySet<string>,
  signalLocalNames: ReadonlySet<string>,
  signalsNamespaceImports: ReadonlySet<string>
): boolean {
  if (node === null) {
    return false;
  }

  if (
    isSignalCreation(
      node,
      hasSignalsImport,
      perfKey,
      creatorNames,
      signalImports,
      signalLocalNames,
      signalsNamespaceImports
    )
  ) {
    return true;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = context.sourceCode.getScope(node).variables.find((v): boolean => {
      return v.name === node.name;
    });

    if (variable) {
      return variable.defs.some((def: Definition): boolean => {
        if ('init' in def.node) {
          return isSignalExpression(
            def.node.init,
            context,
            hasSignalsImport,
            perfKey,
            creatorNames,
            signalImports,
            signalLocalNames,
            signalsNamespaceImports
          );
        }

        return false;
      });
    }
  }

  return false;
}

const ruleName = 'no-non-signal-with-signal-suffix';

export const noNonSignalWithSignalSuffixRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description: 'Enforce that variables with Signal suffix are actual signal instances',
      url: getRuleDocUrl(ruleName),
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
              'Additional creator names that should be considered as signals (e.g., createSignal)',
            default: ['signal', 'useSignal', 'createSignal'],
          },
          suffix: {
            type: 'string',
            description: 'Suffix to detect (default: "Signal")',
            default: 'Signal',
          },
          validateProperties: {
            type: 'boolean',
            description: 'Whether to validate object properties that end with the suffix',
            default: true,
          },
          validateExported: {
            type: 'boolean',
            description:
              'When true, also validate exported variables (by default exported names are skipped)',
            default: false,
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
        "Variable '{{ name }}' has a signal-like suffix but is not a signal instance. Use a signal or rename to remove the suffix.",
      parameterWithSignalSuffixNotSignal:
        "Parameter '{{ name }}' has a signal-like suffix but is not a signal instance.",
      propertyWithSignalSuffixNotSignal:
        "Property '{{ name }}' has a signal-like suffix but is not a signal instance.",
      suggestRenameWithoutSuffix: "Rename '{{ name }}' to '{{ newName }}' (remove suffix)",
      suggestConvertToSignal: "Convert '{{ name }}' to a signal using signal() or useSignal()",
    },
  },
  defaultOptions: [
    {
      ignorePattern: '',
      signalNames: ['signal', 'useSignal', 'createSignal'],
      suffix: 'Signal',
      validateProperties: true,
      validateExported: false,
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

    startPhase(perfKey, 'ruleExecution');

    // Per-file mutable state
    let hasSignalsImport = false;
    const signalImports = new Set<string>();
    const signalLocalNames = new Set<string>();
    const signalsNamespaceImports = new Set<string>();

    const suffixRegex = buildSuffixRegex(
      typeof option?.suffix === 'string' && option.suffix.length > 0 ? option.suffix : 'Signal'
    );

    const creatorNames = new Set<string>(
      option?.signalNames ?? ['signal', 'useSignal', 'createSignal']
    );

    // Avoid touching identifiers within TypeScript type positions
    function isInTypePosition(node: TSESTree.Node): boolean {
      const ancestors = context.sourceCode.getAncestors(node);
      return ancestors.some((a: TSESTree.Node): boolean => {
        // All TS-specific AST node types start with 'TS'
        // Additionally, type annotations wrap identifiers used only for types
        // We conservatively skip if any TS node is in the ancestor chain
        // to avoid renaming inside type positions.
        return a.type.startsWith('TS') || a.type === AST_NODE_TYPES.TSTypeAnnotation;
      });
    }

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
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        startPhase(perfKey, 'import-declaration');

        if (node.source.value === '@preact/signals-react') {
          trackOperation(perfKey, PerformanceOperations.signalsImportFound);

          hasSignalsImport = true;

          node.specifiers.forEach(
            (
              specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
            ): void => {
              if (
                specifier.type === AST_NODE_TYPES.ImportSpecifier &&
                'name' in specifier.imported
              ) {
                // Track imported names and local aliases
                signalImports.add(specifier.imported.name);

                signalLocalNames.add(specifier.local.name);
              }

              if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
                signalsNamespaceImports.add(specifier.local.name);
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

          if (!suffixRegex.test(node.id.name)) {
            endPhase(perfKey, 'variable-declarator');

            return;
          }

          // Do not report if this identifier is inside a TS type position
          if (isInTypePosition(node.id)) {
            endPhase(perfKey, 'variable-declarator');
            return;
          }

          if (
            typeof option?.ignorePattern !== 'undefined' &&
            option.ignorePattern !== '' &&
            // User provided pattern
            // eslint-disable-next-line security/detect-non-literal-regexp
            new RegExp(option.ignorePattern).test(node.id.name)
          ) {
            trackOperation(perfKey, PerformanceOperations.ignoredByPattern);

            endPhase(perfKey, 'variable-declarator');

            return;
          }

          if (
            node.init !== null &&
            isSignalExpression(
              node.init,
              context,
              hasSignalsImport,
              perfKey,
              creatorNames,
              signalImports,
              signalLocalNames,
              signalsNamespaceImports
            )
          ) {
            trackOperation(perfKey, PerformanceOperations.validSignalFound);

            endPhase(perfKey, 'variable-declarator');

            return;
          }

          const newName = node.id.name.replace(suffixRegex, '');

          const messageId = 'variableWithSignalSuffixNotSignal';

          // Skip exported/public API names
          const parentDecl =
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            node.parent?.type === AST_NODE_TYPES.VariableDeclaration ? node.parent : null;

          trackOperation(perfKey, PerformanceOperations.reportingIssue);

          if (
            (option?.validateExported === true ||
              (parentDecl?.parent &&
                parentDecl.parent.type === AST_NODE_TYPES.ExportNamedDeclaration) !== true) &&
            getSeverity(messageId, option) !== 'off'
          ) {
            context.report({
              node: node.id,
              messageId,
              data: { name: node.id.name },
              suggest: [
                {
                  messageId: 'suggestRenameWithoutSuffix',
                  data: {
                    name: node.id.name,
                    newName,
                  },
                  fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                    return fixer.replaceText(node.id, newName);
                  },
                },
                // Convert to signal using existing named import
                ...(parentDecl?.kind === 'const' &&
                Array.isArray(parentDecl.declarations) &&
                parentDecl.declarations.length === 1 &&
                signalImports.has('signal') &&
                signalLocalNames.has('signal')
                  ? [
                      {
                        messageId: 'suggestConvertToSignal' as const,
                        data: { name: node.id.name },
                        fix(
                          fixer: TSESLint.RuleFixer
                        ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                          if ('name' in node.id) {
                            const initText = node.init
                              ? context.sourceCode.getText(node.init)
                              : 'null';
                            if (node.init) {
                              return fixer.replaceTextRange(node.init.range, `signal(${initText})`);
                            }

                            const insertPos =
                              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                              node.id.type === AST_NODE_TYPES.Identifier && node.id.typeAnnotation
                                ? node.id.typeAnnotation.range[1]
                                : node.id.range[1];

                            return fixer.insertTextAfterRange(
                              [insertPos, insertPos],
                              ` = signal(${initText})`
                            );
                          }
                          return null;
                        },
                      } as const,
                    ]
                  : []),
                // Insert named import for signal if missing, then convert
                ...(parentDecl?.kind === 'const' &&
                Array.isArray(parentDecl.declarations) &&
                parentDecl.declarations.length === 1 &&
                !(signalImports.has('signal') && signalLocalNames.has('signal'))
                  ? [
                      {
                        messageId: 'suggestConvertToSignal' as const,
                        data: { name: node.id.name },
                        fix(
                          fixer: TSESLint.RuleFixer
                        ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                          const fixes: Array<TSESLint.RuleFix> = [];

                          const initText = node.init
                            ? context.sourceCode.getText(node.init)
                            : 'null';

                          const firstImport = context.sourceCode.ast.body.find(
                            (s): s is TSESTree.ImportDeclaration =>
                              s.type === AST_NODE_TYPES.ImportDeclaration
                          );

                          const importText = "import { signal } from '@preact/signals-react';\n";

                          if (firstImport) {
                            fixes.push(fixer.insertTextBeforeRange(firstImport.range, importText));
                          } else {
                            fixes.push(fixer.insertTextBeforeRange([0, 0], importText));
                          }

                          if (node.init) {
                            fixes.push(
                              fixer.replaceTextRange(node.init.range, `signal(${initText})`)
                            );
                          } else {
                            const insertPos =
                              node.id.type === AST_NODE_TYPES.Identifier && node.id.typeAnnotation
                                ? node.id.typeAnnotation.range[1]
                                : node.id.range[1];

                            fixes.push(
                              fixer.insertTextAfterRange(
                                [insertPos, insertPos],
                                ` = signal(${initText})`
                              )
                            );
                          }

                          return fixes;
                        },
                      } as const,
                    ]
                  : []),
              ],
            });
          }
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
          if (!('params' in node) || !Array.isArray(node.params)) {
            endPhase(perfKey, 'function-declaration');

            return;
          }

          node.params.forEach(
            (param: TSESTree.TSTypeParameter | TSESTree.Parameter | TSESTree.TypeNode): void => {
              if (!(param.type === AST_NODE_TYPES.Identifier && suffixRegex.test(param.name))) {
                return;
              }

              // Skip parameters used in type-only positions (defensive, though params are values)
              if (isInTypePosition(param)) {
                return;
              }

              if (
                typeof option?.ignorePattern !== 'undefined' &&
                option.ignorePattern !== '' &&
                // User provided pattern
                // eslint-disable-next-line security/detect-non-literal-regexp
                new RegExp(option.ignorePattern).test(param.name)
              ) {
                trackOperation(perfKey, PerformanceOperations.ignoredByPattern);

                return;
              }

              const messageId = 'parameterWithSignalSuffixNotSignal';

              const newName = param.name.replace(suffixRegex, '');

              trackOperation(perfKey, PerformanceOperations.reportingIssue);

              if (getSeverity(messageId, option) !== 'off') {
                context.report({
                  node: param,
                  messageId,
                  data: { name: param.name },
                  suggest: [
                    {
                      messageId: 'suggestRenameWithoutSuffix',
                      data: {
                        name: param.name,
                        newName,
                      },
                      fix(
                        fixer: TSESLint.RuleFixer
                      ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                        const fixes: Array<TSESLint.RuleFix> = [];
                        // Rename the parameter identifier itself
                        fixes.push(fixer.replaceText(param, newName));

                        const variable = context.sourceCode
                          .getDeclaredVariables(node)
                          .find((v: ScopeVariable): boolean => {
                            return v.defs.some((d: Definition): boolean => {
                              return (
                                d.name.range[0] === param.range[0] &&
                                d.name.range[1] === param.range[1]
                              );
                            });
                          });

                        if (typeof variable !== 'undefined') {
                          for (const ref of variable.references) {
                            // Skip the definition identifier (already handled) and any TS type positions
                            if (
                              (ref.identifier.range[0] === param.range[0] &&
                                ref.identifier.range[1] === param.range[1]) ||
                              isInTypePosition(ref.identifier)
                            ) {
                              continue;
                            }
                            fixes.push(fixer.replaceText(ref.identifier, newName));
                          }
                        }

                        return fixes;
                      },
                    },
                  ],
                });
              }
            }
          );
        } finally {
          endPhase(perfKey, 'function-declaration');
        }
      },

      [AST_NODE_TYPES.Property](node: TSESTree.Property): void {
        startPhase(perfKey, 'property');

        trackOperation(perfKey, PerformanceOperations.propertyCheck);

        try {
          if (option?.validateProperties !== true) {
            endPhase(perfKey, 'property');
            return;
          }

          if (
            node.key.type === AST_NODE_TYPES.Identifier &&
            suffixRegex.test(node.key.name) &&
            !node.computed
          ) {
            // Avoid touching properties within TS type literals (should be TSPropertySignature, but be safe)
            if (isInTypePosition(node)) {
              endPhase(perfKey, 'property');
              return;
            }
            if (
              node.shorthand &&
              node.value.type === AST_NODE_TYPES.Identifier &&
              isSignalExpression(
                node.value,
                context,
                hasSignalsImport,
                perfKey,
                creatorNames,
                signalImports,
                signalLocalNames,
                signalsNamespaceImports
              )
            ) {
              trackOperation(perfKey, PerformanceOperations.validSignalFound);

              endPhase(perfKey, 'property');

              return;
            }

            if (
              typeof option.ignorePattern !== 'undefined' &&
              option.ignorePattern !== '' &&
              // User provided pattern
              // eslint-disable-next-line security/detect-non-literal-regexp
              new RegExp(option.ignorePattern).test(node.key.name)
            ) {
              trackOperation(perfKey, PerformanceOperations.ignoredByPattern);

              endPhase(perfKey, 'property');

              return;
            }

            if (
              isSignalExpression(
                node.value,
                context,
                hasSignalsImport,
                perfKey,
                creatorNames,
                signalImports,
                signalLocalNames,
                signalsNamespaceImports
              )
            ) {
              trackOperation(perfKey, PerformanceOperations.validSignalFound);

              endPhase(perfKey, 'property');

              return;
            }

            const messageId = 'propertyWithSignalSuffixNotSignal';

            const newName = node.key.name.replace(suffixRegex, '');

            trackOperation(perfKey, PerformanceOperations.reportingIssue);

            if (getSeverity(messageId, option) !== 'off') {
              context.report({
                node: node.key,
                messageId,
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
          }
        } finally {
          endPhase(perfKey, 'property');
        }
      },

      [`${AST_NODE_TYPES.Program}:exit`]() {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
