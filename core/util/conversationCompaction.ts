import { ChatHistoryItem, ILLM, ToolResultChatMessage } from "..";
import { HistoryManager } from "./history";
import { stripImages } from "./messageContent";

export interface CompactionParams {
  sessionId: string;
  index: number;
  historyManager: HistoryManager;
  currentModel: ILLM;
}

/**
 * Compacts conversation history up to a specified index by generating a summary.
 * This helper function extracts the compaction logic from the main core handler.
 *
 * @param params - Object containing sessionId, index, historyManager, and currentModel
 * @returns Promise<void> - Updates the session with the conversation summary
 */
export async function compactConversation({
  sessionId,
  index,
  historyManager,
  currentModel,
}: CompactionParams): Promise<void> {
  // Get the current session
  const session = historyManager.load(sessionId);
  const historyUpToIndex = session.history.slice(0, index + 1);

  // Apply the same filtering logic as in constructMessages, but exclude the target message
  // if it already has a summary (we're re-compacting)
  let summaryContent = "";
  let filteredHistory = historyUpToIndex;

  // First, check if the target message already has a summary and ignore it
  const targetMessageHasSummary = historyUpToIndex[index].conversationSummary;
  const searchHistory = targetMessageHasSummary
    ? historyUpToIndex.slice(0, index)
    : historyUpToIndex;

  // Find the most recent conversation summary (excluding target if it has one)
  for (let i = searchHistory.length - 1; i >= 0; i--) {
    const summary = searchHistory[i].conversationSummary;
    if (summary) {
      summaryContent = summary;
      // Only include messages that come AFTER the message with the summary
      filteredHistory = historyUpToIndex.slice(i + 1);
      break;
    }
  }

  const messages: ChatHistoryItem["message"][] = [];

  // add cancelled chat messages explicitly for cancelled tool calls
  filteredHistory.forEach((item) => {
    messages.push(item.message);
    // toolcalls only exist in an assistant message
    if (item.message.role === "assistant" && item.message.toolCalls) {
      // for every toolcall, if there is no tool message with a tool call id already, add a chat message saying that it is empty
      item.message.toolCalls.forEach((toolCall) => {
        if (
          !filteredHistory.find(
            (item) =>
              item.message.role === "tool" &&
              item.message.toolCallId === toolCall.id,
          )
        ) {
          messages.push({
            role: "tool",
            content: "Tool cancelled",
            toolCallId: toolCall.id,
          } as ToolResultChatMessage);
        }
      });
    }
  });

  // If there's a previous summary, include it as a user message at the beginning
  if (summaryContent) {
    messages.unshift({
      role: "user",
      content: `${summaryContent}\n\nこれまでの会話を要約してください。`,
    });
  }

  const compactionPrompt = {
    role: "user" as const,
    content:
      "この対話の包括的な要約を作成してください。作業を円滑に継続するために必要なすべての重要な情報を含め、技術的な正確性と文脈の連続性が維持される構成にしてください。\n\n要約には以下を含めてください：\n\n1. **対話の概要**: 主なトピックと議論の進展（焦点や方向性の変化を含む）を記述してください。\n\n2. **進行中の開発**: 直近で実装、修正、またはデバッグされていた内容を詳細に記述してください。採用された具体的な技術的アプローチや手法を含めてください。\n\n3. **技術スタック**: 議論された関連技術、フレームワーク、ライブラリ、コーディングパターン、およびアーキテクチャ上の決定事項を列挙してください。\n\n4. **ファイル操作**: 作成、修正、または参照されたすべてのファイルについて、その目的と主な変更点を記録してください。重要なコードスニペットとその箇所も併記してください。\n\n5. **解決策とトラブルシューティング**: 直面した問題と、それに対してどのようなデバッグ手順や回避策（ワークアラウンド）を用いて解決したかを要約してください。\n\n6. **残課題**: 未完了のタスク、保留中の実装、または議論された次のステップを明確に示してください。ユーザーからの要望や現在の進捗状況への言及を含めてください。\n\n対話の中に以前の要約が含まれている場合は、その内容を統合し、古くなった情報は削除してください。技術的な正確性に重点を置き、作業継続に不可欠な具体的な識別子（ファイルパス、関数名、クラス名など）を記載してください。三人称を用い、客観的かつ技術的なトーンで記述してください。",
  };

  // Generate the summary using the current model
  const response = await currentModel.chat(
    [...messages, compactionPrompt],
    new AbortController().signal,
    { reasoning: false },
  );

  // Update the target message with the conversation summary
  const updatedHistory = [...session.history];
  updatedHistory[index] = {
    ...updatedHistory[index],
    conversationSummary: stripImages(response.content),
  };

  // Update the session with the new history
  const updatedSession = {
    ...session,
    history: updatedHistory,
  };

  historyManager.save(updatedSession);
}
