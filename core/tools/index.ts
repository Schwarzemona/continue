import { ConfigDependentToolParams, Tool } from "..";
import * as toolDefinitions from "./definitions";

// I'm writing these as functions because we've messed up 3 TIMES by pushing to const, causing duplicate tool definitions on subsequent config loads.
export const getBaseToolDefinitions = () => [
  toolDefinitions.readFileTool,
  toolDefinitions.readFileRangeTool,
  toolDefinitions.readCurrentlyOpenFileTool,
  toolDefinitions.multiEditTool,
  toolDefinitions.singleFindAndReplaceTool,
  toolDefinitions.createNewFileTool,
  toolDefinitions.createDirTool,
  toolDefinitions.removeFileTool,
  toolDefinitions.moveFileTool,
  toolDefinitions.lsTool,
  toolDefinitions.globSearchTool,
  toolDefinitions.grepSearchTool,
  toolDefinitions.grepFileTool,
  toolDefinitions.countLinesTool,
  toolDefinitions.codebaseTool,
  toolDefinitions.runTerminalCommandTool,
  toolDefinitions.getErrorsTool,
  toolDefinitions.createRuleBlock,
];

export const getConfigDependentToolDefinitions = async (
  params: ConfigDependentToolParams,
): Promise<Tool[]> => {
  const tools: Tool[] = [
    await toolDefinitions.requestRuleTool(params),
    await toolDefinitions.readSkillTool(params),
  ];

  if (params.enableExperimentalTools) {
    tools.push(
      toolDefinitions.viewRepoMapTool,
      toolDefinitions.viewSubdirectoryTool,
      toolDefinitions.viewDiffTool,
      toolDefinitions.searchWebTool,
      toolDefinitions.fetchUrlContentTool,
    );
  }

  return tools;
};

export function serializeTool(tool: Tool) {
  const { preprocessArgs, evaluateToolCallPolicy, ...rest } = tool;
  return rest;
}
