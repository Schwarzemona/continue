import * as fs from "fs";
import * as path from "path";

import { ContinueError, ContinueErrorReason } from "core/util/errors.js";

import { t } from "../i18n.js";
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

export const uploadArtifactTool: Tool = {
  name: "UploadArtifact",
  displayName: "Upload Artifact",
  description:
    "ユーザーが確認できるセッションのアーティファクト（スクリーンショット、動画、ログ）としてファイルを送信します。対応形式: 画像 (png, jpg, jpeg, gif, webp)、動画 (mp4, mov, avi, webm)、テキストファイル。最大ファイルサイズ: 50MB。同一ファイル名のアーティファクトが既に存在する場合は新しいファイルで上書きされます。",
  parameters: {
    type: "object",
    required: ["filePath"],
    properties: {
      filePath: {
        type: "string",
        description:
          "アップロードするファイルへの絶対パス（例: /tmp/screenshot.png）",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  run: async (args: { filePath: string }): Promise<string> => {
    try {
      // Import services here to avoid circular dependency
      // services/index.ts -> ToolPermissionService -> allBuiltIns -> uploadArtifact -> services/index.ts
      const { services } = await import("../services/index.js");

      const trimmedPath = args.filePath?.trim();
      if (!trimmedPath) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          t(
            "filePath is required to upload an artifact.",
            "アーティファクトをアップロードするには filePath が必要です。",
          ),
        );
      }

      // Get agent session ID
      const agentId = getAgentIdFromArgs();
      if (!agentId) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          t(
            "Agent ID is required. This tool only works with 'cn serve --id <agentId>'.",
            "エージェントIDが必要です。このツールは 'cn serve --id <agentId>' でのみ動作します。",
          ),
        );
      }

      // Auth has been removed - artifact upload requires auth
      const accessToken: string | null = null;
      if (!accessToken) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          t(
            "Artifact upload requires authentication, which has been removed.",
            "アーティファクトのアップロードには認証が必要ですが、認証は削除されています。",
          ),
        );
      }

      // Validate file exists
      if (!fs.existsSync(trimmedPath)) {
        throw new ContinueError(
          ContinueErrorReason.Unspecified,
          `File not found: ${trimmedPath}`,
        );
      }

      // Get file stats for logging
      const stats = fs.statSync(trimmedPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const filename = path.basename(trimmedPath);

      logger.info(
        t(
          `Uploading artifact: ${filename} (${fileSizeMB} MB)`,
          `アーティファクト送信中: ${filename} (${fileSizeMB} MB)`,
        ),
      );

      // Upload the artifact
      const result = await services.artifactUpload.uploadArtifact({
        agentSessionId: agentId,
        filePath: trimmedPath,
        accessToken,
      });

      if (result.success) {
        logger.info(
          t(
            `Successfully uploaded artifact: ${result.filename}`,
            `アーティファクトをアップロードしました: ${result.filename}`,
          ),
        );
        return `Artifact uploaded successfully: ${result.filename} (${fileSizeMB} MB). The user can view it in the Artifacts tab of the session.`;
      } else {
        // Handle specific error cases with helpful messages
        const errorMsg = result.error || t("Unknown error", "不明なエラー");

        if (errorMsg.includes("File size exceeds")) {
          throw new ContinueError(
            ContinueErrorReason.Unspecified,
            `File is too large (${fileSizeMB} MB). Maximum allowed size is 50MB. Consider compressing the file or splitting it into smaller parts.`,
          );
        } else if (errorMsg.includes("Storage limit exceeded")) {
          throw new ContinueError(
            ContinueErrorReason.Unspecified,
            "Session storage limit exceeded (500MB total). The user may need to delete old artifacts or you may need to reduce the number of uploads.",
          );
        } else if (
          errorMsg.includes("not allowed") ||
          errorMsg.includes("extension")
        ) {
          throw new ContinueError(
            ContinueErrorReason.Unspecified,
            `File type not supported. Only images (png, jpg, jpeg, gif, webp), videos (mp4, mov, avi, webm), and text files (log, txt, json, xml, csv, html) are allowed.`,
          );
        } else {
          throw new ContinueError(
            ContinueErrorReason.Unspecified,
            `Failed to upload artifact: ${errorMsg}`,
          );
        }
      }
    } catch (error) {
      if (error instanceof ContinueError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        t(
          `Error uploading artifact: ${errorMessage}`,
          `アーティファクトのアップロードでエラー: ${errorMessage}`,
        ),
      );
      throw new ContinueError(
        ContinueErrorReason.Unspecified,
        t(
          `Error uploading artifact: ${errorMessage}`,
          `アーティファクトのアップロードでエラー: ${errorMessage}`,
        ),
      );
    }
  },
};
