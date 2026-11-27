import React, { useEffect, useState } from "react";

import { t } from "../i18n.js";
import { services } from "../services/index.js";

import { Selector, SelectorOption } from "./Selector.js";

interface ModelOption extends SelectorOption {
  index: number;
  provider: string;
}

interface ModelSelectorProps {
  onSelect: (model: ModelOption) => void;
  onCancel: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  onSelect,
  onCancel,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentModelIndex, setCurrentModelIndex] = useState<number>(-1);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = services.model.getAvailableChatModels();
        const currentIndex = services.model.getCurrentModelIndex();

        if (availableModels.length === 0) {
          setError(
            t(
              "No chat models available in the configuration",
              "設定に利用可能なチャットモデルがありません",
            ),
          );
          setLoading(false);
          return;
        }

        const modelOptions: ModelOption[] = availableModels.map((model) => ({
          id: `${model.provider}-${model.name}-${model.index}`,
          name: model.name,
          index: model.index,
          provider: model.provider,
        }));

        setModels(modelOptions);
        setCurrentModelIndex(currentIndex);
        setSelectedIndex(Math.max(0, currentIndex));
        setLoading(false);
      } catch (err: any) {
        setError(
          err.message ||
            t("Failed to load models", "モデルの読み込みに失敗しました"),
        );
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  return (
    <Selector
      title={t("Select Model", "モデルを選択")}
      options={models}
      selectedIndex={selectedIndex}
      loading={loading}
      error={error}
      loadingMessage={t(
        "Loading available models...",
        "利用可能なモデルを読み込み中...",
      )}
      currentId={
        currentModelIndex >= 0 && models[currentModelIndex]
          ? models[currentModelIndex].id
          : null
      }
      onSelect={onSelect}
      onCancel={onCancel}
      onNavigate={setSelectedIndex}
    />
  );
};

export { ModelSelector };
