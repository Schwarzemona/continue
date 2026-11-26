import { expect, test, vi } from "vitest";
import { Problem, ToolExtras } from "../..";
import { formatProblems, getErrorsImpl } from "./getErrors";

const problem: Problem = {
  filepath: "file:///w/a.txt",
  message: "未使用変数です",
  range: {
    start: { line: 2, character: 4 },
    end: { line: 2, character: 9 },
  },
};

function makeExtras(getProblems: (uri?: string) => Promise<Problem[]>) {
  return {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      getCurrentFile: async () => undefined,
      fileExists: async () => true,
      getProblems: vi.fn(getProblems),
    },
  } as unknown as ToolExtras;
}

test("getErrorsImpl falls back to the active editor when filepath is omitted", async () => {
  const extras = makeExtras(async () => []);

  const result = await getErrorsImpl({}, extras);

  expect(extras.ide.getProblems).toHaveBeenCalledWith(undefined);
  expect(result[0].content).toBe("エラーは見つかりませんでした");
});

test("getErrorsImpl formats problems with 1-based positions", async () => {
  const filepath = "a.txt";

  const result = await getErrorsImpl(
    { filepath },
    makeExtras(async () => [problem]),
  );

  expect(result[0].name).toBe("エラー");
  expect(result[0].content).toBe("3:5: 未使用変数です");
});

test("formatProblems joins every problem on its own line", () => {
  expect(formatProblems([problem, problem])).toBe(
    ["3:5: 未使用変数です", "3:5: 未使用変数です"].join("\n"),
  );
});
