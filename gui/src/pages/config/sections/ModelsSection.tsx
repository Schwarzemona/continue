import { ModelRole } from "@continuedev/config-yaml";
import { ModelDescription } from "core";
import { useContext, useState } from "react";
import Shortcut from "../../../components/gui/Shortcut";
import { useEditModel } from "../../../components/mainInput/Lump/useEditBlock";
import { Card, Divider, Toggle } from "../../../components/ui";
import { useAuth } from "../../../context/Auth";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { AddModelForm } from "../../../forms/AddModelForm";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setDialogMessage, setShowDialog } from "../../../redux/slices/uiSlice";
import { updateSelectedModelByRole } from "../../../redux/thunks/updateSelectedModelByRole";
import { getMetaKeyLabel, isJetBrains } from "../../../util";
import { ConfigHeader } from "../components/ConfigHeader";
import { ModelRoleRow } from "../components/ModelRoleRow";

const MODEL_DOCS_URLS = {
  chat: {
    learnMore: "https://docs.continue.dev/ide-extensions/chat/quick-start",
    setup: "https://docs.continue.dev/ide-extensions/chat/model-setup",
  },
  autocomplete: {
    learnMore:
      "https://docs.continue.dev/ide-extensions/autocomplete/quick-start",
    setup: "https://docs.continue.dev/ide-extensions/autocomplete/model-setup",
  },
  edit: {
    learnMore: "https://docs.continue.dev/ide-extensions/edit/quick-start",
    setup: "https://docs.continue.dev/ide-extensions/edit/model-setup",
  },
} as const;

export function ModelsSection() {
  const { selectedProfile } = useAuth();
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);

  const config = useAppSelector((state) => state.config.config);
  const jetbrains = isJetBrains();
  const metaKey = getMetaKeyLabel();
  const [showAdditionalRoles, setShowAdditionalRoles] = useState(false);

  function handleRoleUpdate(role: ModelRole, model: ModelDescription | null) {
    if (!model) {
      return;
    }

    void dispatch(
      updateSelectedModelByRole({
        role,
        selectedProfile,
        modelTitle: model.title,
      }),
    );
  }

  const handleConfigureModel = useEditModel();

  function handleAddModel() {
    dispatch(setShowDialog(true));
    dispatch(
      setDialogMessage(
        <AddModelForm
          onDone={() => {
            dispatch(setShowDialog(false));
          }}
        />,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <ConfigHeader
        title="モデル"
        onAddClick={handleAddModel}
        addButtonTooltip="モデルを追加"
      />

      <Card>
        <ModelRoleRow
          role="chat"
          displayName="チャット"
          shortcut={
            <span className="text-description-muted">
              (<Shortcut>{`cmd ${jetbrains ? "J" : "L"}`}</Shortcut>)
            </span>
          }
          description={
            <span>
              会話モード、計画モード、自律モードに使うモデル(
              <a
                href={MODEL_DOCS_URLS.chat.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:brightness-125"
              >
                参考
              </a>
              )
            </span>
          }
          models={config.modelsByRole.chat}
          selectedModel={config.selectedModelByRole.chat ?? undefined}
          onSelect={(model) => handleRoleUpdate("chat", model)}
          onConfigure={handleConfigureModel}
          setupURL={MODEL_DOCS_URLS.chat.setup}
        />

        <Divider />

        <ModelRoleRow
          role="autocomplete"
          displayName="オートコンプリート"
          description={
            <span>
              インラインコード補完に使うモデル(
              <a
                href={MODEL_DOCS_URLS.autocomplete.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:brightness-125"
              >
                参考
              </a>
              )
            </span>
          }
          models={config.modelsByRole.autocomplete}
          selectedModel={config.selectedModelByRole.autocomplete ?? undefined}
          onSelect={(model) => handleRoleUpdate("autocomplete", model)}
          onConfigure={handleConfigureModel}
          setupURL={MODEL_DOCS_URLS.autocomplete.setup}
        />

        {/* Jetbrains has a model selector inline */}
        {!jetbrains && (
          <>
            <Divider />
            <ModelRoleRow
              role="edit"
              displayName="編集"
              shortcut={
                <span className="text-description-muted">
                  (<Shortcut>cmd I</Shortcut>)
                </span>
              }
              description={
                <span>
                  選択したコードのセクションで編集に使うモデル(
                  <a
                    href={MODEL_DOCS_URLS.edit.learnMore}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-inherit underline hover:brightness-125"
                  >
                    参考
                  </a>
                  )
                </span>
              }
              models={config.modelsByRole.edit}
              selectedModel={config.selectedModelByRole.edit ?? undefined}
              onSelect={(model) => handleRoleUpdate("edit", model)}
              onConfigure={handleConfigureModel}
              setupURL={MODEL_DOCS_URLS.edit.setup}
            />
          </>
        )}
      </Card>

      <Card>
        <Toggle
          isOpen={showAdditionalRoles}
          onToggle={() => setShowAdditionalRoles(!showAdditionalRoles)}
          title="追加のモデルロール"
          subtitle="適用、組み込み、リランカー"
        >
          <div className="flex flex-col">
            <ModelRoleRow
              role="apply"
              displayName="適用"
              description="生成したコードブロックをファイルに適用するのに使うモデル"
              models={config.modelsByRole.apply}
              selectedModel={config.selectedModelByRole.apply ?? undefined}
              onSelect={(model) => handleRoleUpdate("apply", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.continue.dev/customize/model-roles/apply"
            />

            <Divider />

            <ModelRoleRow
              role="embed"
              displayName="組み込み"
              description="@codebaseと@docsの生成およびクエリに使うモデル"
              models={config.modelsByRole.embed}
              selectedModel={config.selectedModelByRole.embed ?? undefined}
              onSelect={(model) => handleRoleUpdate("embed", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.continue.dev/customize/model-roles/embeddings"
            />

            <Divider />

            <ModelRoleRow
              role="rerank"
              displayName="リランカー"
              description="@codebaseと@docsからの結果をリランクするモデル"
              models={config.modelsByRole.rerank}
              selectedModel={config.selectedModelByRole.rerank ?? undefined}
              onSelect={(model) => handleRoleUpdate("rerank", model)}
              onConfigure={handleConfigureModel}
              setupURL="https://docs.continue.dev/customize/model-roles/reranking"
            />

            <Divider />
          </div>
        </Toggle>

        <Divider />
      </Card>
    </div>
  );
}
