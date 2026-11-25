import { createAsyncThunk } from "@reduxjs/toolkit";
import { ContextItem } from "core";
import {
  abortStream,
  acceptToolCall,
  updateToolCallOutput,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";
import { streamResponseAfterToolCall } from "./streamResponseAfterToolCall";

/**
 * This thunk is used to move a terminal command to the background
 * when the user clicks the "Move to background" link in the UI
 *
 * 全出力はモデルへ返さず、ステータスだけを返す。
 * 出力の続きは core 側がログへ書き出し続け、コマンド自体は走り続ける。
 * ログパスは core の実行中追跡から引き継ぎ、ログリンクをカードに残す。
 */
export const moveTerminalProcessToBackground = createAsyncThunk<
  void,
  { toolCallId: string },
  ThunkApiType
>(
  "chat/moveTerminalProcessToBackground",
  async ({ toolCallId }, { dispatch, extra }) => {
    const logResponse = await extra.ideMessenger.request(
      "process/getRunningLog",
      { toolCallId },
    );
    const terminalLog =
      logResponse.status === "success" ? logResponse.content : undefined;

    const status = "バックグラウンドで実行中";

    const contextItems: ContextItem[] = [
      {
        name: "端末",
        description: "端末コマンド出力",
        content: terminalLog
          ? `${status}\nログ: ${terminalLog.relativePath}`
          : status,
        status,
      },
    ];
    if (terminalLog) {
      contextItems[0].uri = {
        type: "file",
        value: terminalLog.uri,
      };
    }

    // Abort any existing stream for this tool call
    dispatch(abortStream());

    // Update the tool call output
    dispatch(
      updateToolCallOutput({
        toolCallId,
        contextItems,
      }),
    );

    // Mark the process as backgrounded so we ignore future events
    await extra.ideMessenger.request("process/markAsBackgrounded", {
      toolCallId,
    });

    // Mark the tool call as "done" in the UI
    // This will set isRunning to false in RunTerminalCommand.tsx
    dispatch(acceptToolCall({ toolCallId }));

    // Trigger an LLM response about the command being moved to background
    dispatch(
      streamResponseAfterToolCall({
        toolCallId,
      }),
    );
  },
);
