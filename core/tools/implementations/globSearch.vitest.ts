import { expect, test, vi } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { fileGlobSearchImpl } from "./globSearch";

function makeExtras(dirExists: (uri: string) => Promise<boolean>) {
  const getFileResults = vi.fn(
    async (_pattern: string, _maxResults: number, _dirUri?: string) => [
      "file:///w/sub/a.ts",
    ],
  );
  const extras = {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      fileExists: dirExists,
      getFileResults,
    },
  } as unknown as ToolExtras;
  return { extras, getFileResults };
}

test("fileGlobSearchImpl passes the resolved dirPath through to the IDE", async () => {
  const { extras, getFileResults } = makeExtras(async (uri) =>
    uri.endsWith("/sub"),
  );

  await fileGlobSearchImpl({ pattern: "*.ts", dirPath: "sub" }, extras);

  const [, maxResults, dirUri] = getFileResults.mock.calls[0];
  expect(maxResults).toBeGreaterThan(0);
  expect(dirUri).toEqual(expect.stringContaining("/sub"));
});

test("fileGlobSearchImpl leaves dirUri undefined when dirPath is omitted", async () => {
  const { extras, getFileResults } = makeExtras(async () => true);

  await fileGlobSearchImpl({ pattern: "*.ts" }, extras);

  const call = getFileResults.mock.calls[0];
  expect(call[call.length - 1]).toBeUndefined();
});

test("fileGlobSearchImpl fails for an unresolvable dirPath", async () => {
  const { extras, getFileResults } = makeExtras(async () => false);

  await expect(
    fileGlobSearchImpl({ pattern: "*.ts", dirPath: "missing" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.DirectoryNotFound });
  expect(getFileResults).not.toHaveBeenCalled();
});
