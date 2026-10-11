import { IndexingProgressUpdate } from "core";
import { AnimatedEllipsis } from "../../../../components/AnimatedEllipsis";

export interface IndexingProgressTitleTextProps {
  update: IndexingProgressUpdate;
}

const STATUS_TO_TEXT: Record<IndexingProgressUpdate["status"], string> = {
  done: "完了",
  loading: "初期化中",
  waiting: "待機中",
  indexing: "インデックス中",
  paused: "ポーズ中",
  failed: "失敗",
  disabled: "無効",
  cancelled: "キャンセル",
};

function IndexingProgressTitleText({ update }: IndexingProgressTitleTextProps) {
  const showEllipsis = update.status === "loading";

  return (
    <span>
      {STATUS_TO_TEXT[update.status]}
      {showEllipsis && <AnimatedEllipsis />}
    </span>
  );
}

export default IndexingProgressTitleText;
