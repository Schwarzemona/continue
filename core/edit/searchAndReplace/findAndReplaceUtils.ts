import { ContinueError, ContinueErrorReason } from "../../util/errors";

/**
 * Validates a single edit operation
 */
export function validateSingleEdit(
  oldString: unknown,
  newString: unknown,
  replaceAll: unknown,
  index?: number,
): { oldString: string; newString: string; replaceAll?: boolean } {
  const context = index !== undefined ? `インデックス${index}: ` : "";

  if (oldString === undefined || typeof oldString !== "string") {
    throw new ContinueError(
      ContinueErrorReason.FindAndReplaceMissingOldString,
      `${context}文字列old_stringが必要です`,
    );
  }
  if (newString === undefined || typeof newString !== "string") {
    throw new ContinueError(
      ContinueErrorReason.FindAndReplaceMissingNewString,
      `${context}文字列new_stringが必要です`,
    );
  }
  if (oldString === newString) {
    throw new ContinueError(
      ContinueErrorReason.FindAndReplaceIdenticalOldAndNewStrings,
      `${context}old_stringとnew_stringは異なる必要があります`,
    );
  }
  if (replaceAll !== undefined && typeof replaceAll !== "boolean") {
    throw new ContinueError(
      ContinueErrorReason.FindAndReplaceInvalidReplaceAll,
      `${context}replace_allは有効なboolean値である必要があります`,
    );
  }
  return { oldString, newString, replaceAll };
}

export function trimEmptyLines({
  lines,
  fromEnd,
}: {
  lines: string[];
  fromEnd: boolean;
}): string[] {
  lines = fromEnd ? lines.slice().reverse() : lines.slice();
  const newLines: string[] = [];
  let shouldContinueRemoving = true;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (shouldContinueRemoving && line.trim() === "") continue;
    shouldContinueRemoving = false;
    newLines.push(line);
  }
  return fromEnd ? newLines.reverse() : newLines;
}
