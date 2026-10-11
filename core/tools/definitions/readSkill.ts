import { GetTool } from "../..";
import { loadMarkdownSkills } from "../../config/markdown/loadMarkdownSkills";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const readSkillTool: GetTool = async (params) => {
  const { skills } = await loadMarkdownSkills(params.ide);
  return {
    type: "function",
    displayTitle: "Read Skill",
    wouldLikeTo: "{{{ skillName }}}を参照します",
    isCurrently: "{{{ skillName }}}を参照中",
    hasAlready: "{{{ skillName }}}を参照",
    readonly: true,
    isInstant: true,
    group: BUILT_IN_GROUP_NAME,
    function: {
      name: BuiltInToolNames.ReadSkill,
      description: `
スキル名でスキルの内容を読み取ります。descriptionに当てはまるタイミングには、そのスキルを必ず読み取ります。利用可能なスキル: 
${skills.map((skill) => `\nname: ${skill.name}\ndescription: ${skill.description}\n`)}`,
      parameters: {
        type: "object",
        required: ["skillName"],
        properties: {
          skillName: {
            type: "string",
            description:
              "読み取るスキルの名前。利用可能なスキルの名前と一致する必要があります。",
          },
        },
      },
    },
  };
};
