import { expect, test, vi } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { removeFileImpl } from "./removeFile";

type IdeMock = {
  getWorkspaceDirs: () => Promise<string[]>;
  getCurrentFile: () => Promise<undefined>;
  fileExists: (uri: string) => Promise<boolean>;
  listDir: (uri: string) => Promise<[string, boolean][]>;
  removeFile: (uri: string) => Promise<void>;
};

function makeExtras(overrides: Partial<IdeMock> = {}) {
  const removeFile = vi.fn(async (_uri: string) => {});
  const ide: IdeMock = {
    getWorkspaceDirs: async () => ["file:///w"],
    getCurrentFile: async () => undefined,
    fileExists: async (uri) => uri.endsWith("/a.txt"),
    listDir: async () => {
      throw new Error("not a directory");
    },
    removeFile,
    ...overrides,
  };
  const extras = { ide } as unknown as ToolExtras;
  return { extras, removeFile };
}

test("removeFileImpl deletes an existing file", async () => {
  const { extras, removeFile } = makeExtras();

  const result = await removeFileImpl({ filepath: "a.txt" }, extras);

  expect(result[0].content).toBe("ファイルの削除に成功しました");
  expect(removeFile.mock.calls[0][0].endsWith("/a.txt")).toBe(true);
});

test("removeFileImpl fails when the file does not exist", async () => {
  const { extras, removeFile } = makeExtras({ fileExists: async () => false });

  await expect(
    removeFileImpl({ filepath: "missing.txt" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.FileNotFound });
  expect(removeFile).not.toHaveBeenCalled();
});

test("removeFileImpl rejects directories", async () => {
  const { extras, removeFile } = makeExtras({
    listDir: async () => [["child.txt", true]],
  });

  await expect(
    removeFileImpl({ filepath: "a.txt" }, extras),
  ).rejects.toMatchObject({
    message: expect.stringContaining("ディレクトリです"),
  });
  expect(removeFile).not.toHaveBeenCalled();
});
