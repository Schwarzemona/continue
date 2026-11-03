import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AgentsList } from "./AgentsList";

interface BackgroundModeViewProps {
  isCreatingAgent?: boolean;
}

export function BackgroundModeView({
  isCreatingAgent = false,
}: BackgroundModeViewProps) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="px-2">
        <div className="text-description">
          バックグラウンドエージェントを実行するには、上のタスクを送信してください。コンテナが開始されると、約30秒後に下のリストにタスクが表示されます。
        </div>
        {isCreatingAgent && (
          <div className="text-description-muted mt-2 flex items-center gap-2">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
            <span>タスクを作成中……</span>
          </div>
        )}
      </div>
      <AgentsList isCreatingAgent={isCreatingAgent} />
    </div>
  );
}
