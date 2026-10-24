import { ILLM } from "../..";
import { countTokensAsync } from "../../llm/countTokens";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

export async function throwIfFileExceedsHalfOfContext(
  filepath: string,
  content: string,
  model: ILLM | null,
) {
  if (model) {
    const tokens = await countTokensAsync(content, model.title);
    const tokenLimit = model.contextLength / 64;
    if (tokens > tokenLimit) {
      throw new ContinueError(
        ContinueErrorReason.FileTooLarge,
        `読み込む予定の範囲が${tokens}トークンと制限の${tokenLimit}トークンより大きいです。範囲を狭めてください。`,
      );
    }
  }
}
