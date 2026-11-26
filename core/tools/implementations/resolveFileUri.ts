import { IDE } from "../..";
import { inferResolvedUriFromRelativePath } from "../../util/ideUtils";
import { resolveInputPath } from "../../util/pathResolver";

/**
 * Resolves a user-provided path (relative, absolute, tilde, or file:// URI)
 * to a file URI. Unlike resolveInputPath, a relative path that does not exist
 * yet is still resolved against the workspace (e.g. a move destination).
 */
export async function resolveFileUri(ide: IDE, path: string): Promise<string> {
  const resolved = await resolveInputPath(ide, path);
  if (resolved) {
    return resolved.uri;
  }
  return await inferResolvedUriFromRelativePath(path, ide);
}
