import { expect, test } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { countLinesImpl } from "./countLines";

function makeExtras(readFile: () => Promise<string>) {
  return {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      getCurrentFile: async () => undefined,
      fileExists: async () => true,
      readFile,
    },
  } as unknown as ToolExtras;
}

test("countLinesImpl counts newline separated lines", async () => {
  const extras = makeExtras(async () => "a\nb\nc");

  const result = await countLinesImpl({ filepath: "f.txt" }, extras);

  expect(result[0].content).toBe("3");
});

test("countLinesImpl returns 0 for an empty file", async () => {
  const extras = makeExtras(async () => "");

  const result = await countLinesImpl({ filepath: "f.txt" }, extras);

  expect(result[0].content).toBe("0");
});

test("countLinesImpl fails when the file cannot be read", async () => {
  const extras = makeExtras(async () => {
    throw new Error("read failed");
  });

  await expect(
    countLinesImpl({ filepath: "missing.txt" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.FileNotFound });
});
