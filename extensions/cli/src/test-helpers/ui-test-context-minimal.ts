import { vi } from "vitest";

// Create mock objects that will be used by tests
export const mockUseService = vi.fn<(...args: any[]) => any>();
export const mockUseServices = vi.fn<(...args: any[]) => any>();
export const mockUseChat = vi.fn<(...args: any[]) => any>();
export const mockServiceContainer = {
  getSync: vi.fn<(...args: any[]) => any>(),
  isReady: vi.fn<(...args: any[]) => any>(),
  on: vi.fn<(...args: any[]) => any>(),
  off: vi.fn<(...args: any[]) => any>(),
  load: vi.fn<(...args: any[]) => any>(),
  reload: vi.fn<(...args: any[]) => any>(),
  emit: vi.fn<(...args: any[]) => any>(),
  setMaxListeners: vi.fn<(...args: any[]) => any>(),
};

export function createMinimalTestContext() {
  // Reset mock implementations
  mockUseService.mockReturnValue({
    value: null,
    state: "idle",
    error: null,
    reload: vi.fn(),
  });

  mockUseServices.mockReturnValue({
    services: {},
    loading: false,
    error: null,
    allReady: true,
  });

  mockUseChat.mockReturnValue({
    messages: [],
    setMessages: vi.fn(),
    chatHistory: [],
    setChatHistory: vi.fn(),
    isWaitingForResponse: false,
    responseStartTime: null,
    inputMode: true,
    attachedFiles: [],
    handleUserMessage: vi.fn(),
    handleInterrupt: vi.fn(),
    handleFileAttached: vi.fn(),
    resetChatHistory: vi.fn(),
  });

  mockServiceContainer.getSync.mockReturnValue({
    state: "ready",
    value: {},
    error: null,
  });
  mockServiceContainer.isReady.mockReturnValue(true);

  return {
    cleanup: () => {
      vi.clearAllMocks();
    },
  };
}
