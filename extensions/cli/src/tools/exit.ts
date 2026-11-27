import { logger } from "../util/logger.js";

import { Tool } from "./types.js";

export const exitTool: Tool = {
  name: "Exit",
  displayName: "Exit",
  description:
    "失敗またはエラーを示すためにステータスコード1で現在のプロセスを終了します",
  parameters: {
    type: "object",
    properties: {},
  },
  readonly: false,
  isBuiltIn: true,
  run: async (): Promise<string> => {
    const { gracefulExit, updateAgentMetadata } =
      await import("../util/exit.js");

    // Mark agent as complete before exiting
    try {
      await updateAgentMetadata({ isComplete: true });
    } catch (err) {
      // Non-critical: log but don't block exit
      logger.debug(
        "完了メタデータの更新に失敗しました（致命的ではありません）",
        err as any,
      );
    }

    await gracefulExit(1);
    return "";
  },
};
