import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { ToolCallState } from "core";
import { useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useAppDispatch } from "../../redux/hooks";
import { moveTerminalProcessToBackground } from "../../redux/thunks/moveTerminalProcessToBackground";
import { getFontSize } from "../../util";
import { CopyButton } from "../StyledMarkdownPreview/StepContainerPreToolbar/CopyButton";
import { RunInTerminalButton } from "../StyledMarkdownPreview/StepContainerPreToolbar/RunInTerminalButton";

const StyledTerminalContainer = styled.div<{
  fontSize?: number;
}>`
  background-color: var(--background);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    "Noto Sans",
    sans-serif;
  font-size: ${(props) => props.fontSize || getFontSize()}px;
  color: var(--foreground);
  line-height: 1.5;

  > *:last-child {
    margin-bottom: 0;
  }
`;

const TerminalContent = styled.div`
  pre {
    white-space: pre-wrap;
    max-width: calc(100vw - 24px);
    overflow-x: scroll;
    overflow-y: hidden;
    padding: 8px;
    margin: 0;
  }

  code {
    span.line:empty {
      display: none;
    }
    word-wrap: break-word;
    border-radius: 0.5rem;
    background-color: var(--editor-background);
    font-size: ${getFontSize() - 2}px;
    font-family:
      ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono",
      Menlo, monospace;
  }

  code:not(pre > code) {
    font-family:
      ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono",
      Menlo, monospace;
    color: var(--input-placeholder);
  }
`;

interface StatusIconProps {
  status: "running" | "completed" | "failed" | "background";
}

function StatusIcon({ status }: StatusIconProps) {
  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "bg-success";
      case "completed":
        return "bg-success";
      case "background":
        return "bg-accent";
      case "failed":
        return "bg-error";
      default:
        return "bg-success";
    }
  };

  return (
    <span
      className={`mr-2 h-2 w-2 rounded-full ${getStatusColor()} ${
        status === "running" ? "animate-pulse" : ""
      }`}
    />
  );
}

interface UnifiedTerminalCommandProps {
  command: string;
  output?: string;
  status?: "running" | "completed" | "failed" | "background";
  statusMessage?: string;
  /** 端末ログへの file URI。指定時はログリンクを表示する */
  logUri?: string;
  toolCallState?: ToolCallState;
  toolCallId?: string;
  displayLines?: number;
}

export function UnifiedTerminalCommand({
  command,
  output = "",
  status = "completed",
  statusMessage = "",
  logUri,
  toolCallState,
  toolCallId,
}: UnifiedTerminalCommandProps) {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine running state
  const isRunning = toolCallState?.status === "calling" || status === "running";
  const hasOutput = output.length > 0;

  // Determine status type
  let statusType: "running" | "completed" | "failed" | "background" = status;
  if (isRunning) {
    statusType = "running";
  } else if (statusMessage?.includes("失敗")) {
    statusType = "failed";
  } else if (statusMessage?.includes("バックグラウンド")) {
    statusType = "background";
  }

  const handleMoveToBackground = () => {
    if (toolCallId) {
      void dispatch(
        moveTerminalProcessToBackground({
          toolCallId,
        }),
      );
    }
  };

  // Create combined content for copying (command + output)
  const copyContent = useMemo(() => {
    let content = command;
    if (hasOutput) {
      content += `\n\n${output}`;
    }
    return content;
  }, [command, output, hasOutput]);

  return (
    <StyledTerminalContainer
      fontSize={getFontSize()}
      className="mx-2 mb-4"
      data-testid="terminal-container"
    >
      <div className="rounded-default bg-editor outline-command-border !my-2 flex min-w-0 flex-col outline outline-1">
        {/* Toolbar */}
        <div
          className={`find-widget-skip bg-editor sticky -top-2 z-10 m-0 flex items-center justify-between gap-3 px-1.5 py-1 ${
            isExpanded
              ? "rounded-t-default border-command-border border-b"
              : "rounded-default"
          }`}
          style={{ fontSize: `${getFontSize() - 2}px` }}
        >
          <div className="flex max-w-[50%] flex-row items-center">
            <ChevronDownIcon
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-description h-3.5 w-3.5 shrink-0 cursor-pointer hover:brightness-125 ${
                isExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
            <span className="text-description ml-2 select-none">端末</span>
          </div>

          <div className="flex items-center gap-2.5">
            {!isRunning && (
              <div className="xs:flex hidden items-center gap-2.5">
                <CopyButton text={copyContent} />
                <RunInTerminalButton command={command} />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <TerminalContent>
            <pre className="bg-editor">
              <code>
                {/* Command is always visible */}
                <div className="text-terminal pb-2">{command}</div>
              </code>
            </pre>
          </TerminalContent>
        )}

        {/* Status information */}
        {(statusMessage || isRunning) && (
          <div
            className="text-description flex items-center px-2 pt-2 pb-2"
            style={{
              borderTop:
                "1px solid var(--vscode-commandCenter-inactiveBorder, #555555)",
            }}
          >
            <StatusIcon status={statusType} />
            {isRunning && "実行中"}
            {!isRunning && !logUri && statusMessage}
            {!isRunning && logUri && (
              <a
                href="#"
                data-testid="terminal-log-link"
                onClick={(e) => {
                  e.preventDefault();
                  void ideMessenger.ide.openFile(logUri);
                }}
                className="text-link cursor-pointer no-underline hover:underline"
              >
                {statusMessage}
              </a>
            )}
            {isRunning && toolCallId && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleMoveToBackground();
                }}
                className="text-link ml-3 cursor-pointer no-underline hover:underline"
              >
                バックグラウンドへ移動
              </a>
            )}
          </div>
        )}
      </div>
    </StyledTerminalContainer>
  );
}
