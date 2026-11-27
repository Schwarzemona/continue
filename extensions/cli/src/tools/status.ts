import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";
import {
  ApiRequestError,
  AuthenticationRequiredError,
  post,
} from "../util/apiClient.js";
import { updateAgentMetadata } from "../util/exit.js";
import { logger } from "../util/logger.js";

import { Tool } from "./types.js";

/**
 * Extract the agent ID from the --id command line flag
 */
function getAgentIdFromArgs(): string | undefined {
  const args = process.argv;
  const idIndex = args.indexOf("--id");
  if (idIndex !== -1 && idIndex + 1 < args.length) {
    return args[idIndex + 1];
  }
  return undefined;
}

export const statusTool: Tool = {
  name: "Status",
  displayName: "Status",
  description: `ユーザーに伝えるため、現在タスクのステータスを設定します

既定で利用可能なステータスは次のとおりです:
- PLANNING: 実装を開始する前に計画を立てています
- WORKING: タスクの実施中です
- DONE: タスクは完了しました
- BLOCKED: 続行するためにユーザーからの追加情報が必要です

ただし、ユーザーがプロンプトでそれ以外のステータスを明示的に指定した場合は、それらを使用することもできます。

タスクの状態が変わったときは、このツールを使って必ずユーザーに通知してください。既定では、別のステータスを設定されるまで "PLANNING" とみなされます。`,
  parameters: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        description: "設定するステータス値",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  run: async (args: { status: string }): Promise<string> => {
    try {
      // Get agent ID from --id flag
      const agentId = getAgentIdFromArgs();
      if (!agentId) {
        const errorMessage = t(
          "Agent ID is required. Please use the --id flag with cn serve.",
          "エージェントIDが必要です。cn serve に --id フラグを付けて指定してください。",
        );
        logger.error(errorMessage);
        throw new ContinueError(ContinueErrorReason.Unspecified, errorMessage);
      }

      // Call the API endpoint using shared client
      await post(`agents/${agentId}/status`, { status: args.status });

      logger.info(t(`Status: ${args.status}`, `ステータス: ${args.status}`));

      // If status is DONE or FAILED, mark agent as complete
      const normalizedStatus = args.status.toUpperCase();
      if (normalizedStatus === "DONE" || normalizedStatus === "FAILED") {
        try {
          await updateAgentMetadata({ isComplete: true });
          logger.debug(
            t(
              `Marked agent as complete due to status: ${args.status}`,
              `ステータス ${args.status} によりエージェントを完了としてマークしました`,
            ),
          );
        } catch (metadataErr) {
          // Non-critical: log but don't fail the status update
          logger.debug(
            t(
              "Failed to update completion metadata (non-critical)",
              "完了メタデータの更新に失敗しました（致命的ではありません）",
            ),
            metadataErr as any,
          );
        }
      }

      return t(
        `Status set: ${args.status}`,
        `ステータスを設定しました: ${args.status}`,
      );
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }

      if (error instanceof AuthenticationRequiredError) {
        logger.error(error.message);
        throw new Error(
          t("Error: Authentication required", "エラー: 認証が必要です"),
        );
      }

      if (error instanceof ApiRequestError) {
        throw new Error(
          `Error setting status: ${error.status} ${error.response || error.statusText}`,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        t(
          `Error setting status: ${errorMessage}`,
          `ステータスの設定に失敗しました: ${errorMessage}`,
        ),
      );
      throw new Error(
        t(
          `Error setting status: ${errorMessage}`,
          `ステータスの設定に失敗しました: ${errorMessage}`,
        ),
      );
    }
  },
};
