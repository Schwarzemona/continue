import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";

import { t } from "../../i18n.js";
import { setExitMessageCallback, shouldShowExitMessage } from "../../index.js";
import type { PermissionMode } from "../../permissions/types.js";
import type { NavigationScreen } from "../context/NavigationContext.js";

import { ContextPercentageDisplay } from "./ContextPercentageDisplay.js";
import { ModeIndicator } from "./ModeIndicator.js";
import { ResponsiveRepoDisplay } from "./ResponsiveRepoDisplay.js";

export interface BottomStatusBarProps {
  currentMode: PermissionMode;
  remoteUrl?: string;
  isRemoteMode: boolean;
  services: any;
  navState: any;
  navigateTo: (screen: NavigationScreen, data?: any) => void;
  closeCurrentScreen: () => void;
  contextPercentage?: number;
  hasImageInClipboard?: boolean;
  isVerboseMode?: boolean;
  totalCost?: number;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentMode,
  remoteUrl,
  isRemoteMode,
  services: _services,
  navState: _navState,
  navigateTo: _navigateTo,
  closeCurrentScreen: _closeCurrentScreen,
  contextPercentage,
  hasImageInClipboard,
  isVerboseMode,
  totalCost,
}) => {
  const [_refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setExitMessageCallback(() => {
      setRefreshTrigger((prev) => prev + 1);
    });
  }, []);

  const showingExitMessage = shouldShowExitMessage();

  return (
    <Box flexDirection="row" justifyContent="space-between" alignItems="center">
      <Box marginLeft={2} flexDirection="row" alignItems="center">
        {currentMode === "normal" && (
          <React.Fragment>
            {hasImageInClipboard ? (
              <Text key="image-paste-hint" color="cyan" wrap="truncate-start">
                {t(
                  "Press Ctrl+V to paste image",
                  "Ctrl+V で画像を貼り付けられます",
                )}
              </Text>
            ) : showingExitMessage ? (
              <Text key="repo-url" color="dim" wrap="truncate-start">
                {t("ctrl+c to exit", "ctrl+c で終了")}
              </Text>
            ) : (
              <ResponsiveRepoDisplay remoteUrl={remoteUrl} />
            )}
            <Text key="repo-separator"> </Text>
          </React.Fragment>
        )}
        <ModeIndicator />
        {contextPercentage !== undefined && contextPercentage > 0 && (
          <React.Fragment>
            <Text key="context-separator" color="dim">
              {" "}
              •{" "}
            </Text>
            <ContextPercentageDisplay percentage={contextPercentage} />
          </React.Fragment>
        )}
        {isVerboseMode && totalCost !== undefined && totalCost > 0 && (
          <React.Fragment>
            <Text key="cost-separator" color="dim">
              {" "}
              •{" "}
            </Text>
            <Text key="cost-display" color="dim">
              {t("Cost:", "コスト:")} ${totalCost.toFixed(4)}
            </Text>
          </React.Fragment>
        )}
      </Box>
      <Box marginRight={2} marginLeft={2}>
        {isRemoteMode ? (
          <Text color="cyan">{`◉ ${t("Remote Mode", "リモートモード")}`}</Text>
        ) : (
          <Text color="dim">{"◉ Continue CLI"}</Text>
        )}
      </Box>
    </Box>
  );
};
