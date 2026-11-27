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

export const reportFailureTool: Tool = {
  name: "ReportFailure",
  displayName: "Report Failure",
  description:
    "回復不可能なエラーによってタスクが失敗したことを報告します。ユーザー向けの簡潔な説明を含めてください。",
  parameters: {
    type: "object",
    required: ["errorMessage"],
    properties: {
      errorMessage: {
        type: "string",
        description: "何が問題だったのか、継続できない理由を説明してください。",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  run: async (args: { errorMessage: string }): Promise<string> => {
    try {
      const trimmedMessage = args.errorMessage.trim();
      if (!trimmedMessage) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          t(
            "errorMessage is required to report a failure.",
            "失敗を報告するには errorMessage が必要です。",
          ),
        );
      }

      const agentId = getAgentIdFromArgs();
      if (!agentId) {
        const errorMessage = t(
          "Agent ID is required. Please use the --id flag with cn serve.",
          "エージェントIDが必要です。cn serve に --id フラグを付けて指定してください。",
        );
        logger.error(errorMessage);
        throw new ContinueError(ContinueErrorReason.Unspecified, errorMessage);
      }

      await post(`agents/${agentId}/status`, {
        status: "FAILED",
        errorMessage: trimmedMessage,
      });

      // Mark agent as complete since it failed
      try {
        await updateAgentMetadata({ isComplete: true });
        logger.debug("Marked agent as complete due to failure");
      } catch (metadataErr) {
        // Non-critical: log but don't fail the failure report
        logger.debug(
          "Failed to update completion metadata (non-critical)",
          metadataErr as any,
        );
      }

      logger.info(`Failure reported: ${trimmedMessage}`);
      return t("Failure reported to user.", "失敗をユーザーに報告しました。");
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
          `Error reporting failure: ${error.status} ${error.response || error.statusText}`,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error reporting failure: ${errorMessage}`);
      throw new Error(`Error reporting failure: ${errorMessage}`);
    }
  },
};
