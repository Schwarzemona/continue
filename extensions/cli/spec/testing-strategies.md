# テスト戦略

このドキュメントは、本リポジトリで使用されている様々なテスト戦略の概要、各方式を使うべき場面、実例へのリンクを提供します。

## テストの種類

### 1. ユニットテスト

**目的**: 個々の関数、ユーティリティ、モジュールを独立してテストします。

**使用すべき場面**:

- 予測可能な入力／出力を持つ純粋な関数のテスト
- ユーティリティ関数やヘルパーのテスト
- ビジネスロジックコンポーネントのテスト
- エラー処理とエッジケースのテスト

**フレームワーク**: TypeScript サポート付きの Vitest

**実例**:

- [`src/util/formatError.test.ts`](../src/util/formatError.test.ts) - エラーフォーマットユーティリティのテスト
- [`src/util/exponentialBackoff.test.ts`](../src/util/exponentialBackoff.test.ts) - バックオフロジックのテスト
- [`src/logging.test.ts`](../src/logging.test.ts) - ログ機能のテスト
- [`src/args.test.ts`](../src/args.test.ts) - 引数解析のテスト

**実行方法**: `npm test`（リンティングを含みます）

### 2. サービステスト

**目的**: サービスクラスと依存注入システムをテストします。

**使用すべき場面**:

- サービスの初期化とライフサイクルのテスト
- サービス間の依存と注入のテスト
- サービスコンテナの挙動のテスト
- サービスの設定読み込みのテスト

**実例**:

- [`src/services/ServiceContainer.test.ts`](../src/services/ServiceContainer.test.ts) - 依存注入のテスト
- [`src/services/ConfigService.test.ts`](../src/services/ConfigService.test.ts) - 設定読み込みのテスト
- [`src/services/circular-dependencies.test.ts`](../src/services/circular-dependencies.test.ts) - 循環依存検出のテスト

### 3. UI コンポーネントテスト

**目的**: ターミナル UI 向けに Ink のテストライブラリを使って React コンポーネントをテストします。

**使用すべき場面**:

- コンポーネントのレンダリングと表示のテスト
- ユーザー操作と入力処理のテスト
- コンポーネントの状態変化のテスト
- メッセージ表示とフォーマットのテスト

**フレームワーク**: Vitest + Ink Testing Library + React テストユーティリティ

**実例**:

- [`src/ui/__tests__/TUIChat.basic.test.tsx`](../src/ui/__tests__/TUIChat.basic.test.tsx) - 基本的なレンダリングテスト
- [`src/ui/__tests__/TUIChat.messages.test.tsx`](../src/ui/__tests__/TUIChat.messages.test.tsx) - メッセージ表示テスト
- [`src/ui/__tests__/TUIChat.input.test.tsx`](../src/ui/__tests__/TUIChat.input.test.tsx) - 入力処理テスト
- [`src/ui/MarkdownRenderer.test.tsx`](../src/ui/MarkdownRenderer.test.tsx) - Markdown レンダリングテスト

**テストチェックリスト**: 包括的な UI テストガイドラインは [`src/ui/UI_TEST_CHECKLIST.md`](../src/ui/UI_TEST_CHECKLIST.md) を参照してください。

### 4. E2E（エンドツーエンド）テスト

**目的**: 現実的なシナリオにおいて、完全なユーザーワークフローと CLI の挙動をテストします。

**使用すべき場面**:

- CLI コマンドの完全な実行のテスト
- 認証フローのテスト
- 設定の読み込みと切り替えのテスト
- ツール実行とその応答のテスト
- ヘッドレスモードとインタラクティブモードのテスト

**実例**:

- [`src/e2e/auth.test.ts`](../src/e2e/auth.test.ts) - 認証ワークフロー
- [`src/e2e/basic-commands.test.ts`](../src/e2e/basic-commands.test.ts) - 基本的な CLI コマンド
- [`src/e2e/headless-tool-calls.test.ts`](../src/e2e/headless-tool-calls.test.ts) - ヘッドレスモードでのツール実行
- [`src/e2e/config-switching.test.tsx`](../src/e2e/config-switching.test.tsx) - 設定の切り替え

## テストインフラ

### テストヘルパー

**サービスコンテナのテスト**:

- [`src/test-helpers/testServiceContainer.ts`](../src/test-helpers/testServiceContainer.ts) - モックサービスコンテナのセットアップ
- [`src/test-helpers/ui-test-context.ts`](../src/test-helpers/ui-test-context.ts) - UI テストコンテキストのセットアップ

**CLI のテスト**:

- CLI コマンド実行用のテストヘルパーは [`src/test-helpers/`](../src/test-helpers/) にあります

### モック

**UI モック**: [`src/ui/__mocks__/`](../src/ui/__mocks__/)

- 構文ハイライトのモック
- テスト向けのコンポーネントモック

**サービスモック**: [`src/__mocks__/`](../src/__mocks__/)

- 認証のモック
- サービスのモック
- ログのモック

## 設定

**Vitest 設定**: [`vitest.config.ts`](../vitest.config.ts)

- ES モジュールによる TypeScript サポート
- React／Ink コンポーネントテストのセットアップ
- モックの設定
- テストタイムアウトと環境設定

## テストの実行

```bash
# リンティング付きで全テストを実行
npm test

# ウォッチモードでテストを実行
npx vitest --watch

# 特定のテストファイルを実行
npx vitest src/util/formatError.test.ts

# カバレッジ付きでテストを実行
npx vitest --coverage
```

## ベストプラクティス

1. **ユニットテスト**: 純粋な関数と独立したロジックに集中します
2. **サービステスト**: 依存注入とサービスライフサイクルをテストします
3. **UI テスト**: 実装詳細ではなく、ユーザーに見える挙動をテストします
4. **E2E テスト**: 完全なユーザーワークフローと CLI の挙動をテストします

5. **テストを集中させる**: 1 テストにつき 1 挙動
6. **説明的な名前を使う**: テスト名は何をテストしているかを説明すべきです
7. **最小限のモック化**: 外部依存と API のみをモックします
8. **エラーケースをテストする**: ネガティブなテストケースや境界条件を含めます
9. **テストの独立性を維持する**: 各テストは独立しているべきです
