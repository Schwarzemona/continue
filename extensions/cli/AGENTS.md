# AGENTS.md

このファイルは、このリポジトリ内のコードを扱うAIコーディングエージェントのためのガイダンスを提供します。

## 開発コマンド

- **ビルド**: `npm run build` - TypeScriptをJavaScriptにコンパイルし `dist/` に出力します。
- **テスト**: `npm test` - ESMをサポートしたVitestテストを実行します。
- **型チェック**: `npm run lint` - 型チェックのために、ファイルを出力せずにTypeScriptコンパイラを実行します。
- **フォーマット**: `npm run format` - `--write` フラグを使用してPrettierを実行し、書式チェックと修正を行います。
- **起動**: `npm start` - `dist/index.js` からビルドされたCLIを実行します。
- **開発**: ビルド後、`node dist/index.js` でローカルテストが可能です。

## アーキテクチャの概要

これはContinue DevのためのCLIツールであり、インタラクティブなAI支援開発体験を提供します。アーキテクチャは以下の構成になっています。

### コアコンポーネント

1. **エントリポイント** (`src/index.ts`): 2つのモードを持つメインCLIロジック：

   - **ヘッドレスモード**: 自動化やCI向けの非対話型モード
   - **TUIモード**: Ink/Reactを使用したターミナルユーザーインターフェース
   - **スタンダードモード**: 従来のreadlineベースのチャットインターフェース

2. **認証** (`src/auth/`): WorkOSベースの認証システム

   - `ensureAuth.ts`: 認証フローを処理
   - `workos.ts`: WorkOSの設定とトークン管理

3. **Continue SDK統合** (`src/continueSDK.ts`): 以下の内容でContinue SDKクライアントを初期化します：

   - APIキー認証
   - アシスタント設定（slugベース）
   - オーガニゼーションのサポート

4. **ターミナルUI** (`src/ui/`): React/InkベースのTUIコンポーネント

   - `TUIChat.tsx`: メインのチャットインターフェースコンポーネント
   - `UserInput.tsx`: マルチラインをサポートした入力処理
   - `TextBuffer.ts`: テキスト表示ユーティリティ

5. **ツールシステム** (`src/tools/`): 以下の内蔵開発ツールを含む：

   - ファイル操作（読み取り、書き込み、リスト表示）
   - コード検索機能
   - ターミナルコマンドの実行
   - Diff表示
   - 終了ツール（ヘッドレスモードのみ）

6. **MCP統合** (`src/mcp.ts`): 拡張されたツール機能のためのModel Context Protocolサービス

7. **フックシステム** (`src/hooks/`): CLIの動作を拡張するためのイベントインターセプトシステム
   - `HookService.ts`: サービスコンテナの統合、設定のロード、イベントの実行
   - `hookConfig.ts`: 設定ファイルからフックを読み込み、複数のソースから設定をマージ
   - `hookRunner.ts`: 終了コードのセマンティクスを持つフックハンドラ（command, HTTP）を実行
   - `fireHook.ts`: 統合ポイントからイベントを発火させるための便利な関数
   - `types.ts`: フックの入出力に関するClaude Code互換の型定義
   - **設定の場所**（優先度は低い順に）：
     - `~/.claude/settings.json`, `~/.continue/settings.json` (ユーザーグローバル)
     - `.claude/settings.json`, `.continue/settings.json` (プロジェクト)
     - `.claude/settings.local.json`, `.continue/settings.local.json` (プロジェクトローカル)
   - **終了コードのセマンティクス**: 0 = 続行, 2 = ブロック（stderrがフィードバックになる）、その他 = 非ブロッキングエラー
   - **JSON出力**: 細かい制御のための `hookSpecificOutput` を備えたオプションの構造化出力
   - **フックタイプ**: `command` (シェル), `http` (POSTリクエスト), `prompt`/`agent` (未実装)

### 主な機能

- **ストリーミングレスポンス**: リアルタイムのAIレスポンス・ストリーミング (`streamChatResponse.ts`)
- **スラッシュコマンド**: `/help`, `/exit` などの組み込みコマンド (`slashCommands.ts`)
- **マルチモード動作**: TUI、ヘッドレス、スタンダードチャットモードをサポート
- **ツール統合**: 開発タスクのための拡張可能なツールシステム

### テストセットアップ

- VitestをTypeScriptおよびESMサポートとともに使用
- 設定は `vitest.config.ts` に記載
- テストファイルは `.test.ts` 拡張子で作成してください
- 既存のテストファイルは見つかりませんでした。新しい機能を追加する際にはテストを追加してください。
- `npm run test path/or/pattern` を使用してテストを実行します。

### ビルドシステム

- 宣言ファイル（declaration files）を伴うTypeScriptコンパイル
- NodeNextモジュール解決を使用したESNextターゲット
- `dist/` ディレクトリへ出力
- ソースマップとインラインソースを有効化
- Reactコンポーネント用のJSXサポート
- 相対インポートパスには明示的なファイル拡張（例: 'from "./test.js"'）が必要です。

### 重要なルール

- テストを作成または更新する際は、必ずテストを実行してパスすることを確認してください。
- PRを作成する場合は、必ず `npm run format` および `npm run lint` / `npm run lint:fix` で書式とリントを最初に確認してください。
