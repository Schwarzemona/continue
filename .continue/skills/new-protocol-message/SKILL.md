---
name: new-protocol-message
description: core/gui/ideからcore/gui/ideへの新しいプロトコルメッセージを作成する際に読むスキル。
---

# 新しいプロトコルメッセージ

以下の手順に従って、新しいプロトコルメッセージを作成してください：

## 1. メッセージタイプの定義

適切な TypeScript 型を使用して、`protocol/` ディレクトリ内の適切なファイルに新しいメッセージタイプの定義を追加してください。

## 2. 重複の確認

既存のメッセージタイプがすでに同じ機能を提供していないか確認してください。

## 3. passThrough への追加 (webview ↔ core の場合)

メッセージが webview と core の間で行われる場合は、`core/protocol/passThrough.ts` に追加してください。

## 4. メッセージハンドラーの実装

適切な場所でメッセージを実装してください：

- **core へのメッセージ**: `core/core.ts`
- **GUI へのメッセージ**: `useWebviewListener` フック
- **VS Code IDE へのメッセージ**: `VsCodeMessenger.ts`

## 5. 実装のテスト

該当する場合は、VS Code でメッセージが正しく動作することを確認してください。
