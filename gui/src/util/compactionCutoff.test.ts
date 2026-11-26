import { ChatHistoryItem, ContextItem, ToolCallState } from "core";
import { describe, expect, it } from "vitest";
import {
  AUTO_COMPACT_THRESHOLD,
  selectCompactionCutoffIndex,
} from "./compactionCutoff";

function uniqueWords(itemIndex: number, count: number): string {
  return Array.from(
    { length: count },
    (_, j) => `salt${itemIndex}token${j}xyz`,
  ).join(" ");
}

function makeItem(
  index: number,
  wordCount: number,
  extra: Partial<ChatHistoryItem> = {},
): ChatHistoryItem {
  return {
    message: {
      id: `item-${index}`,
      role: "user",
      content: uniqueWords(index, wordCount),
    } as any,
    contextItems: [],
    ...extra,
  };
}

function makeBigToolCallState(index: number, wordCount: number): ToolCallState {
  const output: ContextItem = {
    name: "Tool Result",
    description: "mock",
    content: uniqueWords(index, wordCount),
    icon: "code",
  };
  return {
    toolCallId: `tc-${index}`,
    toolCall: {
      id: `tc-${index}`,
      type: "function",
      function: { name: "run_terminal_command", arguments: "{}" },
    },
    status: "done",
    parsedArgs: {},
    output: [output],
  };
}

function makeLongHistory(count: number, wordsPerItem: number) {
  return Array.from({ length: count }, (_, i) => makeItem(i, wordsPerItem));
}

describe("selectCompactionCutoffIndex", () => {
  it("履歴が末尾予算を超える場合、末尾を残す cutoff を返す", () => {
    const history = makeLongHistory(60, 100);
    const cutoff = selectCompactionCutoffIndex({
      history,
      contextLength: 8000,
    });
    expect(cutoff).toBeGreaterThan(0);
    expect(cutoff).toBeLessThan(history.length - 1);
    // 保護末尾は最低でも最後の 1 項目
    expect(history.length - (cutoff + 1)).toBeGreaterThanOrEqual(1);
  });

  it("履歴全体が末尾予算に収まる場合、圧縮対象なしで -1 を返す", () => {
    const history = makeLongHistory(3, 5);
    const cutoff = selectCompactionCutoffIndex({
      history,
      contextLength: 128000,
    });
    expect(cutoff).toBe(-1);
  });

  it("旧 summary から新項目が少数の場合、再圧縮をスキップして -1 を返す", () => {
    const history = makeLongHistory(60, 100);
    history[history.length - 2].conversationSummary = "直前の要約";
    const cutoff = selectCompactionCutoffIndex({
      history,
      contextLength: 8000,
    });
    expect(cutoff).toBe(-1);
  });

  it("旧 summary が十分過去にある場合、再圧縮の cutoff を返す", () => {
    const history = makeLongHistory(60, 100);
    history[0].conversationSummary = "古い要約";
    const cutoff = selectCompactionCutoffIndex({
      history,
      contextLength: 8000,
    });
    expect(cutoff).toBeGreaterThan(0);
  });

  it("保護末尾単体が過大なら圧縮利得なしで -1 を返す(toolCallStates 出力も計数)", () => {
    const withOutput = makeLongHistory(60, 100);
    withOutput[withOutput.length - 1] = makeItem(withOutput.length - 1, 10, {
      message: {
        id: "assistant-big",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tc-last",
            type: "function",
            function: { name: "run_terminal_command", arguments: "{}" },
          },
        ],
      } as any,
      toolCallStates: [makeBigToolCallState(999, 3000)],
    });

    expect(
      selectCompactionCutoffIndex({
        history: withOutput,
        contextLength: 8000,
      }),
    ).toBe(-1);

    // 同一規模でも末尾の tool 出力がなければ圧縮される
    const withoutOutput = makeLongHistory(60, 100);
    expect(
      selectCompactionCutoffIndex({
        history: withoutOutput,
        contextLength: 8000,
      }),
    ).toBeGreaterThan(0);
  });

  it("項目数が 2 未満なら -1 を返す", () => {
    expect(
      selectCompactionCutoffIndex({
        history: [makeItem(0, 10)],
        contextLength: 8000,
      }),
    ).toBe(-1);
  });
});

describe("AUTO_COMPACT_THRESHOLD", () => {
  it("手動 UI の表示閾値(0.6)より高い", () => {
    expect(AUTO_COMPACT_THRESHOLD).toBeGreaterThan(0.6);
    expect(AUTO_COMPACT_THRESHOLD).toBeLessThan(1);
  });
});
