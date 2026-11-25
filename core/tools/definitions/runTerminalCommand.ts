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

// agent にログ名を選ばせると .continue/logs/ にファイルが乱造されるため、単一ログに固定する。
// 実装はこの定数をログ名として使う。logFilename による指定を復活させるには、実装側で
// createTerminalLog へ args.logFilename を渡した上で、parameters へ string の logFilename を戻す。
export const TERMINAL_LOG_FILENAME = "run_terminal_command.log";

const LOG_LOCATION = `.continue/logs/${TERMINAL_LOG_FILENAME}`;

const RUN_COMMAND_NOTES = `${PLATFORM_INFO}
出力は${LOG_LOCATION}へ上書きされます。\
シェルはステートフルではなく、以前のコマンドを記憶しません。\
特別な権限や管理者権限を必要とするコマンドは実行できません。`;

export const runTerminalCommandTool: Tool = {
  type: "function",
  displayTitle: "Run Terminal Command",
  wouldLikeTo: "コマンドを実行します",
  isCurrently: "コマンドを実行中",
  hasAlready: "コマンドを実行しました",
  readonly: false,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.RunTerminalCommand,
    description: `端末コマンドを実行し、終了結果を返します。\n${RUN_COMMAND_NOTES}`,
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "実行するコマンド。",
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
    exampleArgs: [["command", "git log"]],
  },
};
