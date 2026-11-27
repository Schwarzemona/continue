import type { Tool } from "./types.js";

export const writeChecklistTool: Tool = {
  name: "Checklist",
  displayName: "Checklist",
  description:
    "タスクリストを作成または更新します。既存のリストはチャット履歴で確認できます。新しいリストの作成や既存リストの編集にこのツールを使用してください。",
  readonly: false,
  isBuiltIn: true,
  parameters: {
    type: "object",
    required: ["checklist"],
    properties: {
      checklist: {
        type: "string",
        description:
          "未完了タスクは - [ ]、完了タスクは - [x] で記述した、Markdown形式の完全なタスクリスト。チェックボックスをグループ化する場合を除き、見出しや追加内容包括は避けてください。リストは短めに保ち、各項目を具体的で実行可能なものにしてください。",
      },
    },
  },
  preprocess: async (args: { checklist: string }) => {
    return {
      preview: [
        {
          type: "checklist" as const,
          content: args.checklist,
        },
      ],
      args,
    };
  },
  run: async (args: { checklist: string }) => {
    return `Task list status:\n${args.checklist}`;
  },
};
