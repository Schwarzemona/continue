import { createAsyncThunk } from "@reduxjs/toolkit";
import { ApplyState, ApplyToFilePayload } from "core";
import { EDIT_MODE_STREAM_ID } from "core/edit/constants";
import { logAgentModeEditOutcome } from "../../util/editOutcomeLogger";
import {
  selectApplyStateByToolCallId,
  selectToolCallById,
} from "../selectors/selectToolCalls";
import { updateEditStateApplyState } from "../slices/editState";
import {
  acceptToolCall,
  errorToolCall,
  updateApplyState,
  updateToolCallOutput,
} from "../slices/sessionSlice";
import { ThunkApiType } from "../store";
import { findToolCallById, logToolUsage } from "../util";
import { exitEdit } from "./edit";
import { streamResponseAfterToolCall } from "./streamResponseAfterToolCall";

export const handleApplyStateUpdate = createAsyncThunk<
  void,
  ApplyState,
  ThunkApiType
>(
  "apply/handleStateUpdate",
  async (applyState, { dispatch, getState, extra }) => {
    if (applyState.streamId === EDIT_MODE_STREAM_ID) {
      dispatch(updateEditStateApplyState(applyState));

      if (applyState.status === "closed") {
        const toolCallState = findToolCallById(
          getState().session.history,
          applyState.toolCallId!,
        );
        if (toolCallState) {
          logToolUsage(toolCallState, true, true, extra.ideMessenger);
        }
        void dispatch(exitEdit({}));
      }
    } else {
      // chat or agent
      dispatch(updateApplyState(applyState));

      // Handle apply status updates - use toolCallId from event payload
      if (applyState.toolCallId) {
        const toolCallState = findToolCallById(
          getState().session.history,
          applyState.toolCallId,
        );

        if (
          applyState.status === "done" &&
          toolCallState?.toolCall.function.name &&
          getState().ui.toolSettings[toolCallState.toolCall.function.name] ===
            "allowedWithoutPermission"
        ) {
          extra.ideMessenger.post("acceptDiff", {
            streamId: applyState.streamId,
            filepath: applyState.filepath,
          });
        }

        if (applyState.status === "closed") {
          if (toolCallState) {
            const accepted = toolCallState.status !== "canceled";

            logToolUsage(toolCallState, accepted, true, extra.ideMessenger);

            // Log edit outcome for Agent Mode
            const newApplyState =
              getState().session.codeBlockApplyStates.states.find(
                (s) => s.streamId === applyState.streamId,
              );
            const newState = getState();
            if (newApplyState) {
              void logAgentModeEditOutcome(
                newState.session.history,
                newState.config.config,
                toolCallState,
                newApplyState,
                accepted,
                extra.ideMessenger,
              );
            }

            if (accepted) {
              if (toolCallState.status !== "errored") {
                dispatch(
                  acceptToolCall({
                    toolCallId: applyState.toolCallId,
                  }),
                );

                // Add autoformatting diff to tool output if present
                if (applyState.autoFormattingDiff) {
                dispatch(
                  updateToolCallOutput({
                    toolCallId: applyState.toolCallId,
                    contextItems: [
                      {
                        icon: "info",
                        name: "オートフォーマットが適用されました",
                        description: "エディタによるオートフォーマットの変更",
                        content: `編集内容に加え、エディタによって以下のオートフォーマットが適用されました:\n\n${applyState.autoFormattingDiff}`,
                        hidden: false,
                      },
                    ],
                  }),
                );
                } else {
                dispatch(
                  updateToolCallOutput({
                    toolCallId: applyState.toolCallId,
                    contextItems: [
                      {
                        name: "編集成功",
                        content: `編集に成功しました`,
                        description: "",
                        hidden: true,
                      },
                    ],
                  }),
                );
                }
              } else {
                dispatch(
                updateToolCallOutput({
                  toolCallId: applyState.toolCallId,
                  contextItems: [
                    {
                      name: "編集失敗",
                      content: `${applyState.filepath}の編集に失敗しました`,
                      description: "",
                      hidden: true,
                    },
                  ],
                }),
                );
              }

              void dispatch(
                streamResponseAfterToolCall({
                  toolCallId: applyState.toolCallId,
                }),
              );
            }
          }
        }
      }
    }
  },
);

export const applyForEditTool = createAsyncThunk<
  void,
  ApplyToFilePayload & { toolCallId: string },
  ThunkApiType
>("apply/editTool", async (payload, { dispatch, getState, extra }) => {
  const { toolCallId, streamId } = payload;
  dispatch(
    updateApplyState({
      streamId,
      toolCallId,
      status: "not-started",
    }),
  );

  let didError = false;
  try {
    const response = await extra.ideMessenger.request("applyToFile", payload);
    if (response.status === "error") {
      didError = true;
    }
  } catch (e) {
    didError = true;
  }
      if (didError) {
        const state = getState();

        const toolCallState = selectToolCallById(state, toolCallId);
        const applyState = selectApplyStateByToolCallId(state, toolCallId);
        if (
          toolCallState &&
          applyState &&
          applyState.status !== "closed" &&
          toolCallState.status === "calling"
        ) {
          dispatch(
            errorToolCall({
              toolCallId,
            }),
          );
          dispatch(
            updateToolCallOutput({
              toolCallId,
              contextItems: [
                {
                  icon: "problems",
                  name: "適用エラー",
                  description: "変更の適用に失敗しました",
                  content: `変更の適用に失敗しました`,
                  hidden: false,
                },
              ],
            }),
          );
          void dispatch(
            handleApplyStateUpdate({
              status: "closed",
              streamId: applyState.streamId,
              toolCallId,
            }),
          );
        }
      }
});
