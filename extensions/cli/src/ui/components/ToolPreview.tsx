import { Box, Text } from "ink";
import React from "react";

import { t } from "../../i18n.js";
import { getToolDisplayName } from "../../tools/index.js";
import { ToolCallPreview } from "../../tools/types.js";
import { ColoredDiff } from "../ColoredDiff.js";

import { ChecklistDisplay } from "./ChecklistDisplay.js";

interface ToolPreviewProps {
  toolCallPreview?: ToolCallPreview[];
  toolName: string;
  toolArgs: any;
}

/**
 * Generates a preview of what a tool will do based on its arguments
 */
export const ToolPreview: React.FC<ToolPreviewProps> = ({
  toolCallPreview,
  toolName,
  toolArgs,
}) => {
  if (toolCallPreview) {
    return (
      <Box display={"flex"} flexDirection="column" marginTop={1}>
        {toolCallPreview.map((preview, index) => {
          if (preview.type === "text") {
            return (
              <Box key={index} paddingLeft={preview.paddingLeft ?? 0}>
                {index === 0 && <Text color="dim">⎿ </Text>}
                <Text color={preview.color ?? "dim"}>{preview.content}</Text>
              </Box>
            );
          } else if (preview.type === "checklist") {
            return (
              <Box key={index}>
                <ChecklistDisplay
                  content={`${t("Task list status:", "タスクリストの状態:")}\n${preview.content}`}
                />
              </Box>
            );
          } else {
            return <ColoredDiff key={index} diffContent={preview.content} />;
          }
        })}
      </Box>
    );
  }

  let message = t(
    `Will call ${getToolDisplayName(toolName)}`,
    `${getToolDisplayName(toolName)} を実行する予定です`,
  );
  const argCount = Object.keys(toolArgs || {}).length;
  if (argCount > 0) {
    message += t(
      ` with ${argCount} argument${argCount === 1 ? "" : "s"}`,
      `（引数 ${argCount} 個）`,
    );
  }

  return (
    <Box>
      <Text color="dim">⎿ </Text>
      <Text color="dim">{message}</Text>
    </Box>
  );
};
