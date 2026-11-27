import { Tool } from "../tools/types.js";

export const SUBAGENT_TOOL_META: Tool = {
  name: "Subagent",
  displayName: "Subagent",
  description:
    "専門化されたタスクを処理するためにサブエージェントを使用します。",
  readonly: false,
  isBuiltIn: true,
  parameters: {
    type: "object",
    required: ["description", "prompt", "subagent_name"],
    properties: {
      description: {
        type: "string",
        description: "タスクの短い説明",
      },
      prompt: {
        type: "string",
        description: "エージェントに実行させるタスク",
      },
      subagent_name: {
        type: "string",
        description: "このタスクに使用する専門化されたエージェントの種類。",
      },
    },
  },
  run: async () => "",
};
