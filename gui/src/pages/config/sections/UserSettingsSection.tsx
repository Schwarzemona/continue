import {
  SharedConfigSchema,
  modifyAnyConfigWithSharedConfig,
} from "core/config/sharedConfig";
import { useContext, useEffect, useState } from "react";
import { Card, Toggle, useFontSize } from "../../../components/ui";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { updateConfig } from "../../../redux/slices/configSlice";
import { setLocalStorage } from "../../../util/localStorage";
import { ConfigHeader } from "../components/ConfigHeader";
import { UserSetting } from "../components/UserSetting";

export function UserSettingsSection() {
  /////// User settings section //////
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const config = useAppSelector((state) => state.config.config);

  const [showExperimental, setShowExperimental] = useState(false);

  function handleUpdate(sharedConfig: SharedConfigSchema) {
    // Optimistic update
    const updatedConfig = modifyAnyConfigWithSharedConfig(config, sharedConfig);
    dispatch(updateConfig(updatedConfig));
    // IMPORTANT no need for model role updates (separate logic for selected model roles)
    // simply because this function won't be used to update model roles

    // Actual update to core which propagates back with config update event
    ideMessenger.post("config/updateSharedConfig", sharedConfig);
  }

  // Disable autocomplete
  const disableAutocompleteInFiles = (
    config.tabAutocompleteOptions?.disableInFiles ?? []
  ).join(", ");
  const [formDisableAutocomplete, setFormDisableAutocomplete] = useState(
    disableAutocompleteInFiles,
  );

  useEffect(() => {
    // Necessary so that reformatted/trimmed values don't cause dirty state
    setFormDisableAutocomplete(disableAutocompleteInFiles);
  }, [disableAutocompleteInFiles]);

  // Workspace prompts
  const promptPath = config.experimental?.promptPath || "";

  // TODO defaults are in multiple places, should be consolidated and probably not explicit here
  const showSessionTabs = config.ui?.showSessionTabs ?? false;
  const continueAfterToolRejection =
    config.ui?.continueAfterToolRejection ?? false;
  const codeWrap = config.ui?.codeWrap ?? false;
  const showChatScrollbar = config.ui?.showChatScrollbar ?? false;
  const readResponseTTS = config.experimental?.readResponseTTS ?? false;
  const displayRawMarkdown = config.ui?.displayRawMarkdown ?? false;
  const disableSessionTitles = config.disableSessionTitles ?? false;
  const useCurrentFileAsContext =
    config.experimental?.useCurrentFileAsContext ?? false;
  const enableExperimentalTools =
    config.experimental?.enableExperimentalTools ?? false;
  const onlyUseSystemMessageTools =
    config.experimental?.onlyUseSystemMessageTools ?? false;
  const codebaseToolCallingOnly =
    config.experimental?.codebaseToolCallingOnly ?? false;
  const allowAnonymousTelemetry = config.allowAnonymousTelemetry ?? true;

  const useAutocompleteMultilineCompletions =
    config.tabAutocompleteOptions?.multilineCompletions ?? "auto";
  const modelTimeout = config.tabAutocompleteOptions?.modelTimeout ?? 150;
  const debounceDelay = config.tabAutocompleteOptions?.debounceDelay ?? 250;
  const fontSize = useFontSize();

  const cancelChangeDisableAutocomplete = () => {
    setFormDisableAutocomplete(disableAutocompleteInFiles);
  };
  const handleDisableAutocompleteSubmit = () => {
    handleUpdate({
      disableAutocompleteInFiles: formDisableAutocomplete
        .split(",")
        .map((val) => val.trim())
        .filter((val) => !!val),
    });
  };

  const disableTelemetryToggle = false;

  return (
    <div>
      <div className="flex flex-col">
        <ConfigHeader title="設定" />
        <div className="space-y-6">
          {/* Chat Interface Settings */}
          <div>
            <ConfigHeader title="チャット" variant="sm" />
            <Card>
              <div className="flex flex-col gap-4">
                <UserSetting
                  type="toggle"
                  title="セッションタブの表示"
                  description="セッションの整理やアクセスができるセッションタブを表示します。"
                  value={showSessionTabs}
                  onChange={(value) => handleUpdate({ showSessionTabs: value })}
                />
                <UserSetting
                  type="toggle"
                  title="コードブロックの冒頭表示"
                  description="コードブロック内で長い行を横スクロールせずに折り返し表示します。"
                  value={codeWrap}
                  onChange={(value) => handleUpdate({ codeWrap: value })}
                />
                <UserSetting
                  type="toggle"
                  title="チャットスクロールバーの表示"
                  description="チャットウィンドウにスクロールバーを表示します。"
                  value={showChatScrollbar}
                  onChange={(value) =>
                    handleUpdate({ showChatScrollbar: value })
                  }
                />
                <UserSetting
                  type="toggle"
                  title="TTS出力"
                  description="LLMの応答をTTS(Text-to-Speech)で読み上げます。"
                  value={readResponseTTS}
                  onChange={(value) => handleUpdate({ readResponseTTS: value })}
                />
                <UserSetting
                  type="toggle"
                  title="自動セッションタイトル"
                  description="現在のチャットモデルを使用し、最初のメッセージの後にセッションの要約タイトルを自動生成します。"
                  value={!disableSessionTitles}
                  onChange={(value) =>
                    handleUpdate({ disableSessionTitles: !value })
                  }
                />
                <UserSetting
                  type="toggle"
                  title="マークダウンをレンダリング"
                  description="応答をプレーンテキストではなく、レンダリングして表示します。"
                  value={!displayRawMarkdown}
                  onChange={(value) =>
                    handleUpdate({ displayRawMarkdown: !value })
                  }
                />
              </div>
            </Card>
          </div>

          {/* Appearance Settings */}
          <div>
            <ConfigHeader title="表示" variant="sm" />
            <Card>
              <div className="flex flex-col gap-4">
                <UserSetting
                  type="number"
                  title="フォントサイズ"
                  description="UIの基本フォントサイズを指定します。"
                  value={fontSize}
                  onChange={(val) => {
                    setLocalStorage("fontSize", val);
                    handleUpdate({ fontSize: val });
                  }}
                  min={7}
                  max={50}
                />
              </div>
            </Card>
          </div>

          {/* Autocomplete Settings */}
          <div>
            <ConfigHeader title="オートコンプリート" variant="sm" />
            <Card>
              <div className="flex flex-col gap-4">
                <UserSetting
                  type="select"
                  title="複数行のオートコンプリート"
                  description="オートコンプリートの複数行の補完を有効にします。"
                  value={useAutocompleteMultilineCompletions}
                  onChange={(value) =>
                    handleUpdate({
                      useAutocompleteMultilineCompletions: value as
                        | "auto"
                        | "always"
                        | "never",
                    })
                  }
                  options={[
                    { label: "Auto", value: "auto" },
                    { label: "Always", value: "always" },
                    { label: "Never", value: "never" },
                  ]}
                />
                <UserSetting
                  type="number"
                  title="オートコンプリートのタイムアウト(ms)"
                  description="オートコンプリートのタイムアウトまでの時間（ミリ秒）を指定します。"
                  value={modelTimeout}
                  onChange={(val) => handleUpdate({ modelTimeout: val })}
                  min={100}
                  max={5000}
                />
                <UserSetting
                  type="number"
                  title="オートコンプリート開始時間(ms)"
                  description="変更後にオートコンプリートをトリガーするまでの時間（ミリ秒）を指定します。"
                  value={debounceDelay}
                  onChange={(val) => handleUpdate({ debounceDelay: val })}
                  min={0}
                  max={2500}
                />
                <UserSetting
                  type="input"
                  title="オートコンプリートを無効にするファイル"
                  description="正規表現で一致するファイルにおいてオートコンプリートを無効にする、コンマ区切りのリストを指定します"
                  placeholder="**/*.(txt,md)"
                  value={formDisableAutocomplete}
                  onChange={setFormDisableAutocomplete}
                  onSubmit={handleDisableAutocompleteSubmit}
                  onCancel={cancelChangeDisableAutocomplete}
                  isDirty={
                    formDisableAutocomplete !== disableAutocompleteInFiles
                  }
                  isValid={formDisableAutocomplete.trim() !== ""}
                />
              </div>
            </Card>
          </div>

          {/* Experimental Settings */}
          <div>
            <ConfigHeader title="実験機能" variant="sm" />
            <Card>
              <Toggle
                isOpen={showExperimental}
                onToggle={() => setShowExperimental(!showExperimental)}
                title="実験機能を表示"
              >
                <div className="flex flex-col gap-x-1 gap-y-4">
                  <UserSetting
                    type="toggle"
                    title="デフォルトで現在のファイルを送付"
                    description="現在開いているファイルを、会話ごとにコンテキストとして追加します。"
                    value={useCurrentFileAsContext}
                    onChange={(value) =>
                      handleUpdate({ useCurrentFileAsContext: value })
                    }
                  />
                  <UserSetting
                    type="toggle"
                    title="実験中ツールを使用"
                    description="現在開発中のツールを使用できます。"
                    value={enableExperimentalTools}
                    onChange={(value) =>
                      handleUpdate({ enableExperimentalTools: value })
                    }
                  />
                  <UserSetting
                    type="toggle"
                    title="システムメッセージにツール機能を記述"
                    description="ネイティブのツール呼び出しではなく、システムメッセージにツールを記述します。"
                    value={onlyUseSystemMessageTools}
                    onChange={(value) =>
                      handleUpdate({ onlyUseSystemMessageTools: value })
                    }
                  />
                  <UserSetting
                    type="toggle"
                    title="@Codebaseをツール呼び出しへ変更"
                    description="@codebase使用時に、現在のチャットモデルで適切なツールを判定し使用するよう変更します。"
                    value={codebaseToolCallingOnly}
                    onChange={(value) =>
                      handleUpdate({ codebaseToolCallingOnly: value })
                    }
                  />
                  <UserSetting
                    type="toggle"
                    title="却下後も生成する"
                    description="ツール呼び出しが却下された後も、生成を継続させます。"
                    value={continueAfterToolRejection}
                    onChange={(value) =>
                      handleUpdate({ continueAfterToolRejection: value })
                    }
                  />
                </div>
              </Toggle>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
