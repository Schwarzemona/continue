---
name: protocol-message-development
description: Coreのプロトコルメッセージを追加・変更する際のガイドライン。型定義、パススルー設定、および実装箇所の確認事項を含みます。
alwaysApply: false
globs: ["**/core/protocol/**"]
---

`core/protocol/` ディレクトリに新しいプロトコルメッセージを追加する際は、以下の点を確認してください：

- 型が正しく定義されていること。
- webviewからcore、またはその逆のメッセージである場合、`core/protocol/passThrough.ts` に追加されていること。
- 以下のいずれかで実装されていること：
  - `core/core.ts`（coreへのメッセージの場合）
  - `useWebviewListener`（guiへのメッセージの場合）
  - `VsCodeMessenger.ts`（VS Codeへのメッセージの場合）
  - `IdeProtocolClient.kt`（JetBrainsへのメッセージの場合）
- 既存の他のメッセージタイプや機能と重複していないこと。
