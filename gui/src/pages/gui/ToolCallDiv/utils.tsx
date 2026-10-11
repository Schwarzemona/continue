import * as Icons from "@heroicons/react/24/outline";
import {
  ContextItem,
  ContextItemWithId,
  ToolCallState,
  ToolStatus,
} from "core";
import { ComponentType, SVGProps } from "react";
import { vscButtonBackground } from "../../../components";
import Spinner from "../../../components/gui/Spinner";

// Helper function to determine the intro verb based on tool call status
export function getStatusIntro(
  status: ToolCallState["status"],
  isInstant?: boolean,
): string {
  if (status === "done" || (isInstant && status === "calling")) {
    return "は";
  }

  switch (status) {
    case "generating":
      return "は";
    case "generated":
      return "は";
    case "calling":
      return "は";
    case "canceled":
      return "は";
    case "errored":
      return "は";
    default:
      return "は";
  }
}

// Helper function to get the appropriate verb for group actions
export function getGroupActionVerb(toolCallStates: ToolCallState[]): string {
  if (toolCallStates.length === 0) return "実施中";

  // Get the most "active" status from all tool calls
  const statuses = toolCallStates.map((state) => state.status);

  // Priority order: calling > generating > generated > done > errored/canceled
  if (statuses.includes("calling")) {
    return "実施中";
  } else if (statuses.includes("generating")) {
    return "生成中";
  } else if (statuses.includes("generated")) {
    return "保留中";
  } else if (statuses.some((s) => s === "done")) {
    return "実施";
  } else if (statuses.some((s) => s === "errored" || s === "canceled")) {
    return "試行";
  }

  return "Performing";
}

type IconName = keyof typeof Icons;

type Icon = ComponentType<SVGProps<SVGSVGElement>> | undefined;

export function getIconByName(name: string): Icon | null {
  if (name in Icons) {
    return Icons[name as IconName] as Icon;
  }
  return null;
}

export function getStatusIcon(state: ToolStatus) {
  switch (state) {
    case "generating":
    case "calling":
      return <Spinner />;
    case "generated":
      return <Icons.ArrowRightIcon color={vscButtonBackground} />;
    case "done":
      return <Icons.CheckIcon className="text-success" />;
    case "canceled":
    case "errored":
      return <Icons.XMarkIcon className="text-error" />;
  }
}

export function toolCallStateToContextItems(
  toolCallState: ToolCallState | undefined,
): ContextItemWithId[] {
  if (!toolCallState) {
    return [];
  }
  return (
    toolCallState.output?.map((ctxItem) =>
      toolCallCtxItemToCtxItemWithId(ctxItem, toolCallState.toolCallId),
    ) ?? []
  );
}

export function toolCallCtxItemToCtxItemWithId(
  ctxItem: ContextItem,
  toolCallId: string,
): ContextItemWithId {
  return {
    ...ctxItem,
    id: {
      providerTitle: "toolCall",
      itemId: toolCallId,
    },
  };
}
