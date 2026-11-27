import { Box, Text } from "ink";
import React from "react";

import { t } from "../i18n.js";

interface ModelCapabilityWarningProps {
  modelName: string;
}

const ModelCapabilityWarning: React.FC<ModelCapabilityWarningProps> = ({
  modelName,
}) => {
  return (
    <Box flexDirection="column" paddingX={0}>
      <Box flexDirection="row" alignItems="center">
        <Text bold color="white">
          {/* spaces in brackets to prevent prettier from fixing to 1 space */}
          ⚠️{"  "}
          {t("Model Capability Warning", "モデル能力警告")}
        </Text>
      </Box>
      <Text color="gray">
        {t(
          `The model "${modelName}" is not recommended for use with cn due to limited reasoning and tool calling capabilities`,
          `モデル "${modelName}" は推論とツール呼び出しの能力が限られているため、cn での利用は推奨されません`,
        )}
      </Text>
    </Box>
  );
};

export { ModelCapabilityWarning };
