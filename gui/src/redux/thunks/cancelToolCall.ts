import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  cancelToolCall as cancelToolCallAction,
  updateToolCallOutput,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";

import { streamResponseAfterToolCall } from "./streamResponseAfterToolCall";

const DEFAULT_USER_REJECTION_MESSAGE = `ユーザーがツール呼び出しをスキップしました。`;

export const cancelToolCallThunk = createAsyncThunk<
  void,
  { toolCallId: string },
  ThunkApiType
>("chat/cancelToolCall", async ({ toolCallId }, { dispatch, getState }) => {
  const state = getState();
  const continueAfterToolRejection =
    state.config.config.ui?.continueAfterToolRejection;

  if (continueAfterToolRejection) {
    // Update tool call output with rejection message
    dispatch(
      updateToolCallOutput({
        toolCallId,
        contextItems: [
          {
            icon: "problems",
            name: "ツール呼び出し拒否",
            description: "ユーザーがツール呼び出しをスキップしました",
            content: DEFAULT_USER_REJECTION_MESSAGE,
            hidden: true,
          },
        ],
      }),
    );
  }

  // Dispatch the actual cancel action
  dispatch(cancelToolCallAction({ toolCallId }));

  void dispatch(streamResponseAfterToolCall({ toolCallId }));
});
