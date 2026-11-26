import { ChatHistoryItem } from "core";
import { findLastIndex } from "core/util/findLast";
import {
  renderChatMessage,
  renderContextItems,
} from "core/util/messageContent";

/**
 * contextUsage がこの比率に達したときに自動圧縮を発動する。
 * core が送信前に prune する「利用可能トークン」(`contextLength - 安全バッファ -
 * MIN_RESPONSE_TOKENS`)に対する比率で、1 未満 = prune 発動前に圧縮する余白を残す。
 */
export const AUTO_COMPACT_THRESHOLD = 0.9;

// core/llm/countTokens.ts の MIN_RESPONSE_TOKENS / 安全バッファと同期させること
const MIN_RESPONSE_TOKENS = 1000;
const MAX_COUNTING_SAFETY_BUFFER = 1000;
const COUNTING_SAFETY_PROPORTION = 0.02;
const ASCII_CHARS_PER_TOKEN = 4;
/** 圧縮後に保持末尾へ割り当てる、利用可能トークンに対する比率 */
const TAIL_BUDGET_RATIO = 0.25;
/** 旧 summary から cutoff までにこの数未満の項目しかない場合は再圧縮しない */
const MIN_ITEMS_BETWEEN_SUMMARY_AND_CUTOFF = 4;
/** 保護末尾単体でこれを超える場合、圧縮しても利得がないためスキップ */
const MIN_USEFUL_COMPACT_RATIO = 0.6;

/**
 * 文字数ベースのトークン見積もり。発動判定は core が返す contextPercentage
 * (正確なトークナイザ使用)が行い、ここでは末尾予算の相対配分だけを扱うため、
 * GUI バンドルへトークナイザ(js-tiktoken 等)を取り込まない。
 */
function estimateTokens(text: string): number {
  let wideChars = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      wideChars++;
    }
  }
  return Math.ceil(
    wideChars + (text.length - wideChars) / ASCII_CHARS_PER_TOKEN,
  );
}

function historyItemTokens(item: ChatHistoryItem): number {
  // history の tool item は constructMessages が assistant の toolCallStates から再注入するため計数しない
  let tokens =
    item.message.role === "tool"
      ? 0
      : estimateTokens(renderChatMessage(item.message));

  for (const toolCallState of item.toolCallStates ?? []) {
    if (toolCallState.output?.length) {
      tokens += estimateTokens(renderContextItems(toolCallState.output));
    }
  }
  return tokens;
}

/**
 * 自動圧縮_cutoff の history index_ を返す(-1 はスキップ意思表示)。
 * cutoff の item に summary が添付され、constructMessages の既存規則により
 * cutoff 以降の末尾のみが次のコンテキストへ採用される。
 */
export function selectCompactionCutoffIndex(params: {
  history: ChatHistoryItem[];
  contextLength: number;
}): number {
  const { history, contextLength } = params;
  if (history.length < 2) {
    return -1;
  }

  const availableTokens =
    contextLength -
    Math.min(
      MAX_COUNTING_SAFETY_BUFFER,
      contextLength * COUNTING_SAFETY_PROPORTION,
    ) -
    MIN_RESPONSE_TOKENS;
  const tailBudget = availableTokens * TAIL_BUDGET_RATIO;

  // 末尾から逆順にトークンを積み、予算内の先頭項目までを保護対象とする。
  // 最後の 1 項目は予算超過でも必ず保護する。
  let tailTokens = 0;
  let firstRetainedIdx = history.length;
  for (let i = history.length - 1; i >= 0; i--) {
    const tokens = historyItemTokens(history[i]);
    if (tailTokens + tokens > tailBudget && firstRetainedIdx < history.length) {
      break;
    }
    tailTokens += tokens;
    firstRetainedIdx = i;
  }

  const cutoffIndex = firstRetainedIdx - 1;
  if (cutoffIndex < 0) {
    // 圧縮対象が存在しない
    return -1;
  }
  if (tailTokens > availableTokens * MIN_USEFUL_COMPACT_RATIO) {
    return -1;
  }

  const lastSummaryIndex = findLastIndex(
    history,
    (item) => !!item.conversationSummary,
  );
  if (cutoffIndex - lastSummaryIndex < MIN_ITEMS_BETWEEN_SUMMARY_AND_CUTOFF) {
    return -1;
  }

  return cutoffIndex;
}
