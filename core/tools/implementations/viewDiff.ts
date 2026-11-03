import { ToolImpl } from ".";
import { ContextItem } from "../..";
import { getDiffsFromCache } from "../../autocomplete/snippets/gitDiffCache";

export const DEFAULT_GIT_DIFF_LINE_LIMIT = 5000;

export const viewDiffImpl: ToolImpl = async (args, extras) => {
  const diffs = await getDiffsFromCache(extras.ide); // const diffs = await extras.ide.getDiff(true);
  // TODO includeUnstaged should be an option

  const combinedDiff = diffs.join("\n");

  if (!combinedDiff.trim()) {
    return [
      {
        name: "差分",
        description: "現在のGit差分",
        content: "現在の差分は空です",
      },
    ];
  }

  const diffLines = combinedDiff.split("\n");

  let truncated = false;
  let processedDiff = combinedDiff;

  if (diffLines.length > DEFAULT_GIT_DIFF_LINE_LIMIT) {
    truncated = true;
    processedDiff = diffLines.slice(0, DEFAULT_GIT_DIFF_LINE_LIMIT).join("\n");
  }

  const contextItems: ContextItem[] = [
    {
      name: "差分",
      description: "現在のGit差分",
      content: processedDiff,
    },
  ];

  if (truncated) {
    contextItems.push({
      name: "切り詰め警告",
      description: "",
      content: `${DEFAULT_GIT_DIFF_LINE_LIMIT}行を超えたため切り詰められました`,
    });
  }

  return contextItems;
};
