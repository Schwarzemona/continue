---
name: stale-comments
description: 説明しているコードと一致しなくなったコメントをフラグ立てする
invokable: true
---

# 古い・誤解を招くコメント

## コンテキスト

多くの貢献者がいる、変化の速い TypeScript モノレポでは、コメントが説明しているコードと頻繁に食い違います。誤解を招くコメントは、コメントがないことよりも悪影響を及ぼします。開発者を積極的に誤った方向へ導き、バグを引き起こすからです。このチェックでは、隣接するコードと矛盾している、一致していない、または誤って表現しているコメントをキャッチします。

## チェック内容

### 1. コードと矛盾するコメント

インラインコメント (`//`) やブロックコメント (`/* */`) の中で、説明が実際のコードの動作と一致しなくなったものを探してください。

**悪い例 — コメントは「リトライする」と言っているが、コードはリトライしていない:**

```typescript
// 失敗時にリクエストをリトライする
const result = await fetch(url);
```

**悪い例 — コメントが古いパラメータリストを説明している:**

```typescript
// モデル名を受け取り、プロバイダーを返す
function getProvider(config: ModelConfig, context: ContextManager) {
```

**良い例 — コメントが動作と一致している:**

```typescript
// 完全なモデル構成とコンテキストからプロバイダーを解決する
function getProvider(config: ModelConfig, context: ContextManager) {
```

### 2. 完了した作業に対する TODO/FIXME/HACK コメント

周囲のコードですでに作業が完了しているように見える TODO、FIXME、および HACK コメントをフラグ立てしてください。

**悪い例 — TODO にバリデーションの追加とあるが、下にバリデーションが存在する:**

```typescript
// TODO: 入力バリデーションを追加する
if (!input || typeof input !== "string") {
  throw new Error("Invalid input");
}
```

### 3. 誤解を招く注釈が付いたコメントアウトされたコード

機能が置き換えられたり削除されたりしているのに、まだ必要であることを示唆する注釈が付いているコメントアウトされたコードのブロックをフラグ立てしてください。

**悪い例:**

```typescript
// フォールバックサポートのためにこれを保持する
// const oldProvider = new LegacyProvider(config);
// oldProvider.initialize();
const provider = new ModernProvider(config);
```

### 4. シグネチャと一致しない JSDoc / Docstrings

JSDoc コメント内の `@param`、`@returns`、および `@throws` タグが、実際の関数のシグネチャ（正しいパラメータ名、型、および戻り値の型）と一致しているか確認してください。

**悪い例 — 存在しないパラメータをドキュメント化している:**

```typescript
/**
 * @param modelName - 使用するモデル
 * @returns 補完テキスト
 */
async function complete(config: AutocompleteConfig): Promise<Result> {
```

## チェックすべき主要なファイル

- `core/` — すべての拡張機能で共有されるロジック
- `extensions/vscode/src/` — VS Code 拡張機能のソース
- `extensions/cli/src/` — CLI 拡張機能のソース
- `gui/src/` — React GUI コンポーネント
- `packages/` — 共有 npm パッケージ

## 除外対象

- ライセンスヘッダーおよび著作権表示
- 生成されたファイル、ベンダーコード、または `node_modules` 内のコメント
- 期待される（意図的に間違った）動作を説明しているテストファイル内のコメント
- テストデータとして使用されているテストフィクスチャ内のコメントアウトされたコード
