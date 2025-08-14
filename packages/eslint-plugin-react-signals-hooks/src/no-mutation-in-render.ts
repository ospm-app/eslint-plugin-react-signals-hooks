// FIXED by @ospm/eslint-plugin-react-signals-hooks
/** biome-ignore-all assist/source/organizeImports: off */
import {
  ESLintUtils,
  AST_NODE_TYPES,
  type TSESTree,
  type TSESLint,
} from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

import {
  buildNamedImport,
  getPreferredQuote,
  getPreferredSemicolon,
} from './utils/import-format.js';
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
import { buildSuffixRegex, hasSignalSuffix } from './utils/suffix.js';
import type { PerformanceBudget } from './utils/types.js';
import { getRuleDocUrl } from './utils/urls.js';

type MessageIds =
  | 'signalValueAssignment'
  | 'signalValueUpdate'
  | 'signalPropertyAssignment'
  | 'suggestUseEffect'
  | 'suggestEventHandler'
  | 'signalArrayIndexAssignment'
  | 'signalNestedPropertyAssignment';

type Severity = {
  [key in MessageIds]?: 'error' | 'warn' | 'off';
};

type Option = {
  /** Custom signal function names (e.g., ['createSignal', 'useSignal']) */
  signalNames?: Array<string>;
  /** Patterns where mutations are allowed (e.g., ['^test/', '.spec.ts$']) */
  allowedPatterns?: Array<string>;
  /** Custom severity levels for different violation types */
  severity?: Severity;
  /** Enable unsafe autofixes in suggestions (off by default) */
  unsafeAutofix?: boolean;
  /** Variable name suffix used to detect signal variables (default: "Signal") */
  suffix?: string;
  /** Performance tuning option */
  performance?: PerformanceBudget;
};

type Options = [Option?];

function getAssignmentType(
  node: TSESTree.AssignmentExpression
): 'computedMemberAssignment' | 'memberAssignment' | 'identifierAssignment' | 'otherAssignment' {
  if (node.left.type === AST_NODE_TYPES.MemberExpression) {
    if (node.left.computed) {
      return 'computedMemberAssignment';
    }

    return 'memberAssignment';
  }

  if (node.left.type === AST_NODE_TYPES.Identifier) {
    return 'identifierAssignment';
  }

  return 'otherAssignment';
}

function trackIdentifier(
  name: string,
  perfKey: string,
  resolvedIdentifiers: Map<string, number>
): void {
  const count = resolvedIdentifiers.get(name) ?? 0;

  resolvedIdentifiers.set(name, count + 1);

  if (count === 0) {
    trackOperation(perfKey, PerformanceOperations.identifierResolution);
  }
}

function getSeverity(messageId: MessageIds, option?: Option): 'error' | 'warn' | 'off' {
  if (!option?.severity) {
    return 'error';
  }

  switch (messageId) {
    case 'signalValueAssignment': {
      return option.severity.signalValueAssignment ?? 'error';
    }

    case 'signalValueUpdate': {
      return option.severity.signalValueUpdate ?? 'error';
    }

    case 'signalPropertyAssignment': {
      return option.severity.signalPropertyAssignment ?? 'error';
    }

    case 'suggestUseEffect': {
      return option.severity.suggestUseEffect ?? 'error';
    }

    case 'suggestEventHandler': {
      return option.severity.suggestEventHandler ?? 'error';
    }

    case 'signalArrayIndexAssignment': {
      return option.severity.signalArrayIndexAssignment ?? 'error';
    }

    case 'signalNestedPropertyAssignment': {
      return option.severity.signalNestedPropertyAssignment ?? 'error';
    }

    default: {
      return 'error';
    }
  }
}

// Resolve the base identifier name for patterns like:
//   foo.value = ...
//   foo.value.bar = ...
//   foo.value[expr] = ...
// Returns the identifier name (e.g., "foo") if resolvable, else null
function resolveBaseIdentifierFromValueChain(
  node: TSESTree.ChainElement | TSESTree.Expression
): string | null {
  // Unwrap ChainExpression if present (optional chaining not valid on LHS, but be safe)
  if (node.type === AST_NODE_TYPES.ChainExpression) {
    const inner = node.expression;

    return resolveBaseIdentifierFromValueChain(inner);
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    // We want base.value[...]/base.value or base.value.prop
    if (
      node.object.type === AST_NODE_TYPES.MemberExpression &&
      !node.object.computed &&
      node.object.property.type === AST_NODE_TYPES.Identifier &&
      node.object.property.name === 'value' &&
      node.object.object.type === AST_NODE_TYPES.Identifier
    ) {
      return node.object.object.name;
    }

    // Also support the direct base.value (no further nesting)
    if (
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'value' &&
      node.object.type === AST_NODE_TYPES.Identifier
    ) {
      return node.object.name;
    }
  }

  return null;
}

function looksLikeSignal(
  baseName: string | null,
  suffixRegex: RegExp | null,
  option?: Option
): boolean {
  if (baseName === null) {
    return false;
  }

  // Suffix-based heuristic
  if (suffixRegex !== null && hasSignalSuffix(baseName, suffixRegex)) {
    return true;
  }

  // Explicit configured names (creator/import-based detection to be added separately)
  const names = option?.signalNames ?? [];
  // Only exact matches against configured names
  return names.includes(baseName);
}

const resolvedIdentifiers = new Map<string, number>();
// Track variables created via signal/computed/effect creators in this file
const knownCreatorSignals = new Set<string>();

// Track imported creator identifiers and namespaces from known modules
const creatorIdentifiers = new Set<string>();
const creatorNamespaces = new Set<string>();
const KNOWN_SIGNAL_MODULES = new Set<string>(['@preact/signals-react', '@preact/signals-core']);

let inRenderContext = false;
let renderDepth = 0;
let hookDepth = 0;
let functionDepth = 0;
// Track when traversing the JSX subtree of a component's return statement
let inReturnJSX = false;
let returnJSXDepth = 0;

// Dedupe multiple reports for the same node/message
const reported = new Set<string>();

function makeReportKey(node: TSESTree.Node, messageId: MessageIds): string {
  // node.range is always present in @typescript-eslint parser
  // Fallback to loc if needed
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const start = node.range[0] ?? node.loc.start.column ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const end = node.range[1] ?? node.loc.end.column ?? 0;

  return `${messageId}@${start}-${end}`;
}
function reportOnce(
  descriptor: TSESLint.ReportDescriptor<MessageIds> & { node: TSESTree.Node },
  context: Readonly<RuleContext<MessageIds, Options>>
): void {
  const key = makeReportKey(descriptor.node, descriptor.messageId);

  if (reported.has(key)) {
    return;
  }

  reported.add(key);

  context.report(descriptor);
}

const ruleName = 'no-mutation-in-render';

function isNamedCallee(
  callee: TSESTree.LeftHandSideExpression | TSESTree.Expression,
  names: ReadonlySet<string>
): boolean {
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return names.has(callee.name);
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return names.has(callee.property.name);
  }
  return false;
}

const MEMO_WRAPPERS = new Set<string>(['memo', 'forwardRef']);

function isMemoOrForwardRefCallee(
  c: TSESTree.LeftHandSideExpression | TSESTree.Expression
): boolean {
  return isNamedCallee(c, MEMO_WRAPPERS);
}

export const noMutationInRenderRule = ESLintUtils.RuleCreator((name: string): string => {
  return getRuleDocUrl(name);
})<Options, MessageIds>({
  name: ruleName,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct signal mutation during render',
      url: getRuleDocUrl(ruleName),
    },
    hasSuggestions: true,
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          signalNames: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
            description: 'Custom signal function names',
          },
          allowedPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
            description: 'Patterns where mutations are allowed',
          },
          severity: {
            type: 'object',
            properties: {
              signalValueAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalPropertyAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalArrayIndexAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              signalNestedPropertyAssignment: {
                type: 'string',
                enum: ['error', 'warn', 'off'],
                default: 'error',
              },
              unsafeAutofix: { type: 'boolean' },
              suffix: { type: 'string' },
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
      signalValueAssignment:
        'Avoid mutating signal.value directly in render. Move this to an effect or event handler.',
      signalValueUpdate:
        'Avoid updating signal.value with operators (++, --, +=, etc.) in render. Move this to an effect or event handler.',
      signalPropertyAssignment:
        'Avoid mutating signal properties directly in render. Move this to an effect or event handler.',
      signalArrayIndexAssignment:
        'Avoid mutating array indexes of signal values in render. Move this to an effect or event handler.',
      signalNestedPropertyAssignment:
        'Avoid mutating nested properties of signal values in render. Move this to an effect or event handler.',
      suggestUseEffect: 'Wrap in useEffect',
      suggestEventHandler: 'Move to event handler',
    },
  },
  defaultOptions: [
    {
      signalNames: ['signal', 'useSignal', 'createSignal'],
      allowedPatterns: [],
      severity: {
        suggestUseEffect: 'error',
        signalValueUpdate: 'error',
        suggestEventHandler: 'error',
        signalValueAssignment: 'error',
        signalPropertyAssignment: 'error',
        signalArrayIndexAssignment: 'error',
        signalNestedPropertyAssignment: 'error',
      },
      unsafeAutofix: false,
      suffix: 'Signal',
      performance: DEFAULT_PERFORMANCE_BUDGET,
    },
  ],
  create(context: Readonly<RuleContext<MessageIds, Options>>, [option]): ESLintUtils.RuleListener {
    const perfKey = `${ruleName}:${context.filename}:${Date.now()}`;

    startPhase(perfKey, 'ruleInit');

    const perf = createPerformanceTracker(perfKey, option?.performance);

    // Build suffix regex for variable-name based signal detection
    const suffixRegex = buildSuffixRegex(option?.suffix);

    // Helper: detect if file already imports useEffect from 'react'
    function hasUseEffectImport(): boolean {
      for (const stmt of context.sourceCode.ast.body) {
        if (
          stmt.type === AST_NODE_TYPES.ImportDeclaration &&
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          stmt.source.type === AST_NODE_TYPES.Literal &&
          String(stmt.source.value) === 'react'
        ) {
          // default import or namespace import don't matter; we need a named useEffect
          for (const spec of stmt.specifiers) {
            if (
              spec.type === AST_NODE_TYPES.ImportSpecifier &&
              spec.imported.type === AST_NODE_TYPES.Identifier &&
              spec.imported.name === 'useEffect'
            ) {
              return true;
            }
          }
        }
      }

      return false;
    }

    // Helper: fixes to ensure `import { useEffect } from 'react'` exists
    function ensureUseEffectImportFixes(fixer: TSESLint.RuleFixer): Array<TSESLint.RuleFix> {
      const fixes: Array<TSESLint.RuleFix> = [];

      if (hasUseEffectImport()) {
        return fixes;
      }

      const importText =
        '\n' +
        buildNamedImport(
          'react',
          ['useEffect'],
          getPreferredQuote(context.sourceCode),
          getPreferredSemicolon(context.sourceCode)
        ) +
        '\n';

      const lastImport = context.sourceCode.ast.body.find(
        (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
          return n.type === AST_NODE_TYPES.ImportDeclaration;
        }
      );

      if (lastImport) {
        fixes.push(fixer.insertTextAfter(lastImport, importText));
      } else {
        fixes.push(fixer.insertTextBeforeRange([0, 0], importText));
      }

      return fixes;
    }

    // Early bail if file matches any of the allowed patterns
    if (Array.isArray(option?.allowedPatterns) && option.allowedPatterns.length > 0) {
      try {
        const allowed = option.allowedPatterns.some((p: string): boolean => {
          try {
            // eslint-disable-next-line security/detect-non-literal-regexp
            const re = new RegExp(p);

            return re.test(context.filename);
          } catch {
            return false;
          }
        });

        if (allowed) {
          return {};
        }
      } catch {
        // ignore pattern errors and continue
      }
    }

    if (!/\.(tsx|jsx)$/i.test(context.filename)) {
      return {};
    }

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

      if (nodeCount > (option?.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, PerformanceOperations.nodeBudgetExceeded);

        return false;
      }

      return true;
    }

    startPhase(perfKey, 'fileAnalysis');

    if (
      option?.allowedPatterns?.some((pattern: string): boolean => {
        try {
          // eslint-disable-next-line security/detect-non-literal-regexp
          return new RegExp(pattern).test(context.filename);
        } catch (error: unknown) {
          if (
            option.performance?.enableMetrics === true &&
            option.performance.logMetrics === true
          ) {
            console.error(`Invalid regex pattern: ${pattern}`, error);
          }

          // Invalid regex pattern, ignore it
          return false;
        }
      }) ??
      false
    ) {
      trackOperation(perfKey, PerformanceOperations.fileAnalysis);

      endPhase(perfKey, 'fileAnalysis');

      return {};
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

      // Capture creator-based signals: const x = signal(...)
      [AST_NODE_TYPES.VariableDeclarator](node: TSESTree.VariableDeclarator): void {
        if (
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
          !node.id ||
          node.id.type !== AST_NODE_TYPES.Identifier ||
          !node.init ||
          node.init.type !== AST_NODE_TYPES.CallExpression
        ) {
          return;
        }

        let creatorName: string | null = null;

        if (node.init.callee.type === AST_NODE_TYPES.Identifier) {
          creatorName = node.init.callee.name;
          if (
            creatorIdentifiers.has(creatorName) ||
            ['signal', 'computed', 'effect'].includes(creatorName)
          ) {
            knownCreatorSignals.add(node.id.name);
          }
        } else if (
          node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
          !node.init.callee.computed &&
          node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.init.callee.object.type === AST_NODE_TYPES.Identifier
        ) {
          creatorName = node.init.callee.property.name;
          if (
            creatorNamespaces.has(node.init.callee.object.name) &&
            ['signal', 'computed', 'effect'].includes(creatorName)
          ) {
            knownCreatorSignals.add(node.id.name);
          }
        }
      },

      // Track imports from known signal modules
      [AST_NODE_TYPES.ImportDeclaration](node: TSESTree.ImportDeclaration): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.source.type !== AST_NODE_TYPES.Literal) {
          return;
        }

        const source = String(node.source.value);

        if (!KNOWN_SIGNAL_MODULES.has(source)) {
          return;
        }

        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            const importedName =
              spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : null;

            const localName = spec.local.name;
            if (importedName !== null && ['signal', 'computed', 'effect'].includes(importedName)) {
              creatorIdentifiers.add(localName);
            }
          } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
            creatorNamespaces.add(spec.local.name);
          }
        }
      },

      [AST_NODE_TYPES.FunctionDeclaration](node: TSESTree.FunctionDeclaration): void {
        trackOperation(perfKey, PerformanceOperations.FunctionDeclarationProcessing);

        if (!(node.id !== null && /^[A-Z]/.test(node.id.name))) {
          return;
        }

        trackOperation(perfKey, PerformanceOperations.reactComponentFunctionDeclarationProcessing);

        renderDepth++;

        trackIdentifier(node.id.name, perfKey, resolvedIdentifiers);

        startPhase(perfKey, `render:${node.id.name}`);
      },

      [AST_NODE_TYPES.ArrowFunctionExpression](node: TSESTree.ArrowFunctionExpression): void {
        trackOperation(perfKey, PerformanceOperations.ArrowFunctionExpressionProcessing);

        // Treat wrappers like memo/forwardRef as render roots when they wrap a function
        if (
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          isMemoOrForwardRefCallee(node.parent.callee)
        ) {
          renderDepth++;
          startPhase(perfKey, 'render:memo/forwardRef');
          return;
        }

        if (
          node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
          node.parent.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          trackOperation(
            perfKey,
            PerformanceOperations.reactComponentArrowFunctionExpressionProcessing
          );

          renderDepth++;

          trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

          startPhase(perfKey, `render:${node.parent.id.name}`);

          return;
        }

        functionDepth++;

        if (functionDepth === 1 && renderDepth >= 1) {
          inRenderContext = false;
        }
      },

      [AST_NODE_TYPES.FunctionExpression](node: TSESTree.FunctionExpression): void {
        trackOperation(perfKey, PerformanceOperations.FunctionExpressionProcessing);

        // Treat wrappers like memo/forwardRef as render roots when they wrap a function
        if (
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          isMemoOrForwardRefCallee(node.parent.callee)
        ) {
          renderDepth++;
          startPhase(perfKey, 'render:memo/forwardRef');
          return;
        }

        functionDepth++;

        if (
          node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
          node.parent.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          trackOperation(perfKey, PerformanceOperations.reactComponentFunctionExpressionProcessing);

          renderDepth++;

          trackIdentifier(node.parent.id.name, perfKey, resolvedIdentifiers);

          startPhase(perfKey, `render:${node.parent.id.name}`);
        } else if (functionDepth === 1 && renderDepth >= 1) {
          inRenderContext = false;
        }
      },

      [AST_NODE_TYPES.ReturnStatement](node: TSESTree.ReturnStatement): void {
        if (
          renderDepth >= 1 &&
          hookDepth === 0 &&
          functionDepth === 0 &&
          node.argument &&
          (node.argument.type === AST_NODE_TYPES.JSXElement ||
            node.argument.type === AST_NODE_TYPES.JSXFragment)
        ) {
          inRenderContext = true;
          inReturnJSX = true;
          returnJSXDepth = 0; // depth will be incremented by JSXElement/Fragment enter
        }
      },

      [AST_NODE_TYPES.JSXElement](): void {
        if (inReturnJSX) {
          returnJSXDepth++;
        }
      },

      [AST_NODE_TYPES.JSXFragment](): void {
        if (inReturnJSX) {
          returnJSXDepth++;
        }
      },

      [`${AST_NODE_TYPES.JSXElement}:exit`](): void {
        if (inReturnJSX) {
          returnJSXDepth--;
          if (returnJSXDepth <= 0) {
            inReturnJSX = false;
            inRenderContext = false;
          }
        }
      },

      [`${AST_NODE_TYPES.JSXFragment}:exit`](): void {
        if (inReturnJSX) {
          returnJSXDepth--;
          if (returnJSXDepth <= 0) {
            inReturnJSX = false;
            inRenderContext = false;
          }
        }
      },

      [AST_NODE_TYPES.CallExpression](node: TSESTree.CallExpression): void {
        // Entering a hook/effect/computed call means we're not in top-level render
        if (
          renderDepth >= 1 &&
          node.callee.type === AST_NODE_TYPES.Identifier &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect',
            'computed',
          ].includes(node.callee.name)
        ) {
          hookDepth++;
          inRenderContext = false;
        }

        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          !node.callee.computed &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
          !node.callee.object.computed &&
          node.callee.object.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.object.property.name === 'value' &&
          node.callee.object.object.type === AST_NODE_TYPES.Identifier
        ) {
          const mutatingArrayMethods = new Set([
            'push',
            'pop',
            'splice',
            'sort',
            'reverse',
            'copyWithin',
            'fill',
            'shift',
            'unshift',
          ]);
          const mutatingMapSetMethods = new Set(['set', 'add', 'delete', 'clear']);

          if (
            mutatingArrayMethods.has(node.callee.property.name) ||
            mutatingMapSetMethods.has(node.callee.property.name)
          ) {
            // Best-effort signal identification via suffix or explicit allowlist of names
            const looksLikeSignal =
              hasSignalSuffix(node.callee.object.object.name, suffixRegex) ||
              (option?.signalNames ?? []).some((n: string): boolean => {
                return (
                  'object' in node.callee &&
                  'object' in node.callee.object &&
                  'name' in node.callee.object.object &&
                  n === node.callee.object.object.name
                );
              });

            if (!looksLikeSignal) {
              return;
            }

            if (getSeverity('signalPropertyAssignment', option) === 'off') {
              return;
            }

            reportOnce(
              {
                node,
                messageId: 'signalPropertyAssignment',
                suggest:
                  option?.unsafeAutofix === true
                    ? [
                        {
                          messageId: 'suggestUseEffect',
                          fix(
                            fixer: TSESLint.RuleFixer
                          ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                            if (
                              'object' in node.callee &&
                              'object' in node.callee.object &&
                              'object' in node.callee.object.object &&
                              'name' in node.callee.object.object
                            ) {
                              return [
                                ...ensureUseEffectImportFixes(fixer),
                                fixer.replaceText(
                                  node,
                                  `useEffect(() => { ${context.sourceCode.getText(node)} }, [${node.callee.object.object.name}]);`
                                ),
                              ];
                            }

                            return null;
                          },
                        },
                        {
                          messageId: 'suggestEventHandler',
                          fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                            return fixer.replaceText(
                              node,
                              `const handleEvent = () => { ${context.sourceCode.getText(node)} }`
                            );
                          },
                        },
                      ]
                    : [],
              },
              context
            );
          }
        }
      },

      [AST_NODE_TYPES.AssignmentExpression](node: TSESTree.AssignmentExpression): void {
        trackOperation(perfKey, PerformanceOperations.AssignmentExpressionProcessing);

        // Skip if not in a render context or inside hooks/functions
        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        startPhase(perfKey, PerformanceOperations.assignmentAnalysis);

        trackOperation(
          perfKey,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          PerformanceOperations[`assignmentType:${getAssignmentType(node)}`] ??
            PerformanceOperations.assignmentAnalysis
        );

        // Resolve base name for any .value-based assignment
        const baseName = resolveBaseIdentifierFromValueChain(node.left);

        if (
          (baseName != null && knownCreatorSignals.has(baseName)) ||
          looksLikeSignal(baseName, suffixRegex, option)
        ) {
          if (
            node.left.type === AST_NODE_TYPES.MemberExpression &&
            !node.left.computed &&
            node.left.property.type === AST_NODE_TYPES.Identifier &&
            node.left.property.name === 'value'
          ) {
            const msg: MessageIds =
              node.operator === '=' ? 'signalValueAssignment' : 'signalValueUpdate';

            if (getSeverity(msg, option) !== 'off') {
              reportOnce(
                {
                  node,
                  messageId: msg,
                  suggest:
                    option?.unsafeAutofix === true
                      ? [
                          {
                            messageId: 'suggestUseEffect',
                            fix(
                              fixer: TSESLint.RuleFixer
                            ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                              return [
                                ...ensureUseEffectImportFixes(fixer),
                                fixer.replaceText(
                                  node,
                                  `useEffect(() => { ${context.sourceCode.getText(node)} }, []);`
                                ),
                              ];
                            },
                          },
                          {
                            messageId: 'suggestEventHandler',
                            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                              return fixer.replaceText(
                                node,
                                `const handleEvent = () => { ${context.sourceCode.getText(node)} }`
                              );
                            },
                          },
                        ]
                      : [],
                },
                context
              );
            }

            return;
          }

          if (
            node.left.type === AST_NODE_TYPES.MemberExpression &&
            node.left.computed &&
            node.left.object.type === AST_NODE_TYPES.MemberExpression &&
            !node.left.object.computed &&
            node.left.object.property.type === AST_NODE_TYPES.Identifier &&
            node.left.object.property.name === 'value'
          ) {
            if (getSeverity('signalArrayIndexAssignment', option) !== 'off') {
              reportOnce(
                {
                  node,
                  messageId: 'signalArrayIndexAssignment',
                  suggest:
                    option?.unsafeAutofix === true
                      ? [
                          {
                            messageId: 'suggestUseEffect',
                            fix(
                              fixer: TSESLint.RuleFixer
                            ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                              return [
                                ...ensureUseEffectImportFixes(fixer),
                                fixer.replaceText(
                                  node,
                                  `useEffect(() => { ${context.sourceCode.getText(node)} }, [${baseName ?? ''}]);`
                                ),
                              ];
                            },
                          },
                        ]
                      : [],
                },
                context
              );
            }

            return;
          }

          if (
            node.left.type === AST_NODE_TYPES.MemberExpression &&
            !node.left.computed &&
            node.left.object.type === AST_NODE_TYPES.MemberExpression &&
            !node.left.object.computed &&
            node.left.object.property.type === AST_NODE_TYPES.Identifier &&
            node.left.object.property.name === 'value' &&
            getSeverity('signalNestedPropertyAssignment', option) !== 'off'
          ) {
            reportOnce(
              {
                node,
                messageId: 'signalNestedPropertyAssignment',
                suggest:
                  option?.unsafeAutofix === true
                    ? [
                        {
                          messageId: 'suggestUseEffect',
                          fix(
                            fixer: TSESLint.RuleFixer
                          ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                            return [
                              ...ensureUseEffectImportFixes(fixer),
                              fixer.replaceText(
                                node,
                                `useEffect(() => { ${context.sourceCode.getText(node)} }, []);`
                              ),
                            ];
                          },
                        },
                      ]
                    : [],
              },
              context
            );
          }
        }

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.computed &&
          node.left.object.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.property.type === AST_NODE_TYPES.Identifier &&
          node.left.object.property.name === 'value' &&
          node.left.object.object.type === AST_NODE_TYPES.Identifier &&
          option?.signalNames?.some((name: string): boolean => {
            return (
              'object' in node.left &&
              'object' in node.left.object &&
              'name' in node.left.object.object &&
              node.left.object.object.name === name
            );
          }) === true
        ) {
          if (getSeverity('signalArrayIndexAssignment', option) !== 'off') {
            reportOnce(
              {
                node,
                messageId: 'signalArrayIndexAssignment',
                suggest: [
                  {
                    messageId: 'suggestUseEffect',
                    fix(
                      fixer: TSESLint.RuleFixer
                    ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                      return [
                        ...ensureUseEffectImportFixes(fixer),
                        fixer.replaceText(
                          node,
                          `useEffect(() => { ${context.sourceCode.getText(node)} }, [${
                            'object' in node.left &&
                            'object' in node.left.object &&
                            'name' in node.left.object.object &&
                            node.left.object.object.name
                          }])`
                        ),
                      ];
                    },
                  },
                ],
              },
              context
            );
          }

          return;
        }

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          !node.left.computed &&
          node.left.object.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.property.type === AST_NODE_TYPES.Identifier &&
          node.left.object.property.name === 'value' &&
          node.left.object.object.type === AST_NODE_TYPES.Identifier &&
          option?.signalNames?.some((name: string): boolean => {
            return (
              ('object' in node.left &&
                'object' in node.left.object &&
                'name' in node.left.object.object &&
                node.left.object.object.name === name) ||
              ('object' in node.left &&
                'object' in node.left.object &&
                'name' in node.left.object.object &&
                node.left.object.object.name === name)
            );
          }) === true &&
          getSeverity('signalNestedPropertyAssignment', option) !== 'off'
        ) {
          reportOnce(
            {
              node,
              messageId: 'signalNestedPropertyAssignment',
              suggest: [
                {
                  messageId: 'suggestUseEffect',
                  fix(
                    fixer: TSESLint.RuleFixer
                  ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                    return [
                      ...ensureUseEffectImportFixes(fixer),
                      fixer.replaceText(
                        node,
                        `useEffect(() => { ${context.sourceCode.getText(node)} }, []);`
                      ),
                    ];
                  },
                },
              ],
            },
            context
          );
        }
      },

      [AST_NODE_TYPES.UpdateExpression](node: TSESTree.UpdateExpression): void {
        if (!inRenderContext || renderDepth < 1 || hookDepth > 0 || functionDepth > 0) {
          return;
        }

        // Check for signal.value++ or ++signal.value
        if (
          node.argument.type === AST_NODE_TYPES.MemberExpression &&
          node.argument.property.type === AST_NODE_TYPES.Identifier &&
          node.argument.property.name === 'value'
        ) {
          const baseName = resolveBaseIdentifierFromValueChain(node.argument);

          if (
            !(
              (baseName != null && knownCreatorSignals.has(baseName)) ||
              looksLikeSignal(baseName, suffixRegex, option)
            )
          ) {
            return;
          }

          if (getSeverity('signalValueUpdate', option) === 'off') {
            return;
          }

          reportOnce(
            {
              node,
              messageId: 'signalValueUpdate',
              suggest:
                option?.unsafeAutofix === true
                  ? [
                      {
                        messageId: 'suggestUseEffect',
                        fix(
                          fixer: TSESLint.RuleFixer
                        ): TSESLint.RuleFix | Array<TSESLint.RuleFix> | null {
                          return [
                            ...ensureUseEffectImportFixes(fixer),
                            fixer.replaceText(
                              node,
                              `useEffect(() => { ${context.sourceCode.getText(node)} }, [${baseName ?? ''}]);`
                            ),
                          ];
                        },
                      },
                      {
                        messageId: 'suggestEventHandler',
                        fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
                          return fixer.replaceText(
                            node,
                            `const handleEvent = () => { ${context.sourceCode.getText(node)} }`
                          );
                        },
                      },
                    ]
                  : [],
            },
            context
          );
        }
      },

      'FunctionDeclaration > :not(FunctionDeclaration)'(node: TSESTree.FunctionDeclaration): void {
        if (
          node.id != null &&
          typeof node.id.name === 'string' &&
          node.id.name !== '' &&
          /^[A-Z]/.test(node.id.name)
        ) {
          renderDepth--;

          if (renderDepth === 0) {
            inRenderContext = false;
          }
        }
      },

      'ArrowFunctionExpression > :not(ArrowFunctionExpression)'(
        node: TSESTree.ArrowFunctionExpression
      ): void {
        // Check if this is the main component arrow function
        if (
          node.parent.type === AST_NODE_TYPES.VariableDeclarator &&
          node.parent.id.type === AST_NODE_TYPES.Identifier &&
          /^[A-Z]/.test(node.parent.id.name)
        ) {
          // This is a main component - exit render context
          renderDepth--;

          if (renderDepth === 0) {
            inRenderContext = false;
          }
        } else {
          // This is a nested arrow function
          functionDepth--;
        }
      },

      // Explicit exit for memo/forwardRef-wrapped arrow functions
      [`${AST_NODE_TYPES.ArrowFunctionExpression}:exit`](
        node: TSESTree.ArrowFunctionExpression
      ): void {
        if (
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          node.parent &&
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          isMemoOrForwardRefCallee(node.parent.callee)
        ) {
          renderDepth--;
          if (renderDepth === 0) {
            inRenderContext = false;
          }
        }
      },

      // Explicit exit for memo/forwardRef-wrapped function expressions
      [`${AST_NODE_TYPES.FunctionExpression}:exit`](node: TSESTree.FunctionExpression): void {
        if (
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
          node.parent &&
          node.parent.type === AST_NODE_TYPES.CallExpression &&
          isMemoOrForwardRefCallee(node.parent.callee)
        ) {
          renderDepth--;
          if (renderDepth === 0) {
            inRenderContext = false;
          }
        }
      },

      'FunctionExpression > :not(FunctionExpression)'(_node: TSESTree.FunctionExpression): void {
        functionDepth--;
        // Do not toggle inRenderContext here; it is controlled by returned JSX traversal
      },

      'CallExpression:exit'(node: TSESTree.CallExpression): void {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          [
            'useEffect',
            'useLayoutEffect',
            'useCallback',
            'useMemo',
            'useImperativeHandle',
            'effect', // @preact/signals-core effect
            'computed', // @preact/signals-core computed
          ].includes(node.callee.name)
        ) {
          hookDepth--;
          // Do not toggle inRenderContext here; it is controlled by returned JSX traversal
        }
      },
      [`${AST_NODE_TYPES.Program}:exit`](): void {
        startPhase(perfKey, 'programExit');

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      },
    };
  },
});
