import { quizService } from "../services/QuizService.js";

import { Tool } from "./types.js";

export const askQuestionTool: Tool = {
  name: "AskQuestion",
  displayName: "Ask Question",
  description: `作業を進める前に、要件、好み、または実装の詳細を確認するために、ユーザーに明確化のための質問を行います。
ガイドライン:
- 仮定を明確にしたい場合や、計画を立てるための回答が必要な場合は、**常に**このツールを使用してください。
- 「その他」や「上記のいずれでもない」といった選択肢は提供しないでください。必要に応じて、ユーザーは自由記述で回答できます。
`,
  parameters: {
    type: "object",
    required: ["question", "options"],
    properties: {
      question: {
        type: "string",
        description: "ユーザーに質問する内容",
      },
      options: {
        type: "array",
        description:
          "選択肢のリスト。ユーザーに自由記述で回答させる場合は空の配列にしてください。",
        items: {
          type: "string",
        },
      },
      defaultAnswer: {
        type: "string",
        description: "ユーザーが入力せずにEnterを押した場合の既定の回答",
      },
    },
  },
  readonly: true,
  isBuiltIn: true,
  run: async (args: {
    question: string;
    options?: string[];
    defaultAnswer?: string;
  }): Promise<string> => {
    const { question, options, defaultAnswer } = args;

    const answer = await quizService.askQuestion({
      question,
      options,
      defaultAnswer,
    });

    if (options && options.length > 0) {
      const selectedIndex = options.indexOf(answer);
      if (selectedIndex !== -1) {
        return `ユーザーが選択肢 ${selectedIndex + 1} を選択: "${answer}"`;
      }
      return `ユーザーが自由記述で回答: "${answer}"`;
    }

    return `ユーザーの回答: "${answer}"`;
  },
};
