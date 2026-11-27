import { t } from "../i18n.js";
import { services } from "../services/index.js";
import { serviceContainer } from "../services/ServiceContainer.js";
import { ModelServiceState, SERVICE_NAMES } from "../services/types.js";
import { executeSubAgent } from "../subagent/executor.js";
import {
  generateSubagentToolDescription,
  getSubagent,
  getAgentNames as getSubagentNames,
} from "../subagent/get-agents.js";
import { SUBAGENT_TOOL_META } from "../subagent/index.js";
import { logger } from "../util/logger.js";

import { Tool } from "./types.js";

export const subagentTool = async (): Promise<Tool> => {
  const modelServiceState = await serviceContainer.get<ModelServiceState>(
    SERVICE_NAMES.MODEL,
  );

  return {
    ...SUBAGENT_TOOL_META,

    description: generateSubagentToolDescription(modelServiceState),

    parameters: {
      ...SUBAGENT_TOOL_META.parameters,
      properties: {
        ...SUBAGENT_TOOL_META.parameters.properties,
        subagent_name: {
          type: "string",
          description: `このタスクに使用する専門化されたエージェントの種類。利用可能なエージェント: ${
            modelServiceState
              ? getSubagentNames(modelServiceState).join(", ")
              : ""
          }`,
        },
      },
    },

    preprocess: async (args: any) => {
      const { description, subagent_name } = args;

      const agent = getSubagent(modelServiceState, subagent_name);
      if (!agent) {
        throw new Error(
          t(
            `Unknown agent type: ${subagent_name}. Available agents: ${getSubagentNames(
              modelServiceState,
            ).join(", ")}`,
            `不明なエージェント種類: ${subagent_name}。利用可能なエージェント: ${getSubagentNames(
              modelServiceState,
            ).join(", ")}`,
          ),
        );
      }

      return {
        args,
        preview: [
          {
            type: "text",
            content: t(
              `Spawning ${agent.model.name} to: ${description}`,
              `${agent.model.name} を起動します: ${description}`,
            ),
          },
        ],
      };
    },

    run: async (args: any, context?: { toolCallId: string }) => {
      const { prompt, subagent_name } = args;

      logger.debug(t("subagent args", "サブエージェント引数"), {
        args,
        context,
      });

      // get agent configuration
      const agent = getSubagent(modelServiceState, subagent_name);
      if (!agent) {
        throw new Error(
          t(
            `Unknown agent type: ${subagent_name}`,
            `不明なエージェント種別: ${subagent_name}`,
          ),
        );
      }

      const chatHistoryService = services.chatHistory;
      const parentSessionId = chatHistoryService.getSessionId();
      if (!parentSessionId) {
        throw new Error(
          t(
            "No active session found",
            "アクティブなセッションが見つかりません",
          ),
        );
      }

      // Execute subagent with output streaming
      const result = await executeSubAgent({
        agent,
        prompt,
        parentSessionId,
        abortController: new AbortController(),
        onOutputUpdate: context?.toolCallId
          ? (output: string) => {
              try {
                chatHistoryService.addToolResult(
                  context.toolCallId,
                  output,
                  "calling",
                );
              } catch {
                // Ignore errors during streaming updates
              }
            }
          : undefined,
      });

      logger.debug(t("subagent result", "サブエージェント結果"), { result });

      const output = [
        result.response,
        "<task_metadata>",
        t(
          `status: ${result.success ? "completed" : "failed"}`,
          `状態: ${result.success ? "完了" : "失敗"}`,
        ),
        "</task_metadata>",
      ]
        .filter(Boolean)
        .join("\n");

      return output;
    },
  };
};
