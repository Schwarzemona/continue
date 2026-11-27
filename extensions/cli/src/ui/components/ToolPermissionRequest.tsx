import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

import { t } from "../../i18n.js";

interface ToolPermissionRequestProps {
  toolName: string;
  toolArgs: any;
  requestId: string;
  onResponse: (requestId: string, approved: boolean) => void;
}

export const ToolPermissionRequest: React.FC<ToolPermissionRequestProps> = ({
  toolName,
  toolArgs,
  requestId,
  onResponse,
}) => {
  const [responded, setResponded] = useState(false);

  useInput((input) => {
    if (responded) return;

    if (input === "y" || input === "Y") {
      setResponded(true);
      onResponse(requestId, true);
    } else if (input === "n" || input === "N") {
      setResponded(true);
      onResponse(requestId, false);
    }
  });

  if (responded) {
    return null; // Component will be replaced by updated message
  }

  const formatArgs = (args: any) => {
    if (!args || Object.keys(args).length === 0) return "";

    const firstKey = Object.keys(args)[0];
    const firstValue = args[firstKey];

    if (typeof firstValue === "string" && firstValue.length > 50) {
      return `${firstValue.substring(0, 50)}...`;
    }

    return String(firstValue);
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="yellow">⚠ </Text>
        <Text color="yellow" bold>
          {t("Permission Required", "権限が必要です")}
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text>
          {t("Tool:", "ツール:")} <Text color="cyan">{toolName}</Text>
        </Text>
      </Box>
      {formatArgs(toolArgs) && (
        <Box marginLeft={2}>
          <Text>
            {t("Args:", "引数:")}{" "}
            <Text color="gray">{formatArgs(toolArgs)}</Text>
          </Text>
        </Box>
      )}
      <Box marginLeft={2}>
        <Text>
          {t("Allow this tool call?", "このツール呼び出しを許可しますか?")}(
          <Text color="green" bold>
            y
          </Text>
          /
          <Text color="red" bold>
            n
          </Text>
          )
        </Text>
      </Box>
    </Box>
  );
};
