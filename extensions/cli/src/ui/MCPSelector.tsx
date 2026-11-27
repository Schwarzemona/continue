import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { quote } from "shell-quote";

import { useServices } from "../hooks/useService.js";
import { t } from "../i18n.js";
import {
  MCPConnectionInfo,
  MCPServerStatus,
  MCPServiceState,
  SERVICE_NAMES,
} from "../services/types.js";
import { logger } from "../util/logger.js";

import { defaultBoxStyles } from "./styles.js";

const MCP_STATUS_TEXT: Record<MCPServerStatus, [string, string]> = {
  idle: ["idle", "待機中"],
  connecting: ["connecting", "接続中"],
  connected: ["connected", "接続済み"],
  error: ["error", "エラー"],
};

// Utility function to get status icon and color based on server connection
const getServerStatusDisplay = (conn: MCPConnectionInfo) => {
  let icon = "⚪️"; // note, white circle causes extra blank line bug
  let color: "green" | "yellow" | "red" | "white" | "dim" = "white";
  let statusLabel = t(...MCP_STATUS_TEXT[conn.status]);

  if (conn.status === "connecting") {
    icon = "🟡";
    color = "yellow";
  } else if (conn.status === "error") {
    icon = "🔴";
    color = "red";
  } else if (conn.status === "connected") {
    if (conn.warnings && conn.warnings.length > 0) {
      icon = "🟡";
      color = "yellow";
      statusLabel = t("connected (with warnings)", "接続済み(警告あり)");
    } else {
      icon = "🟢";
      color = "green";
    }
  }

  return { icon, color, statusLabel };
};

interface MCPSelectorProps {
  onCancel: () => void;
}

type MCPMenuState = "main" | "server-detail";

interface MCPMenuItem {
  label: string;
  value: string;
}

export const MCPSelector: React.FC<MCPSelectorProps> = ({ onCancel }) => {
  const [menuState, setMenuState] = useState<MCPMenuState>("main");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { services } = useServices<{ mcp: MCPServiceState }>([
    SERVICE_NAMES.MCP,
  ]);
  const connections = services.mcp?.connections ?? [];
  const mcpService = services.mcp?.mcpService;

  const backItem = { label: t("Back", "戻る"), value: "back" };

  const handleBack = () => {
    if (menuState === "server-detail") {
      setSelectedServer(null);
      setMenuState("main");
      setSelectedIndex(0);
    } else {
      onCancel();
    }
    setMessage(null);
  };

  // Main menu items (includes servers)
  const getMainMenuItems = (): MCPMenuItem[] => {
    const options: MCPMenuItem[] = [];

    // Add individual servers first
    if (connections.length > 0) {
      connections.forEach((conn) => {
        const { icon } = getServerStatusDisplay(conn);

        let serverLabel = `${icon} ${conn.config.name}`;

        // Add tools and prompts count if server is connected
        if (conn.status === "connected") {
          const toolsCount = conn.tools.length;
          const promptsCount = conn.prompts.length;

          const counts = [];
          if (toolsCount > 0) {
            counts.push(`🔧${toolsCount}`);
          }
          if (promptsCount > 0) {
            counts.push(`📝${promptsCount}`);
          }

          if (counts.length > 0) {
            serverLabel += ` (${counts.join(" ")})`;
          }
        }

        options.push({
          label: serverLabel,
          value: `server:${conn.config.name}`,
        });
      });

      // Add bulk actions
      options.push(
        {
          label: t("🔄 Restart all servers", "🔄 全サーバーを再起動"),
          value: "restart-all",
        },
        {
          label: t("⏹️  Stop all servers", "⏹️  全サーバーを停止"),
          value: "stop-all",
        },
      );
    }

    // Add "Explore MCP Servers" option at the bottom
    options.push({
      label: t("🔍 Explore MCP Servers", "🔍 MCPサーバーを検索"),
      value: "explore-mcp-servers",
    });

    return options;
  };

  // Server detail items
  const getServerDetailItems = (): MCPMenuItem[] => {
    if (!selectedServer) return [];

    const serverInfo = connections.find(
      (conn) => conn.config.name === selectedServer,
    );
    if (!serverInfo) return [];

    const items: MCPMenuItem[] = [
      {
        label: t("🔄 Restart server", "🔄 サーバーを再起動"),
        value: "restart",
      },
    ];

    // Only show stop server if it's connected
    if (serverInfo.status === "connected") {
      items.push({
        label: t("⏹️  Stop server", "⏹️  サーバーを停止"),
        value: "stop",
      });
    }

    return items;
  };
  const getServerInfoDisplay = () => {
    if (menuState !== "server-detail" || !selectedServer) return null;

    const serverInfo = connections.find(
      (conn) => conn.config.name === selectedServer,
    );
    if (!serverInfo) return null;

    return (
      <Box flexDirection="column">
        {/* Add error if server has error status */}
        {serverInfo.status === "error" && serverInfo.error && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="red" bold>
              {t("🚫 Error:", "🚫 エラー:")}
            </Text>
            <Text color="red">{serverInfo.error}</Text>
          </Box>
        )}

        {/* Add warnings if any */}
        {serverInfo.warnings.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>
              {t("⚠️ Warnings:", "⚠️ 警告:")}
            </Text>
            {serverInfo.warnings.map((warning, index) => (
              <Text key={index} color="yellow">
                • {warning}
              </Text>
            ))}
          </Box>
        )}

        {/* Add prompts if any */}
        {serverInfo.prompts.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="blue">
              {t("📝 Prompts:", "📝 プロンプト:")} {serverInfo.prompts.length}
            </Text>
            {serverInfo.prompts.map((prompt, index) => (
              <Text key={index} color="dim">
                • {prompt.name}
              </Text>
            ))}
          </Box>
        )}

        {/* Add tools if any */}
        {serverInfo.tools.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="blue">
              {t("🔧 Tools:", "🔧 ツール:")} {serverInfo.tools.length}
            </Text>
            {serverInfo.tools.map((tool, index) => (
              <Text key={index} color="dim">
                • {tool.name}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  let items: MCPMenuItem[] = [];

  switch (menuState) {
    case "main":
      items = getMainMenuItems();
      break;
    case "server-detail":
      items = getServerDetailItems();
      break;
  }

  items = [...items, backItem];

  const maxIndex = Math.max(0, items.length - 1);

  useInput(async (input, key) => {
    // Always allow escape/Ctrl+C so users can cancel even when loading
    if (key.escape || (key.ctrl && input === "c")) {
      handleBack();
      return;
    }

    if (isLoading) return;

    if (key.upArrow) {
      setSelectedIndex(selectedIndex <= 0 ? maxIndex : selectedIndex - 1);
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
      return;
    }

    if (key.return) {
      const selectedItem = items[selectedIndex];
      if (!selectedItem) return;

      setIsLoading(true);
      setMessage(null);

      try {
        switch (menuState) {
          case "main":
            await handleMainMenuSelect(selectedItem.value);
            break;
          case "server-detail":
            await handleServerAction(selectedItem.value);
            break;
        }
      } catch (error: any) {
        setMessage(`${t("Error:", "エラー:")} ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  });

  const handleMainMenuSelect = async (value: string) => {
    if (value.startsWith("server:")) {
      // Handle server selection
      const serverName = value.replace("server:", "");
      setSelectedServer(serverName);
      setMenuState("server-detail");
      setSelectedIndex(0);
      return;
    }

    switch (value) {
      case "restart-all":
        await mcpService?.restartAllServers();
        setMessage(t("All servers restarted", "全サーバーを再起動しました"));
        break;
      case "stop-all":
        await mcpService?.shutdownConnections();
        setMessage(t("All servers stopped", "全サーバーを停止しました"));
        break;
      case "explore-mcp-servers":
        // Open the MCP servers hub in the default browser
        const open = (await import("open")).default;
        await open("https://continue.dev/hub?type=mcpServers");
        setMessage(
          t(
            "Opened MCP servers hub in browser",
            "ブラウザでMCPサーバーハブを開きました",
          ),
        );
        break;
      case "back":
        onCancel();
        return;
    }
  };

  const handleServerAction = async (action: string) => {
    try {
      switch (action) {
        case "restart":
          if (!selectedServer) {
            return;
          }
          await mcpService?.restartServer(selectedServer);
          setMessage(
            t(
              `Server "${selectedServer}" restarted`,
              `サーバー "${selectedServer}" を再起動しました`,
            ),
          );
          break;
        case "stop":
          if (!selectedServer) {
            return;
          }
          await mcpService?.stopServer(selectedServer);
          setMessage(
            t(
              `Server "${selectedServer}" stopped`,
              `サーバー "${selectedServer}" を停止しました`,
            ),
          );
          break;
        case "back":
          handleBack();
          return;
      }
    } catch {
      logger.error(
        t("Error handling MCP action", "MCPアクションの処理でエラー"),
      );
    }
  };

  const renderHeader = () => {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="blue">
          {menuState === "server-detail" && selectedServer
            ? t(`Server: ${selectedServer}`, `サーバー: ${selectedServer}`)
            : t("MCP Servers", "MCPサーバー")}
        </Text>
        {connections.length === 0 && (
          <Text color="gray">
            {t("No servers configured", "サーバーが設定されていません")}
          </Text>
        )}
        {menuState === "server-detail" &&
          selectedServer &&
          (() => {
            const serverInfo = connections.find(
              (conn) => conn.config.name === selectedServer,
            );
            if (!serverInfo) return null;

            const { color: statusColor, statusLabel } =
              getServerStatusDisplay(serverInfo);

            let configText = "";
            if ("command" in serverInfo.config) {
              const { command, args } = serverInfo.config;
              const cmd = command ? quote([command, ...(args ?? [])]) : "";
              if (cmd) {
                configText = ` • ${t("Command:", "コマンド:")} ${cmd}`;
              }
            } else {
              const { url } = serverInfo.config;
              configText = ` • URL: ${url}`;
            }
            configText = configText.replace(
              /\$\{\{.*\}\}/,
              t("(secret)", "(シークレット)"),
            );

            return (
              <Text color="dim">
                {t("Status:", "状態:")}
                <Text color={statusColor}>{statusLabel}</Text>
                {configText}
              </Text>
            );
          })()}
      </Box>
    );
  };

  return (
    <Box {...defaultBoxStyles("blue", { minHeight: 10 })}>
      {renderHeader()}

      {message && (
        <Box marginBottom={1}>
          <Text
            color={message.startsWith(t("Error:", "エラー:")) ? "red" : "green"}
          >
            {message}
          </Text>
        </Box>
      )}

      {menuState === "server-detail" && getServerInfoDisplay()}

      {isLoading ? (
        <Box>
          <Text color="yellow">{t("Working...", "処理中...")}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;

            return (
              <Text
                key={`${item.value}-${index}`}
                color={isSelected ? "blue" : "white"}
                bold={isSelected}
              >
                {isSelected ? "➤ " : "  "}
                {item.label}
              </Text>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="dim">
          ↑/↓ to navigate, Enter to select, Esc to go back
        </Text>
      </Box>
    </Box>
  );
};
