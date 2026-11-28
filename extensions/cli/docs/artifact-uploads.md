# アーティファクトアップロードアーキテクチャ

## 概要

アーティファクトアップロード機能により、devbox 上で実行されている Continue エージェントは、任意のファイル（スクリーンショット、動画、ログ）をエージェントセッションストレージにアップロードし、レビューやデバッグに活用できるようになります。本アーキテクチャでは、安全かつ高性能なアップロードを実現するため、2 段階の presigned URL（署名付き URL）パターンを使用しています。

## アーキテクチャパターン: Presigned URL（署名付き URL）

### なぜ Presigned URL を使うのか？

アーティファクトアップロードシステムは、ファイルをバックエンド経由でプロキシするのではなく、クライアントから S3 への直接アップロードのために **presigned URL（署名付き URL）** を使用します。この設計には次のような利点があります。

1. **セキュリティ**: バックエンドが、誰がアップロードできるかを制御し、ファイル形式・サイズを検証し、presigned URL を発行する前にストレージ上限を強制します。エージェントはこの検証を回避できません。

2. **パフォーマンス**: ファイルは devbox から S3 へ直接アップロードされるため、バックエンドの API サーバーを経由することによる帯域コストや遅延を回避できます。

3. **スケーラビリティ**: バックエンドがファイルアップロードのボトルネックになりません。データ転送の負荷は S3 が引き受けます。

4. **シンプルさ**: Presigned URL は有効期限付き（15 分）の自己完結型の認証情報であり、複雑なトークン管理が不要です。

## 2 段階のアップロードフロー

### ステップ 1: Presigned URL のリクエスト

エージェントはバックエンドに対して presigned アップロード URL をリクエストします。

**リクエスト:**

```http
POST /agents/artifacts/upload-url
Authorization: Bearer <CONTINUE_API_KEY>
Content-Type: application/json

{
  "agentSessionId": "<session-id>",
  "filename": "screenshot.png",
  "contentType": "image/png",
  "fileSize": 1048576
}
```

**バックエンドでの検証:**

- API キーの認証とセッション所有者の検証
- ファイル名の検証（パストラバーサルの禁止、許可された拡張子であること）
- ファイルサイズの検証（1 ファイルあたりの上限、既定は 50MB）
- コンテンツタイプの検証（許可リストに対して実施）
- セッション全体のストレージ量の検証（上限は既定で 500MB）

**レスポンス（検証が通過した場合):**

```json
{
  "url": "https://s3.amazonaws.com/bucket/sessions/org/abc123/artifacts/screenshot.png?X-Amz-...",
  "key": "sessions/org/abc123/artifacts/screenshot.png",
  "expiresIn": 900
}
```

**レスポンス（検証が失敗した場合):**

```http
400 Bad Request

{
  "error": "File size exceeds maximum allowed (50MB)"
}
```

### ステップ 2: S3 へのアップロード

エージェントは presigned URL を使ってファイルを直接 S3 にアップロードします。

**リクエスト:**

```http
PUT <presigned-url>
Content-Type: image/png
<file-contents>
```

S3 が presigned URL の署名を検証し、アップロードを受け入れます。このステップにバックエンドは関与しません。

## ストレージの構成

アーティファクトは以下のパス構造で S3 に保存されます。

```
sessions/
  user/
    <userId>/
      <sessionId>/
        artifacts/
          screenshot.png
          video.mp4
          debug.log
        session.json        # セッション状態（既存）
        diff.txt           # Git diff（既存）
  org/
    <organizationId>/
      <sessionId>/
        artifacts/
          ...
```

この構造により:

- 既存の `session.json` および `diff.txt` ファイルとの後方互換性を維持
- ユーザー／組織のデータを分離しセキュリティを確保
- セッション関連のファイルをすべて同じ場所にグループ化
- セッション削除時にシンプルな再帰的削除が可能

## ファイル形式とサイズの上限

### 許可されるファイル形式

システムはファイル拡張子と MIME タイプの両方を検証します。

**画像:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
**動画:** `.mp4`, `.mov`, `.avi`, `.webm`
**テキスト／ログ:** `.log`, `.txt`, `.json`, `.xml`, `.csv`, `.html`

コンテンツタイプは許可リストに対して検証され、実行可能ファイルやその他危険なコンテンツのアップロードを防止します。

### サイズ上限

2 つの上限が強制されます。

1. **1 ファイルあたりの上限:** 50MB（`ARTIFACT_MAX_FILE_SIZE_MB` で設定可能）
2. **セッション全体のストレージ:** 500MB（`ARTIFACT_MAX_TOTAL_SIZE_MB` で設定可能）

バックエンドは presigned URL を発行する前に、そのセッションの S3 プレフィックス配下の全ファイルの合計を計算して総ストレージ量を求めます。これにより、単一のセッションが過度なストレージを消費することを防ぎます。

## CLI の使用方法

### UploadArtifact ツールの使用（推奨）

`UploadArtifact` ツールは beta フラグ付きで実行した場合に利用可能になります。

```bash
cn serve --id <agentSessionId> --beta-upload-artifact-tool
```

エージェントは組み込みの `UploadArtifact` ツールを使ってファイルをアップロードできます。

```typescript
// エージェントがファイルパスを指定してこのツールを呼び出す
{
  "name": "UploadArtifact",
  "parameters": {
    "filePath": "/tmp/screenshot.png"
  }
}
```

このツールは次の処理を行います。

- ファイルが存在し、許可された形式であることを検証
- ファイルサイズの上限をチェック（1 ファイル最大 50MB）
- セッションストレージへアップロード
- 成功メッセージまたは詳細なエラーを返却

**ツールの説明:** "Upload a file (screenshot, video, log) to the session artifacts for user review. Supported formats: images (png, jpg, jpeg, gif, webp), videos (mp4, mov, avi, webm), and text files (log, txt, json, xml, csv, html). Maximum file size: 50MB. **If an artifact with the same filename already exists, it will be overwritten with the new file.**"

**必要条件:**

- `--id <agentSessionId>`（エージェントモード）で実行していること
- `--beta-upload-artifact-tool` フラグを有効にしていること
- ユーザーが認証済みであること（`cn login`）

### プログラムによるアップロード（サービス API）

独自の実装を行う場合は、サービスを直接利用してください。

```typescript
import { services } from "./services/index.js";

const result = await services.artifactUpload.uploadArtifact({
  agentSessionId: process.env.AGENT_SESSION_ID,
  filePath: "/tmp/screenshot.png",
  accessToken: process.env.CONTINUE_API_KEY,
});

if (result.success) {
  console.log(`Uploaded: ${result.filename}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### 複数ファイルのアップロード

```typescript
const results = await services.artifactUpload.uploadArtifacts(
  process.env.AGENT_SESSION_ID,
  ["/tmp/screenshot1.png", "/tmp/screenshot2.png", "/tmp/debug.log"],
  process.env.CONTINUE_API_KEY,
);

results.forEach((result) => {
  console.log(`${result.filename}: ${result.success ? "✓" : "✗"}`);
});
```

## 環境変数

CLI はアーティファクトアップロードのために次の環境変数を必要とします。

- `CONTINUE_API_KEY`: バックエンド認証用の Bearer トークン
- `CONTINUE_API_BASE`: API ベース URL（既定は `https://api.continue.dev/`）
- `AGENT_SESSION_ID`: 現在のエージェントセッション識別子

これらは Continue の devbox 環境で実行した際に自動的に提供されます。

## エラー処理

### 検証エラー（400）

- 不正なファイル名（パストラバーサル、許可されていない拡張子）
- ファイルが大きすぎる（1 ファイルあたりの上限を超過）
- ストレージ上限の超過（セッション合計が 500MB を超過）
- 不正なコンテンツタイプ

### 認証エラー（401/403）

- API キーが存在しない、または不正
- ユーザーがそのエージェントセッションを所有していない

### アップロードエラー（S3）

- アップロード中のネットワーク障害
- Presigned URL の期限切れ（15 分のタイムアウト）
- S3 サービスエラー

すべてのエラーはログに記録され、説明メッセージ付きで返されます。アップロードが失敗してもエージェントはクラッシュせず、エラー結果が返されるため、エージェントは適切に処理できます。

## フロントエンドからのアクセス

フロントエンドは以下を使ってアーティファクトの一覧取得とダウンロードを行うことができます。

**アーティファクトの一覧取得:**

```http
GET /agents/{agentSessionId}/artifacts
Authorization: Bearer <API_KEY>

Response:
{
  "artifacts": [
    {
      "filename": "screenshot.png",
      "size": 1048576,
      "sizeFormatted": "1.0 MB",
      "lastModified": "2025-12-08T10:30:00Z"
    }
  ]
}
```

**アーティファクトのダウンロード:**

```http
GET /agents/{agentSessionId}/artifacts/{filename}/download
Authorization: Bearer <API_KEY>

Response:
{
  "url": "https://s3.amazonaws.com/...",
  "expiresIn": 3600
}
```

フロントエンドはその後、presigned ダウンロード URL を使って S3 から直接アーティファクトを取得します。

## セキュリティに関する考慮事項

1. **認証**: すべてのエンドポイントは、ユーザー／組織アカウントに紐づく有効な API キーを必要とします
2. **認可**: Presigned URL の発行前にセッションの所有者検証が実施されます
3. **パストラバーサル対策**: ファイル名が検証され、`../` を用いた攻撃を防止します
4. **コンテンツ検証**: ファイル形式は拡張子と MIME タイプのチェックにより制限されます
5. **レート制限**: ストレージ上限（1 ファイルあたりおよびセッション合計）により乱用を防止します
6. **有効期限付き URL**: Presigned URL はアップロードで 15 分、ダウンロードで 1 時間後に失効します
7. **ストレージの分離**: ファイルはユーザー／組織のプレフィックスにスコープされ、テナント間のクロスアクセスを防止します

## 設計上のトレードオフ

### 採用: データベースでのトラッキングを行わない

**決定:** アーティファクトは S3 上のファイルとして保存し、個々のファイルをデータベースで追跡しません。

**根拠:**

- よりシンプルな実装（新しいデータベーステーブルが不要）
- ファイルが信頼できる情報源（DB と S3 間の同期問題が発生しない）
- S3 API（ListObjects）による高速な一覧取得
- セッションフォルダ削除時の自動クリーンアップ

**トレードオフ:** アーティファクトをセッション横断でクエリすることや、S3 をスキャンせずにメタデータを追跡することはできません。

### 採用: 名前衝突時の上書き

**決定:** 同じファイル名が 2 回アップロードされた場合、最後のアップロードが優先されます。

**根拠:**

- バージョニングや自動リネームよりシンプル
- よくあるユースケース: エージェントが更新済みスクリーンショットを再アップロードする
- ストレージ消費の削減

**トレードオフ:** アーティファクトのバージョン履歴は残りません。

### 採用: S3 直接アップロード（Presigned URL）

**決定:** ファイルをバックエンド経由でプロキシする代わりに presigned URL を使用します。

**根拠:**

- より良いパフォーマンス（バックエンドがボトルネックにならない）
- 低いコスト（バックエンドの帯域課金が発生しない）
- 実績のあるパターン（StorageSyncService で既に使用されている）

**トレードオフ:** バックエンドはアップロード前にファイルコンテンツを検査できません（URL 生成時の検証に依存します）。

## 将来の拡張

- **圧縮**: アップロード前にスクリーンショット／動画を自動圧縮
- **リテンションポリシー**: N 日後にアーティファクトを自動削除
- **アーティファクトの種類**: より多くのファイル形式（PDF、アーカイブなど）のサポート
- **プレビュー生成**: 画像／動画のサムネイル生成
- **ストリーミング**: マルチパートアップロードによる大容量ファイルのアップロードサポート
- **メタデータ**: アーティファクトへのカスタムメタデータ（タグ、説明）の付与

---

このドキュメントはアーティファクトアップロードの初期実装を説明したものです。アーキテクチャが進化した際には更新してください。
