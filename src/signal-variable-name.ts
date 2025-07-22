import type { Rule } from 'eslint';
import type { SimpleCallExpression, VariableDeclarator } from 'estree';

/**
 * ESLint rule: signal-variable-name
 *
 * Enforces naming conventions for signal and computed variables.
 * Variables should end with 'Signal', start with lowercase, and not start with 'use'.
 */
export const signalVariableNameRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce naming conventions for signal and computed variables',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      invalidSignalName:
        "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
      invalidComputedName:
        "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
    },
  },
  create(context: Rule.RuleContext): {
    VariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension): void;
  } {
    function isSignalCall(node: SimpleCallExpression): boolean {
      return (
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'signal' || node.callee.name === 'computed')
      );
    }

    function isValidSignalName(name: string): boolean {
      if (!name.endsWith('Signal')) {
        return false;
      }

      if (!/^[a-z]/.test(name)) {
        return false;
      }

      // Only forbid 'use' prefix when followed by a capital letter (e.g., 'useSignal' is invalid, but 'userSignal' is valid)
      if (name.startsWith('use') && name.length > 2 && /^[A-Z]/.test(name[2])) {
        return false;
      }

      return true;
    }

    function getFixedName(originalName: string): string {
      let fixedName = originalName;

      if (fixedName.startsWith('use')) {
        fixedName = fixedName.slice(3);
      }

      if (fixedName.length > 0) {
        fixedName = fixedName.charAt(0).toLowerCase() + fixedName.slice(1);
      }

      if (!fixedName.endsWith('Signal')) {
        fixedName += 'Signal';
      }

      return fixedName;
    }

    function checkVariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension): void {
      if (
        node.id.type === 'Identifier' &&
        node.init &&
        node.init.type === 'CallExpression' &&
        isSignalCall(node.init)
      ) {
        const variableName = node.id.name;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const callName = node.init.callee.name;

        if (!isValidSignalName(variableName)) {
          const fixedName = getFixedName(variableName);

          context.report({
            node: node.id,
            message:
              callName === 'signal'
                ? "Signal variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'"
                : "Computed variable '{{name}}' should end with 'Signal', start with lowercase, and not start with 'use'",
            data: {
              name: variableName,
            },
            fix(fixer) {
              return fixer.replaceText(node.id, fixedName);
            },
          });
        }
      }
    }

    return {
      VariableDeclarator(node: VariableDeclarator & Rule.NodeParentExtension): void {
        checkVariableDeclarator(node);
      },
    };
  },
} satisfies Rule.RuleModule;

export default signalVariableNameRule;
