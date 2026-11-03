import { ToolImpl } from ".";
import { loadMarkdownSkills } from "../../config/markdown/loadMarkdownSkills";
import { ContinueError, ContinueErrorReason } from "../../util/errors";
import { getStringArg } from "../parseArgs";

export const readSkillImpl: ToolImpl = async (args, extras) => {
  const skillName = getStringArg(args, "skillName");

  const { skills } = await loadMarkdownSkills(extras.ide);

  const skill = skills.find((s) => s.name === skillName);

  if (!skill) {
    const availableSkills = skills.map((s) => s.name).join(", ");
    throw new ContinueError(
      ContinueErrorReason.SkillNotFound,
      `「${skillName}」が見つかりません。利用可能なスキル: ${availableSkills || "なし"}`,
    );
  }

  let content = skill.content;

  if (skill.files.length > 0) {
    content += `\n
## サポートファイル
スキルディレクトリ:
${skill.files.join("\n")}

必要に応じてread_fileツールを使用してこれらのファイルにアクセスしてください。`;
  }

  return [
    {
      name: `スキル: ${skill.name}`,
      description: skill.description,
      content,
      uri: {
        type: "file",
        value: skill.path,
      },
    },
  ];
};
