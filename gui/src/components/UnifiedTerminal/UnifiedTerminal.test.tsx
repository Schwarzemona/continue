import { screen, waitFor } from "@testing-library/react";
import { ToolCallState } from "core";
import { MockIdeMessenger } from "../../context/MockIdeMessenger";
import { renderWithProviders } from "../../util/test/render";
import { UnifiedTerminalCommand } from "./UnifiedTerminal";

const MOCK_COMMAND = "npm test";
const MOCK_OUTPUT = `Running tests...
✓ Test 1 passed
✓ Test 2 passed
✗ Test 3 failed
  Error: Expected true but got false

Test Results:
  2 passed, 1 failed
  Total: 3 tests`;
const MOCK_TOOL_CALL_ID = "terminal-call-123";
const MOCK_LOG_URI = "file:///workspace/.continue/logs/npm-test.log";
const MOCK_STATUS_MESSAGE = "実行完了";

// Mock the redux hooks
const mockDispatch = vi.fn();
const mockSelector = vi.fn();
vi.mock("../../redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => mockSelector,
}));

function createRunningToolCallState(): ToolCallState {
  return {
    status: "calling",
    toolCallId: MOCK_TOOL_CALL_ID,
    toolCall: {
      id: MOCK_TOOL_CALL_ID,
      type: "function",
      function: {
        name: "terminal",
        arguments: "{}",
      },
    },
    parsedArgs: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UnifiedTerminalCommand", () => {
  test("renders basic terminal command without output", async () => {
    await renderWithProviders(
      <UnifiedTerminalCommand command={MOCK_COMMAND} status="completed" />,
    );

    // Should show the command
    expect(screen.getByText(MOCK_COMMAND)).toBeInTheDocument();

    // Should show terminal header
    expect(screen.getByText("端末")).toBeInTheDocument();
  });

  test("ログURIが指定されるとstatusMessageをログリンクとして表示する", async () => {
    await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        statusMessage={MOCK_STATUS_MESSAGE}
        logUri={MOCK_LOG_URI}
      />,
    );

    const link = await screen.findByTestId("terminal-log-link");
    expect(link.textContent).toBe(MOCK_STATUS_MESSAGE);
    expect(screen.queryByText(MOCK_STATUS_MESSAGE)).toBe(link);
  });

  test("ログURIが無い場合はstatusMessageをリンク外で表示する", async () => {
    await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        statusMessage={MOCK_STATUS_MESSAGE}
      />,
    );

    expect(screen.getByText(MOCK_STATUS_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByTestId("terminal-log-link")).toBeNull();
  });

  test("ログリンクのクリックでide.openFileが呼ばれる", async () => {
    const mockIdeMessenger = new MockIdeMessenger();
    const openFileSpy = vi
      .spyOn(mockIdeMessenger.ide, "openFile")
      .mockResolvedValue(undefined);

    const { user } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        statusMessage={MOCK_STATUS_MESSAGE}
        logUri={MOCK_LOG_URI}
      />,
      { mockIdeMessenger },
    );

    await user.click(screen.getByTestId("terminal-log-link"));

    expect(openFileSpy).toHaveBeenCalledWith(MOCK_LOG_URI);
  });

  test("実行中はログリンクを表示しない", async () => {
    await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="running"
        statusMessage={MOCK_STATUS_MESSAGE}
        toolCallId={MOCK_TOOL_CALL_ID}
        logUri={MOCK_LOG_URI}
      />,
    );

    expect(screen.queryByTestId("terminal-log-link")).toBeNull();
  });

  test("出力内容はインライン表示しない（ログへ外部化）", async () => {
    const { container } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        output={MOCK_OUTPUT}
        status="completed"
      />,
    );

    // The command itself is rendered
    expect(screen.getByText(MOCK_COMMAND)).toBeInTheDocument();

    // Output is externalized to the log file, so it must not appear inline
    expect(container.textContent).not.toMatch(/Test 1 passed/);
    expect(container.textContent).not.toMatch(/Test 3 failed/);
  });

  test("shows running state with move to background link", async () => {
    await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="running"
        toolCallState={createRunningToolCallState()}
        toolCallId={MOCK_TOOL_CALL_ID}
      />,
    );

    // Should show running status
    expect(screen.getByText("実行中")).toBeInTheDocument();

    // Should show move to background link
    expect(screen.getByText("バックグラウンドへ移動")).toBeInTheDocument();
  });

  test("can expand and collapse terminal", async () => {
    const { user, container } = await renderWithProviders(
      <UnifiedTerminalCommand command={MOCK_COMMAND} status="completed" />,
    );

    // Should initially be expanded and show the command
    expect(screen.getByText(MOCK_COMMAND)).toBeInTheDocument();

    // Find and click the collapse chevron (SVG icon)
    const chevron = container.querySelector(
      'svg[class*="cursor-pointer"], .cursor-pointer svg',
    );
    expect(chevron).toBeInTheDocument();

    if (chevron) {
      await user.click(chevron);

      // After collapsing, the command block should be removed
      await waitFor(() => {
        expect(screen.queryByText(MOCK_COMMAND)).toBeNull();
      });

      await user.click(chevron);
      await waitFor(() => {
        expect(screen.getByText(MOCK_COMMAND)).toBeInTheDocument();
      });
    }
  });

  test("shows copy and run in terminal buttons when not running", async () => {
    const { container } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        output={MOCK_OUTPUT}
        status="completed"
      />,
    );

    // Look for toolbar elements - they may be hidden by responsive classes but exist in DOM
    const toolbarArea = container.querySelector('[class*="gap-2.5"]');
    expect(toolbarArea).toBeInTheDocument();

    // Should contain SVG icons for copy/run operations
    const svgIcons = container.querySelectorAll("svg");
    expect(svgIcons.length).toBeGreaterThan(0);

    // Should show the "実行" label (hidden on small screens, but present in DOM)
    expect(screen.getByText("実行")).toBeInTheDocument();
  });

  test("handles move to background action", async () => {
    const { user } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="running"
        toolCallState={createRunningToolCallState()}
        toolCallId={MOCK_TOOL_CALL_ID}
      />,
    );

    // Find and click move to background link
    const moveToBackgroundLink = screen.getByText("バックグラウンドへ移動");
    await user.click(moveToBackgroundLink);

    // Should dispatch the move to background action
    expect(mockDispatch).toHaveBeenCalled();
  });

  test("shows different status types correctly", async () => {
    // Test completed status
    const { rerender, container } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="completed"
        statusMessage="Command completed successfully"
      />,
    );

    expect(container.textContent).toMatch(/Command completed successfully/);

    // Test failed status
    rerender(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="failed"
        statusMessage="Command failed with exit code 1"
      />,
    );

    expect(container.textContent).toMatch(/Command failed with exit code 1/);

    // Test background status
    rerender(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        status="background"
        statusMessage="Command moved to background"
      />,
    );

    expect(container.textContent).toMatch(/Command moved to background/);
  });

  test("handles empty output gracefully", async () => {
    const { container } = await renderWithProviders(
      <UnifiedTerminalCommand
        command={MOCK_COMMAND}
        output=""
        status="completed"
      />,
    );

    // Should show command but no output section
    expect(screen.getByText(MOCK_COMMAND)).toBeInTheDocument();

    // Should not show any output content
    const outputElements = container.querySelectorAll(
      "pre code > div:not(:first-child)",
    );
    expect(outputElements.length).toBe(0);
  });
});
