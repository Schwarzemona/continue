---
name: gui-editing
description: GUIを編集する際に読むルール。
alwaysApply: false
globs: ["**/gui/**"]
---

# guiフォルダ

- `gui`内で`continue.dev`に直接リンクするリンクを追加する場合は、IDEの`openUrl`コマンドを使用して、ユーザーのデフォルトブラウザでURLを開くようにしてください。

# rem単位の使用

スケーラビリティを確保するため、可能な限り `px` ではなく `rem` CSS 単位を使用するようにしてください。

# GUIリンクの開き方

GUI コンポーネントに外部リンクを開く機能を追加するときは、`useContext(IdeMessengerContext)` から取得した `ideMessenger` を使用して `ideMessenger.post("openUrl", url)` を使用してください。
