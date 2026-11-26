import { ToolImpl } from ".";
import { ContextItem } from "../..";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getStringArg } from "../parseArgs";
import { resolveFileUri } from "./resolveFileUri";

export const MAX_GREP_FILE_MATCHES = 200;

export const grepFileImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");
  const pattern = getStringArg(args, "pattern");

  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    return [
      {
        name: "検索エラー",
        description: "無効な正規表現パターン",
        content: `無効な正規表現パターンのため検索に失敗しました: ${pattern}`,
      },
    ];
  }

  const fileUri = await resolveFileUri(extras.ide, filepath);
  let content: string;
  try {
    content = await extras.ide.readFile(fileUri);
  } catch (error) {
    throw new ContinueError(
      ContinueErrorReason.FileNotFound,
      `「${filepath}」を読み取れませんでした: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const matchedLines: number[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      matchedLines.push(i + 1);
      if (matchedLines.length >= MAX_GREP_FILE_MATCHES) {
        break;
      }
    }
  }

  const contextItems: ContextItem[] = [];
  if (matchedLines.length === 0) {
    contextItems.push({
      name: "検索結果",
      description: `grep_file: ${filepath}`,
      content: "一致する項目が見つかりませんでした",
    });
    return contextItems;
  }

  contextItems.push({
    name: `検索結果`,
    description: `一致した行番号 (${matchedLines.length}件)`,
    content: matchedLines.join("\n"),
  });

  if (matchedLines.length === MAX_GREP_FILE_MATCHES) {
    contextItems.push({
      name: "切り詰め警告",
      description: "",
      content: `結果は${MAX_GREP_FILE_MATCHES}件の行番号で切り詰められました`,
    });
  }

  return contextItems;
};
