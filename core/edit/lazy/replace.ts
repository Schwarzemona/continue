import { ILLM } from "../..";
import { filterLeadingNewline } from "../../autocomplete/filtering/streamTransforms/lineStream";
import { streamLines } from "../../diff/util";
import { dedent } from "../../util";

export const BUFFER_LINES_BELOW = 3;

const MATCH_LINES_ABOVE = 1;
export function getReplacementByMatching(
  oldCode: string,
  linesBefore: string[],
  linesAfter: string[],
): string | undefined {
  const oldLines = oldCode.split("\n");
  const linesToMatchAbove = MATCH_LINES_ABOVE;
  const linesToMatchBelow = Math.min(BUFFER_LINES_BELOW, linesAfter.length);

  // Get surrounding lines around the gap
  const beforeContext = linesBefore.slice(-linesToMatchAbove).join("\n");
  const afterContext = linesAfter.slice(0, linesToMatchBelow).join("\n");

  // Find the start index in the old code
  const startIndex = oldLines.findIndex((line, index) => {
    const chunk = oldLines.slice(index, index + linesToMatchAbove).join("\n");
    return chunk === beforeContext;
  });

  if (startIndex === -1) {
    return undefined; // Couldn't find matching start
  }

  // Find the end index in the old code
  const endIndex = oldLines.findIndex((line, index) => {
    if (index <= startIndex + linesToMatchBelow) {
      return false;
    }
    const chunk = oldLines.slice(index, index + linesToMatchBelow).join("\n");
    return chunk === afterContext;
  });

  if (endIndex === -1) {
    return undefined; // Couldn't find matching end
  }

  // Extract the replacement code
  const replacement = oldLines
    .slice(startIndex + linesToMatchAbove, endIndex)
    .join("\n");

  return replacement;
}

const REPLACE_HERE = "// REPLACE HERE //";
export async function* getReplacementWithLlm(
  oldCode: string,
  linesBefore: string[],
  linesAfter: string[],
  llm: ILLM,
  abortController: AbortController,
): AsyncGenerator<string> {
  const userPrompt = dedent`
    # タスク
    - 元の文字列に提案された変更を適用し、assistantは修正後のファイル全体を出力してください。
    - 内容**のみ**をassistantは出力してください。変更内容の説明、要約、記述は行わないでください。
    - 変更に伴う修正が必要な場合を除き、assistantは既存のコメントはそのまま残してください。
    - assistantは変更のない文字列をすべて、そのまま維持してください。
    # 元の文字列
    \`\`\`
    ${oldCode}
    \`\`\`
    # 提案された変更
    \`\`\`
    ${linesBefore.join("\n")}
    ${REPLACE_HERE}
    ${linesAfter.join("\n")}
    \`\`\`
  `;

  const assistantPrompt = dedent``;

  const completion = await llm.streamChat(
    [
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantPrompt },
    ],
    abortController.signal,
    {
      raw: true,
      prediction: undefined,
      reasoning: false,
    },
  );

  let lines = streamLines(completion);
  lines = filterLeadingNewline(lines);
  // We want to retrive everything from the llm
  // then let the filterCodeBlocks function clean up for any trailing text.
  // if we stop here early, we run the risk of loosing inner markdown content.

  for await (const line of lines) {
    yield line;
  }
}
