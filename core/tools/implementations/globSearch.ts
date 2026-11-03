import { ToolImpl } from ".";
import { ContextItem } from "../..";
import { getStringArg } from "../parseArgs";

const MAX_AGENT_GLOB_RESULTS = 100;

export const fileGlobSearchImpl: ToolImpl = async (args, extras) => {
  const pattern = getStringArg(args, "pattern");
  const results = await extras.ide.getFileResults(
    pattern,
    MAX_AGENT_GLOB_RESULTS,
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
