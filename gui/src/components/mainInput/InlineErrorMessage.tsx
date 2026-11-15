import { useContext } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setInlineErrorMessage } from "../../redux/slices/sessionSlice";

export type InlineErrorMessageType = "out-of-context";

export default function InlineErrorMessage() {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const inlineErrorMessage = useAppSelector(
    (state) => state.session.inlineErrorMessage,
  );
  if (inlineErrorMessage === "out-of-context") {
    return (
      <div
        className={`relative m-2 flex flex-col rounded-md border border-solid border-border bg-transparent p-4`}
      >
        <p className={`thread-message text-center text-error`}>
          {`メッセージがコンテキスト制限を超えています。`}
        </p>
        <div className="flex flex-row items-center justify-center gap-1.5 px-3 text-description">
          <div
            className="cursor-pointer hover:underline"
            onClick={() => {
              ideMessenger.post("config/openProfile", {
                profileId: undefined,
              });
            }}
          >
            <span className="hidden xs:flex">設定を開く</span>
            <span className="xs:hidden">設定</span>
          </div>
          |
          <span
            className="cursor-pointer hover:underline"
            onClick={() => {
              dispatch(setInlineErrorMessage(undefined));
            }}
          >
            隠す
          </span>
        </div>
      </div>
    );
  }
  return null;
}
