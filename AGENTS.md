---
name: AGENTS.md
copyright: © 2026 Schwarzemona All rights reserved.
---

# プロジェクトガイド

## 1. 概要

- Continueは、AIを活用したオープンソースのコーディングエージェントです。本リポジトリは、オリジナルのContinueプロジェクトのフォークです。

## 2. アーキテクチャと依存関係

本プロジェクトはモノレポ構造を採用しており、コンポーネント間には強い依存関係があります。**VS Code 拡張機能をビルド・デプロイするには、依存する下流コンポーネントの準備が完了している必要があります。**

## 3. 主要コンポーネント

- `core/`: IDE・プラットフォーム非依存の中核ロジック。`llm/`(プロバイダ接続)、`indexing/`(埋め込み・コードマップ)、`context/`(context provider)、`tools/`(エージェントツール)、`edit/`・`diff/`(編集適用)、`autocomplete/`、`commands/`、`config/`(config.yaml読込)などに大別される
- `gui/`: React 18 + Redux Toolkit + Vite のWebview UI。Coreへの通信は`core.invoke`経由のみ
- `continue/extensions/vscode/`: VS Code拡張のホスト側。GUIとの橋渡しは`VsCodeMessenger.ts`
- `continue/packages/`: 共有npmライブラリ（`config-yaml`, `config-types`, `openai-adapters`, `fetch`, `terminal-security`, `llm-info`, `continue-sdk`）。core/guiは`file:`依存で参照するため、これらの変更は下流の再ビルドを要する

## 4. ビルド・テスト・リント

- 依存インストール: `scripts/install-dependencies.ps1`（Windows）/ `install-dependencies.sh`。**これは`npm ci`を上書きするため、依存の追加後はこの実行が必須**
- 型チェック: `continue`ルートで`npm run tsc:watch`（gui/vscode/core/binaryを並列監視）。単発チェックは各ディレクトリの`npm run tsc:check`
- 整形: ルートで`npm run format` / `format:check`（Prettier）。husky + lint-stagedがコミット時にPrettierを強制する
- リント: ESLintは`core`・`gui`・`extensions/vscode`の各ディレクトリで実行（`npm run lint`、coreとvscodeは`lint:fix`）
- テストは対象ディレクトリで実行する:
  - `core`: `npm test`（Jest）と `npm run vitest`（Vitest）の両方を使う
  - `gui`: `npm test`（Vitest + Testing Library）
  - `extensions/vscode`: `npm run e2e:all`（VS Code e2e）
  - `packages/*`: `npm test`（vitest または jest のいずれか）。`packages/openai-adapters` の `npm test` は vitest が watch モードで起動するため、単発実行は `npx vitest run` を使う
  - APIキーを要するテストは環境変数`IGNORE_API_KEY_TESTS=true`でスキップする
