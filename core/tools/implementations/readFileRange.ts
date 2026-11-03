import { resolveInputPath } from "../../util/pathResolver";
import { getUriPathBasename } from "../../util/uri";

import { ToolImpl } from ".";
import { throwIfFileIsSecurityConcern } from "../../indexing/ignore";
import { getNumberArg, getStringArg } from "../parseArgs";
import { throwIfFileExceedsHalfOfContext } from "./readFileLimit";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

// Use Int.MAX_VALUE from Java/Kotlin (2^31 - 1) instead of JavaScript's Number.MAX_SAFE_INTEGER
// to ensure compatibility with IntelliJ's Kotlin Position type which uses Int for character field
export const MAX_CHAR_POSITION = 2147483647;

export const readFileRangeImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");
  const startLine = getNumberArg(args, "startLine");
  const endLine = getNumberArg(args, "endLine");

  // Validate that line numbers are positive integers
  if (startLine < 1) {
    throw new ContinueError(
      ContinueErrorReason.InvalidLineNumber,
      "startLineは1以上である必要があります",
    );
  }
  if (endLine < 1) {
    throw new ContinueError(
      ContinueErrorReason.InvalidLineNumber,
      "endLineは1以上である必要があります",
    );
  }
  if (endLine < startLine) {
    throw new ContinueError(
      ContinueErrorReason.InvalidLineNumber,
      `endLine(${endLine})はstartLine(${startLine})以上である必要があります`,
    );
  }

  // Resolve the path first to get the actual path for security check
  const resolvedPath = await resolveInputPath(extras.ide, filepath);
  if (!resolvedPath) {
    throw new ContinueError(
      ContinueErrorReason.FileNotFound,
      `ファイル「${filepath}」は存在しないか、アクセスできません`,
    );
  }

  // Security check on the resolved display path
  throwIfFileIsSecurityConcern(resolvedPath.displayPath);

  // Use the IDE's readRangeInFile method with 0-based range (IDE expects 0-based internally)
  const content = await extras.ide.readRangeInFile(resolvedPath.uri, {
    start: {
      line: startLine - 1, // Convert from 1-based to 0-based
      character: 0,
    },
    end: {
      line: endLine - 1, // Convert from 1-based to 0-based
      character: MAX_CHAR_POSITION, // Read to end of line
    },
  });

  await throwIfFileExceedsHalfOfContext(
    resolvedPath.displayPath,
    content,
    extras.config.selectedModelByRole.chat,
  );

  const rangeDescription = `${resolvedPath.displayPath} (lines ${startLine}-${endLine})`;

  return [
    {
      name: getUriPathBasename(resolvedPath.uri),
      description: rangeDescription,
      content,
      uri: {
        type: "file",
        value: resolvedPath.uri,
      },
    },
  ];
};
