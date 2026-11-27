import path from "path";

import { Box, Text } from "ink";
import React from "react";

import { getToolDisplayName } from "src/tools/index.js";

import { t } from "../i18n.js";

import { ColoredDiff } from "./ColoredDiff.js";
import { ChecklistDisplay } from "./components/ChecklistDisplay.js";

const MAX_BASH_OUTPUT_LINES = 4;

interface ToolResultSummaryProps {
  toolName?: string;
  content: string;
}

const ToolResultSummary: React.FC<ToolResultSummaryProps> = ({
  toolName,
  content,
}) => {
  if (!content) {
    return (
      <Box>
        <Text color="dim">⎿ </Text>
        <Text color="dim"> No output</Text>
      </Box>
    );
  }

  const lines = content.split("\n").length;
  const chars = content.length;
  const displayName = toolName
    ? getToolDisplayName(toolName)
    : t("Tool", "ツール");

  // Handle Checklist specially with styled display
  if (toolName === "Checklist") {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="dim">⎿ </Text>
          <Text color="blue">
            {t("Task List Updated", "タスクリスト更新済み")}
          </Text>
        </Box>
        <ChecklistDisplay
          content={t(
            `Task list status:\n${content}`,
            `タスクリストの状態:\n${content}`,
          )}
        />
      </Box>
    );
  }

  // Handle Write/Edit/MultiEdit with diff specially
  if (
    (toolName === "Write" || toolName === "Edit" || toolName === "MultiEdit") &&
    content.includes("Diff:\n")
  ) {
    const diffSection = content.split("Diff:\n")[1];
    if (diffSection) {
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="dim">⎿ </Text>
            <Text color="green">
              {toolName === "Edit"
                ? t(
                    " File edited successfully",
                    " ファイルを正常に編集しました",
                  )
                : toolName === "MultiEdit"
                  ? t(
                      " File edited successfully",
                      " ファイルを正常に編集しました",
                    )
                  : t(
                      " File written successfully",
                      " ファイルに書き込みました",
                    )}
            </Text>
          </Box>
          <ColoredDiff diffContent={diffSection} />
        </Box>
      );
    }
  }

  // Handle terminal command output specially
  if (toolName === "Bash") {
    const isStderr = content.startsWith("Stderr:");
    const actualOutput = isStderr ? content.slice(7).trim() : content;
    const outputLines = actualOutput.split("\n");

    if (outputLines.length <= MAX_BASH_OUTPUT_LINES) {
      // Show actual output for MAX_BASH_OUTPUT_LINES lines or fewer
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="dim">⎿ </Text>
            <Text color="dim"> {t("Terminal output:", "ターミナル出力:")}</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color={isStderr ? "red" : "white"}>
              {actualOutput.trimEnd()}
            </Text>
          </Box>
        </Box>
      );
    } else {
      // Show first MAX_BASH_OUTPUT_LINES lines with ellipsis for more lines
      const firstLines = outputLines.slice(0, MAX_BASH_OUTPUT_LINES).join("\n");
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="dim">⎿ </Text>
            <Text color="dim"> {t("Terminal output:", "ターミナル出力:")}</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color={isStderr ? "red" : "white"}>
              {firstLines.trimEnd()}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="dim">
              {t(
                `... +${outputLines.length - MAX_BASH_OUTPUT_LINES} lines`,
                `... ほか ${outputLines.length - MAX_BASH_OUTPUT_LINES} 行`,
              )}
            </Text>
          </Box>
        </Box>
      );
    }
  }

  // show streaming output for subagent tool output
  if (toolName === "Subagent") {
    const metadataIndex = content.indexOf("<task_metadata>");
    const actualOutput =
      metadataIndex >= 0 ? content.slice(0, metadataIndex).trim() : content;

    if (!actualOutput) {
      return (
        <Box>
          <Text color="dim">⎿ </Text>
          <Text color="dim">
            {" "}
            {t("Subagent executing...", "サブエージェント実行中...")}
          </Text>
        </Box>
      );
    }

    const outputLines = actualOutput.split("\n");
    const MAX_TASK_OUTPUT_LINES = 20;

    if (outputLines.length <= MAX_TASK_OUTPUT_LINES) {
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="dim">⎿ </Text>
            <Text color="dim">
              {" "}
              {t("Subagent output:", "サブエージェント出力:")}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text>{actualOutput.trimEnd()}</Text>
          </Box>
        </Box>
      );
    } else {
      const lastLines = outputLines.slice(-MAX_TASK_OUTPUT_LINES).join("\n");
      return (
        <Box flexDirection="column">
          <Box>
            <Text color="dim">⎿ </Text>
            <Text color="dim">
              {" "}
              {t("Subagent output:", "サブエージェント出力:")}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="dim">
              {t(
                `... +${outputLines.length - MAX_TASK_OUTPUT_LINES} lines`,
                `... ほか ${outputLines.length - MAX_TASK_OUTPUT_LINES} 行`,
              )}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text>{lastLines.trimEnd()}</Text>
          </Box>
        </Box>
      );
    }
  }

  // Handle all other cases with text summary
  const getSummary = () => {
    // Check if this is a user cancellation first
    if (
      content ===
      t("Permission denied by user", "ユーザーにより権限が拒否されました")
    ) {
      return t("Cancelled by user", "ユーザーによりキャンセルされました");
    }

    // Check if it was an error
    if (
      content.startsWith("Error") ||
      content.startsWith(t("Error", "エラー"))
    ) {
      const lines = content.split("\n");
      return t(
        `Error: ${lines[0]}${lines.length > 1 ? "..." : ""}`,
        `エラー: ${lines[0]}${lines.length > 1 ? "..." : ""}`,
      );
    }

    // Convert absolute paths to relative paths from workspace root
    const formatPath = (filePath: string) => {
      if (path.isAbsolute(filePath)) {
        const workspaceRoot = process.cwd();
        const relativePath = path.relative(workspaceRoot, filePath);
        return relativePath || filePath;
      }
      return filePath;
    };

    // Handle specific tool output formatting
    switch (toolName) {
      case "Read":
        // Try to extract file path from content if it contains line numbers
        if (content.includes("→")) {
          const pathMatch = content.match(/^(.+?):/);
          const filePath = pathMatch ? pathMatch[1] : t("file", "ファイル");
          return t(
            `${displayName} ${formatPath(filePath)} (${lines} lines)`,
            `${displayName} ${formatPath(filePath)}（${lines} 行）`,
          );
        }
        return t(
          `${displayName} tool output (${lines} lines)`,
          `${displayName} ツールの出力（${lines} 行）`,
        );

      case "Write":
        return content.includes(
          t("Successfully created file", "ファイルを正常に作成しました"),
        )
          ? t("File created successfully", "ファイルを作成しました")
          : t("File updated successfully", "ファイルを更新しました");

      case "Edit":
        return t("File edited successfully", "ファイルを正常に編集しました");

      case "MultiEdit":
        return t("File edited successfully", "ファイルを正常に編集しました");

      case "List":
        return t(
          `Listed ${lines} ${lines === 1 ? "item" : "items"}`,
          `${lines} 件を一覧表示しました`,
        );

      case "Search":
        return t(
          `Found ${lines} ${lines === 1 ? "match" : "matches"}`,
          `${lines} 件見つかりました`,
        );

      case "Diff":
        return t(`Diff output (${lines} lines)`, `diff 出力（${lines} 行）`);

      default:
        // Fallback for all tools using display name
        if (chars > 1000) {
          return t(
            `${displayName} output: ${lines} lines, ${chars} characters`,
            `${displayName} の出力: ${lines} 行、${chars} 文字`,
          );
        } else if (lines > 10) {
          return t(
            `${displayName} output: ${lines} lines`,
            `${displayName} の出力: ${lines} 行`,
          );
        } else {
          return content.slice(0, 100) + (content.length > 100 ? "..." : "");
        }
    }
  };

  return (
    <Box>
      <Text color="dim">⎿ </Text>
      <Text color="dim"> {getSummary()}</Text>
    </Box>
  );
};

export { ToolResultSummary };
