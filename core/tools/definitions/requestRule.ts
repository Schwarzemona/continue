import { ConfigDependentToolParams, GetTool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export interface RequestRuleArgs {
  name: string;
}

function getAvailableRules(rules: ConfigDependentToolParams["rules"]) {
  // Must be explicitly false and no globs
  const agentRequestedRules = rules.filter(
    (rule) => rule.alwaysApply === false && !rule.globs,
  );

  if (agentRequestedRules.length === 0) {
    return "No rules available.";
  }

  return agentRequestedRules
    .map((rule) => `${rule.name}: ${rule.description}`)
    .join("\n");
}

export function getRequestRuleDescription(
  rules: ConfigDependentToolParams["rules"],
): string {
  const prefix =
    "ルール名でルールの内容を取得します。descriptionに当てはまるタイミングには、そのルールを必ず取得します。利用可能なルール:\n";
  return prefix + getAvailableRules(rules);
}

function getRequestRuleSystemMessageDescription(
  rules: ConfigDependentToolParams["rules"],
): string {
  const prefix = `To retrieve "rules" that contain more context/instructions based on their descriptions, use the ${BuiltInToolNames.RequestRule} tool with the name of the rule. The available rules are:\n`;
  const availableRules = getAvailableRules(rules);
  const suffix = "\n\nFor example, you might respond with:";
  return prefix + availableRules + suffix;
}

export const requestRuleTool: GetTool = async ({ rules }) => ({
  type: "function",
  displayTitle: "Request Rules",
  wouldLikeTo: "{{{ name }}}を取得します",
  isCurrently: "{{{ name }}}を取得中",
  hasAlready: "{{{ name }}}を取得",
  group: BUILT_IN_GROUP_NAME,
  readonly: false,
  function: {
    name: BuiltInToolNames.RequestRule,
    description: getRequestRuleDescription(rules),
    parameters: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description:
            "ルール名。利用可能なルールの名前と一致する必要があります。",
        },
      },
    },
  },
  systemMessageDescription: {
    prefix: getRequestRuleSystemMessageDescription(rules),
    exampleArgs: [["name", "rule_name"]],
  },
  defaultToolPolicy: "disabled",
});
