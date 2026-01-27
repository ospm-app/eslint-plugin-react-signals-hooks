import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

/**
 * Returns true if the given node is within a JSXElement or JSXFragment.
 */
export function isInJSXContext(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === AST_NODE_TYPES.JSXElement || parent.type === AST_NODE_TYPES.JSXFragment) {
      return true;
    }

    parent = parent.parent as TSESTree.Node | undefined;
  }

  return false;
}

/**
 * Returns true if the given node is within a JSXAttribute.
 */
export function isInJSXAttribute(node: TSESTree.Node): boolean {
  let parent: TSESTree.Node | undefined = node.parent;

  while (parent) {
    if (parent.type === AST_NODE_TYPES.JSXAttribute) {
      return true;
    }

    parent = parent.parent as TSESTree.Node | undefined;
  }

  return false;
}
