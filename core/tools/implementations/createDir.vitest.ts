import { expect, test, vi } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { createDirImpl } from "./createDir";

function makeExtras(fileExists: (uri: string) => Promise<boolean>) {
  const createDirectory = vi.fn(async (_uri: string) => {});
  const extras = {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      getCurrentFile: async () => undefined,
      fileExists,
      createDirectory,
    },
  } as unknown as ToolExtras;
  return { extras, createDirectory };
}

test("createDirImpl creates a new directory", async () => {
  const { extras, createDirectory } = makeExtras(async () => false);

  const result = await createDirImpl({ dirpath: "newDir" }, extras);

  expect(result[0].content).toBe("ディレクトリの作成に成功しました");
  expect(createDirectory.mock.calls[0][0].endsWith("/newDir")).toBe(true);
});

test("createDirImpl fails when the path already exists", async () => {
  const { extras, createDirectory } = makeExtras(async () => true);

  await expect(
    createDirImpl({ dirpath: "existingDir" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.FileAlreadyExists });
  expect(createDirectory).not.toHaveBeenCalled();
});
