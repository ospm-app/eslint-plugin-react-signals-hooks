import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

/**
 * Returns true if the given node appears within a React useEffect dependency array.
 *
 * Walks up the parent chain looking for an ArrayExpression whose parent is
 * a CallExpression to an identifier named "useEffect".
 */
export function isInDependencyArray(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (current?.parent) {
    current = current.parent;
    if (
      current.type === AST_NODE_TYPES.ArrayExpression &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      current.parent?.type === AST_NODE_TYPES.CallExpression &&
      current.parent.callee.type === AST_NODE_TYPES.Identifier &&
      current.parent.callee.name === 'useEffect'
    ) {
      return true;
    }
  }

  return false;
}
