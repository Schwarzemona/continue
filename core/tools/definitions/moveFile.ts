import { ToolPolicy } from "@continuedev/terminal-security";
import { Tool } from "../..";
import { ResolvedPath, resolveInputPath } from "../../util/pathResolver";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";
import { evaluateFileAccessPolicy } from "../policies/fileAccess";

export const moveFileTool: Tool = {
  type: "function",
  displayTitle: "Move/Rename File",
  wouldLikeTo: "{{{ from }}}を{{{ to }}}へ移動します",
  isCurrently: "{{{ from }}}を{{{ to }}}へ移動中",
  hasAlready: "{{{ from }}}を{{{ to }}}へ移動しました",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  isInstant: true,
  function: {
    name: BuiltInToolNames.MoveFile,
    description: "ファイルまたはディレクトリを移動または名前変更します。",
    parameters: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: {
          type: "string",
          description:
            "現在のパス。プロジェクトルートからの相対パス、絶対パス、チルダパス(~/...)、またはfile://URIが指定できます。",
        },
        to: {
          type: "string",
          description: "新しいパス。",
        },
      },
    },
  },
  defaultToolPolicy: "allowedWithoutPermission",
  systemMessageDescription: {
    prefix: `ファイルまたはディレクトリを移動・名前変更するには、${BuiltInToolNames.MoveFile} ツールを使用してください。例:`,
    exampleArgs: [
      ["from", "path/to/the_old_file.txt"],
      ["to", "path/to/the_new_file.txt"],
    ],
  },
  toolCallIcon: "ArrowRightIcon",
  preprocessArgs: async (args, { ide }) => {
    const resolvedFrom = await resolveInputPath(ide, args.from as string);
    const resolvedTo = await resolveInputPath(ide, args.to as string);
    return {
      resolvedFrom,
      resolvedTo,
    };
  },
  evaluateToolCallPolicy: (
    basePolicy: ToolPolicy,
    _: Record<string, unknown>,
    processedArgs?: Record<string, unknown>,
  ): ToolPolicy => {
    const resolvedFrom = processedArgs?.resolvedFrom as
      ResolvedPath | null | undefined;
    if (!resolvedFrom) return basePolicy;

    let policy = evaluateFileAccessPolicy(
      basePolicy,
      resolvedFrom.isWithinWorkspace,
    );

    // The destination may not exist yet, in which case resolveInputPath returns
    // null. An existing destination outside the workspace always requires permission.
    const resolvedTo = processedArgs?.resolvedTo as
      ResolvedPath | null | undefined;
    if (resolvedTo && !resolvedTo.isWithinWorkspace) {
      policy = "allowedWithPermission";
    }

    return policy;
  },
};
