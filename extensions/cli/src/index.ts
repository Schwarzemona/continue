#!/usr/bin/env node

// MUST be the first import - intercepts console/stdout/stderr before any dependencies load
import "./init.js";

import { Command } from "commander";

import { chat } from "./commands/chat.js";
import { checks } from "./commands/checks.js";
import { listSessionsCommand } from "./commands/ls.js";
import { review } from "./commands/review.js";
import { serve } from "./commands/serve.js";
import {
  handleValidationErrors,
  validateFlags,
} from "./flags/flagValidator.js";
import { t } from "./i18n.js";
import { configureConsoleForHeadless, safeStderr } from "./init.js";
import { addCommonOptions, mergeParentOptions } from "./shared-options.js";
import { post } from "./util/apiClient.js";
import { markUnhandledError } from "./util/errorState.js";
import { gracefulExit } from "./util/exit.js";
import { logger } from "./util/logger.js";
import { readStdinSync } from "./util/stdin.js";
import { getVersion } from "./version.js";

// TUI lifecycle and two-stage exit state management
let tuiUnmount: (() => void) | null;
let showExitMessage: boolean;
let exitMessageCallback: (() => void) | null;
let lastCtrlCTime: number;

// Agent ID for serve mode - set when serve command is invoked with --id
let agentId: string | undefined;

// Initialize state immediately to avoid temporal dead zone issues with exported functions
(function initializeTUIState() {
  tuiUnmount = null;
  showExitMessage = false;
  exitMessageCallback = null;
  lastCtrlCTime = 0;
})();

// Set the agent ID for error reporting (called by serve command)
export function setAgentId(id: string | undefined) {
  agentId = id;
}

// Register TUI cleanup function for graceful shutdown
export function setTUIUnmount(unmount: () => void) {
  tuiUnmount = unmount;
}

// Register callback to trigger UI updates when exit message state changes
export function setExitMessageCallback(callback: () => void) {
  exitMessageCallback = callback;
}

// Sets up SIGINT handler that requires double Ctrl+C within 1 second to exit
export function enableSigintHandler() {
  // Remove all existing SIGINT listeners first
  process.removeAllListeners("SIGINT");

  process.on("SIGINT", async () => {
    const now = Date.now();
    const timeSinceLastCtrlC = now - lastCtrlCTime;

    if (timeSinceLastCtrlC <= 1000 && lastCtrlCTime !== 0) {
      // Second Ctrl+C within 1 second - exit
      showExitMessage = false;
      if (tuiUnmount) {
        tuiUnmount();
      }
      await gracefulExit(0);
    } else {
      // First Ctrl+C or too much time elapsed - show exit message
      lastCtrlCTime = now;
      showExitMessage = true;
      if (exitMessageCallback) {
        exitMessageCallback();
      }

      // Hide message after 1 second
      setTimeout(() => {
        showExitMessage = false;
        if (exitMessageCallback) {
          exitMessageCallback();
        }
      }, 1000);
    }
  });
}

// Check if "ctrl+c to exit" message should be displayed
export function shouldShowExitMessage(): boolean {
  return showExitMessage;
}

// Helper to report unhandled errors to the API when running in serve mode
async function reportUnhandledErrorToApi(error: Error): Promise<void> {
  if (!agentId) {
    // Not running in serve mode with an agent ID, skip API reporting
    return;
  }

  try {
    await post(`agents/${agentId}/status`, {
      status: "FAILED",
      errorMessage: `Unhandled error: ${error.message}`,
    });
    logger.debug(`Reported unhandled error to API for agent ${agentId}`);
  } catch (apiError) {
    // If API reporting fails, just log it - don't crash
    logger.debug(
      `Failed to report error to API: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
    );
  }
}

// Add global error handlers to prevent uncaught errors from crashing the process
process.on("unhandledRejection", (reason, promise) => {
  // Mark that an unhandled error occurred - this will cause non-zero exit
  markUnhandledError();

  // Extract useful information from the reason
  const errorDetails = {
    promiseString: String(promise),
    reasonType: typeof reason,
    reasonConstructor: reason?.constructor?.name,
  };

  // If reason is an Error, use it directly for better stack traces
  if (reason instanceof Error) {
    logger.error("Unhandled Promise Rejection", reason, errorDetails);
    // Report to API if running in serve mode
    reportUnhandledErrorToApi(reason).catch(() => {
      // Silently fail if API reporting errors - already logged in helper
    });
  } else {
    // Convert non-Error reasons to Error for consistent handling
    const error = new Error(`Unhandled rejection: ${String(reason)}`);
    logger.error("Unhandled Promise Rejection", error, {
      ...errorDetails,
      originalReason: String(reason),
    });
    // Report to API if running in serve mode
    reportUnhandledErrorToApi(error).catch(() => {
      // Silently fail if API reporting errors - already logged in helper
    });
  }

  // Don't exit the process immediately, but hasUnhandledError will cause non-zero exit later
});

process.on("uncaughtException", (error) => {
  // Mark that an unhandled error occurred - this will cause non-zero exit
  markUnhandledError();

  logger.error("Uncaught Exception:", error);
  // Report to API if running in serve mode
  reportUnhandledErrorToApi(error).catch(() => {
    // Silently fail if API reporting errors - already logged in helper
  });
  // Don't exit the process immediately, but hasUnhandledError will cause non-zero exit later
});

// keyboard interruption handler for non-TUI flows
process.on("SIGINT", async () => {
  await gracefulExit(130);
});

const program = new Command();

program
  .name("cn")
  .description(
    t(
      "Continue CLI - AI-powered development assistant. Starts an interactive session by default, use -p/--print for non-interactive output.",
      "Continue CLI - AI活用型の開発アシスタント。既定では対話セッションを開始します。非対話の出力には -p/--print を使用してください。",
    ),
  )
  .version(
    getVersion(),
    "-v, --version",
    t("Display version number", "バージョン番号を表示する"),
  );

// Root command - chat functionality (default)
// Add common options to the root command
addCommonOptions(program)
  .argument(
    "[prompt]",
    t(
      "Optional prompt to send to the assistant",
      "アシスタントへ送信する任意のプロンプト",
    ),
  )
  .option(
    "-p, --print",
    t(
      "Print response and exit (useful for pipes)",
      "応答を出力して終了する(パイプ連携に便利)",
    ),
  )
  .option(
    "--format <format>",
    t(
      "Output format for headless mode (json). Only works with -p/--print flag.",
      "ヘッドレスモードの出力形式(json)。-p/--print フラグと併せてのみ動作します。",
    ),
  )
  .option(
    "--silent",
    t(
      "Strip <think></think> tags and excess whitespace from output. Only works with -p/--print flag.",
      "出力から <think></think> タグと過剰な空白を除く。-p/--print フラグと併せてのみ動作します。",
    ),
  )
  .option(
    "--resume",
    t("Resume from last session", "前回のセッションから再開する"),
  )
  .option(
    "--fork <sessionId>",
    t("Fork from an existing session ID", "既存のセッションIDからフォークする"),
  )
  .option(
    "--beta-subagent-tool",
    t(
      "Enable beta Subagent tool for invoking subagents",
      "サブエージェント呼び出し用のベータ版 Subagent ツールを有効化する",
    ),
  )
  .action(async (prompt, options) => {
    // Handle piped input - detect it early and decide on mode
    let stdinInput = null;

    if (!options.print) {
      // Check if there's piped input available
      stdinInput = readStdinSync();
      if (stdinInput) {
        // Use piped input as the initial prompt
        if (prompt) {
          // Combine stdin and prompt argument
          prompt = `${stdinInput}\n\n${prompt}`;
        } else {
          // Only stdin input, use as initial prompt
          prompt = stdinInput;
        }

        // We have piped input but want to use TUI mode
        // Store a flag to pass custom stdin to TUI
        (options as any).hasPipedInput = true;
      }
    }

    // Configure console overrides FIRST, before any other logging
    const isHeadless = options.print;
    configureConsoleForHeadless(isHeadless);
    logger.configureHeadlessMode(isHeadless);

    // Validate all command line flags
    const validation = validateFlags({
      print: options.print,
      format: options.format,
      silent: options.silent,
      readonly: options.readonly,
      auto: options.auto,
      config: options.config,
      resume: options.resume,
      fork: options.fork,
      allow: options.allow,
      ask: options.ask,
      exclude: options.exclude,
      isRootCommand: true,
      commandName: "cn",
    });

    if (!validation.isValid) {
      handleValidationErrors(validation.errors);
    }

    if (options.verbose) {
      logger.setLevel("debug");
      const logPath = logger.getLogPath();
      const sessionId = logger.getSessionId();
      // In headless mode, suppress these verbose logs
      if (!isHeadless) {
        console.log(
          t(
            `Verbose logging enabled (session: ${sessionId})`,
            `詳細ログを有効化しました(セッション: ${sessionId})`,
          ),
        );
        console.log(t(`Logs: ${logPath}`, `ログ: ${logPath}`));
        console.log(
          t(
            `Filter this session: grep '\\[${sessionId}\\]' ${logPath}`,
            `このセッションのみ抽出: grep '\\[${sessionId}\\]' ${logPath}`,
          ),
        );
      }
      logger.debug("Verbose logging enabled");
    }

    // Handle piped input for headless mode (only if we haven't already read it)
    if (options.print && !stdinInput) {
      const headlessStdinInput = readStdinSync();
      if (headlessStdinInput) {
        if (prompt) {
          // Combine stdin and prompt argument - stdin comes first in XML block
          prompt = `<stdin>\n${headlessStdinInput}\n</stdin>\n\n${prompt}`;
        } else {
          // Only stdin input, use as-is
          prompt = headlessStdinInput;
        }
      }
    }

    // In headless mode, ensure we have a prompt unless using --agent flag or --resume flag
    // Agent files can provide their own prompts, and resume can work without new input
    if (options.print && !prompt && !options.agent && !options.resume) {
      safeStderr(
        t(
          "Error: A prompt is required when using the -p/--print flag, unless --prompt, --agent, or --resume is provided.\n\n",
          "エラー: -p/--print フラグの使用時には、--prompt、--agent、--resume のいずれかを指定しない限りプロンプトが必須です。\n\n",
        ),
      );
      safeStderr(t("Usage examples:\n", "使用例:\n"));
      safeStderr('  cn -p "please review my current git diff"\n');
      safeStderr('  echo "hello" | cn -p\n');
      safeStderr('  cn -p "analyze the code in src/"\n');
      safeStderr("  cn -p --agent my-org/my-agent\n");
      safeStderr("  cn -p --prompt my-org/my-prompt\n");
      safeStderr("  cn -p --resume\n");
      await gracefulExit(1);
    }

    // Map --print to headless mode
    options.headless = options.print;
    options.print = undefined;
    await chat(prompt, options);
  });

// List sessions subcommand
program
  .command("ls")
  .description(
    t(
      "List recent chat sessions and select one to resume",
      "最近のチャットセッションを一覧し、再開するものを選択する",
    ),
  )
  .option("--json", t("Output in JSON format", "JSON形式で出力する"))
  .action(async (options) => {
    await listSessionsCommand({
      format: options.json ? "json" : undefined,
    });
  });

// Serve subcommand
program
  .command("serve [prompt]", { hidden: true })
  .description(
    t(
      "Start an HTTP server with /state and /message endpoints",
      "/state と /message エンドポイントを備えたHTTPサーバーを起動する",
    ),
  )
  .option(
    "--timeout <seconds>",
    t(
      "Inactivity timeout in seconds (default: 300)",
      "非アクティブタイムアウトの秒数(既定: 300)",
    ),
    "300",
  )
  .option(
    "--port <port>",
    t(
      "Port to run the server on (default: 8000)",
      "サーバーを起動するポート(既定: 8000)",
    ),
    "8000",
  )
  .option(
    "--id <storageId>",
    t(
      "Upload session snapshots to Continue-managed storage using the provided identifier",
      "指定の識別子を用いて、Continue管理のストレージへセッションスナップショットをアップロードする",
    ),
  )
  .option(
    "--beta-upload-artifact-tool",
    t(
      "Enable beta UploadArtifact tool for uploading screenshots, videos, and logs",
      "スクリーンショット・動画・ログをアップロードするベータ版 UploadArtifact ツールを有効化する",
    ),
  )
  .action(async (prompt, options) => {
    // Merge parent options with subcommand options
    const mergedOptions = mergeParentOptions(program, options);

    if (mergedOptions.verbose) {
      logger.setLevel("debug");
      logger.debug("Verbose logging enabled");
    }

    await serve(prompt, mergedOptions);
  });

// Checks subcommand
program
  .command("checks [action] [pr-url]")
  .description(
    t("Show CI check statuses for a PR", "PRのCIチェック状況を表示する"),
  )
  .action(async (action: string | undefined, prUrl: string | undefined) => {
    await checks(action, prUrl);
  });

// Review subcommand
program
  .command("review")
  .description(
    t(
      "Run AI-powered reviews on your changes",
      "変更内容に対してAIレビューを実行する",
    ),
  )
  .option(
    "--base <ref>",
    t(
      "Base git ref to diff against (default: auto-detect)",
      "差分比較の基準となるgit ref(既定: 自動検出)",
    ),
  )
  .option("--format <format>", t("Output format", "出力形式"))
  .option(
    "--fix",
    t(
      "Automatically apply suggested fixes",
      "提案された修正を自動的に適用する",
    ),
  )
  .option("--patch", t("Show patches", "パッチを表示する"))
  .option("--fail-fast", t("Stop on first failure", "最初の失敗で停止する"))
  .option(
    "--review-agents <agents...>",
    t(
      "Specific review agents to run",
      "実行するレビューエージェントを指定する",
    ),
  )
  .option("--verbose", t("Enable verbose logging", "詳細ログを有効化する"))
  .action(async (options) => {
    await review(options);
  });

// Handle unknown commands
program.on("command:*", () => {
  console.error(
    t(
      `Error: Unknown command '${program.args.join(" ")}'\n`,
      `エラー: 不明なコマンド '${program.args.join(" ")}'\n`,
    ),
  );
  program.outputHelp();
  void gracefulExit(1);
});

export async function runCli(): Promise<void> {
  // Handle internal worker subprocess for cn review
  if (process.argv.includes("--internal-review-worker")) {
    const { runReviewWorker } =
      await import("./commands/review/reviewWorker.js");
    await runReviewWorker();
    return;
  }

  // Parse arguments and handle errors
  try {
    program.parse();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  process.on("SIGTERM", async () => {
    await gracefulExit(0);
  });
}
