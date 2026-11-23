import { IndexingProgressUpdate } from "core";

export interface IndexingProgressSubtextProps {
  update: IndexingProgressUpdate;
  onClick: () => void;
}

const STATUS_TO_SUBTITLE_TEXT: Record<
  IndexingProgressUpdate["status"],
  string | undefined
> = {
  done: "再インデックス",
  loading: "",
  waiting: "",
  indexing: "ポーズ",
  paused: "再開",
  failed: "リトライ",
  disabled: "設定を開く",
  cancelled: "再スタート",
};

function IndexingProgressSubtext({
  update,
  onClick,
}: IndexingProgressSubtextProps) {
  const showIndexingDesc = update.status === "indexing";

  return (
    <div className="flex justify-between">
      <span
        className={`text-lightgray inline-block cursor-pointer underline`}
        onClick={onClick}
      >
        {STATUS_TO_SUBTITLE_TEXT[update.status]}
      </span>

      <div className={`${showIndexingDesc ? "w-2/3" : "flex-1"}`}>
        {showIndexingDesc && (
          <span className="text-lightgray block truncate text-right">
            {update.desc}
          </span>
        )}
      </div>
    </div>
  );
}

export default IndexingProgressSubtext;
