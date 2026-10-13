import {
  LLMInteractionStartChat,
  LLMInteractionStartComplete,
  LLMInteractionStartFim,
} from "core";
import Expander from "./Expander";
import Message from "./Message";

export interface StartProps {
  item:
    | LLMInteractionStartChat
    | LLMInteractionStartComplete
    | LLMInteractionStartFim;
}

export default function Start({ item }: StartProps) {
  return (
    <div className="border-0 border-b-2 border-solid border-[color:var(--vscode-panel-border)] p-1">
      {(() => {
        switch (item.kind) {
          case "startChat":
            return (
              <>
                <Expander label="プロンプト">
                  <div className="p-1">
                    {item.messages.map((message, i) => (
                      <Message key={i} message={message}></Message>
                    ))}
                  </div>
                </Expander>
                <Expander label="設定">
                  <pre className="m-0">
                    {JSON.stringify(item.options, undefined, 2)}
                  </pre>
                </Expander>
              </>
            );
            break;
          case "startComplete":
            return (
              <>
                <Expander label="プロンプト">
                  <pre className="m-0">{item.prompt}</pre>
                </Expander>
                <Expander label="設定">
                  <pre className="m-0">
                    {JSON.stringify(item.options, undefined, 2)}
                  </pre>
                </Expander>
              </>
            );
            break;
          case "startFim":
            return (
              <>
                <Expander label="接頭辞">
                  <pre className="m-0">{item.prefix}</pre>
                </Expander>
                <Expander label="接尾辞">
                  <pre className="m-0">{item.suffix}</pre>
                </Expander>
                <Expander label="設定">
                  <pre className="m-0">
                    {JSON.stringify(item.options, undefined, 2)}
                  </pre>
                </Expander>
              </>
            );
        }
      })()}
    </div>
  );
}
