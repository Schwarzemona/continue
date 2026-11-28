import fs from "fs";

import { type AssistantConfig } from "@continuedev/sdk";
import chalk from "chalk";
import type { Session } from "core/index.js";
import historyManager from "core/util/history.js";
import { v4 as uuidv4 } from "uuid";

import { getAllSlashCommands } from "./commands/commands.js";
import { handleInit } from "./commands/init.js";
import { t } from "./i18n.js";
import { handleInfoSlashCommand } from "./infoScreen.js";
import { getCurrentSession, updateSessionTitle } from "./session.js";
import { buildImportSkillPrompt } from "./tools/skills.js";
import { SlashCommandResult } from "./ui/hooks/useChat.types.js";
import {
  getSkillSlashCommandName,
  loadMarkdownSkills,
} from "./util/loadMarkdownSkills.js";

type CommandHandler = (
  args: string[],
  assistant: AssistantConfig,
) => Promise<SlashCommandResult> | SlashCommandResult;

async function handleHelp(_args: string[], _assistant: AssistantConfig) {
  const helpMessage = [
    chalk.bold(t("Keyboard Shortcuts:", "キーボードショートカット:")),
    "",
    chalk.white(t("Navigation:", "移動:")),
    `  ${chalk.cyan("↑/↓")}        ${t("Navigate command/file suggestions or history", "コマンド/ファイルの補完候補または履歴を移動する")}`,
    `  ${chalk.cyan("Tab")}        ${t("Complete command or file selection", "コマンドまたはファイル選択を確定する")}`,
    `  ${chalk.cyan("Enter")}      ${t("Submit message", "メッセージを送信する")}`,
    `  ${chalk.cyan("Shift+Enter")} ${t("New line", "改行")}`,
    `  ${chalk.cyan("\\")}          ${t("Line continuation (at end of line)", "行の続き(行末尾で)")}`,
    `  ${chalk.cyan("!")}          ${t("Shell mode - run shell commands", "シェルモード - シェルコマンドを実行")}`,
    "",
    chalk.white(t("Controls:", "操作:")),
    `  ${chalk.cyan("Ctrl+C")}     ${t("Clear input", "入力をクリアする")}`,
    `  ${chalk.cyan("Ctrl+D")}     ${t("Exit application", "アプリケーションを終了する")}`,
    `  ${chalk.cyan("Ctrl+L")}     ${t("Clear screen", "画面をクリアする")}`,
    `  ${chalk.cyan("Shift+Tab")}  ${t("Cycle permission modes (normal/plan/auto)", "権限モードを切り替える(normal/plan/auto)")}`,
    `  ${chalk.cyan("Esc")}        ${t("Cancel streaming or close suggestions", "ストリーミングを中断または補完候補を閉じる")}`,
    "",
    chalk.white(t("Special Characters:", "特殊文字:")),
    `  ${chalk.cyan("@")}          ${t("Search and attach files for context", "ファイルを検索してコンテキストに添付する")}`,
    `  ${chalk.cyan("/")}          ${t("Access slash commands", "スラッシュコマンドを開く")}`,
    `  ${chalk.cyan("!")}          ${t("Execute bash commands directly", "bashコマンドを直接実行する")}`,
    "",
    chalk.white(t("Available Commands:", "利用可能なコマンド:")),
    `  ${t(
      `Type ${chalk.cyan("/")} to see available slash commands`,
      `${chalk.cyan("/")} を入力すると利用可能なスラッシュコマンドを一覧できます`,
    )}`,
    `  ${t(
      `Type ${chalk.cyan("!")} followed by a command to execute bash directly`,
      `${chalk.cyan("!")} の後にコマンドを入力すると bash を直接実行できます`,
    )}`,
  ].join("\n");
  return { output: helpMessage };
}

async function handleFork() {
  try {
    const currentSession = getCurrentSession();
    const forkCommand = `cn --fork ${currentSession.sessionId}`;
    // Try to copy to clipboard dynamically to avoid hard dependency in tests
    try {
      const clipboardy = await import("clipboardy");
      await clipboardy.default.write(forkCommand);
      return {
        exit: false,
        output: chalk.gray(
          `${forkCommand} ${t("(copied to clipboard)", "(クリップボードにコピーしました)")}`,
        ),
      };
    } catch {
      return {
        exit: false,
        output: chalk.gray(`${forkCommand}`),
      };
    }
  } catch (error: any) {
    return {
      exit: false,
      output: chalk.red(
        `${t("Failed to create fork command:", "フォークコマンドの作成に失敗しました:")} ${error.message}`,
      ),
    };
  }
}

function handleTitle(args: string[]) {
  const title = args.join(" ").trim();
  if (!title) {
    return {
      exit: false,
      output: chalk.yellow(
        t(
          "Please provide a title. Usage: /title <your title>",
          "タイトルを入力してください。使い方: /title <タイトル>",
        ),
      ),
    };
  }

  try {
    updateSessionTitle(title);
    return {
      exit: false,
      output: chalk.green(
        `${t("Session title updated to:", "セッションタイトルを更新しました:")} "${title}"`,
      ),
    };
  } catch (error: any) {
    return {
      exit: false,
      output: chalk.red(
        `${t("Failed to update title:", "タイトルの更新に失敗しました:")} ${error.message}`,
      ),
    };
  }
}

function handleJobs() {
  return { openJobsSelector: true };
}

async function handleSkills(): Promise<SlashCommandResult> {
  const { skills } = await loadMarkdownSkills();

  if (!skills.length) {
    return {
      exit: false,
      output: chalk.yellow(
        t(
          "No skills found. Add skills under .continue/skills or .claude/skills.",
          "スキルが見つかりません。.continue/skills または .claude/skills にスキルを追加してください。",
        ),
      ),
    };
  }

  const header = chalk.bold(t("Available skills:", "利用可能なスキル:"));
  const lines = skills.map(
    (skill) =>
      `${chalk.cyan(skill.name)} - ${skill.description} ${chalk.gray(
        `(${skill.path})`,
      )}`,
  );

  return {
    exit: false,
    output: [header, "", ...lines].join("\n"),
  };
}

async function handleImportSkill(args: string[]): Promise<SlashCommandResult> {
  const query = args.join(" ").trim();

  if (!query) {
    return {
      exit: false,
      output: chalk.yellow(
        t(
          "Please provide a skill URL or name. Usage: /import-skill <url-or-name>",
          "スキルのURLまたは名前を入力してください。使い方: /import-skill <url-or-name>",
        ),
      ),
    };
  }

  return {
    newInput: buildImportSkillPrompt(query),
  };
}

function handleSessions() {
  return { openSessionSelector: true };
}

const EXPORTED_SESSION_VERSION = 1;

interface ExportedSession {
  version: number;
  exportedAt: string;
  session: Session;
}

function isValidExportedSession(data: unknown): data is ExportedSession {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    obj.version === EXPORTED_SESSION_VERSION &&
    typeof obj.exportedAt === "string" &&
    typeof obj.session === "object" &&
    obj.session !== null &&
    typeof (obj.session as Record<string, unknown>).sessionId === "string" &&
    typeof (obj.session as Record<string, unknown>).title === "string" &&
    Array.isArray((obj.session as Record<string, unknown>).history)
  );
}

function handleExport(_args: string[]): SlashCommandResult {
  return {
    exit: false,
    openExportSelector: true,
  };
}

function handleImport(args: string[]): SlashCommandResult {
  const filePath = args.join(" ").trim();
  if (!filePath) {
    return {
      exit: false,
      output: chalk.yellow(
        t(
          "Please provide a file path. Usage: /import <file-path>",
          "ファイルパスを入力してください。使い方: /import <file-path>",
        ),
      ),
    };
  }

  if (!fs.existsSync(filePath)) {
    return {
      exit: false,
      output: chalk.red(
        `${t("File not found:", "ファイルが見つかりません:")} ${filePath}`,
      ),
    };
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const exportedData: unknown = JSON.parse(fileContent);

    if (!isValidExportedSession(exportedData)) {
      return {
        exit: false,
        output: chalk.red(
          t(
            "Invalid session file: expected a valid Continue exported session (version 1).",
            "無効なセッションファイル: 有効な Continue エクスポートセッション(バージョン1)が必要です。",
          ),
        ),
      };
    }

    let session = exportedData.session;

    const existing = historyManager.load(session.sessionId);
    const sessionExists = existing.history.length > 0;

    if (sessionExists) {
      const originalId = session.sessionId;
      session = {
        ...session,
        sessionId: uuidv4(),
      };
      historyManager.save(session);
      return {
        exit: false,
        output: chalk.green(
          `${t("Session imported with new ID:", "新しいIDでセッションをインポートしました:")} ${session.sessionId}\n` +
            chalk.gray(
              `(${t("original ID", "元のID")}: ${originalId} ${t("already existed", "は既に存在していました")})`,
            ),
        ),
      };
    }

    historyManager.save(session);
    return {
      exit: false,
      output: chalk.green(
        `${t("Session imported:", "セッションをインポートしました:")} ${session.sessionId} (${session.title})`,
      ),
    };
  } catch (error: any) {
    return {
      exit: false,
      output: chalk.red(
        `${t("Failed to import session:", "セッションのインポートに失敗しました:")} ${error.message}`,
      ),
    };
  }
}

const commandHandlers: Record<string, CommandHandler> = {
  help: handleHelp,
  clear: () => {
    return {
      clear: true,
      output: t("Chat history cleared", "チャット履歴を消去しました"),
    };
  },
  exit: () => {
    return { exit: true, output: t("Goodbye!", "さようなら！") };
  },
  config: () => {
    return { openConfigSelector: true };
  },
  info: handleInfoSlashCommand,
  model: () => ({ openModelSelector: true }),
  compact: () => {
    return { compact: true };
  },
  mcp: () => {
    return { openMcpSelector: true };
  },
  resume: () => {
    return { openSessionSelector: true };
  },
  fork: handleFork,
  title: handleTitle,
  rename: handleTitle,
  init: (args, assistant) => {
    return handleInit(args, assistant);
  },
  jobs: handleJobs,
  skills: () => handleSkills(),
  "import-skill": (args) => handleImportSkill(args),
  sessions: handleSessions,
  export: handleExport,
  import: handleImport,
};

export async function handleSlashCommands(
  input: string,
  assistant: AssistantConfig,
): Promise<SlashCommandResult | null> {
  // Only trigger slash commands if slash is the very first character
  if (!input.startsWith("/") || !input.trim().startsWith("/")) {
    return null;
  }

  const [command, ...args] = input.slice(1).split(" ");

  const handler = commandHandlers[command];
  if (handler) {
    return await handler(args, assistant);
  }

  // Check for custom assistant prompts
  const assistantPrompt = assistant.prompts?.find(
    (prompt) => prompt?.name === command,
  );
  if (assistantPrompt) {
    const newInput = assistantPrompt.prompt + args.join(" ");
    return { newInput };
  }

  // Check for invokable rules
  const invokableRule = assistant.rules?.find((rule) => {
    // Handle both string rules and rule objects
    if (!rule || typeof rule === "string") {
      return false;
    }
    const ruleObj = rule as any;
    return ruleObj.invokable === true && ruleObj.name === command;
  });
  if (invokableRule) {
    const ruleObj = invokableRule as any;
    const newInput = ruleObj.rule + " " + args.join(" ");
    return { newInput };
  }

  const { skills } = await loadMarkdownSkills();
  if (skills.length) {
    const normalizedCommand = command.trim().toLowerCase();
    const matchingSkill = skills.find(
      (skill) => getSkillSlashCommandName(skill) === normalizedCommand,
    );

    if (matchingSkill) {
      return {
        newInput: `Load the skill using the **Skills** tool and then set the **skill_name** parameter to "${matchingSkill.name}".`,
      };
    }
  }

  // Check if this command would match any available commands (same logic as UI)
  const allCommands = await getAllSlashCommands(assistant);
  const hasMatches = allCommands.some((cmd) =>
    cmd.name.toLowerCase().includes(command.toLowerCase()),
  );

  // If no commands match, treat this as regular text instead of an unknown command
  if (!hasMatches) {
    return null;
  }

  return { output: `${t("Unknown command:", "不明なコマンド:")} ${command}` };
}
