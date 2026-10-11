import {
  DocumentArrowUpIcon,
  LinkIcon,
  NumberedListIcon,
  PaintBrushIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Shortcut from "../../../components/gui/Shortcut";
import { Card } from "../../../components/ui";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setOnboardingCard } from "../../../redux/slices/uiSlice";
import { saveCurrentSession } from "../../../redux/thunks/session";
import { isJetBrains } from "../../../util";
import { ROUTES } from "../../../util/navigation";
import { ConfigHeader } from "../components/ConfigHeader";
import { ConfigRow } from "../components/ConfigRow";

interface KeyboardShortcutProps {
  shortcut: string;
  description: string;
  isEven: boolean;
}

function KeyboardShortcut(props: KeyboardShortcutProps) {
  return (
    <div
      className={`flex flex-col items-start p-3 sm:flex-row sm:items-center ${props.isEven ? "" : "bg-vsc-editor-background/50"}`}
    >
      <div className="w-full flex-grow pb-2 pr-4 sm:w-auto sm:pb-0">
        <span className="block break-words text-sm">{props.description}:</span>
      </div>
      <div className="flex-shrink-0 whitespace-nowrap">
        <Shortcut>{props.shortcut}</Shortcut>
      </div>
    </div>
  );
}

// Shortcut strings will be rendered correctly based on the platform by the Shortcut component
const vscodeShortcuts: Omit<KeyboardShortcutProps, "isEven">[] = [
  {
    shortcut: "cmd '",
    description: "選択モデルの切り替え",
  },
  {
    shortcut: "cmd I",
    description: "ハイライトコードを編集",
  },
  {
    shortcut: "cmd L",
    description:
      "新しいチャット / 選択したコードで新しいチャット / チャットにフォーカスがある場合はContinueのサイドバーを閉じる",
  },
  {
    shortcut: "cmd backspace",
    description: "生成を停止",
  },
  {
    shortcut: "cmd shift I",
    description: "インライン編集のフォーカスの切り替え",
  },
  {
    shortcut: "cmd shift L",
    description:
      "現在のチャットにフォーカス / 選択したコードを現在のチャットに追加 / チャットにフォーカスがある場合はContinueサイドバーを閉じる",
  },
  {
    shortcut: "cmd shift R",
    description: "デバッグターミナル",
  },
  {
    shortcut: "cmd shift backspace",
    description: "差分を却下",
  },
  {
    shortcut: "cmd shift enter",
    description: "差分を承認",
  },
  {
    shortcut: "alt cmd N",
    description: "最初の差分を却下",
  },
  {
    shortcut: "alt cmd Y",
    description: "最初の差分を承認",
  },
  {
    shortcut: "cmd K cmd A",
    description: "オートコンプリート有効の切り替え",
  },
  {
    shortcut: "cmd alt space",
    description: "オートコンプリートを実行する",
  },
  {
    shortcut: "cmd K cmd M",
    description: "フルスクリーンの切り替え",
  },
];

const jetbrainsShortcuts: Omit<KeyboardShortcutProps, "isEven">[] = [
  {
    shortcut: "cmd '",
    description: "Toggle Selected Model",
  },
  {
    shortcut: "cmd I",
    description: "Edit highlighted code",
  },
  {
    shortcut: "cmd J",
    description:
      "New Chat / New Chat With Selected Code / Close Continue Sidebar If Chat Already In Focus",
  },
  {
    shortcut: "cmd backspace",
    description: "Cancel response",
  },
  {
    shortcut: "cmd shift I",
    description: "Toggle inline edit focus",
  },
  {
    shortcut: "cmd shift J",
    description:
      "Focus Current Chat / Add Selected Code To Current Chat / Close Continue Sidebar If Chat Already In Focus",
  },
  {
    shortcut: "cmd shift backspace",
    description: "Reject Diff",
  },
  {
    shortcut: "cmd shift enter",
    description: "Accept Diff",
  },
  {
    shortcut: "alt shift J",
    description: "Quick Input",
  },
  {
    shortcut: "alt cmd J",
    description: "Toggle Sidebar",
  },
];

export function HelpSection() {
  const ideMessenger = useContext(IdeMessengerContext);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const currentSession = useAppSelector((state) => state.session);

  const shortcuts = useMemo(() => {
    return isJetBrains() ? jetbrainsShortcuts : vscodeShortcuts;
  }, []);

  const handleViewSessionData = async () => {
    const sessionData = await ideMessenger.request("history/load", {
      id: currentSession.id,
    });

    if (sessionData.status === "success") {
      await ideMessenger.request("showVirtualFile", {
        name: `${sessionData.content.title}.json`,
        content: JSON.stringify(sessionData.content, null, 2),
      });
    }
  };

  return (
    <div className="flex flex-col">
      <ConfigHeader title="ヘルプ" />
      <div className="space-y-6">
        {/* Resources */}
        <div>
          <h3 className="mb-3 text-base font-medium">参考</h3>
          <Card className="!p-0">
            <div className="flex flex-col">
              <ConfigRow
                title="ドキュメント"
                description="設定方法と使用方法が学べます。"
                icon={LinkIcon}
                onClick={() =>
                  ideMessenger.post("openUrl", "https://docs.continue.dev/")
                }
              />
            </div>
          </Card>
        </div>

        {/* Tools */}
        <div>
          <h3 className="mb-3 text-base font-medium">ツール</h3>
          <Card className="!p-0">
            <div className="flex flex-col">
              <ConfigRow
                title="トークン使用量"
                description="モデルごとの日次トークン使用量です。"
                icon={TableCellsIcon}
                onClick={() => navigate(ROUTES.STATS)}
              />

              {currentSession.history.length > 0 &&
                !currentSession.isStreaming && (
                  <ConfigRow
                    title="現在のセッション履歴を表示"
                    description="トラブルシューティングとして現在のチャットセッションファイルを開きます。"
                    icon={NumberedListIcon}
                    onClick={handleViewSessionData}
                  />
                )}

              <ConfigRow
                title="クイックスタート"
                description="クイックスタートとチュートリアルのファイルを開きます。"
                icon={DocumentArrowUpIcon}
                onClick={async () => {
                  navigate("/");
                  // Used to clear the chat panel before showing onboarding card
                  await dispatch(
                    saveCurrentSession({
                      openNewSession: true,
                      generateTitle: true,
                    }),
                  );
                  dispatch(
                    setOnboardingCard({
                      show: true,
                      activeTab: undefined,
                    }),
                  );
                  ideMessenger.post("showTutorial", undefined);
                }}
              />

              {process.env.NODE_ENV === "development" && (
                <ConfigRow
                  title="Theme Test Page"
                  description="Development page for testing themes"
                  icon={PaintBrushIcon}
                  onClick={async () => {
                    navigate(ROUTES.THEME);
                  }}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <h3 className="mb-3 text-base font-medium">ショートカット</h3>
          <Card className="!p-0">
            <div className="overflow-hidden rounded-md border border-gray-600">
              {shortcuts.map((shortcut, i) => {
                return (
                  <KeyboardShortcut
                    key={i}
                    shortcut={shortcut.shortcut}
                    description={shortcut.description}
                    isEven={i % 2 === 0}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
