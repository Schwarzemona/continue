import { type AssistantConfig } from "@continuedev/sdk";

import { t } from "../i18n.js";
import {
  getSkillSlashCommandName,
  loadMarkdownSkills,
} from "../util/loadMarkdownSkills.js";

// Export command functions
export { chat } from "./chat.js";
export { listSessionsCommand } from "./ls.js";
export { review } from "./review.js";
export { serve } from "./serve.js";

export interface SlashCommand {
  name: string;
  description: string;
  category: "system" | "assistant";
}

export interface SystemCommand extends SlashCommand {
  category: "system";
}

// Central definition of all system slash commands
export const SYSTEM_SLASH_COMMANDS: SystemCommand[] = [
  {
    name: "help",
    description: t("Show help message", "ヘルプメッセージを表示する"),
    category: "system",
  },
  {
    name: "clear",
    description: t("Clear the chat history", "チャット履歴を消去する"),
    category: "system",
  },
  {
    name: "update",
    description: t("Update the Continue CLI", "Continue CLIを更新する"),
    category: "system",
  },
  {
    name: "info",
    description: t("Show session information", "セッション情報を表示する"),
    category: "system",
  },
  {
    name: "model",
    description: t(
      "Switch between available chat models",
      "利用可能なチャットモデルを切り替える",
    ),
    category: "system",
  },
  {
    name: "config",
    description: t("Switch configuration", "設定を切り替える"),
    category: "system",
  },
  {
    name: "mcp",
    description: t(
      "Manage MCP server connections",
      "MCPサーバー接続を管理する",
    ),
    category: "system",
  },
  {
    name: "init",
    description: t("Create an AGENTS.md file", "AGENTS.mdファイルを作成する"),
    category: "system",
  },
  {
    name: "compact",
    description: t(
      "Summarize chat history into a compact form",
      "チャット履歴をコンパクトな形に要約する",
    ),
    category: "system",
  },
  {
    name: "resume",
    description: t(
      "Resume a previous chat session",
      "過去のチャットセッションを再開する",
    ),
    category: "system",
  },
  {
    name: "fork",
    description: t(
      "Start a forked chat session from the current history",
      "現在の履歴からフォークしたチャットセッションを開始する",
    ),
    category: "system",
  },
  {
    name: "title",
    description: t(
      "Set the title for the current session",
      "現在のセッションのタイトルを設定する",
    ),
    category: "system",
  },
  {
    name: "rename",
    description: t(
      "Rename the current session",
      "現在のセッション名を変更する",
    ),
    category: "system",
  },
  {
    name: "exit",
    description: t("Exit the chat", "チャットを終了する"),
    category: "system",
  },
  {
    name: "jobs",
    description: t("List background jobs", "バックグラウンドジョブを一覧する"),
    category: "system",
  },
  {
    name: "sessions",
    description: t(
      "Show all chat sessions",
      "全てのチャットセッションを表示する",
    ),
    category: "system",
  },
  {
    name: "skills",
    description: t("List all available skills", "利用可能な全スキルを一覧する"),
    category: "system",
  },
  {
    name: "import-skill",
    description: t(
      "Import a skill from a URL or name into ~/.continue/skills",
      "URLまたは名前からスキルを ~/.continue/skills へインポートする",
    ),
    category: "system",
  },
  {
    name: "export",
    description: t(
      "Export a session to JSON file",
      "セッションをJSONファイルへエクスポートする",
    ),
    category: "system",
  },
  {
    name: "import",
    description: t(
      "Import a session from JSON file",
      "JSONファイルからセッションをインポートする",
    ),
    category: "system",
  },
];

export const REMOTE_MODE_SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "exit",
    description: t("Exit the remote environment", "リモート環境を終了する"),
    category: "system",
  },
  {
    name: "diff",
    description: t(
      "Show the current diff from the remote environment",
      "リモート環境の現在の差分を表示する",
    ),
    category: "system",
  },
  {
    name: "apply",
    description: t(
      "Apply the current diff to the local working tree",
      "現在の差分をローカルの作業ツリーへ適用する",
    ),
    category: "system",
  },
];

/**
 * Get all available slash commands including system commands and assistant prompts
 */
export async function getAllSlashCommands(
  assistant: AssistantConfig,
  options: { isRemoteMode?: boolean } = {},
): Promise<SlashCommand[]> {
  const { isRemoteMode = false } = options;

  // In remote mode, only show the exit command
  if (isRemoteMode) {
    return REMOTE_MODE_SLASH_COMMANDS;
  }

  // All system commands are available
  const systemCommands = SYSTEM_SLASH_COMMANDS;

  // Get assistant prompt commands
  const assistantCommands: SlashCommand[] =
    assistant?.prompts?.map((prompt) => ({
      name: prompt?.name || "",
      description: prompt?.description || "",
      category: "assistant" as const,
    })) || [];

  // Get invokable rule commands
  const invokableRuleCommands = getInvokableRuleSlashCommands(assistant);

  // Get skill commands
  const skillCommands = await getSkillSlashCommands();

  return [
    ...systemCommands,
    ...assistantCommands,
    ...invokableRuleCommands,
    ...skillCommands,
  ];
}

/**
 * Get assistant prompt commands only
 */
export function getAssistantSlashCommands(
  assistant: AssistantConfig,
): SlashCommand[] {
  return (
    assistant?.prompts?.map((prompt) => ({
      name: prompt?.name || "",
      description: prompt?.description || "",
      category: "assistant" as const,
    })) || []
  );
}

/**
 * Get invokable rule commands from assistant config
 */
export function getInvokableRuleSlashCommands(
  assistant: AssistantConfig,
): SlashCommand[] {
  if (!assistant?.rules) {
    return [];
  }

  return assistant.rules
    .filter((rule) => {
      // Handle both string rules and rule objects
      if (!rule || typeof rule === "string") {
        return false;
      }
      // Only include rules with invokable: true
      return rule.invokable === true;
    })
    .map((rule) => {
      // TypeScript now knows rule is an object with invokable: true
      const ruleObj = rule as any;
      return {
        name: ruleObj.name || "",
        description: ruleObj.description || "",
        category: "assistant" as const,
      };
    });
}

/**
 * Get skill-based slash commands from Markdown skills
 */
export async function getSkillSlashCommands(): Promise<SlashCommand[]> {
  const { skills } = await loadMarkdownSkills();

  return skills.map((skill) => ({
    name: getSkillSlashCommandName(skill),
    description: skill.description,
    category: "assistant" as const,
  }));
}
