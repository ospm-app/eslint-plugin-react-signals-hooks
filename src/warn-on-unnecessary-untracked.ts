import type { Rule, SourceCode } from 'eslint';
import type { ArrowFunctionExpression, CallExpression, Expression, BlockStatement } from 'estree';

function getNodeText(node: CallExpression | Expression | BlockStatement, sourceCode: SourceCode) {
  try {
    return sourceCode.getText(node);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return `[${node.type}]`;
  }
}

function debug(...args: unknown[]): void {
  console.info('[warn-on-unnecessary-untracked]', ...args);
}

function isUnnecessaryUntrackedCall(node: CallExpression): boolean {
  if (node.type !== 'CallExpression') return false;

  // Check if it's a call to untracked()
  if (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'untracked' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ArrowFunctionExpression' &&
    node.arguments[0].params.length === 0
  ) {
    const body = node.arguments[0].body;

    // Check for direct .value access
    if (
      body.type === 'MemberExpression' &&
      body.property.type === 'Identifier' &&
      body.property.name === 'value' &&
      body.object.type === 'MemberExpression' &&
      body.object.property.type === 'Identifier' &&
      body.object.property.name === 'value'
    ) {
      return true;
    }
  }

  return false;
}

function isInComponentOrHook(node: CallExpression): boolean {
  let currentNode: CallExpression | null = node;

  while (currentNode) {
    if (
      ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(
        currentNode.type
      )
    ) {
      let functionName = 'anonymous';

      // @ts-expect-error
      if (currentNode.type === 'FunctionDeclaration' && currentNode.id) {
        // @ts-expect-error
        functionName = currentNode.id.name;
      } else if (
        // @ts-expect-error
        currentNode.parent &&
        // @ts-expect-error
        currentNode.parent.type === 'VariableDeclarator' &&
        // @ts-expect-error
        currentNode.parent.id.type === 'Identifier'
      ) {
        // @ts-expect-error
        functionName = currentNode.parent.id.name;
      }

      if (/^[A-Z]/.test(functionName) || /^use[A-Z]/.test(functionName)) {
        debug('Found component/hook:', functionName);
        return true;
      }
    }

    // Move up the AST
    // @ts-expect-error
    currentNode = 'parent' in currentNode ? currentNode.parent : null;
  }

  return false;
}

export const warnOnUnnecessaryUntrackedRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when untracked() is used unnecessarily',
      recommended: true,
    },
    messages: {
      unnecessaryUntracked: 'Unnecessary use of untracked() - signal.value is already untracked',
    },
    schema: [],
  },
  create(context: Rule.RuleContext): { CallExpression(node: CallExpression): void } {
    debug('Initializing rule');

    // Get the source code for better error messages
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      CallExpression(node: CallExpression): void {
        if (isUnnecessaryUntrackedCall(node) && isInComponentOrHook(node)) {
          debug('Found unnecessary untracked() call', {
            code: getNodeText(node, sourceCode),
            loc: node.loc,
          });

          context.report({
            node,
            messageId: 'unnecessaryUntracked',
            fix(fixer) {
              const innerNode = (node.arguments[0] as ArrowFunctionExpression).body;
              const innerText = getNodeText(innerNode, sourceCode);
              return fixer.replaceText(node, innerText);
            },
          });
        }
      },
    };
  },
} satisfies Rule.RuleModule;

export default warnOnUnnecessaryUntrackedRule;
