import { ChildProcess, spawn } from "child_process";
import fs from "fs";

import {
  evaluateTerminalCommandSecurity,
  type ToolPolicy,
} from "@continuedev/terminal-security";

import { t } from "../i18n.js";
import { backgroundJobService } from "../services/BackgroundJobService.js";
import { services } from "../services/index.js";
import { backgroundSignalManager } from "../util/backgroundSignalManager.js";
import { emitBashToolEnded, emitBashToolStarted } from "../util/cli.js";
import {
  parseEnvNumber,
  truncateOutputFromStart,
} from "../util/truncateOutput.js";

import { Tool, ToolRunContext } from "./types.js";

// Output truncation defaults
const DEFAULT_BASH_MAX_CHARS = 50000; // ~12.5k tokens
const DEFAULT_BASH_MAX_LINES = 1000;

/**
 * When running on Windows, but inside WSL, shell commands need to run using the WSL environment.
 */
export function isRunningInWsl(): boolean {
  // WSL only applies when platform reports as Linux
  if (process.platform !== "linux") {
    return false;
  }

  if (process.env.WSL_DISTRO_NAME) {
    return true;
  }

  // Check /proc/version for Microsoft/WSL indicators
  try {
    const procVersion = fs.readFileSync("/proc/version", "utf8").toLowerCase();
    return procVersion.includes("microsoft") || procVersion.includes("wsl");
  } catch {
    return false;
  }
}

function getBashMaxChars(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_BASH_MAX_OUTPUT_CHARS,
    DEFAULT_BASH_MAX_CHARS,
  );
}

function getBashMaxLines(): number {
  return parseEnvNumber(
    process.env.CONTINUE_CLI_BASH_MAX_OUTPUT_LINES,
    DEFAULT_BASH_MAX_LINES,
  );
}

// Helper function to use login shell on Unix/macOS and PowerShell on Windows and available shell in WSL
function getShellCommand(command: string): { shell: string; args: string[] } {
  if (process.platform === "win32") {
    // Windows: Use PowerShell
    return {
      shell: "powershell.exe",
      args: ["-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", command],
    };
  }

  if (isRunningInWsl()) {
    // in WSL, bash is always available
    const wslShell = process.env.SHELL || "/bin/bash";
    return {
      shell: wslShell,
      args: ["-l", "-c", command],
    };
  }

  // Unix/macOS: Use login shell to source .bashrc/.zshrc etc.
  const userShell = process.env.SHELL || "/bin/bash";
  return { shell: userShell, args: ["-l", "-c", command] };
}

export function runCommandInBackground(command: string): {
  success: boolean;
  jobId?: string;
  error?: string;
} {
  const job = backgroundJobService.createJob(command);
  if (!job) {
    return {
      success: false,
      error: t(
        "Cannot create background job: limit of 5 concurrent jobs reached",
        "バックグラウンドジョブを作成できません: 同時実行数の上限5個に達しました",
      ),
    };
  }

  const { shell, args } = getShellCommand(command);
  const child = backgroundJobService.startJob(job.id, shell, args);

  if (!child) {
    return {
      success: false,
      error: t(
        `Failed to start background job ${job.id}`,
        `バックグラウンドジョブ ${job.id} を開始できませんでした`,
      ),
    };
  }

  return {
    success: true,
    jobId: job.id,
  };
}

export const runTerminalCommandTool: Tool = {
  name: "Bash",
  displayName: "Bash",
  description: `ターミナルコマンドを実行し、その出力を返します

コマンドは現在の作業ディレクトリ（${process.cwd()}）から自動的に実行されるため、「cd」コマンドでディレクトリを変更する必要はありません。

重要: ファイルの編集には bash コマンド（sed、awk など）ではなく Edit/MultiEdit ツールを使用してください。
`,
  parameters: {
    type: "object",
    required: ["command"],
    properties: {
      command: {
        type: "string",
        description: "ターミナルで実行するコマンド。",
      },
      timeout: {
        type: "number",
        description:
          "任意のタイムアウト（秒、最大600）。既定の180秒を超えるコマンドでこのパラメータを使用してください。",
      },
    },
  },
  readonly: false,
  isBuiltIn: true,
  evaluateToolCallPolicy: (
    basePolicy: ToolPolicy,
    parsedArgs: Record<string, unknown>,
  ): ToolPolicy => {
    return evaluateTerminalCommandSecurity(
      basePolicy,
      parsedArgs.command as string,
    );
  },
  preprocess: async (args) => {
    const command = args.command;
    if (!command || typeof command !== "string") {
      throw new Error(
        t(
          "command arg is required and must be a non-empty string",
          "command 引数は必須であり、空でない文字列である必要があります",
        ),
      );
    }
    const truncatedCmd =
      command.length > 60 ? command.substring(0, 60) + "..." : command;
    return {
      args,
      preview: [
        {
          type: "text",
          content: t(`Will run: ${truncatedCmd}`, `実行予定: ${truncatedCmd}`),
        },
      ],
    };
  },
  run: async (
    {
      command,
      timeout,
    }: {
      command: string;
      timeout?: number;
    },
    context?: ToolRunContext,
  ): Promise<string> => {
    // Divide limits by parallel tool call count to avoid context overflow
    const parallelCount = context?.parallelToolCallCount ?? 1;
    const baseMaxChars = getBashMaxChars();
    const baseMaxLines = getBashMaxLines();
    const maxChars = Math.floor(baseMaxChars / parallelCount);
    const maxLines = Math.floor(baseMaxLines / parallelCount);

    emitBashToolStarted();

    const terminalOutput: string = await new Promise((resolve, reject) => {
      // Use same shell logic as core implementation
      const { shell, args } = getShellCommand(command);
      const child = spawn(shell, args);
      let stdout = "";
      let stderr = "";
      let timeoutId: NodeJS.Timeout;
      let isResolved = false;

      // Determine timeout: use provided timeout (capped at 600s), test env variable, or default 120s
      let TIMEOUT_MS = 180000; // 180 seconds default
      if (timeout !== undefined) {
        // Cap at 600 seconds (10 minutes)
        const cappedTimeout = Math.min(timeout, 600);
        TIMEOUT_MS = cappedTimeout * 1000;
      } else if (
        process.env.NODE_ENV === "test" &&
        process.env.TEST_TERMINAL_TIMEOUT
      ) {
        TIMEOUT_MS = parseInt(process.env.TEST_TERMINAL_TIMEOUT, 10);
      }

      /**
       * Appends a note about reduced limits when parallel tool calls are in effect.
       */
      const appendParallelLimitNote = (output: string): string => {
        if (parallelCount > 1) {
          return (
            output +
            `\n\n(Note: output limit reduced due to ${parallelCount} parallel tool calls. ` +
            t(
              `Single-tool limit: ${baseMaxChars.toLocaleString()} characters or ${baseMaxLines.toLocaleString()} lines.)`,
              `1ツールあたりの上限: ${baseMaxChars.toLocaleString()} 文字または ${baseMaxLines.toLocaleString()} 行）`,
            )
          );
        }
        return output;
      };

      const moveToBackground = () => {
        if (isResolved) return;
        isResolved = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        backgroundSignalManager.off("backgroundRequested", moveToBackground);

        // Detach stdout/stderr listeners so they don't accumulate in local
        // buffers or trigger chat history updates after the tool call resolves.
        // BackgroundJobService.createJobWithProcess attaches its own listeners.
        child.stdout.removeListener("data", onStdout);
        child.stderr.removeListener("data", onStderr);

        const job = backgroundJobService.createJobWithProcess(
          command,
          child as ChildProcess,
          stdout,
        );

        if (job) {
          const truncationResult = truncateOutputFromStart(stdout, {
            maxChars,
            maxLines,
          });
          const outputSoFar = truncationResult.wasTruncated
            ? appendParallelLimitNote(truncationResult.output)
            : truncationResult.output;
          resolve(
            `Command moved to background. Job ID: ${job.id}\nOutput so far:\n${outputSoFar}\nUse CheckBackgroundJob("${job.id}") to check status.`,
          );
        } else {
          resolve(
            t(
              `Failed to move to background (job limit reached). Command continues in foreground.\nOutput so far: ${stdout}`,
              `バックグラウンドへ移動できませんでした（ジョブ数の上限に到達）。コマンドはフォアグラウンドで継続中です。\n現在の出力: ${stdout}`,
            ),
          );
        }
      };

      backgroundSignalManager.on("backgroundRequested", moveToBackground);

      const resetTimeout = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          if (isResolved) return;
          isResolved = true;
          child.kill();
          let output = stdout + (stderr ? `\nStderr: ${stderr}` : "");
          output += `\n\n[Command timed out after ${TIMEOUT_MS / 1000} seconds of no output]`;

          const truncationResult = truncateOutputFromStart(output, {
            maxChars,
            maxLines,
          });
          const finalOutput = truncationResult.wasTruncated
            ? appendParallelLimitNote(truncationResult.output)
            : truncationResult.output;
          resolve(finalOutput);
        }, TIMEOUT_MS);
      };

      const showCurrentOutput = () => {
        if (!context?.toolCallId) return;
        try {
          const currentOutput = stdout + (stderr ? `\nStderr: ${stderr}` : "");
          services.chatHistory.addToolResult(
            context.toolCallId,
            currentOutput,
            "calling",
          );
        } catch {
          // Ignore errors during streaming updates
        }
      };

      // Start the initial timeout
      resetTimeout();

      const onStdout = (data: Buffer) => {
        stdout += data.toString();
        resetTimeout();
        showCurrentOutput();
      };

      const onStderr = (data: Buffer) => {
        stderr += data.toString();
        resetTimeout();
        showCurrentOutput();
      };

      child.stdout.on("data", onStdout);
      child.stderr.on("data", onStderr);

      child.on("close", (code) => {
        if (isResolved) return;
        isResolved = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        backgroundSignalManager.removeListener(
          "backgroundRequested",
          moveToBackground,
        );

        // Only reject on non-zero exit code if there's also stderr
        if (code !== 0 && stderr) {
          reject(
            t(
              `Error (exit code ${code}): ${stderr}`,
              `エラー (終了コード ${code}): ${stderr}`,
            ),
          );
          return;
        }

        let output = stdout;
        if (stderr) {
          output = stdout + `\nStderr: ${stderr}`;
        }

        const truncationResult = truncateOutputFromStart(output, {
          maxChars,
          maxLines,
        });
        const finalOutput = truncationResult.wasTruncated
          ? appendParallelLimitNote(truncationResult.output)
          : truncationResult.output;
        resolve(finalOutput);
      });

      child.on("error", (error) => {
        if (isResolved) return;
        isResolved = true;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        backgroundSignalManager.off("backgroundRequested", moveToBackground);
        reject(t(`Error: ${error.message}`, `エラー: ${error.message}`));
      });
    });

    emitBashToolEnded();

    return terminalOutput;
  },
};
