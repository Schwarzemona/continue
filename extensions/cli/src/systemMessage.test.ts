import { describe, expect, it, vi } from "vitest";

// Use the actual implementation instead of the mocked one
vi.unmock("./systemMessage.js");
const { constructSystemMessage } = await import("./systemMessage.js");

// Mock the service container to avoid "No factory registered for service 'config'" error
vi.mock("./services/ServiceContainer.js", () => ({
  serviceContainer: {
    get: vi.fn().mockResolvedValue({ config: { rules: [] } }),
    set: vi.fn(),
  },
}));

// Mock processRule to avoid file system operations in tests
vi.mock("./hubLoader.js", () => ({
  processRule: vi
    .fn()
    .mockImplementation((spec: string) => Promise.resolve(spec)),
}));

const PLAN_MODE_STRING = "_Plan Mode_ で動作しています";

describe("constructSystemMessage", () => {
  it("should return base system message with rules when additionalRules is provided", async () => {
    const rules = ["These are the rules for the assistant."];
    const result = await constructSystemMessage("normal", rules);

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain('<context name="userRules">');
    expect(result).toContain(rules[0]);
    expect(result).toContain("</context>");
  });

  it("should return base system message with agent content when no rules but agent file exists", async () => {
    // The implementation checks for agent files like AGENTS.md which exists in this project
    const result = await constructSystemMessage("normal");

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain('<context name="userRules">');
    expect(result).toContain("AGENTS.md");
  });

  it("should include base system message components", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain("<env>");
    expect(result).toContain('<context name="gitStatus">');
  });

  it("should handle whitespace-only rules message", async () => {
    const result = await constructSystemMessage("normal", ["   "]);

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain('<context name="userRules">');
  });

  it("should include working directory information", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("Working directory:");
    expect(result).toContain("<env>");
  });

  it("should include platform information", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("Platform:");
  });

  it("should include current date", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("Today's date:");
    expect(result).toContain(new Date().toISOString().split("T")[0]);
  });

  it("should format rules section correctly", async () => {
    const rulesMessage = "Rule 1: Do this\nRule 2: Do that";
    const result = await constructSystemMessage("normal", [rulesMessage]);

    expect(result).toContain('<context name="userRules">');
    expect(result).toContain(rulesMessage);
    expect(result).toContain("</context>");
  });

  it("should handle multiline rules message", async () => {
    const rulesMessage = `Rule 1: First rule
Rule 2: Second rule
Rule 3: Third rule`;
    const result = await constructSystemMessage("normal", [rulesMessage]);

    expect(result).toContain(rulesMessage);
    expect(result).toContain('<context name="userRules">');
    expect(result).toContain("</context>");
  });

  it("should handle special characters in rules message", async () => {
    const rulesMessage = "Rule with <special> characters & symbols!";
    const result = await constructSystemMessage("normal", [rulesMessage]);

    expect(result).toContain(rulesMessage);
    expect(result).toContain('<context name="userRules">');
  });

  it("should handle very long rules message", async () => {
    const rulesMessage = "A".repeat(1000);
    const result = await constructSystemMessage("normal", [rulesMessage]);

    expect(result).toContain(rulesMessage);
    expect(result).toContain('<context name="userRules">');
  });

  it("should combine rules and agent content when both are present", async () => {
    const rulesMessage = "These are the rules.";
    const result = await constructSystemMessage("normal", [rulesMessage]);

    expect(result).toContain('<context name="userRules">');
    expect(result).toContain(rulesMessage);
    expect(result).toContain("AGENTS.md");
    expect(result).toContain("</context>");
  });

  it("should add headless mode instructions when headless is true", async () => {
    const result = await constructSystemMessage(
      "normal",
      undefined,
      undefined,
      true,
    );

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain("headless モードで実行しています");
    expect(result).toContain("最終回答のみを提供してください");
    expect(result).toContain("説明・推論・追加のコメントは含めないでください");
  });

  it("should not add headless mode instructions when headless is false", async () => {
    const result = await constructSystemMessage(
      "normal",
      undefined,
      undefined,
      false,
    );

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).not.toContain("headless モードで実行しています");
    expect(result).not.toContain("最終回答のみを提供してください");
  });

  it("should not add headless mode instructions when headless is undefined", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).not.toContain("headless モードで実行しています");
    expect(result).not.toContain("最終回答のみを提供してください");
  });

  it("should add JSON format instructions when format is json", async () => {
    const result = await constructSystemMessage("normal", undefined, "json");

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain("JSON 出力モードで動作しています");
    expect(result).toContain("有効な JSON でなければなりません");
    expect(result).toContain("JSON.parse()");
  });

  it("should add plan mode instructions when mode is plan", async () => {
    const result = await constructSystemMessage(
      "plan",
      undefined,
      undefined,
      false,
    );

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).toContain(PLAN_MODE_STRING);
    expect(result).toContain("ユーザーのアイデアの調査と計画の立案を支援する");
    expect(result).toContain("行動を起こす前に");
    expect(result).toContain("読み取り専用ツール");
    expect(result).toContain(
      "これらを迂回してファイルの書き込み / 削除 / 作成を試みてはいけません",
    );
  });

  it("should not add plan mode instructions when mode is not plan", async () => {
    const result = await constructSystemMessage(
      "normal",
      undefined,
      undefined,
      false,
    );

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).not.toContain(PLAN_MODE_STRING);
    expect(result).not.toContain(
      "ユーザーのアイデアの調査と計画の立案を支援する",
    );
  });

  it("should not add plan mode instructions when mode is normal", async () => {
    const result = await constructSystemMessage("normal");

    expect(result).toContain("あなたは Continue CLI のエージェントです");
    expect(result).not.toContain(PLAN_MODE_STRING);
    expect(result).not.toContain(
      "ユーザーのアイデアの調査と計画の立案を支援する",
    );
  });

  it("should include basic plan mode description", async () => {
    const result = await constructSystemMessage(
      "plan",
      undefined,
      undefined,
      false,
    );

    expect(result).toContain(PLAN_MODE_STRING);
    expect(result).toContain("読み取り専用ツール");
    expect(result).toContain("書き込み / 削除 / 作成");
  });

  it("should combine plan mode with headless mode instructions", async () => {
    const result = await constructSystemMessage(
      "plan",
      undefined,
      undefined,
      true,
    );

    expect(result).toContain("headless モードで実行しています");
    expect(result).toContain(PLAN_MODE_STRING);
    expect(result).toContain("ユーザーのアイデアの調査と計画の立案を支援する");
  });

  it("should combine plan mode with JSON format instructions", async () => {
    const result = await constructSystemMessage(
      "plan",
      undefined,
      "json",
      false,
    );

    expect(result).toContain("JSON 出力モードで動作しています");
    expect(result).toContain(PLAN_MODE_STRING);
    expect(result).toContain("ユーザーのアイデアの調査と計画の立案を支援する");
  });
});
