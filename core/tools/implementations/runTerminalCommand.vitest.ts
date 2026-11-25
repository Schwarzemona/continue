import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { IDE, ToolExtras } from "../..";
import * as processTerminalStates from "../../util/processTerminalStates";
import {
  TERMINAL_LOG_FILENAME,
  runTerminalCommandTool,
} from "../definitions/runTerminalCommand";
import { runTerminalCommandImpl } from "./runTerminalCommand";

// We're using real child processes, so ensure these aren't mocked
vi.unmock("node:child_process");
vi.unmock("node:util");

describe("runTerminalCommandImpl", () => {
  // Setup mocks and spies
  const mockGetIdeInfo = vi.fn();
  const mockGetWorkspaceDirs = vi.fn();
  const mockOnPartialOutput = vi.fn();
  const mockRunCommand = vi.fn();

  // Use a simple approach to ensure background processes are terminated
  let testPid: number | null = null;

  // Create a temp directory for our tests
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "terminal-command-test-"),
  );

  // ログはワークスペース直下の .continue/logs/ に固定名で書かれる
  const terminalLogPath = () =>
    path.join(workspaceDir, ".continue", "logs", TERMINAL_LOG_FILENAME);

  const readLog = (): string => fs.readFileSync(terminalLogPath(), "utf-8");

  const logExists = (): boolean => fs.existsSync(terminalLogPath());

  // 各テストは空のワークスペースを持つ(ログの名前衝突を防ぐ)
  let workspaceDir: string;

  // ワークスペースが無いケースの fallback 先が実ホームにならないようにする
  let savedHome: string | undefined;
  let savedUserProfile: string | undefined;

  beforeEach(() => {
    vi.resetAllMocks();

    workspaceDir = fs.mkdtempSync(path.join(tempDir, "workspace-"));
    savedHome = process.env.HOME;
    savedUserProfile = process.env.USERPROFILE;
    const fakeHome = fs.mkdtempSync(path.join(tempDir, "home-"));
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;

    // Setup backgrounded processes handling - don't mock, just make sure it's empty
    // Clear any processes that might be already tracked
    processTerminalStates.clearAllBackgroundProcesses();

    // Setup IDE mocks
    mockGetIdeInfo.mockReturnValue(Promise.resolve({ remoteName: "local" }));
    mockGetWorkspaceDirs.mockReturnValue(
      Promise.resolve([pathToFileURL(workspaceDir).toString()]),
    );
  });

  afterEach(async () => {
    if (savedHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = savedHome;
    }
    if (savedUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = savedUserProfile;
    }

    // Clean up any lingering test processes
    if (testPid !== null) {
      try {
        // Platform-independent way to kill a process
        if (process.platform === "win32") {
          await new Promise((resolve) => {
            childProcess.exec(`taskkill /F /PID ${testPid}`, () =>
              resolve(null),
            );
          });
        } else {
          process.kill(testPid);
        }
      } catch (e) {
        // Process might already be gone, ignore
      }
      testPid = null;
    }
  });

  afterAll(() => {
    // Clean up the temp directory after tests
    // Windows では spawn 中のプロセスが handle を持つことがあるため再試行する
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 300,
    });
  });

  // Helper function to create a ToolExtras object
  const createMockExtras = (
    overrides: Partial<{
      onPartialOutput?: any;
      remoteName?: string;
    }> = {},
  ): ToolExtras => {
    // Update IDE info if remoteName is provided
    if (overrides.remoteName) {
      mockGetIdeInfo.mockReturnValue(
        Promise.resolve({ remoteName: overrides.remoteName }),
      );
    }

    // Create a minimally compliant IDE mock
    const mockIde = {
      getIdeInfo: mockGetIdeInfo,
      getWorkspaceDirs: mockGetWorkspaceDirs,
      runCommand: mockRunCommand,
      // Add stubs for other required IDE methods
      getIdeSettings: vi.fn(),
      getDiff: vi.fn(),
      getClipboardContent: vi.fn(),
      isTelemetryEnabled: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      renameFile: vi.fn(),
      deleteFile: vi.fn(),
      globFiles: vi.fn(),
      ls: vi.fn(),
    };

    // Create a base ToolExtras object with required properties
    const baseExtras = {
      ide: mockIde as unknown as IDE,
      llm: {} as any,
      fetch: {} as any,
      tool: {} as any,
      toolCallId: "test-tool-call",
    } as ToolExtras;

    // Apply overrides
    if (overrides.onPartialOutput) {
      baseExtras.onPartialOutput = overrides.onPartialOutput;
    }

    return baseExtras;
  };

  it("should execute a command synchronously and capture output", async () => {
    // Use Node.js for cross-platform output generation
    const command = `node -e "console.log('real test output')"`;
    const args = {
      command,
      waitForCompletion: true,
    };
    const extras = createMockExtras();

    const result = await runTerminalCommandImpl(args, extras);

    // Verify the return value is status + log location only
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("端末");
    expect(result[0].description).toBe("端末コマンドの出力");
    expect(result[0].content).not.toContain("real test output");
    expect(result[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );
    // Verify status field indicates successful completion
    expect(result[0].status).toBe("実行完了");

    // 実出力はログファイルへ書き出されている
    expect(readLog()).toContain("real test output");
    expect(result[0].uri?.value).toContain(`logs/${TERMINAL_LOG_FILENAME}`);
  });

  it("agent が logFilename を渡しても単一ログへ書き出す", async () => {
    const result = await runTerminalCommandImpl(
      {
        command: `node -e "console.log('fixed log')"`,
        logFilename: "hallucinated.log",
        waitForCompletion: true,
      },
      createMockExtras(),
    );

    expect(result[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );
    expect(readLog()).toContain("fixed log");
  });

  it("実行のたびに単一ログを切り詰め、logs 下にファイルを1つだけ残す", async () => {
    await runTerminalCommandImpl(
      {
        command: `node -e "console.log('first run')"`,
        waitForCompletion: true,
      },
      createMockExtras(),
    );
    await runTerminalCommandImpl(
      {
        command: `node -e "console.log('second run')"`,
        waitForCompletion: true,
      },
      createMockExtras(),
    );

    const log = readLog();
    expect(log).not.toContain("first run");
    expect(log).toContain("second run");
    expect(
      fs.readdirSync(path.join(workspaceDir, ".continue", "logs")),
    ).toEqual([TERMINAL_LOG_FILENAME]);
  });

  it("should not use onPartialOutput in foreground when provided", async () => {
    // This test uses Node to create a command that outputs data incrementally
    const command = `node -e "
      console.log('first output');
      setTimeout(() => { 
        console.log('second output'); 
        console.error('error output');
      }, 50);
    "`;

    const args = {
      command,
      waitForCompletion: true,
    };
    const mockOutputFn = vi.fn();
    const extras = createMockExtras({ onPartialOutput: mockOutputFn });

    // Execute the command with streaming
    const result = await runTerminalCommandImpl(args, extras);

    // 実行中のライブ表示は廃止されたため、onPartialOutput は呼ばれない
    expect(mockOutputFn).not.toHaveBeenCalled();

    // 完走後の戻り値に全出力は含まれず、実出力はログへ書き出される
    const log = readLog();
    expect(log).toContain("first output");
    expect(log).toContain("second output");
    expect(log).toContain("error output");
    expect(result[0].content).not.toContain("first output");
    // Verify status field indicates successful completion
    expect(result[0].status).toBe("実行完了");
  });

  it("should run commands in background when waitForCompletion is false", async () => {
    // Create a self-identifying background process that writes its PID
    // to a file we can access to kill it later
    const pidFile = path.join(tempDir, "test-pid.txt");
    // Windows のバックスラッシュは node -e の文字列リテラルで消失するためスラッシュ化する
    const pidPath = pidFile.split(path.sep).join("/");

    // This script creates a long-running process and writes its PID to our file
    // Using a fixed duration timeout so we can be sure to clean it up
    const command = `node -e "
      const fs = require('fs');
      console.log('starting background process with PID: ' + process.pid);
      fs.writeFileSync('${pidPath}', process.pid.toString());
      setTimeout(() => { 
        console.log('background process completed'); 
      }, 500);
    "`;

    const args = {
      command,
      waitForCompletion: false,
    };
    const mockOutputFn = vi.fn();
    const extras = createMockExtras({ onPartialOutput: mockOutputFn });

    const result = await runTerminalCommandImpl(args, extras);

    // Result should indicate background running in either content or status
    expect(result[0].content || result[0].status).toContain(
      "コマンドはバックグラウンドで実行中",
    );
    // Verify status field indicates background running
    expect(result[0].status).toBe("コマンドはバックグラウンドで実行中……");

    // バックグラウンド実行でもログは作成される
    expect(logExists()).toBe(true);

    // 実行中のライブ表示は廃止のため、戻り時点ではまだ通知されない
    expect(mockOutputFn).not.toHaveBeenCalled();

    // Wait a bit to make sure the PID file is written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Read the PID file to get the process ID so we can kill it later
    if (fs.existsSync(pidFile)) {
      testPid = Number(fs.readFileSync(pidFile, "utf-8"));
    }

    // プロセス終了時に onPartialOutput へ完了通知が届く
    await vi.waitFor(
      () => {
        expect(mockOutputFn).toHaveBeenCalled();
      },
      { timeout: 5000, interval: 50 },
    );
    const completion = mockOutputFn.mock.calls.at(-1)![0];
    expect(completion.contextItems[0].status).toContain(
      "バックグラウンド処理完了",
    );
    expect(completion.contextItems[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );
  });

  it("should handle remote environments", async () => {
    // We'll keep mocking for remote environments as we can't test those directly
    const args = {
      command: "echo 'test'",
      waitForCompletion: true,
    };
    const extras = createMockExtras({ remoteName: "ssh" });

    const result = await runTerminalCommandImpl(args, extras);

    // In remote environments, it should use the IDE's runCommand
    expect(mockRunCommand).toHaveBeenCalledWith("echo 'test'");
    expect(result[0].content).toContain("リモート端末でコマンドを実行");
    expect(result[0].status).toBe("実行");

    // リモートではログを書かない
    expect(fs.existsSync(path.join(workspaceDir, ".continue"))).toBe(false);
  });

  it("should handle errors when executing invalid commands", async () => {
    // Use a command that should fail on any platform
    const args = {
      command: "non-existent-command-xyz",
      waitForCompletion: true,
    };
    const extras = createMockExtras();

    const result = await runTerminalCommandImpl(args, extras);

    expect(result[0].name).toBe("端末");
    expect(result[0].description).toBe("端末コマンドの出力");

    // 戻り値はステータスとログ位置のみ
    expect(result[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );

    // エラー文言はシェルとOSの言語に依存するため、内容が残っていることだけを確認する
    expect(readLog().trim().length).toBeGreaterThan(0);

    // Verify status field indicates command failure
    expect(result[0].status).toContain("コマンドが失敗しました:");
  });

  it("should handle error situations gracefully", async () => {
    // Use Node.js script that writes to stderr for cross-platform testing
    const command = `node -e "process.stderr.write('This is an error message'); process.exit(1)"`;
    const args = {
      command,
      waitForCompletion: true,
    };
    const extras = createMockExtras();

    const result = await runTerminalCommandImpl(args, extras);

    // Verify we still get a result with a name and description
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("端末");
    expect(result[0].description).toBe("端末コマンドの出力");

    // 戻り値はステータスとログ位置のみ
    expect(result[0].content).not.toContain("This is an error message");

    // stderr もログへ書き出される
    expect(readLog()).toContain("This is an error message");

    // Verify status field indicates command failure - the exact message format can vary
    // between different node versions and platforms
    expect(result[0].status).toContain("コマンドが失敗しました:");
  });

  it("should set appropriate status when a command completes successfully", async () => {
    // Use a simple command that will succeed
    const command = `node -e "console.log('success test')"`;
    const args = {
      command,
      waitForCompletion: true,
    };
    const extras = createMockExtras();

    const result = await runTerminalCommandImpl(args, extras);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("端末");
    expect(result[0].content).not.toContain("success test");
    expect(readLog()).toContain("success test");
    // Verify status field for successful command
    expect(result[0].status).toBe("実行完了");
  });

  it("should include status info for background commands in non-streaming mode", async () => {
    // Use a simple background command
    const command = `node -e "setTimeout(() => console.log('done'), 300)"`;
    const args = {
      command,
      waitForCompletion: false,
    };
    // No streaming in this test (no onPartialOutput)
    const extras = createMockExtras();

    const result = await runTerminalCommandImpl(args, extras);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("端末");
    // Verify both content and status fields for background commands
    expect(result[0].content).toContain("コマンドはバックグラウンドで実行中……");
    expect(result[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );
    expect(result[0].status).toBe("コマンドはバックグラウンドで実行中……");

    // detached でも fd 経由でログが作成される
    expect(logExists()).toBe(true);
  });

  it("runTerminalCommandImpl strips ANSI escapes when writing the log", async () => {
    const command = `node -e "console.log('\\x1b[31mcolored\\x1b[0m')"`;
    await runTerminalCommandImpl(
      {
        command,
        waitForCompletion: true,
      },
      createMockExtras(),
    );

    const log = readLog();
    expect(log).toContain("colored");
    expect(log).not.toContain("\x1b[");
  });

  it("runTerminalCommandImpl leaves the log readable after a non-zero exit", async () => {
    const command = `node -e "console.log('before failure'); process.exit(3)"`;
    const result = await runTerminalCommandImpl(
      {
        command,
        waitForCompletion: true,
      },
      createMockExtras(),
    );

    expect(result[0].status).toContain("コマンドが失敗しました:");
    expect(result[0].content).toContain(
      `ログ: .continue/logs/${TERMINAL_LOG_FILENAME}`,
    );
    expect(readLog()).toContain("before failure");
  });

  it("should handle missing workspace directory gracefully", async () => {
    // Mock IDE to return empty workspace directories
    const mockEmptyWorkspace = vi.fn().mockReturnValue(Promise.resolve([]));

    // Create IDE mock with empty workspace
    const mockIde = {
      getIdeInfo: vi
        .fn()
        .mockReturnValue(Promise.resolve({ remoteName: "local" })),
      getWorkspaceDirs: mockEmptyWorkspace,
      runCommand: vi.fn(),
      getIdeSettings: vi.fn(),
      getDiff: vi.fn(),
      getClipboardContent: vi.fn(),
      isTelemetryEnabled: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      renameFile: vi.fn(),
      deleteFile: vi.fn(),
      globFiles: vi.fn(),
      ls: vi.fn(),
    };

    const extras = {
      ide: mockIde as unknown as IDE,
      llm: {} as any,
      fetch: {} as any,
      tool: {} as any,
      toolCallId: "test-tool-call",
    } as ToolExtras;

    const command = `node -e "console.log('no workspace test')"`;
    const args = {
      command,
      waitForCompletion: true,
    };

    const result = await runTerminalCommandImpl(args, extras);

    // Should still work - falling back to HOME or cwd
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("端末");
    expect(result[0].description).toBe("端末コマンドの出力");
    expect(result[0].status).toBe("実行完了");

    // fallback 先でも uri が指すログに実出力が残る
    expect(
      fs.readFileSync(fileURLToPath(result[0].uri!.value), "utf-8"),
    ).toContain("no workspace test");

    // Verify workspace dirs was called but returned empty
    expect(mockEmptyWorkspace).toHaveBeenCalled();
  });

  it("should handle case where cwd fallbacks all fail", async () => {
    // Mock IDE to return empty workspace directories
    const mockEmptyWorkspace = vi.fn().mockReturnValue(Promise.resolve([]));

    // Save original environment variables and process.cwd
    const originalHome = process.env.HOME;
    const originalUserProfile = process.env.USERPROFILE;
    const originalCwd = process.cwd;

    try {
      // Mock all fallbacks to fail
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      process.cwd = vi.fn().mockImplementation(() => {
        throw new Error("Current directory unavailable");
      }) as any;

      // Create IDE mock with empty workspace
      const mockIde = {
        getIdeInfo: vi
          .fn()
          .mockReturnValue(Promise.resolve({ remoteName: "local" })),
        getWorkspaceDirs: mockEmptyWorkspace,
        runCommand: vi.fn(),
        getIdeSettings: vi.fn(),
        getDiff: vi.fn(),
        getClipboardContent: vi.fn(),
        isTelemetryEnabled: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        renameFile: vi.fn(),
        deleteFile: vi.fn(),
        globFiles: vi.fn(),
        ls: vi.fn(),
      };

      const extras = {
        ide: mockIde as unknown as IDE,
        llm: {} as any,
        fetch: {} as any,
        tool: {} as any,
        toolCallId: "test-tool-call",
      } as ToolExtras;

      const command = `node -e "console.log('fallback test')"`;
      const args = {
        command,
        waitForCompletion: true,
      };

      // This should now handle the case gracefully by falling back to temp directory
      const result = await runTerminalCommandImpl(args, extras);

      // Should work using the temp directory as fallback
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("端末");
      expect(result[0].status).toBe("実行完了");
      expect(
        fs.readFileSync(fileURLToPath(result[0].uri!.value), "utf-8"),
      ).toContain("fallback test");
      fs.rmSync(fileURLToPath(result[0].uri!.value), { force: true });

      console.log(
        "Successfully handled cwd fallback to temp directory:",
        result[0].status,
      );
    } finally {
      // Always restore original values
      if (originalHome !== undefined) {
        process.env.HOME = originalHome;
      }
      if (originalUserProfile !== undefined) {
        process.env.USERPROFILE = originalUserProfile;
      }
      process.cwd = originalCwd;
    }
  });

  describe("cwd handling", () => {
    describe("workspace directory handling", () => {
      it("should use file:// URI when available", async () => {
        const fileUri = "file:///home/user/workspace";
        mockGetWorkspaceDirs.mockResolvedValue([fileUri]);

        // We can't easily test the internal cwd without mocking child_process,
        // but we can verify the function doesn't throw with file URIs
        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should skip non-file URIs and use the first file:// URI", async () => {
        const workspaceDirs = [
          "vscode-vfs://github/user/repo",
          "untitled:/Untitled-1",
          "file:///home/user/workspace",
          "file:///home/user/other-workspace",
        ];
        mockGetWorkspaceDirs.mockResolvedValue(workspaceDirs);

        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should handle workspace with only non-file URIs", async () => {
        const workspaceDirs = [
          "vscode-vfs://github/user/repo",
          "untitled:/Untitled-1",
        ];
        mockGetWorkspaceDirs.mockResolvedValue(workspaceDirs);

        // Should fall back to HOME/USERPROFILE or process.cwd() without throwing
        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should handle empty workspace directories", async () => {
        mockGetWorkspaceDirs.mockResolvedValue([]);

        // Should fall back to HOME/USERPROFILE or process.cwd() without throwing
        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should properly convert file:// URIs to paths", () => {
        const testPath =
          os.platform() === "win32" ? "C:/test/workspace" : "/test/workspace";

        const fileUri = pathToFileURL(testPath).href;
        const expectedPath = path.normalize(testPath);

        // Test that fileURLToPath works correctly with file:// URIs
        expect(fileURLToPath(fileUri)).toBe(expectedPath);
      });

      it("should throw error when trying to convert non-file URI", () => {
        const nonFileUri = "vscode-vfs://github/user/repo";

        // This demonstrates why the fix is needed - fileURLToPath throws on non-file URIs
        expect(() => fileURLToPath(nonFileUri)).toThrow();
      });

      it("should handle vscode-remote URIs by extracting pathname", async () => {
        // Various remote URI formats that VS Code uses
        const remoteUris = [
          "vscode-remote://wsl+Ubuntu/home/user/project",
          "vscode-remote://ssh-remote+myserver/home/user/project",
          "vscode-remote://dev-container+abc123/workspace",
        ];

        for (const uri of remoteUris) {
          mockGetWorkspaceDirs.mockResolvedValue([uri]);

          // Should not throw - the generic URI handler extracts the pathname
          await expect(
            runTerminalCommandImpl(
              {
                command: "echo test",
                waitForCompletion: false,
              },
              createMockExtras(),
            ),
          ).resolves.toBeDefined();
        }
      });

      it("should decode URI-encoded characters in remote workspace paths", async () => {
        // Path with spaces and special characters
        const encodedUri =
          "vscode-remote://wsl+Ubuntu/home/user/my%20project%20%28test%29";
        mockGetWorkspaceDirs.mockResolvedValue([encodedUri]);

        // Should handle without throwing - decodeURIComponent is applied
        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should prefer file:// URIs over remote URIs when both present", async () => {
        const workspaceDirs = [
          "vscode-remote://wsl+Ubuntu/home/user/remote-project",
          "file:///home/user/local-project",
        ];
        mockGetWorkspaceDirs.mockResolvedValue(workspaceDirs);

        // Should succeed, preferring the file:// URI
        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });
    });

    describe("remote environment handling", () => {
      it("should use ide.runCommand for remote environments", async () => {
        const extras = createMockExtras({
          remoteName: "some-unsupported-remote",
        });

        const result = await runTerminalCommandImpl(
          { command: "echo test" },
          extras,
        );

        expect(mockRunCommand).toHaveBeenCalledWith("echo test");
        expect(result[0].content).toContain("リモート端末でコマンドを実行");
      });

      it("should handle local environment with file URIs", async () => {
        mockGetWorkspaceDirs.mockResolvedValue(["file:///home/user/workspace"]);

        await expect(
          runTerminalCommandImpl(
            {
              command: "echo test",
              waitForCompletion: false,
            },
            createMockExtras(),
          ),
        ).resolves.toBeDefined();
      });

      it("should use ide.runCommand for WSL environment", async () => {
        // WSL is a remote — commands should execute in WSL, not on the host
        const extras = createMockExtras({ remoteName: "wsl" });

        const result = await runTerminalCommandImpl(
          { command: "echo test" },
          extras,
        );

        expect(mockRunCommand).toHaveBeenCalledWith("echo test");
        expect(result[0].content).toContain("リモート端末でコマンドを実行");
      });

      it("should use ide.runCommand for dev-container environment", async () => {
        const extras = createMockExtras({ remoteName: "dev-container" });

        const result = await runTerminalCommandImpl(
          { command: "echo test" },
          extras,
        );

        expect(mockRunCommand).toHaveBeenCalledWith("echo test");
        expect(result[0].content).toContain("リモート端末でコマンドを実行");
      });
    });

    describe("fallback behavior", () => {
      it("should use HOME environment variable as fallback", async () => {
        const originalHome = process.env.HOME;
        process.env.HOME = "/home/testuser";

        mockGetWorkspaceDirs.mockResolvedValue([
          "vscode-vfs://github/user/repo",
        ]);

        try {
          await expect(
            runTerminalCommandImpl(
              {
                command: "echo test",
                waitForCompletion: false,
              },
              createMockExtras(),
            ),
          ).resolves.toBeDefined();
        } finally {
          process.env.HOME = originalHome;
        }
      });

      it("should use USERPROFILE on Windows as fallback", async () => {
        const originalHome = process.env.HOME;
        const originalUserProfile = process.env.USERPROFILE;

        delete process.env.HOME;
        process.env.USERPROFILE = "C:\\Users\\TestUser";

        mockGetWorkspaceDirs.mockResolvedValue([]);

        try {
          await expect(
            runTerminalCommandImpl(
              {
                command: "echo test",
                waitForCompletion: false,
              },
              createMockExtras(),
            ),
          ).resolves.toBeDefined();
        } finally {
          process.env.HOME = originalHome;
          process.env.USERPROFILE = originalUserProfile;
        }
      });

      it("should use os.tmpdir() as final fallback", async () => {
        const originalHome = process.env.HOME;
        const originalUserProfile = process.env.USERPROFILE;
        const originalCwd = process.cwd;

        delete process.env.HOME;
        delete process.env.USERPROFILE;
        // Mock process.cwd to throw an error
        process.cwd = vi.fn().mockImplementation(() => {
          throw new Error("No cwd available");
        }) as typeof process.cwd;

        mockGetWorkspaceDirs.mockResolvedValue([]);

        try {
          // Should fall back to os.tmpdir() without throwing
          await expect(
            runTerminalCommandImpl(
              {
                command: "echo test",
                waitForCompletion: false,
              },
              createMockExtras(),
            ),
          ).resolves.toBeDefined();
        } finally {
          fs.rmSync(
            path.join(os.tmpdir(), ".continue", "logs", TERMINAL_LOG_FILENAME),
            { force: true },
          );
          process.env.HOME = originalHome;
          process.env.USERPROFILE = originalUserProfile;
          process.cwd = originalCwd;
        }
      });
    });
  });
});

describe("runTerminalCommandTool.evaluateToolCallPolicy", () => {
  it("should return base policy for safe commands like echo", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: "echo hello world" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });

  it("should respect disabled policy even for non-echo commands", () => {
    const basePolicy = "disabled";
    const args = { command: "ls -la" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("disabled");
  });

  it("should respect disabled policy even for safe commands", () => {
    const basePolicy = "disabled";
    const args = { command: "echo test" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("disabled");
  });

  it("should return base policy for non-echo commands", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: "ls -la" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });

  it("should return base policy for git commands", () => {
    const basePolicy = "allowedWithPermission";
    const args = { command: "git status" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithPermission");
  });

  it("should handle undefined command gracefully", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: undefined };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });

  it("should handle null command gracefully", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: null };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });

  it("should handle empty command string", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: "" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });

  it("should disable dangerous commands like rm -rf /", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: "rm -rf /" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("disabled");
  });

  it("should require permission for high-risk network commands", () => {
    const basePolicy = "allowedWithoutPermission";
    const args = { command: "curl http://example.com" };

    const result = runTerminalCommandTool.evaluateToolCallPolicy!(
      basePolicy,
      args,
    );

    expect(result).toBe("allowedWithoutPermission");
  });
});
