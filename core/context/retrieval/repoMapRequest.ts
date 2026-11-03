import { Chunk, ContinueConfig, IDE, ILLM } from "../..";
import { getModelByRole } from "../../config/util";
import generateRepoMap from "../../util/generateRepoMap";
import { resolveRelativePathInDir } from "../../util/ideUtils";
import { renderChatMessage } from "../../util/messageContent";

const SUPPORTED_MODEL_TITLE_FAMILIES = [
  "claude-3",
  "llama3.1",
  "llama3.2",
  "gemini-2.5",
  "gpt-4",
];

function isSupportedModel(
  config: ContinueConfig,
  modelTitle?: string,
): boolean {
  if (config.experimental?.modelRoles?.repoMapFileSelection) {
    return true;
  }

  if (!modelTitle) {
    return false;
  }

  const lowercaseModelTitle = modelTitle.toLowerCase();

  return SUPPORTED_MODEL_TITLE_FAMILIES.some((title) =>
    lowercaseModelTitle.includes(title),
  );
}

export async function requestFilesFromRepoMap(
  defaultLlm: ILLM,
  config: ContinueConfig,
  ide: IDE,
  input: string,
  filterDirUri?: string,
): Promise<Chunk[]> {
  const llm = getModelByRole(config, "repoMapFileSelection") ?? defaultLlm;

  // Only supported for Claude models right now
  if (!isSupportedModel(config, llm.title)) {
    return [];
  }

  try {
    const repoMap = await generateRepoMap(llm, ide, {
      dirUris: filterDirUri ? [filterDirUri] : undefined,
      includeSignatures: false,
      outputRelativeUriPaths: true,
    });

    const prompt = `${repoMap}

上記のレポジトリマップに基づき、質問に回答する際に最も関連性が高いと考えられるファイルを選択してください。回答を出す前に、どのファイルやフォルダが重要であるかについての推論を記述してください。この思考プロセスは<reasoning>タグで開始し、推論を説明する段落を記述した後、最終行に閉じタグ</reasoning>を記述してください。

その後、回答は<results>タグで開始し、各ファイルを1行ずつリストアップした後、最終行に閉じタグ</results>を記述してください。選択するファイル数は5個から10個の間としてください。リストアップする名前は、レポジトリマップに記載されている正確な相対パスを使用し、ファイル名のみにしないでください。

関連するファイルを選択すべき質問は以下の通りです: "${input}"`;

    const response = await llm.chat(
      [
        { role: "user", content: prompt },
        { role: "assistant", content: "<reasoning>" },
      ],
      new AbortController().signal,
    );
    const content = renderChatMessage(response);

    if (!content.includes("\n")) {
      return [];
    }

    const filepaths = content
      .split("<results>")[1]
      ?.split("</results>")[0]
      ?.split("\n")
      .filter(Boolean)
      .map((filepath) => filepath.trim());

    const chunks = await Promise.all(
      filepaths.map(async (filepath) => {
        const uri = await resolveRelativePathInDir(filepath, ide);
        if (!uri) {
          return undefined;
        }
        const content = await ide.readFile(uri);
        const lineCount = content.split("\n").length;
        const chunk: Chunk = {
          digest: uri,
          content,
          filepath: uri,
          endLine: lineCount - 1,
          startLine: 0,
          index: 0,
        };
        return chunk;
      }),
    );

    return chunks.filter((c) => c !== undefined) as Chunk[];
  } catch (e) {
    console.debug("Error requesting files from repo map", e);
    return [];
  }
}
