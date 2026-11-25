import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDE, ToolExtras } from "../..";
import { runTerminalCommandImpl } from "./runTerminalCommand";
import {
  getRunningProcessLog,
  markProcessAsBackgrounded,
} from "../../util/processTerminalStates";

// Hoist mock function so it can be referenced in vi.mock factory
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  default: {
    spawn: mockSpawn,
  },
  spawn: mockSpawn,
}));

describe("runTerminalCommand timeout functionality", () => {
  let tempDir: string;
  let tempHome: string;
  let workspaceDir: string;
  let savedHome: string | undefined;
  let savedUserProfile: string | undefined;
  let mockChildProc: any;
  let mockGetIdeInfo: ReturnType<typeof vi.fn>;
  let mockGetWorkspaceDirs: ReturnType<typeof vi.fn>;
  let mockOnPartialOutput: ReturnType<
    typeof vi.fn<(params: { toolCallId: string; contextItems: any[] }) => void>
  >;
  let setTimeoutSpy: any;
  let clearTimeoutSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    savedHome = process.env.HOME;
    savedUserProfile = process.env.USERPROFILE;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runcmd-timeout-"));
    // 存在しないワークスペースの場合のフォールバック先をテスト実行中に汚さない
    tempHome = fs.mkdtempSync(path.join(tempDir, "home-"));
    process.env.HOME = tempHome;
    process.env.USERPROFILE = tempHome;
    workspaceDir = fs.mkdtempSync(path.join(tempDir, "workspace-"));

    // Spy on setTimeout and clearTimeout
    setTimeoutSpy = vi.spyOn(global, "setTimeout");
    clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    // Create mock child process with EventEmitter behavior
    mockChildProc = new EventEmitter();
    mockChildProc.stdout = new EventEmitter();
    mockChildProc.stderr = new EventEmitter();
    // Use exitCode/signalCode to track process state (matches Node.js ChildProcess API)
    mockChildProc.exitCode = null;
    mockChildProc.signalCode = null;
    mockChildProc.killed = false;
    mockChildProc.kill = vi.fn((signal?: NodeJS.Signals) => {
      mockChildProc.killed = true;
      setTimeout(() => {
        mockChildProc.exitCode = signal === "SIGKILL" ? 137 : 143;
        mockChildProc.signalCode = signal ?? null;
        mockChildProc.emit("close", mockChildProc.exitCode);
      }, 100);
      return true;
    });

    mockSpawn.mockReturnValue(mockChildProc);

    mockGetIdeInfo = vi.fn().mockResolvedValue({ remoteName: "local" });
    mockGetWorkspaceDirs = vi
      .fn()
      .mockResolvedValue([pathToFileURL(workspaceDir).toString()]);
    mockOnPartialOutput = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    for (const [key, value] of [
      ["HOME", savedHome],
      ["USERPROFILE", savedUserProfile],
    ] as [string, string | undefined][]) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function logPath(logFilename: string): string {
    return path.join(workspaceDir, ".continue", "logs", logFilename);
  }

  const createMockExtras = (
    overrides: Partial<ToolExtras> = {},
  ): ToolExtras => {
    const mockIde = {
      getIdeInfo: mockGetIdeInfo,
      getWorkspaceDirs: mockGetWorkspaceDirs,
      getIdeSettings: vi.fn(),
      getDiff: vi.fn(),
      readFile: vi.fn(),
      readRangeInFile: vi.fn(),
      isTelemetryEnabled: vi.fn(),
      getProblems: vi.fn(),
      subprocess: vi.fn(),
      getWorkspaceConfigs: vi.fn(),
      showToast: vi.fn(),
      listWorkspaceContents: vi.fn(),
      getTerminalContents: vi.fn(),
      listFolders: vi.fn(),
      getSessionId: vi.fn(),
      runCommand: vi.fn(),
      showLines: vi.fn(),
      saveFile: vi.fn(),
      getBranch: vi.fn(),
      showDiff: vi.fn(),
      getOpenFiles: vi.fn(),
      showVirtualFile: vi.fn(),
      openFile: vi.fn(),
      getRepo: vi.fn(),
      pathSep: vi.fn(),
      fileExists: vi.fn(),
    } as unknown as IDE;

    return {
      ide: mockIde,
      llm: {} as any,
      fetch: vi.fn() as any,
      tool: {} as any,
      config: {} as any,
      onPartialOutput: mockOnPartialOutput,
      toolCallId: "test-tool-call-id",
      ...overrides,
    };
  };

  it("should set up timeout when waitForCompletion is true", async () => {
    const extras = createMockExtras();
    const args = {
      command: "echo test",
      logFilename: "timeout-test.log",
      waitForCompletion: true,
    };
    const resultPromise = runTerminalCommandImpl(args, extras);
    await vi.runOnlyPendingTimersAsync();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 600_000);
    mockChildProc.exitCode = 0;
    mockChildProc.emit("close", 0);
    await resultPromise;
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should NOT set up timeout when waitForCompletion is false", async () => {
    const extras = createMockExtras();
    const args = {
      command: "sleep 10",
      logFilename: "background-test.log",
      waitForCompletion: false,
    };
    const result = await runTerminalCommandImpl(args, extras);
    const timeoutCalls = setTimeoutSpy.mock.calls.filter(
      (call: any[]) => call[1] === 600_000,
    );
    expect(timeoutCalls.length).toBe(0);
    expect(result[0].status).toContain("バックグラウンドで実行中");
    expect(result[0].content).toContain("ログ: .continue/logs/");
    expect(fs.existsSync(logPath("background-test.log"))).toBe(true);
  });

  it("should kill process when timeout fires (streaming)", async () => {
    const extras = createMockExtras();
    const args = {
      command: "sleep 300",
      logFilename: "sleep-300.log",
      waitForCompletion: true,
    };
    const resultPromise = runTerminalCommandImpl(args, extras);
    await vi.runOnlyPendingTimersAsync();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(mockChildProc.kill).toHaveBeenCalledWith("SIGTERM");
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result[0].status).toContain("タイムアウト");
    expect(result[0].content).not.toContain("タイムアウト: 10分経過");
    // タイムアウトの記録も実際の出力も、残るのはログだけ
    expect(fs.readFileSync(logPath("sleep-300.log"), "utf-8")).toContain(
      "[タイムアウト: 10分経過しました]",
    );
  });

  it("should clear timeout on normal process exit", async () => {
    const extras = createMockExtras();
    const args = {
      command: "echo quick",
      logFilename: "quick.log",
      waitForCompletion: true,
    };
    const resultPromise = runTerminalCommandImpl(args, extras);
    // Flush async setup (getIdeInfo, getWorkspaceDirs) without advancing timer time
    await vi.advanceTimersByTimeAsync(0);
    mockChildProc.stdout.emit("data", Buffer.from("quick\n"));
    mockChildProc.exitCode = 0;
    mockChildProc.emit("close", 0);
    await resultPromise;
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(mockChildProc.kill).not.toHaveBeenCalled();
  });

  it("should clear SIGKILL timeout when process exits between SIGTERM and SIGKILL grace period", async () => {
    const extras = createMockExtras();
    const args = {
      command: "sleep 300",
      logFilename: "sleep-300.log",
      waitForCompletion: true,
    };
    const resultPromise = runTerminalCommandImpl(args, extras);

    // Let initial setup complete
    await vi.runOnlyPendingTimersAsync();

    // Advance to trigger main timeout (120s) — SIGTERM sent, SIGKILL timer started
    await vi.advanceTimersByTimeAsync(120_000);
    expect(mockChildProc.kill).toHaveBeenCalledWith("SIGTERM");
    expect(mockChildProc.kill).toHaveBeenCalledTimes(1);

    // Process exits gracefully after 2 seconds (before 5s grace period)
    await vi.advanceTimersByTimeAsync(2_000);
    mockChildProc.exitCode = 143;
    mockChildProc.signalCode = "SIGTERM";
    mockChildProc.emit("close", 143); // SIGTERM exit code

    // Wait for promise to resolve
    await resultPromise;

    // Advance past the SIGKILL grace period (3 more seconds)
    await vi.advanceTimersByTimeAsync(3_000);

    // Verify SIGKILL was NOT called (timer was cleared)
    expect(mockChildProc.kill).toHaveBeenCalledTimes(1); // Only SIGTERM
    expect(mockChildProc.kill).not.toHaveBeenCalledWith("SIGKILL");
  });

  it("should append an exit marker and notify the log link when backgrounded", async () => {
    const extras = createMockExtras();
    const args = {
      command: "long-running",
      logFilename: "bg-handoff.log",
      waitForCompletion: true,
    };
    const resultPromise = runTerminalCommandImpl(args, extras);
    // setup の await を流して spawn と markProcessAsRunning まで進める
    await vi.advanceTimersByTimeAsync(0);
    expect(getRunningProcessLog("test-tool-call-id")?.relativePath).toBe(
      ".continue/logs/bg-handoff.log",
    );

    // ユーザー操作でのバックグラウンド化を再現
    markProcessAsBackgrounded("test-tool-call-id");

    // その後プロセスが終了する
    mockChildProc.exitCode = 0;
    mockChildProc.emit("close", 0, null);

    // UI へログリンク付きの完了が通知される
    const lastCall = mockOnPartialOutput.mock.calls.at(-1)?.[0];
    expect(lastCall?.contextItems[0].status).toBe("実行完了");
    expect(lastCall?.contextItems[0].uri?.value).toContain("bg-handoff.log");

    // ログ末尾へ終了マーカーが残る
    expect(fs.readFileSync(logPath("bg-handoff.log"), "utf-8")).toContain(
      "[実行完了]",
    );

    // 終了で前台・后台の追跡は解除される
    expect(getRunningProcessLog("test-tool-call-id")).toBeUndefined();

    // resultPromise は解決されないまま残る（バックグラウンド化済み）
    void resultPromise;
  });
});
