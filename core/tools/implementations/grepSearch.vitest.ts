import { expect, test, vi } from "vitest";
import { ToolExtras } from "../..";
import { ContinueErrorReason } from "../../util/errors";
import { grepSearchImpl } from "./grepSearch";

function makeExtras(dirExists: (uri: string) => Promise<boolean>) {
  const getSearchResults = vi.fn(
    async (_query: string, _maxResults: number, _dirUri?: string) => "",
  );
  const extras = {
    ide: {
      getWorkspaceDirs: async () => ["file:///w"],
      fileExists: dirExists,
      getSearchResults,
    },
  } as unknown as ToolExtras;
  return { extras, getSearchResults };
}

test("grepSearchImpl passes the resolved dirPath through to the IDE", async () => {
  const { extras, getSearchResults } = makeExtras(async (uri) =>
    uri.endsWith("/sub"),
  );

  await grepSearchImpl({ query: "foo", dirPath: "sub" }, extras);

  const [, maxResults, dirUri] = getSearchResults.mock.calls[0];
  expect(dirUri).toEqual(expect.stringContaining("/sub"));
  expect(maxResults).toBeGreaterThan(0);
});

test("grepSearchImpl leaves dirUri undefined when dirPath is omitted", async () => {
  const { extras, getSearchResults } = makeExtras(async () => true);

  await grepSearchImpl({ query: "foo" }, extras);

  const call = getSearchResults.mock.calls[0];
  expect(call[call.length - 1]).toBeUndefined();
});

test("grepSearchImpl fails for an unresolvable dirPath", async () => {
  const { extras, getSearchResults } = makeExtras(async () => false);

  await expect(
    grepSearchImpl({ query: "foo", dirPath: "missing" }, extras),
  ).rejects.toMatchObject({ reason: ContinueErrorReason.DirectoryNotFound });
  expect(getSearchResults).not.toHaveBeenCalled();
});
