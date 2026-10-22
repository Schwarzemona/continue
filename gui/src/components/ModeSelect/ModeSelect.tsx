import {
  CheckIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { MessageModes } from "core";
import { isRecommendedAgentModel } from "core/llm/toolSupport";
import { useCallback, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { selectSelectedChatModel } from "../../redux/slices/configSlice";
import { setMode } from "../../redux/slices/sessionSlice";
import { getFontSize, getMetaKeyLabel } from "../../util";
import { ToolTip } from "../gui/Tooltip";
import { useMainEditor } from "../mainInput/TipTapEditor";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "../ui";
import { ModeIcon } from "./ModeIcon";

const tinyFont = getFontSize() - 2;

export function ModeSelect() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((store) => store.session.mode);
  const selectedModel = useAppSelector(selectSelectedChatModel);

  const isGoodAtAgentMode = useMemo(() => {
    if (!selectedModel) {
      return undefined;
    }
    return isRecommendedAgentModel(selectedModel.model);
  }, [selectedModel]);

  const { mainEditor } = useMainEditor();
  const metaKeyLabel = useMemo(() => {
    return getMetaKeyLabel();
  }, []);

  const cycleMode = useCallback(() => {
    if (mode === "chat") {
      dispatch(setMode("plan"));
    } else if (mode === "plan") {
      dispatch(setMode("agent"));
    } else {
      dispatch(setMode("chat"));
    }
    // Only focus main editor if another one doesn't already have focus
    if (!document.activeElement?.classList?.contains("ProseMirror")) {
      mainEditor?.commands.focus();
    }
  }, [mode, mainEditor]);

  const selectMode = useCallback(
    (newMode: MessageModes) => {
      if (newMode === mode) {
        return;
      }

      dispatch(setMode(newMode));

      mainEditor?.commands.focus();
    },
    [mode, mainEditor],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "." && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void cycleMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cycleMode]);

  const notGreatAtAgent = (mode: string) => (
    <>
      <ToolTip
        style={{
          zIndex: 200001, // in front of listbox
        }}
        className="flex items-center gap-1"
        content={`${mode} might not work well with this model.`}
      >
        <ExclamationTriangleIcon className="h-2.5 w-2.5 text-warning" />
      </ToolTip>
    </>
  );

  return (
    <Listbox value={mode} onChange={selectMode}>
      <div className="relative">
        <ListboxButton
          data-testid="mode-select-button"
          className="gap-1 rounded-full border-none bg-lightgray/20 px-1.5 py-0.5 text-description transition-colors duration-200 hover:brightness-110 xs:px-3"
        >
          <ModeIcon mode={mode} />
          <span className="hidden sm:block" style={{ fontSize: tinyFont }}>
            {mode === "chat" ? "会話" : mode === "agent" ? "自律" : "計画"}
          </span>
          <ChevronDownIcon
            className="h-3 w-3 flex-shrink-0"
            aria-hidden="true"
          />
        </ListboxButton>
        <ListboxOptions className="min-w-32 max-w-48">
          <ListboxOption value="chat">
            <div
              className="flex flex-row items-center gap-1.5"
              style={{ fontSize: tinyFont }}
            >
              <ModeIcon mode="chat" />
              <span className="">会話</span>
              <ToolTip
                style={{
                  zIndex: 200001,
                }}
                content="すべてのツールが利用不可"
              >
                <InformationCircleIcon
                  data-tooltip-id="chat-tip"
                  className="h-3 w-3 flex-shrink-0"
                />
              </ToolTip>
              <span className={`mr-auto text-description-muted`}>
                {getMetaKeyLabel()}L
              </span>
            </div>
            {mode === "chat" && <CheckIcon className="ml-auto h-3 w-3" />}
          </ListboxOption>
          <ListboxOption value="plan" className={"gap-1"}>
            <div
              className="flex flex-row items-center gap-1.5"
              style={{ fontSize: tinyFont }}
            >
              <ModeIcon mode="plan" />
              <span className="">計画</span>
              <ToolTip
                style={{
                  zIndex: 200001,
                }}
                content="読み取り専用ツール/MCPツールが利用可能"
              >
                <InformationCircleIcon className="h-3 w-3 flex-shrink-0" />
              </ToolTip>
            </div>
            {!isGoodAtAgentMode && notGreatAtAgent("Plan")}
            <CheckIcon
              className={`ml-auto h-3 w-3 ${mode === "plan" ? "" : "opacity-0"}`}
            />
          </ListboxOption>

          <ListboxOption value="agent" className={"gap-1"}>
            <div
              className="flex flex-row items-center gap-1.5"
              style={{ fontSize: tinyFont }}
            >
              <ModeIcon mode="agent" />
              <span className="">自律</span>
              <ToolTip
                style={{
                  zIndex: 200001,
                }}
                content="全てのツールが利用可能"
              >
                <InformationCircleIcon className="h-3 w-3 flex-shrink-0" />
              </ToolTip>
            </div>
            {!isGoodAtAgentMode && notGreatAtAgent("Agent")}
            <CheckIcon
              className={`ml-auto h-3 w-3 ${mode === "agent" ? "" : "opacity-0"}`}
            />
          </ListboxOption>

          <div
            className="px-2 py-1 text-description-muted"
            style={{ fontSize: tinyFont }}
          >
            {`${metaKeyLabel} .で次のモード`}
          </div>
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
