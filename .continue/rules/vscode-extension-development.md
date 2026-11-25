---
name: vscode-extension-development
description: VS Code拡張機能の開発ガイドライン。Coreとの分離とプロトコル通信に関する指示を含みます。
alwaysApply: false
globs: ["**/extensions/vscode/**"]
---

- 主要なIDE機能（ファイルの読み取り等）は `VSCodeIDE` クラスを使用して実装してください。
- `core/` からのコードの直接インポートは可能な限り避けてください。Coreはバイナリとしてバンドルされる設計であるため、メッセージ送信には `core.invoke` を使用してください。
- VS CodeからCoreへ送信/リクエスト可能なコマンドの定義は `core/protocol/core.ts` を参照してください。
- CoreからVS Codeへ送信/リクエスト可能なコマンド/メッセージタイプの定義は `core/protocol/ide.ts` を参照してください。
