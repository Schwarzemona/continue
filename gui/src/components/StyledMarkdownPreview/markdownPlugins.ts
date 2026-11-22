import { visit } from "unist-util-visit";

/**
 * mdast の code ノードに、UI 側で必要とする data-* ハッシュプロパティを付与する。
 * - data-islastcodeblock: 最後のコードブロックかどうか
 * - data-codeblockcontent: コード本文（ツールバーで再利用）
 * - data-relativefilepath / range: コードブロックのフェンス info string から抽出
 *
 * 旧実装(react-remark ベース)では empty source で tree.children が空のとき
 * lastNode が undefined となり throw していた（onError で握りつぶされていた）。
 * React 19 互換のため react-markdown へ移行した結果エラーが表面化するので、
 * オプションチェーンでガードする。
 */
export function annotateCodeNodes() {
  return (tree: any) => {
    const lastNode = tree.children[tree.children.length - 1];
    const lastCodeNode = lastNode?.type === "code" ? lastNode : null;

    visit(tree, "code", (node: any) => {
      if (!node.lang) {
        node.lang = "";
      } else if (node.lang.includes(".")) {
        node.lang = node.lang.split(".").slice(-1)[0];
      }

      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};

      node.data.hProperties["data-islastcodeblock"] = lastCodeNode === node;
      node.data.hProperties["data-codeblockcontent"] = node.value;

      if (node.meta) {
        const meta = node.meta.split(" ");
        node.data.hProperties["data-relativefilepath"] = meta[0];
        node.data.hProperties.range = meta[1];
      }
    });
  };
}

/** rehype 段階で <pre> ごとに data-codeblockindex を付与する。 */
export function indexCodeBlocks() {
  let codeBlockIndex = 0;
  return (tree: any) => {
    visit(tree, { tagName: "pre" }, (node: any) => {
      node.properties = { "data-codeblockindex": codeBlockIndex };
      codeBlockIndex++;
    });
  };
}
