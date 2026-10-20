import {
  SharedConfigSchema,
  modifyAnyConfigWithSharedConfig,
} from "core/config/sharedConfig";
import { useContext } from "react";
import Alert from "../../../components/gui/Alert";
import { Card, Divider } from "../../../components/ui";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { updateConfig } from "../../../redux/slices/configSlice";
import { ConfigHeader } from "../components/ConfigHeader";
import { UserSetting } from "../components/UserSetting";
import IndexingProgress from "../features/indexing";
import { DocsSection } from "./DocsSection";

function CodebaseSubSection() {
  const config = useAppSelector((state) => state.config.config);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="mb-0 font-semibold">@codebaseインデックス</h3>
      </div>

      <Card>
        <div className="py-2">
          {config.disableIndexing ? (
            <div className="p-1">
              <p className="text-center font-semibold">Indexing is disabled</p>
            </div>
          ) : (
            <IndexingProgress />
          )}
        </div>
      </Card>
    </div>
  );
}

function EnableIndexingSetting() {
  const dispatch = useAppDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const config = useAppSelector((state) => state.config.config);

  function handleUpdate(sharedConfig: SharedConfigSchema) {
    const updatedConfig = modifyAnyConfigWithSharedConfig(config, sharedConfig);
    dispatch(updateConfig(updatedConfig));
    ideMessenger.post("config/updateSharedConfig", sharedConfig);
  }

  const disableIndexing = config.disableIndexing ?? false;
  const disableIndexingToggle = false;

  return (
    <div className="flex flex-col gap-4">
      <UserSetting
        title="インデックスを有効"
        type="toggle"
        description={
          <div className="text-foreground">
            検索やコンテキストの理解のために、コードベースのインデックス作成を有効にします。
            <br />
            <br />
            注意:
            インデックス作成は大規模なコードベースでは、大量のシステムリソースを消費します。
          </div>
        }
        value={!disableIndexing}
        disabled={disableIndexingToggle}
        onChange={(value) => handleUpdate({ disableIndexing: !value })}
      />
    </div>
  );
}

export function IndexingSettingsSection() {
  const config = useAppSelector((state) => state.config.config);
  const disableIndexing = config.disableIndexing ?? false;

  return (
    <>
      <ConfigHeader title="インデックス" />

      <Alert type="warning" className="mb-6">
        <div className="space-y-4">
          <div>
            <div className="-mt-0.5 font-medium">インデックスは非推奨です</div>
            <div className="mt-1">
              次を参照する:{" "}
              <a
                href="https://docs.continue.dev/guides/codebase-documentation-awareness"
                target="_blank"
                rel="noopener noreferrer"
                className="text-inherit underline hover:brightness-125"
              >
                How to Make Agent mode Aware of Codebases and Documentation
              </a>
            </div>
          </div>
          <Divider className="border-inherit" />
          <EnableIndexingSetting />
        </div>
      </Alert>

      {!disableIndexing && (
        <div className="space-y-8">
          <CodebaseSubSection />
          <DocsSection />
        </div>
      )}
    </>
  );
}
