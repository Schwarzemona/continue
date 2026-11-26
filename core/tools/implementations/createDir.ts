import { ToolImpl } from ".";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getCleanUriPath } from "../../util/uri";
import { getStringArg } from "../parseArgs";
import { resolveFileUri } from "./resolveFileUri";

export const createDirImpl: ToolImpl = async (args, extras) => {
  const dirpath = getStringArg(args, "dirpath");
  const dirUri = await resolveFileUri(extras.ide, dirpath);

  if (await extras.ide.fileExists(dirUri)) {
    throw new ContinueError(
      ContinueErrorReason.FileAlreadyExists,
      `ディレクトリ「${dirpath}」は既に存在します。`,
    );
  }

  throwIfFileIsSecurityConcern(getCleanUriPath(dirUri));

  await extras.ide.createDirectory(dirUri);

  return [
    {
      name: "フォルダ作成",
      description: getCleanUriPath(dirUri),
      content: "ディレクトリの作成に成功しました",
    },
  ];
};
