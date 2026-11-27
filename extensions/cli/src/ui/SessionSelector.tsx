import type { Session } from "core/index.js";
import { format, isThisWeek, isThisYear, isToday, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";

import { detectLang, t } from "../i18n.js";
import { ExtendedSessionMetadata, loadSessionById } from "../session.js";

import { useTerminalSize } from "./hooks/useTerminalSize.js";
import { SessionPreview } from "./SessionPreview.js";
import { defaultBoxStyles } from "./styles.js";

interface SessionSelectorProps {
  sessions: ExtendedSessionMetadata[];
  onSelect: (sessionId: string) => void;
  onExit: () => void;
}

function formatTimestamp(date: Date): string {
  const japanese = detectLang() === "ja";
  const locale = japanese ? { locale: ja } : undefined;
  if (isToday(date)) {
    return japanese ? format(date, "H時M分", locale) : format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return t("yesterday", "昨日");
  } else if (isThisWeek(date)) {
    // Day name (e.g., "Monday" / "月曜日")
    return format(date, "EEEE", locale);
  } else if (isThisYear(date)) {
    // e.g., "Jan 15" / "1月15日"
    return japanese
      ? format(date, "M月d日", locale)
      : format(date, "MMM d", locale);
  } else {
    // e.g., "Jan 15, 2023" / "2023年1月15日"
    return japanese
      ? format(date, "yyyy年M月d日", locale)
      : format(date, "MMM d, yyyy", locale);
  }
}

function formatMessage(message: string | undefined): string {
  if (!message) return t("(no messages)", "(メッセージなし)");
  // Ensure we're working with a string, handle edge cases from persisted data
  const messageStr = typeof message === "string" ? message : String(message);
  return messageStr.split("\n")[0];
}

export function SessionSelector({
  sessions,
  onSelect,
  onExit,
}: SessionSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const { rows: terminalHeight, columns: terminalWidth } = useTerminalSize();

  // Load the selected session for preview
  useEffect(() => {
    const selectedSession = sessions[selectedIndex];
    if (selectedSession && !selectedSession.isRemote) {
      const session = loadSessionById(selectedSession.sessionId);
      setPreviewSession(session);
    } else {
      setPreviewSession(null);
    }
  }, [selectedIndex, sessions]);

  // Calculate how many sessions we can display based on terminal height and scrolling
  const { displaySessions, scrollOffset } = useMemo(() => {
    // Account for:
    // - Box border (top + bottom): 2 lines
    // - Box padding (top + bottom): 2 lines
    // - Header "Recent Sessions": 1 line
    // - Instructions line: 1 line
    // - Empty line after instructions: 1 line
    // - Potential scroll indicators: up to 2 lines (1 above, 1 below)
    // Total overhead: ~9 lines
    const MAGIC_NUMBER = 9;
    const availableHeight = Math.max(1, terminalHeight - MAGIC_NUMBER);
    const maxDisplayableSessions = Math.floor(availableHeight / 3);

    // If we can display all sessions, no need to scroll
    if (sessions.length <= maxDisplayableSessions) {
      return { displaySessions: sessions, scrollOffset: 0 };
    }

    // Calculate scroll offset to keep selected item visible
    let scrollOffset = 0;
    if (selectedIndex >= maxDisplayableSessions) {
      scrollOffset = Math.min(
        selectedIndex - maxDisplayableSessions + 1,
        sessions.length - maxDisplayableSessions,
      );
    }

    const displaySessions = sessions.slice(
      scrollOffset,
      scrollOffset + maxDisplayableSessions,
    );
    return { displaySessions, scrollOffset };
  }, [sessions, terminalHeight, selectedIndex]);

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : sessions.length - 1));
    } else if (key.downArrow || input === "j") {
      setSelectedIndex((prev) => (prev < sessions.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (sessions[selectedIndex]) {
        onSelect(sessions[selectedIndex].sessionId);
      }
    } else if (key.escape || (key.ctrl && input === "d")) {
      onExit();
    }
  });

  if (sessions.length === 0) {
    return (
      <Box {...defaultBoxStyles("blue")}>
        <Text color="yellow">
          {t(
            "No previous sessions found.",
            "過去のセッションが見つかりません。",
          )}
        </Text>
        <Text color="gray">
          {t(
            "Start a new conversation with: cn",
            "cn を実行して新しい会話を開始してください",
          )}
        </Text>
        <Text color="gray">{t("Press Esc to exit", "Esc で終了します")}</Text>
      </Box>
    );
  }

  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + displaySessions.length < sessions.length;

  // Determine if we should show preview (only if terminal is wide enough)
  const showPreview = terminalWidth > 100;
  const listWidth = showPreview
    ? Math.floor(terminalWidth * 0.3)
    : terminalWidth;

  return (
    <Box flexDirection="row" width={terminalWidth}>
      {/* Left side: Session list */}
      <Box {...defaultBoxStyles("blue")} width={listWidth}>
        <Text color="blue" bold>
          {t("Recent Sessions", "最近のセッション")}{" "}
          {sessions.length > displaySessions.length &&
            `(${selectedIndex + 1}/${sessions.length})`}
        </Text>
        <Text color="gray">
          {t(
            "↑/↓ to navigate, Enter to select, Esc to exit",
            "↑/↓ で移動、Enter で選択、Esc で終了",
          )}
        </Text>
        <Text> </Text>

        {hasMoreAbove && (
          <Text color="gray" italic>
            ⬆{" "}
            {t(
              `${scrollOffset} more sessions above...`,
              `${scrollOffset}件前のセッションがあります…`,
            )}
          </Text>
        )}

        {displaySessions.map((session, index) => {
          const globalIndex = index + scrollOffset;
          const isSelected = globalIndex === selectedIndex;
          const indicator = isSelected ? "➤ " : "  ";
          const color = isSelected ? "blue" : "white";

          return (
            <Box key={session.sessionId} flexDirection="column">
              <Box paddingRight={3}>
                <Text bold={isSelected} color={color} wrap="truncate-end">
                  {indicator}
                  {formatMessage(session.title)}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">
                  {formatTimestamp(new Date(session.dateCreated))}
                  {session.isRemote
                    ? t(" (remote)", " (リモート)")
                    : t(" (local)", " (ローカル)")}
                </Text>
              </Box>
              {index < displaySessions.length - 1 && (
                <Text key={`spacer-${session.sessionId}`}> </Text>
              )}
            </Box>
          );
        })}

        {hasMoreBelow && (
          <Text color="gray" italic>
            {t(
              `⬇ ${sessions.length - scrollOffset - displaySessions.length} more sessions below...`,
              `⬇ ${sessions.length - scrollOffset - displaySessions.length}件後のセッションがあります…`,
            )}
          </Text>
        )}
      </Box>

      {/* Right side: Preview panel */}
      {showPreview && (
        <Box marginLeft={1} flexGrow={1} width="100%">
          {previewSession ? (
            <SessionPreview
              chatHistory={previewSession.history}
              sessionTitle={previewSession.title}
            />
          ) : (
            <Box
              {...defaultBoxStyles("blue")}
              flexDirection="column"
              width="100%"
            >
              <Text color="blue" bold>
                {t("Preview", "プレビュー")}
              </Text>
              <Text color="gray">
                {sessions[selectedIndex]?.isRemote
                  ? t(
                      "(remote session preview not available)",
                      "(リモートセッションのプレビューは利用できません)",
                    )
                  : t("(loading...)", "(読み込み中...)")}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
