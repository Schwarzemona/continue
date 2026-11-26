import { ToolImpl } from ".";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getStringArg } from "../parseArgs";
import { resolveFileUri } from "./resolveFileUri";

export const countLinesImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");
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

  const lineCount = content === "" ? 0 : content.split("\n").length;

  return [
    {
      name: `ファイル行数`,
      description: "総行数",
      content: String(lineCount),
    },
  ];
};
