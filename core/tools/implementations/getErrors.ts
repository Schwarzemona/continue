import { ToolImpl } from ".";
import { Problem } from "../..";
import { getUriPathBasename } from "../../util/uri";
import { resolveFileUri } from "./resolveFileUri";

export function formatProblems(problems: Problem[]): string {
  return problems
    .map(
      (p) =>
        `${p.range.start.line + 1}:${p.range.start.character + 1}: ${p.message}`,
    )
    .join("\n");
}

export const getErrorsImpl: ToolImpl = async (args, extras) => {
  const filepath: string | undefined = args?.filepath;

  const fileUri = filepath
    ? await resolveFileUri(extras.ide, filepath)
    : undefined;
  const problems = await extras.ide.getProblems(fileUri);

  const target = filepath ?? "アクティブエディタ";
  if (problems.length === 0) {
    return [
      {
        name: `エラー`,
        description: "Problems",
        content: "エラーは見つかりませんでした",
      },
    ];
  }

  return [
    {
      name: `エラー`,
      description: `IDEのProblems: ${problems[0].filepath ? getUriPathBasename(problems[0].filepath) : target}`,
      content: formatProblems(problems),
    },
  ];
};
