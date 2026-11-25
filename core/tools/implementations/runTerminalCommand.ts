import iconv from "iconv-lite";
import childProcess from "node:child_process";
import os from "node:os";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

// Default timeout for terminal commands (10 minutes)
const DEFAULT_TOOL_TIMEOUT_MS = 600_000;

// Automatically decode the buffer according to the platform to avoid garbled Chinese
function getDecodedOutput(data: Buffer): string {
  if (process.platform === "win32") {
    try {
      let out = iconv.decode(data, "utf-8");
      if (/�/.test(out)) {
        out = iconv.decode(data, "gbk");
      }
      return out;
    } catch {
      return iconv.decode(data, "gbk");
    }
  } else {
    return data.toString();
  }
} // Simple helper function to use login shell on Unix/macOS and PowerShell on Windows
function getShellCommand(command: string): { shell: string; args: string[] } {
  if (process.platform === "win32") {
    // Windows: Use PowerShell
    return {
      shell: "pwsh.exe",
      args: ["-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", command],
    };
  } else {
    // Unix/macOS: Use login shell to source .bashrc/.zshrc etc.
    const userShell = process.env.SHELL || "/bin/bash";
    return { shell: userShell, args: ["-l", "-c", command] };
  }
}

import type { StdioOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ToolImpl } from ".";
import { ContextItem } from "../..";
import {
  isProcessBackgrounded,
  markProcessAsRunning,
  removeBackgroundedProcess,
  removeRunningProcess,
  updateProcessOutput,
} from "../../util/processTerminalStates";
import { TERMINAL_LOG_FILENAME } from "../definitions/runTerminalCommand";
import { getBooleanArg, getStringArg } from "../parseArgs";

/**
 * Resolves the working directory from workspace dirs.
 * Falls back to home directory or temp directory if no workspace is available.
 */
function resolveWorkingDirectory(workspaceDirs: string[]): string {
  // Handle file:// URIs (local workspaces)
  const fileWorkspaceDir = workspaceDirs.find((dir) =>
    dir.startsWith("file:/"),
  );
  if (fileWorkspaceDir) {
    try {
      return fileURLToPath(fileWorkspaceDir);
    } catch {
      // fileURLToPath can fail on malformed URIs or in some remote environments
      // Fall through to default handling
    }
  }

  // Handle other URI schemes (vscode-remote://wsl, vscode-remote://ssh-remote, etc.)
  const remoteWorkspaceDir = workspaceDirs.find(
    (dir) => dir.includes("://") && !dir.startsWith("file:/"),
  );
  if (remoteWorkspaceDir) {
    try {
      const url = new URL(remoteWorkspaceDir);
      return decodeURIComponent(url.pathname);
    } catch {
      // Fall through to other handlers
    }
  }

  // Default to user's home directory with fallbacks
  try {
    return process.env.HOME || process.env.USERPROFILE || process.cwd();
  } catch {
    // Final fallback if even process.cwd() fails - use system temp directory
    return os.tmpdir();
  }
}

// Add color-supporting environment variables
const getColorEnv = () => ({
  ...process.env,
  FORCE_COLOR: "1",
  COLORTERM: "truecolor",
  TERM: "xterm-256color",
  CLICOLOR: "1",
  CLICOLOR_FORCE: "1",
});

// ログは read_file で読む前提のため、ANSI カラーシーケンスは除去して書き出す。
// GUI への partial output はライブ表示に使うため ANSI を保持する。
const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07|\x1b[()][A-Za-z0-9]/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, "");
}

interface TerminalLog {
  fsPath: string;
  uri: string;
  /** read_file に渡すワークスペース基準の相対パス */
  relativePath: string;
  /** ANSI を除去してログへ追記する */
  append(text: string): void;
}

// ログを準備する。呼び出し側は固定名を渡すため、実行のたびに同じファイルへ切り詰められ、
// 最新1コマ分のログが残る。書き出せない場合は undefined を返してコマンド実行は続ける。
// logFilename の正規化と検証は、agent による名前指定を復活させる際の足場として残している。
function createTerminalLog(
  cwd: string,
  logFilename: string,
): TerminalLog | undefined {
  // 拡張子の無いファイル名が渡されることもあるため、.log を補記して区別可能にする
  const logname =
    logFilename.length === 0 ? TERMINAL_LOG_FILENAME : logFilename;
  const filename = /\.log$/i.test(logname) ? logname : `${logname}.log`;
  const segments = filename.split(/[\\/]+/).filter((s) => s !== "");
  if (segments.includes("..") || path.isAbsolute(filename)) {
    throw new ContinueError(
      ContinueErrorReason.PathResolutionFailed,
      "logFilenameは.continue/logs/からの相対ファイル名にしてください（絶対パスと..は使用できません）。",
    );
  }
  if (!fs.existsSync(cwd)) {
    return undefined;
  }
  const relativePath = path
    .join(".continue", "logs", ...segments)
    .split(path.sep)
    .join("/");
  const fsPath = path.resolve(cwd, relativePath);
  try {
    fs.mkdirSync(path.dirname(fsPath), { recursive: true });
    // ログリンクが常に実在するファイルへ向くよう、空でも作成しておく
    fs.writeFileSync(fsPath, "");
  } catch {
    // 書き込み権限の無いフォールバック先でもコマンド実行は続ける
    return undefined;
  }
  return {
    fsPath,
    uri: pathToFileURL(fsPath).toString(),
    relativePath,
    // 実行中にログが削除されてもコマンドを止めない
    append: (text) => {
      try {
        fs.appendFileSync(fsPath, stripAnsi(text));
      } catch {
        // ログが削除済みでも実行を続ける
      }
    },
  };
}

// status は UI のバッジ専用なので、モデルへは content で終了状態とログ位置を伝える
function toTerminalLogItem(
  status: string,
  log: TerminalLog | undefined,
  description: string,
): ContextItem {
  const item: ContextItem = {
    name: "端末",
    description,
    content: log ? `${status}\nログ: ${log.relativePath}` : status,
    status,
  };
  if (log) {
    item.uri = { type: "file", value: log.uri };
  }
  return item;
}

// code が null の場合はシグナルで停止した場合
function terminationStatus(code: number | null, signal: string | null): string {
  if (code === 0) {
    return "実行完了";
  }
  if (code !== null) {
    return `コマンドが終了コード${code}で失敗`;
  }
  return `コマンドがシグナル${signal}で停止`;
}

// Only spawn processes locally when there is no remote workspace.
// With extensionKind: ["ui", "workspace"], the extension host almost always
// runs on the local machine. childProcess.spawn() executes on the extension
// host, so for any remote workspace it would run commands on the wrong machine
// (or fail with ENOENT when the local shell doesn't match the remote OS).
// All remote types delegate to ide.runCommand() which routes through VS Code's
// integrated terminal and executes in the correct remote environment.
const LOCAL_ONLY = ["", "local"];

export const runTerminalCommandImpl: ToolImpl = async (args, extras) => {
  const command = getStringArg(args, "command");
  // Default to waiting for completion if not specified
  const waitForCompletion =
    getBooleanArg(args, "waitForCompletion", false) ?? true;

  const ideInfo = await extras.ide.getIdeInfo();
  const toolCallId = extras.toolCallId || "";

  if (LOCAL_ONLY.includes(ideInfo.remoteName)) {
    // For streaming output
    if (extras.onPartialOutput) {
      try {
        const workspaceDirs = await extras.ide.getWorkspaceDirs();
        const cwd = resolveWorkingDirectory(workspaceDirs);

        const log = createTerminalLog(cwd, TERMINAL_LOG_FILENAME);

        return new Promise((resolve, reject) => {
          let terminalOutput = "";
          let timedOut = false;
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          let sigkillTimeoutId: ReturnType<typeof setTimeout> | undefined;

          // Use spawn with color environment
          const { shell, args } = getShellCommand(command);
          const childProc = childProcess.spawn(shell, args, {
            cwd,
            env: getColorEnv(), // Add enhanced environment for colors
          });

          // Track this process for foreground cancellation
          if (toolCallId && waitForCompletion) {
            markProcessAsRunning(
              toolCallId,
              childProc,
              extras.onPartialOutput,
              terminalOutput,
              log && { uri: log.uri, relativePath: log.relativePath },
            );
          }

          // Check if the child process is still running.
          // `childProc.killed` only indicates that kill() was called,
          // not that the process has actually exited.
          const isRunning = () =>
            childProc.exitCode === null && childProc.signalCode === null;

          // Set up timeout for waitForCompletion mode
          if (waitForCompletion) {
            timeoutId = setTimeout(() => {
              if (isRunning()) {
                timedOut = true;
                terminalOutput += "\n[タイムアウト: 10分経過しました]\n";
                log?.append("\n[タイムアウト: 10分経過しました]\n");

                // ライブ表示は廃止済み。完走時にタイムアウトステータスが返る

                // Try graceful termination first
                childProc.kill("SIGTERM");

                // Force kill after 5 seconds if still running
                sigkillTimeoutId = setTimeout(() => {
                  if (isRunning()) {
                    childProc.kill("SIGKILL");
                  }
                }, 5_000);
              }
            }, DEFAULT_TOOL_TIMEOUT_MS);
          }

          childProc.stdout?.on("data", (data) => {
            const newOutput = getDecodedOutput(data);
            // バックグラウンド化後もログには全出力を追記し続ける
            log?.append(newOutput);
            // Skip if this process has been backgrounded
            if (isProcessBackgrounded(toolCallId)) return;

            terminalOutput += newOutput;

            // Update the tracked output for potential cancellation notifications
            if (toolCallId && waitForCompletion) {
              updateProcessOutput(toolCallId, terminalOutput);
            }
            // 実行中のライブ表示（partial output）は廃止。出力はログにのみ追記
          });

          childProc.stderr?.on("data", (data) => {
            const newOutput = getDecodedOutput(data);
            log?.append(newOutput);
            // Skip if this process has been backgrounded
            if (isProcessBackgrounded(toolCallId)) return;

            terminalOutput += newOutput;

            // Update the tracked output for potential cancellation notifications
            if (toolCallId && waitForCompletion) {
              updateProcessOutput(toolCallId, terminalOutput);
            }
          });

          // If we don't need to wait for completion, resolve immediately
          if (!waitForCompletion) {
            const status = "コマンドはバックグラウンドで実行中……";
            resolve([toTerminalLogItem(status, log, "端末コマンド出力")]);
          }

          childProc.on("close", (code, signal) => {
            // Clear timeout on normal completion
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Clear inner SIGKILL timeout if process exits before grace period
            if (sigkillTimeoutId) {
              clearTimeout(sigkillTimeoutId);
            }

            // Clean up process tracking
            if (toolCallId) {
              if (isProcessBackgrounded(toolCallId)) {
                // 終了文言をログ末尾へ追記し、ログリンク付きで完了を UI へ通知する。
                // モデルはログを読み直す次のターンで、ログ末尾から終了を確認する
                const status = terminationStatus(code, signal);
                log?.append(`\n[${status}]\n`);
                extras.onPartialOutput?.({
                  toolCallId,
                  contextItems: [
                    toTerminalLogItem(status, log, "端末コマンド出力"),
                  ],
                });
                removeBackgroundedProcess(toolCallId);
                removeRunningProcess(toolCallId);
                return;
              }
              // Remove from foreground tracking if it was tracked
              removeRunningProcess(toolCallId);
            }

            if (waitForCompletion) {
              // Normal completion, resolve now
              const status = timedOut
                ? "タイムアウト(10分)"
                : terminationStatus(code, signal);
              resolve([toTerminalLogItem(status, log, "端末コマンド出力")]);
            } else {
              // Already resolved, just notify the UI of the final status
              const status =
                code === 0
                  ? "バックグラウンド処理完了"
                  : terminationStatus(code, signal);
              log?.append(`\n[${status}]\n`);
              if (extras.onPartialOutput) {
                extras.onPartialOutput({
                  toolCallId,
                  contextItems: [
                    toTerminalLogItem(status, log, "端末コマンド出力"),
                  ],
                });
              }
            }
          });

          childProc.on("error", (error) => {
            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Clear SIGKILL timeout to prevent delayed kill after rejection
            if (sigkillTimeoutId) {
              clearTimeout(sigkillTimeoutId);
            }

            // Clean up process tracking
            if (toolCallId) {
              if (isProcessBackgrounded(toolCallId)) {
                removeBackgroundedProcess(toolCallId);
                return;
              }
              // Remove from foreground tracking if it was tracked
              removeRunningProcess(toolCallId);
            }

            reject(error);
          });
        });
      } catch (error: any) {
        throw error;
      }
    } else {
      // Fallback to non-streaming for older clients
      const workspaceDirs = await extras.ide.getWorkspaceDirs();
      const cwd = resolveWorkingDirectory(workspaceDirs);
      const log = createTerminalLog(cwd, TERMINAL_LOG_FILENAME);

      if (waitForCompletion) {
        // Standard execution, waiting for completion
        try {
          // Use spawn approach for consistency with streaming version
          const { shell: nonStreamingShell, args: nonStreamingArgs } =
            getShellCommand(command);
          await new Promise<void>((resolve, reject) => {
            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            let sigkillTimeoutId: ReturnType<typeof setTimeout> | undefined;

            const childProc = childProcess.spawn(
              nonStreamingShell,
              nonStreamingArgs,
              {
                cwd,
                env: getColorEnv(),
              },
            );

            // Track this process for foreground cancellation
            if (toolCallId) {
              markProcessAsRunning(
                toolCallId,
                childProc,
                undefined,
                "",
                log && { uri: log.uri, relativePath: log.relativePath },
              );
            }

            // Check if the child process is still running.
            // `childProc.killed` only indicates that kill() was called,
            // not that the process has actually exited.
            const isRunning = () =>
              childProc.exitCode === null && childProc.signalCode === null;

            // Set up timeout
            timeoutId = setTimeout(() => {
              if (isRunning()) {
                log?.append("\n[タイムアウト: 10分経過しました]\n");

                // Try graceful termination first
                childProc.kill("SIGTERM");

                // Force kill after 5 seconds if still running
                sigkillTimeoutId = setTimeout(() => {
                  if (isRunning()) {
                    childProc.kill("SIGKILL");
                  }
                }, 5_000);
              }
            }, DEFAULT_TOOL_TIMEOUT_MS);

            childProc.stdout?.on("data", (data) => {
              log?.append(getDecodedOutput(data));
            });

            childProc.stderr?.on("data", (data) => {
              log?.append(getDecodedOutput(data));
            });

            childProc.on("close", (code, signal) => {
              // Clear outer timeout
              if (timeoutId) {
                clearTimeout(timeoutId);
              }

              // Clear inner SIGKILL timeout if process exits before grace period
              if (sigkillTimeoutId) {
                clearTimeout(sigkillTimeoutId);
              }

              // Clean up process tracking
              if (toolCallId) {
                removeRunningProcess(toolCallId);
              }

              if (code === 0) {
                resolve();
              } else {
                reject(
                  new ContinueError(
                    ContinueErrorReason.CommandExecutionFailed,
                    terminationStatus(code, signal),
                  ),
                );
              }
            });

            childProc.on("error", (error) => {
              // Clear timeout on error
              if (timeoutId) {
                clearTimeout(timeoutId);
              }

              // Clear SIGKILL timeout to prevent delayed kill after rejection
              if (sigkillTimeoutId) {
                clearTimeout(sigkillTimeoutId);
              }

              // Clean up process tracking
              if (toolCallId) {
                removeRunningProcess(toolCallId);
              }
              reject(error);
            });
          });

          const status = "実行完了";
          return [toTerminalLogItem(status, log, "端末コマンドの出力")];
        } catch (error: any) {
          const status = `コマンドが失敗しました: ${error.message || error.toString()}`;
          return [toTerminalLogItem(status, log, "端末コマンドの出力")];
        }
      } else {
        // For non-streaming but also not waiting for completion, use spawn
        // but don't attach any listeners other than error
        try {
          // Use spawn with color environment
          const { shell: detachedShell, args: detachedArgs } =
            getShellCommand(command);
          // fd を直接渡してログへ書き出す。パイプを接続しないためこの分岐だけ
          // ANSI を除去できないが、detached を維持できる
          const logFd = log ? fs.openSync(log.fsPath, "w") : undefined;
          const stdio: StdioOptions =
            logFd === undefined ? "ignore" : ["ignore", logFd, logFd];
          const childProc = childProcess.spawn(detachedShell, detachedArgs, {
            cwd,
            env: getColorEnv(), // Add color environment
            // Detach the process so it's not tied to the parent
            detached: true,
            stdio,
          });
          if (logFd !== undefined) {
            fs.closeSync(logFd);
          }

          // Even for detached processes, add event handlers to clean up the background process map
          childProc.on("close", (code, signal) => {
            log?.append(`\n[${terminationStatus(code, signal)}]\n`);
            if (isProcessBackgrounded(toolCallId)) {
              removeBackgroundedProcess(toolCallId);
            }
          });

          childProc.on("error", () => {
            if (isProcessBackgrounded(toolCallId)) {
              removeBackgroundedProcess(toolCallId);
            }
          });

          // Unref the child to allow the Node.js process to exit
          childProc.unref();
          const status = "コマンドはバックグラウンドで実行中……";
          return [toTerminalLogItem(status, log, "端末コマンドの出力")];
        } catch (error: any) {
          const status = `コマンドが失敗しました: ${error.message || error.toString()}`;
          return [toTerminalLogItem(status, log, "端末コマンドの出力")];
        }
      }
    }
  }

  // For remote environments (SSH, WSL, Dev Container, Codespaces, etc.),
  // delegate to VS Code's integrated terminal which handles remote execution.
  // Note: output capture and waitForCompletion are not yet supported for remotes.
  // 拡張ホストがローカル側で動くためログをリモート FS へも書けないので、ログの書き出しは行わない。
  await extras.ide.runCommand(command);
  return [
    {
      name: "端末",
      description: "端末コマンドの出力",
      content:
        "リモート端末でコマンドを実行しました。リモートではログの書き出しも出力・終了コードの捕捉もできないため、VS Code 統合端末の出力をご確認ください。",
      status: "実行",
    },
  ];
};
