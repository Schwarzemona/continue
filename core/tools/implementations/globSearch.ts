import { ToolImpl } from ".";
import { ContextItem } from "../..";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { resolveInputPath } from "../../util/pathResolver";
import { getStringArg } from "../parseArgs";

const MAX_AGENT_GLOB_RESULTS = 100;

export const fileGlobSearchImpl: ToolImpl = async (args, extras) => {
  const pattern = getStringArg(args, "pattern");

  let dirUri: string | undefined;
  const dirPath = args?.dirPath as string | undefined;
  if (dirPath) {
    const resolved = await resolveInputPath(extras.ide, dirPath);
    if (!resolved) {
      throw new ContinueError(
        ContinueErrorReason.DirectoryNotFound,
        `ディレクトリ「${dirPath}」を解決できませんでした`,
      );
    }
    dirUri = resolved.uri;
  }

  const results = await extras.ide.getFileResults(
    pattern,
    MAX_AGENT_GLOB_RESULTS,
    dirUri,
  );

  if (results.length === 0) {
    return [
      {
        name: "ファイル検索結果",
        description: "glob検索",
        content: "ファイルが見つかりませんでした",
      },
    ];
  }
  const contextItems: ContextItem[] = [
    {
      name: "ファイル検索結果",
      description: "glob検索",
      content: results.join("\n"),
    },
  ];

  // In case of truncation, add a warning
  if (results.length === MAX_AGENT_GLOB_RESULTS) {
    contextItems.push({
      name: "切り詰め警告",
      description: "",
      content: `警告: 上記の結果は${MAX_AGENT_GLOB_RESULTS}個のファイルに切り詰められました`,
    });
  }

  return contextItems;
};
