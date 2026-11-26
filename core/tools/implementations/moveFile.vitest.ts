import { expect, test, vi } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { moveFileImpl } from "./moveFile";

function makeExtras(exists: (uri: string) => Promise<boolean>) {
  const renameFile = vi.fn(async (_from: string, _to: string) => {});
  const refreshCodebaseIndexFiles = vi.fn(async (_uris: string[]) => {});
  const extras = {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      getCurrentFile: async () => undefined,
      fileExists: exists,
      renameFile,
    },
    codeBaseIndexer: { refreshCodebaseIndexFiles },
  } as unknown as ToolExtras;
  return { extras, renameFile, refreshCodebaseIndexFiles };
}

test("moveFileImpl renames an existing file and refreshes the index", async () => {
  const { extras, renameFile, refreshCodebaseIndexFiles } = makeExtras(
    async (uri) => uri.endsWith("/from.txt"),
  );

  const result = await moveFileImpl({ from: "from.txt", to: "to.txt" }, extras);

  expect(result[0].content).toBe("移動に成功しました");
  expect(result[0].uri?.value.endsWith("/to.txt")).toBe(true);

  const [fromArg, toArg] = renameFile.mock.calls[0];
  expect(fromArg.endsWith("/from.txt")).toBe(true);
  expect(toArg.endsWith("/to.txt")).toBe(true);
  expect(refreshCodebaseIndexFiles).toHaveBeenCalledWith([
    expect.stringContaining("/from.txt"),
    expect.stringContaining("/to.txt"),
  ]);
});

test("moveFileImpl fails when the source does not exist", async () => {
  const { extras, renameFile } = makeExtras(async () => false);

  await expect(
    moveFileImpl({ from: "missing.txt", to: "to.txt" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.FileNotFound });
  expect(renameFile).not.toHaveBeenCalled();
});

test("moveFileImpl fails when the destination already exists", async () => {
  const { extras, renameFile } = makeExtras(async () => true);

  await expect(
    moveFileImpl({ from: "from.txt", to: "to.txt" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.FileAlreadyExists });
  expect(renameFile).not.toHaveBeenCalled();
});
