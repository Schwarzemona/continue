import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUITestContext } from "../../test-helpers/ui-test-context.js";
import { AppRoot } from "../AppRoot.js";

// Mock the useChat hook to control state
const mockUseChat = vi.fn();
const mockHandleInterrupt = vi.fn();

vi.mock("../hooks/useChat.js", () => ({
  useChat: () => mockUseChat(),
}));

describe("TUIChat - Compaction Cancellation", () => {
  let context: any;

  beforeEach(() => {
    context = createUITestContext({
      allServicesReady: true,
      serviceState: "ready",
    });

    // Reset the mock
    mockHandleInterrupt.mockClear();
  });

  afterEach(() => {
    context.cleanup();
    vi.clearAllMocks();
  });

  it("calls handleInterrupt when ESC is pressed during compaction", async () => {
    const compactionStartTime = Date.now();

    mockUseChat.mockReturnValue({
      chatHistory: [],
      setChatHistory: vi.fn(),
      isWaitingForResponse: false,
      responseStartTime: null,
      isCompacting: true,
      compactionStartTime,
      inputMode: true, // Changed to true so ESC handling is active
      attachedFiles: [],
      activePermissionRequest: null,
      wasInterrupted: false,
      handleUserMessage: vi.fn(),
      handleInterrupt: mockHandleInterrupt,
      handleFileAttached: vi.fn(),
      resetChatHistory: vi.fn(),
      handleToolPermissionResponse: vi.fn(),
    });

    const { stdin, unmount } = render(React.createElement(AppRoot, {}));

    try {
      stdin.write("\x1b"); // ESC key
      // ink holds a trailing ESC byte pending for ~20ms before emitting the
      // keypress, so wait for the input pipeline to deliver it.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The handleInterrupt should be called
      expect(mockHandleInterrupt).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it("shows compaction status with esc to interrupt message", () => {
    const compactionStartTime = Date.now();

    mockUseChat.mockReturnValue({
      chatHistory: [],
      setChatHistory: vi.fn(),
      isWaitingForResponse: false,
      responseStartTime: null,
      isCompacting: true,
      compactionStartTime,
      inputMode: false,
      attachedFiles: [],
      activePermissionRequest: null,
      wasInterrupted: false,
      handleUserMessage: vi.fn(),
      handleInterrupt: mockHandleInterrupt,
      handleFileAttached: vi.fn(),
      resetChatHistory: vi.fn(),
      handleToolPermissionResponse: vi.fn(),
    });

    const { lastFrame, unmount } = render(React.createElement(AppRoot, {}));

    try {
      const frame = lastFrame();
      expect(frame).toBeDefined();

      // Should show compaction message with interrupt option
      expect(frame).toContain("Compacting history");
      expect(frame).toContain("esc to interrupt");
    } finally {
      unmount();
    }
  });

  it("prioritizes compaction cancellation over response cancellation", async () => {
    // This tests the case where both might be true (theoretical edge case)
    const compactionStartTime = Date.now();
    const responseStartTime = Date.now();

    mockUseChat.mockReturnValue({
      chatHistory: [],
      setChatHistory: vi.fn(),
      isWaitingForResponse: true,
      responseStartTime,
      isCompacting: true,
      compactionStartTime,
      inputMode: false,
      attachedFiles: [],
      activePermissionRequest: null,
      wasInterrupted: false,
      handleUserMessage: vi.fn(),
      handleInterrupt: mockHandleInterrupt,
      handleFileAttached: vi.fn(),
      resetChatHistory: vi.fn(),
      handleToolPermissionResponse: vi.fn(),
    });

    const { stdin, unmount } = render(React.createElement(AppRoot, {}));

    try {
      // Simulate ESC key press when both states are active
      stdin.write("\x1b"); // ESC key
      // ink holds a trailing ESC byte pending for ~20ms before emitting the
      // keypress, so wait for the input pipeline to deliver it.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still call handleInterrupt (which will prioritize compaction)
      expect(mockHandleInterrupt).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });
});
