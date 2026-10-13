import { RuleMetadata } from "../..";
import { getLastNPathParts } from "../../util/uri";

export function getRuleDisplayName(rule: RuleMetadata): string {
  if (rule.name) {
    return rule.name;
  }
  return getRuleSourceDisplayName(rule);
}

export function getRuleSourceDisplayName(rule: RuleMetadata): string {
  switch (rule.source) {
    case ".continuerules":
      return "プロジェクトルール";
    case "default-chat":
      return "デフォルトチャットシステムメッセージ";
    case "default-plan":
      return "デフォルトプランモードシステムメッセージ";
    case "default-agent":
      return "デフォルトエージェントシステムメッセージ";
    case "json-systemMessage":
      return "システムメッセージ(JSON)";
    case "model-options-agent":
      return "ベースシステムエージェントメッセージ";
    case "model-options-plan":
      return "ベースシステムプランメッセージ";
    case "model-options-chat":
      return "ベースシステムチャットメッセージ";
    case "agentFile":
      if (rule.sourceFile) {
        return getLastNPathParts(rule.sourceFile, 2);
      } else {
        return "エージェントファイル";
      }
    case "colocated-markdown":
      if (rule.sourceFile) {
        return getLastNPathParts(rule.sourceFile, 2);
      } else {
        return "rules.md";
      }
    case "rules-block":
      return "ルールブロック";
    default:
      return rule.source;
  }
}
