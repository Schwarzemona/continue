import { Box, Text, useInput } from "ink";
import React, { useEffect } from "react";

import { t } from "../i18n.js";

import { ColoredDiff } from "./ColoredDiff.js";

interface DiffViewerProps {
  diffContent: string;
  onClose: () => void;
}

/**
 * Full-screen diff viewer overlay
 * Shows diff content with syntax highlighting and allows closing with ESC
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffContent,
  onClose,
}) => {
  // Handle ESC key to close the diff viewer
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  // Auto-focus when component mounts
  useEffect(() => {
    // Component is already focused by default in Ink
  }, []);

  return (
    <Box
      flexDirection="column"
      height="100%"
      borderStyle="single"
      borderColor="blue"
      padding={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="blue" bold>
          {t("Git Diff (Press ESC to close)", "git diff（Esc で閉じます）")}
        </Text>
      </Box>

      {/* Diff content - scrollable */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {diffContent.trim() ? (
          <ColoredDiff diffContent={diffContent} />
        ) : (
          <Text color="gray" italic>
            {t("No changes to display", "表示する変更はありません")}
          </Text>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} justifyContent="center">
        <Text color="gray" dimColor>
          {t("ESC to close", "Esc で閉じる")}
        </Text>
      </Box>
    </Box>
  );
};
