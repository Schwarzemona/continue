# @continuedev/sdk

> **⚠️ 実験的: このパッケージは開発初期段階にあり、予告なしに頻繁に破壊的な変更が行われる可能性があります。**

このSDKは、ContinueのHub APIおよび機能へのプログラムによるアクセスを提供します。

## 概要

Continue SDKは、言語ごとに分かれたパッケージで構成されています。現在はTypeScriptとPythonの実装があり、将来的にはさらに多くの言語が計画されています：

- **TypeScript SDK**: `/typescript` ディレクトリにあり、OpenAIのTypeScriptクライアントライブラリの代わりとしてそのまま利用できます。
- **Python SDK**: `/python` ディレクトリにあり、OpenAIのPythonクライアントライブラリの代わりとしてそのまま利用できます。
- **その他の言語**: 将来的にさらに多くの言語の実装が追加される予定です。

各パッケージには以下が含まれます：

1. Continue Hub API用のOpenAPI生成クライアント
2. OpenAI互換のインターフェースを使用してContinueアシスタントを簡単に初期化して使用するための `Continue.from()` メソッドを公開するラッパー層

## エンドユーザー向け

エンドユーザーは、公開されているパッケージを直接インストールする必要があります：

- TypeScript/JavaScriptの場合: `npm install @continuedev/sdk`
- Pythonの場合: `pip install continuedev`
- その他の言語の場合: 新しい言語のサポートをお待ちください

各公開パッケージには独自のドキュメントが含まれています。

## 開発者向け

### 開発

```bash
# 依存関係のインストール
npm install

# APIクライアントの生成
npm run generate-client:ALL

# API探索用のSwagger UIの起動
npm run swagger-ui
```
