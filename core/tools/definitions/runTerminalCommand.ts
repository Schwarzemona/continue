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

const PLATFORM_INFO = `環境は${os.platform()}の${os.arch()}で${getPreferredShell()}です。`;

const RUN_COMMAND_NOTES = `${PLATFORM_INFO}
コマンドの出力はlogFilenameで指定した.continue/logs/下のログファイルへ書き出されます。\
シェルはステートフルではなく、以前のコマンドを記憶しません。\
特別な権限や管理者権限を必要とするコマンドは実行できません。`;

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
    description: `端末コマンドを実行します。\n${RUN_COMMAND_NOTES}`,
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "実行するコマンド。",
        },
        logFilename: {
          type: "string",
          description: "ログを書き出すログファイル名。",
        },
        waitForCompletion: {
          type: "boolean",
          description:
            "コマンドの完了を待ってから戻るかどうか(デフォルトはtrue)。falseに設定するとコマンドをバックグラウンドで実行します。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
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
    exampleArgs: [
      ["command", "git log"],
      ["logFilename", "git-log.log"],
    ],
  },
};
