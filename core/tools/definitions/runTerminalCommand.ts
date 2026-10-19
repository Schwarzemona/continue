import {
  evaluateTerminalCommandSecurity,
  ToolPolicy,
} from "@continuedev/terminal-security";
import os from "os";
import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

/**
 * Get the preferred shell for the current platform
 * @returns The preferred shell command or path
 */
function getPreferredShell(): string {
  const platform = os.platform();

  if (platform === "win32") {
    return "pwsh.exe";
  } else if (platform === "darwin") {
    return process.env.SHELL || "/bin/zsh";
  } else {
    // Linux and other Unix-like systems
    return process.env.SHELL || "/bin/bash";
  }
}

const PLATFORM_INFO = `${os.platform()}、${os.arch()}、およびシェル${getPreferredShell()}に最適化されたターミナルコマンドとスクリプトを選択してください。`;

const RUN_COMMAND_NOTES = `シェルはステートフルではなく、以前のコマンドを記憶しません。\
      特別な権限や管理者権限を必要とするコマンドは実行できません。\
      重要: ファイルを編集するには、コマンド（sed, awkなど）の代わりに必ずEdit/MultiEditツールを使用します。\
      ${PLATFORM_INFO}`;

export const runTerminalCommandTool: Tool = {
  type: "function",
  displayTitle: "Run Terminal Command",
  wouldLikeTo: "コマンドを実行:",
  isCurrently: "コマンドを実行中:",
  hasAlready: "コマンドを実行:",
  readonly: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.RunTerminalCommand,
    description: `現在のディレクトリでターミナルコマンドを実行します。\n${RUN_COMMAND_NOTES}`,
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "実行するコマンド。これはIDEのシェルに直接渡されます。",
        },
        waitForCompletion: {
          type: "boolean",
          description:
            "コマンドの完了を待ってから戻るかどうか。デフォルトはtrueです。falseに設定するとコマンドをバックグラウンドで実行します。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithPermission",
  evaluateToolCallPolicy: (
    basePolicy: ToolPolicy,
    parsedArgs: Record<string, unknown>,
  ): ToolPolicy => {
    return evaluateTerminalCommandSecurity(
      basePolicy,
      parsedArgs.command as string,
    );
  },
  systemMessageDescription: {
    prefix: `To run a terminal command, use the ${BuiltInToolNames.RunTerminalCommand} tool
${RUN_COMMAND_NOTES}
You can also optionally include the waitForCompletion argument set to false to run the command in the background.      
For example, to see the git log, you could respond with:`,
    exampleArgs: [["command", "git log"]],
  },
};
