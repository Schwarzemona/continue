import { Command } from "commander";

import { t } from "./i18n.js";

// Function to add common options to any command
export function addCommonOptions(command: Command): Command {
  return command
    .option(
      "--config <path>",
      t(
        "Configuration file for the assistant (can be a file path or hub slug)",
        "アシスタントの設定ファイル(ファイルパスまたはハブスラッグ可)",
      ),
    )
    .option(
      "--org <slug>",
      t(
        "Organization slug to use for this session (supported only in headless mode)",
        "このセッションで使用する組織スラッグ(ヘッドレスモードのみ対応)",
      ),
    )
    .option(
      "--readonly",
      t(
        "Start in plan mode (read-only tools)",
        "プランモードで開始する(読み取り専用ツール)",
      ),
    )
    .option(
      "--auto",
      t(
        "Start in auto mode (all tools allowed)",
        "自動モードで開始する(全ツール許可)",
      ),
    )
    .option("--verbose", t("Enable verbose logging", "詳細ログを有効化する"))
    .option(
      "--beta-status-tool",
      t("Enable beta status tool", "ベータ版 status ツールを有効化する"),
    )
    .option(
      "--rule <rule>",
      t(
        "Add a rule (can be a file path, hub slug, or string content). Can be specified multiple times.",
        "ルールを追加する(ファイルパス、ハブスラッグ、文字列内容のいずれも可)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--mcp <slug>",
      t(
        "Add an MCP server from the hub (slug in format 'owner/package'). Can be specified multiple times.",
        "ハブからMCPサーバーを追加する(形式は 'owner/package' のスラッグ)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--model <slug>",
      t(
        "Add a model from the hub (slug in format 'owner/package'). Can be specified multiple times.",
        "ハブからモデルを追加する(形式は 'owner/package' のスラッグ)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--prompt <prompt>",
      t(
        "Add to the initial user message (can be a file path, hub slug, or string content). Can be specified multiple times.",
        "初期ユーザーメッセージへ追加する(ファイルパス、ハブスラッグ、文字列内容のいずれも可)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--allow <tool>",
      t(
        "Allow specified tool (overrides default policies). Can be specified multiple times.",
        "指定ツールを許可する(既定ポリシーを上書き)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--ask <tool>",
      t(
        "Ask for permission before using specified tool (overrides default policies). Can be specified multiple times.",
        "指定ツールの使用前に権限を確認する(既定ポリシーを上書き)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--exclude <tool>",
      t(
        "Exclude specified tool from use (overrides default policies). Can be specified multiple times.",
        "指定ツールを使用対象から除外する(既定ポリシーを上書き)。複数回指定できます。",
      ),
      (value: string, previous: string[] | undefined) => {
        const array = Array.isArray(previous) ? previous : [];
        array.push(value);
        return array;
      },
      [] as string[],
    )
    .option(
      "--agent <slug>",
      t(
        "Load agent file from the hub (slug in format 'owner/package')",
        "ハブからエージェントファイルを読み込む(形式は 'owner/package' のスラッグ)",
      ),
    );
}

// Function to merge parent options into subcommand options
export function mergeParentOptions(parentCommand: Command, options: any): any {
  const parentOpts = parentCommand.opts();
  const mergedOptions = { ...options };

  // List of options to inherit from parent if not present in subcommand
  const inheritableOptions = [
    "config",
    "org",
    "readonly",
    "auto",
    "tools",
    "verbose",
    "rule",
    "mcp",
    "model",
    "prompt",
    "allow",
    "ask",
    "exclude",
    "agent",
  ];

  for (const optName of inheritableOptions) {
    if (
      parentOpts[optName] !== undefined &&
      mergedOptions[optName] === undefined
    ) {
      mergedOptions[optName] = parentOpts[optName];
    }
  }

  return mergedOptions;
}
