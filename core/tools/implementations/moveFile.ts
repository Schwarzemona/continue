import { ToolImpl } from ".";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getCleanUriPath } from "../../util/uri";
import { getStringArg } from "../parseArgs";
import { resolveFileUri } from "./resolveFileUri";

export const moveFileImpl: ToolImpl = async (args, extras) => {
  const from = getStringArg(args, "from");
  const to = getStringArg(args, "to");

  const fromUri = await resolveFileUri(extras.ide, from);
  const toUri = await resolveFileUri(extras.ide, to);

  if (!(await extras.ide.fileExists(fromUri))) {
    throw new ContinueError(
      ContinueErrorReason.FileNotFound,
      `「${from}」が見つかりませんでした。`,
    );
  }
  if (await extras.ide.fileExists(toUri)) {
    throw new ContinueError(
      ContinueErrorReason.FileAlreadyExists,
      `ファイル「${to}」は既に存在します。`,
    );
  }

  throwIfFileIsSecurityConcern(getCleanUriPath(fromUri));
  throwIfFileIsSecurityConcern(getCleanUriPath(toUri));

  await extras.ide.renameFile(fromUri, toUri);

  if (extras.codeBaseIndexer) {
    void extras.codeBaseIndexer.refreshCodebaseIndexFiles([fromUri, toUri]);
  }

  return [
    {
      name: "ファイル移動",
      description: `${getCleanUriPath(fromUri)} → ${getCleanUriPath(toUri)}`,
      content: "移動に成功しました",
      uri: {
        type: "file",
        value: toUri,
      },
    },
  ];
};
