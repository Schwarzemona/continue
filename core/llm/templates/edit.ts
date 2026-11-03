import { ChatMessage, PromptTemplate } from "../../index.js";
import { gptEditPrompt } from "./edit/gpt.js";

const simplifiedEditPrompt = `以下のコードを検討してください：
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`
以下のユーザーリクエストを完全に満たすようにコードを編集してください：
{{{userInput}}}
コード以外の出力は何もしないでください。コードブロック、英語の解説、開始/終了タグも不要です。変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。`;

const START_TAG = "<START EDITING HERE>";
const osModelsEditPrompt: PromptTemplate = (history, otherData) => {
  // "No sufix" means either there is no suffix OR
  // it's a clean break at end of function or something
  // (what we're trying to avoid is just the language model trying to complete the closing brackets of a function or something)
  const firstCharOfFirstLine = otherData.suffix?.split("\n")[0]?.[0]?.trim();
  const isSuffix =
    otherData.suffix?.trim() !== "" &&
    // First character of first line is whitespace
    // Otherwise we assume it's a clean break
    !firstCharOfFirstLine;
  const suffixTag = isSuffix ? "<STOP EDITING HERE>" : "";
  const suffixExplanation = isSuffix
    ? ' "<STOP EDITING HERE>" に到達したら、回答を終了してください。'
    : "";

  // If neither prefilling nor /v1/completions are supported, we have to use a chat prompt without putting words in the model's mouth
  if (
    otherData.supportsCompletions !== "true" &&
    otherData.supportsPrefill !== "true"
  ) {
    return gptEditPrompt(history, otherData);
  }

  // Use a different prompt when there's neither prefix nor suffix
  if (otherData.prefix?.trim() === "" && otherData.suffix?.trim() === "") {
    return [
      {
        role: "user",
        content: `\`\`\`${otherData.language}
${otherData.codeToEdit}
${suffixTag}
\`\`\`

以下のリクエストを満たすために、上記のコードブロック全体を書き換えてください: "${otherData.userInput}"。たとえコードが以前と同じであっても、プレースホルダーを残さずにコードブロック全体を書き換える必要があります。変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。${suffixExplanation}`,
      },
    ];
  }

  return [
    {
      role: "user",
      content: `\`\`\`${otherData.language}
${otherData.prefix}${START_TAG}
${otherData.codeToEdit}
${suffixTag}
\`\`\`

以下のリクエストを満たすために、"${START_TAG}" 以下の部分を編集して、上記のコードブロック全体を書き換えてください: "${otherData.userInput}"。たとえコードが以前と同じであっても、プレースホルダーを残さずにコードブロック全体を書き換える必要があります。変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。${suffixExplanation}
`,
    },
  ];
};

const mistralEditPrompt = `[INST] あなたは役に立つコードアシスタントです。あなたのタスクは、以下の指示に従ってコードを書き換えることです: "{{{userInput}}}"
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`

変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。解説なしでコードを書き換えてください: [/INST]
\`\`\`{{{language}}}`;

const alpacaEditPrompt = `以下はタスクを説明する指示と、さらなる文脈を提供する入力のペアです。リクエストを適切に完了する回答を書いてください。

### 指示: 変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。このリクエストを満たすようにコードを書き換えてください: "{{{userInput}}}"

### 入力:

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`
`;

const phindEditPrompt = `### システムプロンプト
あなたはエキスパートプログラマーであり、エラーや不要な記述なしに一発でコードを書き上げます。

### ユーザーメッセージ:
変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。このリクエストを満たすようにコードを書き換えてください: "{{{userInput}}}"

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`
`;

const deepseekEditPrompt = `### システムプロンプト
あなたはDeepSeek Companyによって開発されたDeepSeek Coderモデルを利用するAIプログラミングアシスタントであり、コンピュータサイエンスに関する質問を支援する役割を担っています。政治的に敏感な質問、セキュリティやプライバシーの問題、およびその他のコンピュータサイエンス以外の質問には回答しません。
### 指示:
変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。このリクエストを満たすようにコードを書き換えてください: "{{{userInput}}}"

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`<|EOT|>
`;

const zephyrEditPrompt = `<|system|>
あなたはエキスパートプログラマーであり、エラーや不要な記述なしに一発でコードを書き上げます。</s>
<|user|>
変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。このリクエストを満たすようにコードを書き換えてください: "{{{userInput}}}"

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`</s>
`;

const openchatEditPrompt = `GPT4 Correct User:あなたはエキスパートプログラマーであり、パーソナルアシスタントです。{{{userInput}}}のために、以下のコードを書き換えるよう求められています。
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`
コードのみで回答し、それをMarkdownのコードブロックに入れてください。解説は一切不要ですが、コードはユーザーのリクエストを完全に満たす必要があります。変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。<|end_of_turn|>`;

const xWinCoderEditPrompt = `<system>:あなたはプログラミングを行う人々を支援するAIコーディングエージェントです。ユーザーのリクエストを適切に完了する回答を書いてください。
<user>:以下のコードを、以下の指示に従って（既存のコードコメントは変更せずに）書き換えてください: "{{{userInput}}}"
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`

解説なしでコードを書き換えてください:`;

const neuralChatEditPrompt = `### System:
あなたはエキスパートプログラマーであり、エラーや不要な記述なしに一発でコードを書き上げます。
### User:
このリクエストを満たすように、コードを（既存のコードコメントは変更せずに）書き換えてください: "{{{userInput}}}"

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`
`;

const codeLlama70bEditPrompt = `<s>Source: system\n\n あなたはエキスパートプログラマーであり、エラーや不要な記述なしに一発でコードを書き上げます。 <step> Source: user\n\n このリクエストを満たすように、コードを（既存のコードコメントは変更せずに）書き換えてください: "{{{userInput}}}"

\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\` <step> Source: assistant\nDestination: user\n\n `;

const claudeEditPrompt: PromptTemplate = (
  history: ChatMessage[],
  otherData: Record<string, string>,
) => [
  {
    role: "user",
    content: `\
\`\`\`${otherData.language}
${otherData.codeToEdit}
\`\`\`

あなたはエキスパートプログラマーです。以下のことを行うために、上記のコードを書き換えてください：

${otherData.userInput}

変更のために修正が必要な場合を除き、既存のコメントはそのまま残してください。書き換えたコードを含むコードブロックのみを出力してください：`,
  },
];

const llama3EditPrompt: PromptTemplate = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\`

このリクエストを満たすように、上記のコードを書き換えてください（既存のコードコメントは変更しないでください）: "{{{userInput}}}"<|eot_id|>`;

const gemmaEditPrompt = `# タスク
- やり直しがきかないため、assistantはエラーや不要な記述なしに一発でコードを書き上げます。
- 以下のリクエストを満たすように、assistantはコードを書き直してください(既存のコードコメントは変更しないでください)。
# リクエスト
\`\`\`
{{{userInput}}}
\`\`\`
# コード
\`\`\`{{{language}}}
{{{codeToEdit}}}
\`\`\``;

export {
  alpacaEditPrompt,
  claudeEditPrompt,
  codeLlama70bEditPrompt,
  deepseekEditPrompt,
  gemmaEditPrompt,
  gptEditPrompt,
  llama3EditPrompt,
  mistralEditPrompt,
  neuralChatEditPrompt,
  openchatEditPrompt,
  osModelsEditPrompt,
  phindEditPrompt,
  simplifiedEditPrompt,
  xWinCoderEditPrompt,
  zephyrEditPrompt,
};
