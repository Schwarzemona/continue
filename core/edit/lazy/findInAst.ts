// web-tree-sitter 0.27 renamed `SyntaxNode` to `Node`.
import { Node as SyntaxNode } from "web-tree-sitter";

export function findInAst(
  node: SyntaxNode,
  criterion: (node: SyntaxNode) => boolean,
  shouldRecurse: (node: SyntaxNode) => boolean = () => true,
): SyntaxNode | null {
  const stack = [node];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (criterion(node)) {
      return node;
    }

    if (shouldRecurse(node)) {
      stack.push(...node.children);
    }
  }
  return null;
}
