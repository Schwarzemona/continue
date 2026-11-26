import {
  AssistantChatMessage,
  ModelDescription,
  PromptLog,
  Session,
} from "core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockIdeMessenger } from "../../context/MockIdeMessenger";
import { selectCompactionCutoffIndex } from "../../util/compactionCutoff";
import { createMockStore, getEmptyRootState } from "../../util/test/mockStore";
import { RootState } from "../store";
import { streamNormalInput } from "./streamNormalInput";

vi.mock("../util/getBaseSystemMessage", () => ({
  getBaseSystemMessage: vi.fn(() => "You are a helpful assistant."),
}));

const SESSION_ID = "auto-compact-session";

const modelWithContextLength: ModelDescription = {
  title: "Claude Sonnet",
  model: "claude-3-5-sonnet-20241022",
  provider: "anthropic",
  underlyingProviderName: "anthropic",
  contextLength: 4000,
};

function makeHistory(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    message: {
      id: `msg-${i}`,
      role: "user" as const,
      content: Array.from(
        { length: 100 },
        (_, j) => `seed${i}chunk${j}abc`,
      ).join(" "),
    },
    contextItems: [],
  }));
}

function createInitialState(
  model: ModelDescription,
  history: ReturnType<typeof makeHistory>,
  autoCompactConversation?: boolean,
): RootState {
  const state = getEmptyRootState();
  state.session.id = SESSION_ID;
  state.session.history = history as any;
  state.config.config.selectedModelByRole.chat = model;
  if (autoCompactConversation !== undefined) {
    state.config.config.experimental = {
      ...state.config.config.experimental,
      autoCompactConversation,
    };
  }
  return state;
}

function setupStreamingMock(messenger: MockIdeMessenger) {
  async function* simpleGenerator(): AsyncGenerator<
    AssistantChatMessage[],
    PromptLog
  > {
    yield [{ role: "assistant", content: "done" }];
    return {
      prompt: "prompt",
      completion: "done",
      modelProvider: "anthropic",
      modelTitle: "Claude Sonnet",
    };
  }
  messenger.llmStreamChat = vi.fn().mockImplementation(() => simpleGenerator());
}

beforeEach(() => vi.clearAllMocks());

describe("streamNormalInput automatic compaction", () => {
  it("contextPercentage が閾値以上なら送信前に圧縮を発動し、圧縮後の再コンパイルで続行する", async () => {
    const history = makeHistory(30);
    const store = createMockStoreFor(history, modelWithContextLength);
    const messenger = store.mockIdeMessenger;

    let compileCount = 0;
    messenger.responseHandlers["llm/compileChat"] = async () => {
      compileCount++;
      return {
        compiledChatMessages: [{ role: "user", content: "compiled" }] as any,
        didPrune: false,
        contextPercentage: compileCount === 1 ? 0.9 : 0.3,
      };
    };

    let compactIndex = -1;
    const compactHandler = vi.fn(async (data: { index: number }) => {
      compactIndex = data.index;
      return undefined;
    });
    messenger.responseHandlers["conversation/compact"] = compactHandler;

    // core 側 compact を模して、cutoff 項目に summary を付与した履歴を返す
    messenger.responseHandlers["history/load"] = async () => {
      const compacted = (store.getState() as RootState).session.history.map(
        (item) => ({ ...item }),
      );
      if (compactIndex >= 0 && compacted[compactIndex]) {
        compacted[compactIndex].conversationSummary = "自動生成された要約";
      }
      return {
        sessionId: SESSION_ID,
        title: "Auto Compact Session",
        workspaceDirectory: "file:///Users/user/workspace1",
        history: compacted,
        chatModelTitle: null,
      } satisfies Session;
    };

    setupStreamingMock(messenger);

    await store.dispatch(streamNormalInput({}) as any);

    const expectedCutoff = selectCompactionCutoffIndex({
      history: history as any,
      contextLength: modelWithContextLength.contextLength!,
    });

    expect(expectedCutoff).toBeGreaterThan(0);
    expect(compactHandler).toHaveBeenCalledTimes(1);
    expect(compactIndex).toBe(expectedCutoff);
    // 1 回目(閾値超過検出) + 圧縮後再コンパイル
    expect(compileCount).toBe(2);
    expect(messenger.llmStreamChat).toHaveBeenCalledTimes(1);
    expect((store.getState() as RootState).session.contextPercentage).toBe(0.3);
  });

  it("contextPercentage が閾値未満なら圧縮を発動しない", async () => {
    const history = makeHistory(30);
    const store = createMockStoreFor(history, modelWithContextLength);
    const messenger = store.mockIdeMessenger;

    let compileCount = 0;
    messenger.responseHandlers["llm/compileChat"] = async () => {
      compileCount++;
      return {
        compiledChatMessages: [{ role: "user", content: "compiled" }] as any,
        didPrune: false,
        contextPercentage: 0.5,
      };
    };
    const compactHandler = vi.fn(async () => undefined);
    messenger.responseHandlers["conversation/compact"] = compactHandler;
    setupStreamingMock(messenger);

    await store.dispatch(streamNormalInput({}) as any);

    expect(compactHandler).not.toHaveBeenCalled();
    expect(compileCount).toBe(1);
  });

  it("experimental.autoCompactConversation = false なら圧縮を発動しない", async () => {
    const history = makeHistory(30);
    const store = createMockStoreFor(history, modelWithContextLength, false);
    const messenger = store.mockIdeMessenger;

    let compileCount = 0;
    messenger.responseHandlers["llm/compileChat"] = async () => {
      compileCount++;
      return {
        compiledChatMessages: [{ role: "user", content: "compiled" }] as any,
        didPrune: false,
        contextPercentage: 0.9,
      };
    };
    const compactHandler = vi.fn(async () => undefined);
    messenger.responseHandlers["conversation/compact"] = compactHandler;
    setupStreamingMock(messenger);

    await store.dispatch(streamNormalInput({}) as any);

    expect(compactHandler).not.toHaveBeenCalled();
    expect(compileCount).toBe(1);
  });

  it("contextLength 不明のモデルでは圧縮を発動しない", async () => {
    const history = makeHistory(30);
    const modelWithoutContextLength: ModelDescription = {
      title: "Claude Sonnet",
      model: "claude-3-5-sonnet-20241022",
      provider: "anthropic",
      underlyingProviderName: "anthropic",
    };
    const store = createMockStoreFor(history, modelWithoutContextLength);
    const messenger = store.mockIdeMessenger;

    messenger.responseHandlers["llm/compileChat"] = async () => ({
      compiledChatMessages: [{ role: "user", content: "compiled" }] as any,
      didPrune: false,
      contextPercentage: 0.9,
    });
    const compactHandler = vi.fn(async () => undefined);
    messenger.responseHandlers["conversation/compact"] = compactHandler;
    setupStreamingMock(messenger);

    await store.dispatch(streamNormalInput({}) as any);

    expect(compactHandler).not.toHaveBeenCalled();
  });
});

function createMockStoreFor(
  history: ReturnType<typeof makeHistory>,
  model: ModelDescription,
  autoCompactConversation?: boolean,
) {
  return createMockStore(
    createInitialState(model, history, autoCompactConversation),
  );
}
