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
    return "なし";
  }

  return agentRequestedRules
    .map((rule) => `${rule.name}: ${rule.description}`)
    .join("\n");
}

export function getRequestRuleDescription(
  rules: ConfigDependentToolParams["rules"],
): string {
  const prefix =
    "ルールの内容を返します。ルールが当てはまるタイミングには、そのルールを必ず取得します。利用可能なルール:\n";
  return prefix + getAvailableRules(rules);
}

function getRequestRuleSystemMessageDescription(
  rules: ConfigDependentToolParams["rules"],
): string {
  const prefix = `説明文に基づいて、より多くのコンテキストや指示を含む「ルール」を取得するには、${BuiltInToolNames.RequestRule} ツールをルール名とともに使用してください。利用可能なルールは以下の通りです:\n`;
  const availableRules = getAvailableRules(rules);
  const suffix = "\n\n例えば、次のように応答します:";
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
