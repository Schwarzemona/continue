import { expect, test } from "vitest";
import { ToolExtras } from "../..";
import { grepFileImpl, MAX_GREP_FILE_MATCHES } from "./grepFile";

function makeExtras(readFile: (uri: string) => Promise<string>) {
  const extras = {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      getCurrentFile: async () => undefined,
      fileExists: async () => true,
      readFile,
    },
  } as unknown as ToolExtras;
  return extras;
}

test("grepFileImpl returns only 1-based matching line numbers", async () => {
  const extras = makeExtras(async () => "a\nfoo\nb\nfoo\nc");

  const result = await grepFileImpl(
    { filepath: "f.txt", pattern: "foo" },
    extras,
  );

  expect(result).toHaveLength(1);
  expect(result[0].content).toBe("2\n4");
  expect(result[0].description).toBe("一致した行番号 (2件)");
});

test("grepFileImpl reports an error item for an invalid regex", async () => {
  const extras = makeExtras(async () => "a");

  const result = await grepFileImpl(
    { filepath: "f.txt", pattern: "(" },
    extras,
  );

  expect(result[0].name).toBe("検索エラー");
});

test("grepFileImpl reports when nothing matches", async () => {
  const extras = makeExtras(async () => "a\nb");

  const result = await grepFileImpl(
    { filepath: "f.txt", pattern: "zzz" },
    extras,
  );

  expect(result[0].content).toBe("一致する項目が見つかりませんでした");
});

test("grepFileImpl truncates results at MAX_GREP_FILE_MATCHES", async () => {
  const content = Array.from(
    { length: MAX_GREP_FILE_MATCHES + 50 },
    () => "x",
  ).join("\n");
  const extras = makeExtras(async () => content);

  const result = await grepFileImpl(
    { filepath: "f.txt", pattern: "x" },
    extras,
  );

  expect(result[0].content.split("\n")).toHaveLength(MAX_GREP_FILE_MATCHES);
  expect(result[1].name).toBe("切り詰め警告");
});
