import { ToolImpl } from ".";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getCleanUriPath } from "../../util/uri";
import { getStringArg } from "../parseArgs";
import { resolveFileUri } from "./resolveFileUri";

export const removeFileImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");
  const fileUri = await resolveFileUri(extras.ide, filepath);

  if (!(await extras.ide.fileExists(fileUri))) {
    throw new ContinueError(
      ContinueErrorReason.FileNotFound,
      `「${filepath}」が見つかりませんでした。`,
    );
  }

  throwIfFileIsSecurityConcern(getCleanUriPath(fileUri));

  // listDir succeeds only for directories, which this tool does not support
  let isDirectory: boolean;
  try {
    await extras.ide.listDir(fileUri);
    isDirectory = true;
  } catch {
    isDirectory = false;
  }
  if (isDirectory) {
    throw new ContinueError(
      ContinueErrorReason.Unspecified,
      `「${filepath}」はディレクトリです。remove_file はファイルを削除するツールです。remove_file でディレクトリ内のファイルを1つずつ削除してください。`,
    );
  }

  await extras.ide.removeFile(fileUri);

  if (extras.codeBaseIndexer) {
    void extras.codeBaseIndexer.refreshCodebaseIndexFiles([fileUri]);
  }

  return [
    {
      name: "ファイル削除",
      description: getCleanUriPath(fileUri),
      content: "ファイルの削除に成功しました",
    },
  ];
};
