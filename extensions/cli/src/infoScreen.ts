import { execSync } from "child_process";

import chalk from "chalk";

import { t } from "./i18n.js";
import { services } from "./services/index.js";
import {
  getCurrentSession,
  getSessionFilePath,
  getSessionUsage,
} from "./session.js";
import { logger } from "./util/logger.js";
import { getVersion } from "./version.js";

function getVersionInfo(): string[] {
  const version = getVersion();
  const cwd = process.cwd();

  return [
    chalk.white(t("CLI Information:", "CLI情報:")),
    `  ${t("Version:", "バージョン:")} ${chalk.green(version)}`,
    `  ${t("Working Directory:", "作業ディレクトリ:")} ${chalk.blue(cwd)}`,
  ];
}

function getConfigInfo(): string[] {
  const lines: string[] = ["", chalk.white(t("Configuration:", "設定:"))];

  try {
    const configState = services.config.getState();
    if (configState.config) {
      lines.push(
        `  ${chalk.gray(
          t(
            `Using ${configState.config?.name}`,
            `${configState.config?.name} を使用しています`,
          ),
        )}`,
      );
    } else {
      lines.push(
        `  ${chalk.red(t("Config not found", "設定が見つかりません"))}`,
      );
    }
    if (configState.configPath) {
      lines.push(
        `  ${t("Path:", "パス:")} ${chalk.blue(configState.configPath)}`,
      );
    }

    // Add current model info
    try {
      const modelInfo = services.model?.getModelInfo();
      if (modelInfo) {
        lines.push(`  ${t("Model:", "モデル:")} ${chalk.cyan(modelInfo.name)}`);
      } else {
        lines.push(
          `  ${t("Model:", "モデル:")} ${chalk.red(t("Not available", "利用不可"))}`,
        );
      }
    } catch {
      lines.push(
        `  ${t("Model:", "モデル:")} ${chalk.red(
          t(
            "Error retrieving model info",
            "モデル情報の取得でエラーが発生しました",
          ),
        )}`,
      );
    }
  } catch {
    lines.push(
      `  ${chalk.red(t("Configuration service not available", "設定サービスが利用できません"))}`,
    );
  }

  return lines;
}

function getSessionInfo(): string[] {
  const lines: string[] = ["", chalk.white(t("Session:", "セッション:"))];

  try {
    const currentSession = getCurrentSession();
    const sessionFilePath = getSessionFilePath();
    lines.push(
      `  ${t("Title:", "タイトル:")} ${chalk.green(currentSession.title)}`,
      `  ${t("ID:", "ID:")} ${chalk.gray(currentSession.sessionId)}`,
      `  ${t("File:", "ファイル:")} ${chalk.blue(sessionFilePath)}`,
    );
  } catch {
    lines.push(
      `  ${chalk.red(t("Session not available", "セッションが利用できません"))}`,
    );
  }

  return lines;
}

function getUsageInfo(): string[] {
  const lines: string[] = ["", chalk.white(t("Usage:", "使用量:"))];

  try {
    const usage = getSessionUsage();
    if (usage.totalCost > 0) {
      lines.push(
        `  ${t("Total Cost:", "総コスト:")} ${chalk.green(`$${usage.totalCost.toFixed(6)}`)}`,
      );
      lines.push(
        `  ${t("Input Tokens:", "入力トークン:")} ${chalk.cyan(usage.promptTokens.toLocaleString())}`,
      );
      lines.push(
        `  ${t("Output Tokens:", "出力トークン:")} ${chalk.cyan(usage.completionTokens.toLocaleString())}`,
      );

      if (usage.promptTokensDetails?.cachedTokens) {
        lines.push(
          `  ${t("Cache Read Tokens:", "キャッシュ読み取りトークン:")} ${chalk.cyan(usage.promptTokensDetails.cachedTokens.toLocaleString())}`,
        );
      }

      if (usage.promptTokensDetails?.cacheWriteTokens) {
        lines.push(
          `  ${t("Cache Write Tokens:", "キャッシュ書き込みトークン:")} ${chalk.cyan(usage.promptTokensDetails.cacheWriteTokens.toLocaleString())}`,
        );
      }

      const totalTokens = usage.promptTokens + usage.completionTokens;
      lines.push(
        `  ${t("Total Tokens:", "総トークン:")} ${chalk.cyan(totalTokens.toLocaleString())}`,
      );
    } else {
      lines.push(
        `  ${chalk.gray(t("No usage data yet", "まだ使用量データがありません"))}`,
      );
    }
  } catch (error) {
    logger.warn("Failed to get session usage:", error);
    lines.push(
      `  ${chalk.red(t("Usage data not available", "使用量データが利用できません"))}`,
    );
  }

  return lines;
}

function getDiagnosticInfo(): string[] {
  const nodePath = process.execPath;
  const invokedPath = process.argv[1];

  // Get npm version
  let npmVersion = "unknown";
  try {
    npmVersion = execSync("npm --version", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    logger.warn("Failed to get npm version:", error);
  }

  return [
    "",
    chalk.white(t("Diagnostic Info", "診断情報")),
    `  ${t("Currently running:", "現在の実行:")} npm-global (${chalk.green(npmVersion)})`,
    `  ${t("Path:", "パス:")} ${chalk.blue(nodePath)}`,
    `  ${t("Invoked:", "起動方法:")} ${chalk.blue(invokedPath)}`,
  ];
}

export async function handleInfoSlashCommand() {
  const infoLines = [
    ...getVersionInfo(),
    ...getConfigInfo(),
    ...getSessionInfo(),
    ...getUsageInfo(),
    ...getDiagnosticInfo(),
  ];

  return {
    exit: false,
    output: infoLines.join("\n"),
  };
}
