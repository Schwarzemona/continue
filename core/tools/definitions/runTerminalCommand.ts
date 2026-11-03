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

const PLATFORM_INFO = `${os.platform()}、${os.arch()}、およびシェル${getPreferredShell()}に最適化された端末コマンドとスクリプトを選択してください。`;

const RUN_COMMAND_NOTES = `シェルはステートフルではなく、以前のコマンドを記憶しません。\
特別な権限や管理者権限を必要とするコマンドは実行できません。\
重要: ファイルの捜索や編集のコマンドは実行できません。\
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
    description: `現在のディレクトリで端末コマンドを実行します。\n${RUN_COMMAND_NOTES}`,
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
            "コマンドの完了を待ってから戻るかどうか(デフォルトはtrue)。falseに設定するとコマンドをバックグラウンドで実行します。",
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
    prefix: `端末コマンドを実行するには、${BuiltInToolNames.RunTerminalCommand} ツールを使用してください。\n${RUN_COMMAND_NOTES}\nまた、waitForCompletion 引数を false に設定して、コマンドをバックグラウンドで実行することもできます。\n例えば、git log を表示するには、次のように応答できます:`,
    exampleArgs: [["command", "git log"]],
  },
};
