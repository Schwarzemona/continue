import ignore from "ignore";

import { ToolImpl } from ".";
import { walkDir } from "../../indexing/walkDir";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { resolveInputPath } from "../../util/pathResolver";

export function resolveLsToolDirPath(dirPath: string | undefined) {
  if (!dirPath || dirPath === ".") {
    return ".";
  }
  return dirPath.replace(/\\/g, "/");
}

const MAX_LS_TOOL_LINES = 200;

export const lsToolImpl: ToolImpl = async (args, extras) => {
  const dirPath = resolveLsToolDirPath(args?.dirPath);
  const resolvedPath = await resolveInputPath(extras.ide, dirPath);
  if (!resolvedPath) {
    throw new ContinueError(
      ContinueErrorReason.DirectoryNotFound,
      `ディレクトリ「${args.dirPath}」が見つからないか、アクセスできません。絶対パス、相対パス、または~で始まるパスを使用できます。`,
    );
  }

  const entries = await walkDir(resolvedPath.uri, extras.ide, {
    returnRelativeUrisPaths: true,
    include: "both",
    recursive: args?.recursive ?? false,
    overrideDefaultIgnores: ignore(), // Show all directories including dist/, build/, etc.
  });

  const lines = entries.slice(0, MAX_LS_TOOL_LINES);

  let content =
    lines.length > 0
      ? lines.join("\n")
      : `「${resolvedPath.displayPath}」にファイルやフォルダは見つかりませんでした`;

  const contextItems = [
    {
      name: "ファイル/フォルダリスト",
      description: `「${resolvedPath.displayPath}」内のファイル/フォルダ`,
      content,
    },
  ];

  if (entries.length > MAX_LS_TOOL_LINES) {
    let warningContent = `${entries.length - MAX_LS_TOOL_LINES}個のlsエントリが切り詰められました`;
    if (args?.recursive) {
      warningContent += "。非再帰的な検索を試してください";
    }
    contextItems.push({
      name: "切り詰め警告",
      description: "",
      content: warningContent,
    });
  }

  return contextItems;
};
