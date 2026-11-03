# Continueへの貢献

## 目次

- [Continueへの貢献](#continueへの貢献)
  - [目次](#目次)
- [貢献の方法](#貢献の方法)
  - [Continueへの貢献アイデア](#continueへの貢献アイデア)
  - [バグ報告](#バグ報告)
  - [機能改善の提案](#機能改善の提案)
  - [ドキュメントの更新/改善](#ドキュメントの更新/改善)
    - [ドキュメントサーバーをローカルで実行する](#ドキュメントサーバーをローカルで実行する)
      - [方法1: NPMスクリプト](#方法1:-npmスクリプト)
      - [方法2: VS Codeタスク](#方法2:-vs-codeタスク)
  - [コードの貢献](#コードの貢献)
    - [環境構築](#環境構築)
      - [前提条件](#前提条件)
      - [Continueリポジトリをフォークする](#continueリポジトリをフォークする)
      - [VS Code](#vs-code)
        - [デバッグ](#デバッグ)
    - [開発ワークフロー](#development-workflow)
    - [フォーマット](#formatting)
    - [テーマカラー](#theme-colors)
    - [テスト](#testing)

# 貢献の方法

## Continueへの貢献アイデア

このドキュメントは、Continueにどのように貢献できるかのアイデアのリストです。これらは唯一の方法ではありませんが、プロジェクトに初めて参加する場合の素晴らしい出発点となります。また、[good first issues](https://github.com/Schwarzemona/continue/issues?q=is:issue%20state:open%20label:good-first-issue)のリストも閲覧できます。

## バグ報告

バグを見つけた場合は、[issueを作成して](https://github.com/Schwarzemona/continue/issues)報告してください！優れたバグ報告には以下が含まれます：

- バグの説明
- 再現手順
- 期待される動作
- 実際の動作
- スクリーンショットまたは動画

## 機能改善の提案

Continueは急速に機能を追加しており、どの機能があなたにとって最も重要かをお聞きしたいと考えています。機能改善を提案する最善の方法は以下の通りです：

- issueを作成する

  - まず、同様の提案が既になされていないか確認してください
  - なされていない場合は、[issueを作成して](https://github.com/Schwarzemona/continue/issues)ください
  - 改善内容をできるだけ詳細に、そしてなぜそれが有用なのかを記述してください

## コードの貢献

私たちは、初めての貢献者から経験豊富なオープンソースのメンテナーまで、あらゆる経験レベルの開発者からの貢献を歓迎します。信頼性と保守性のための高い基準を維持することを目指していますが、プロセスをできるだけ歓迎的で分かりやすいものにすることを目標としています。

### 環境構築

#### 前提条件

Node.jsがインストールされている必要があります。[nodejs.org](https://nodejs.org/en/download) で入手するか、NVM (Node Version Manager) を使用している場合は、プロジェクトのルートで次のコマンドを実行して、このプロジェクトに適した Node.js のバージョンを設定できます：

```bash
nvm use
```

その後、Vite をグローバルにインストールします：

```bash
npm i -g vite
```

#### Continue リポジトリをフォークする

1. [Continue GitHub リポジトリ](https://github.com/Schwarzemona/continue) に行き、ご自身の GitHub アカウントにフォークします。

2. フォークしたリポジトリをローカルマシンにクローンします。使用するコマンド：`git clone https://github.com/YOUR_USERNAME/continue.git`

3. クローンしたディレクトリに移動し、`main` ブランチにいることを確認します。そこから、次のように機能/修正用のブランチを作成します：`git checkout -b 123-my-feature-branch`

4. `main` ブランチに対してプルリクエストを送信します。

#### VS Code

1. VS Code のコマンドパレット (`cmd/ctrl+shift+p`) を開き、`Tasks: Run Task` を選択して、次に `install-all-dependencies` を選択します。

2. デバッグを開始する：

   1. 「実行とデバッグ」ビューに切り替えます
   2. ドロップダウンから `Launch extension` を選択します
   3. 再生ボタンを押します
   4. これにより、拡張機能がデバッグモードで起動し、インストールされた状態で新しい VS Code ウィンドウが開きます
      1. 拡張機能がインストールされた新しい VS Code ウィンドウは、_Host VS Code_ と呼ばれます
      2. デバッグを開始したウィンドウは、_Main VS Code_ と呼ばれます

3. 拡張機能をパッケージ化するには、`extensions/vscode` ディレクトリで `npm run package` を実行し、`Tasks: Run Task` を選択してから `vscode-extension:package` を選択します。これにより `extensions/vscode/build/continue-{VERSION}.vsix` が生成されます。これは、右クリックして「Install Extension VSIX」を選択することでインストールできます。

##### デバッグ

**ブレークポイント**は、デバッグ中に `core` と `extensions/vscode` の両方のフォルダで使用できますが、現在のところ `gui` コード内ではサポートされていません。

**ホットリロード**は Vite で有効になっているため、`gui` に変更を加えると、再ビルドなしで自動的に反映されるはずです。場合によっては、変更を確認するために _Host VS Code_ ウィンドウをリフレッシュする必要があるかもしれません。

同様に、`core` または `extensions/vscode` への変更は、cmd/ctrl+shift+p で "Reload Window" を実行して _Host VS Code_ ウィンドウをリロードするだけで自動的に含まれます。

### 良いPRとは？

Continue のコードベースをクリーンで保守可能な状態に保つため、私たちのチームおよびすべての貢献者に対して以下を期待しています：

- コードを書く前に、新しい issue を作成するか、既存の issue にコメントしてください。これにより、提案された変更がプロジェクトの方向に沿っていることを確認できます。
- 変更内容を絞ってください。無関係な複数の修正は、個別の PR として開く必要があります。
- 新しい機能に対してテストを記述または更新してください。
- `docs` フォルダ内の関連ドキュメントを更新してください。
- **新機能の場合**: 新しい機能を実演する短い画面録画またはスクリーンショットを含めてください。これにより、貢献者として変更内容をレビューし、理解することが非常に容易になります。
- `main` ブランチに対して PR を開いてください。PR テンプレートに必ず記入してください。

### フォーマット

Continue は、JavaScript/TypeScript のフォーマットに [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) を使用しています。VS Code に Prettier 拡張機能をインストールし、設定で "Format on Save" を有効にしてください。

### テーマカラー

Continue は、拡張機能の色や Tailwind クラスにマッピングされる一連の名前付きテーマカラーを持っており、それらは [gui/src/styles/theme.ts](gui/src/styles/theme.ts) で確認できます。

テーマカラーを使用するためのガイドライン:

- 可能な限り Tailwind の色を使用してください。VS Code で開発している場合は、[Tailwind CSS Intellisense 拡張機能](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)をダウンロードすると、素晴らしい提案が得られます。
- テーマ外で明示的なクラスや CSS 変数（例: `text-yellow-400`）を使用しないでください。

テーマカラーを追加/更新するためのガイドライン:

- [gui/src/styles/theme.ts](gui/src/styles/theme.ts) で追加/更新する、適切な VS Code 変数を選択してください（インスピレーションを得るには[こちら](https://code.visualstudio.com/api/references/theme-color)と[こちら](https://www.notion.so/1fa1d55165f78097b551e3bc296fcf76?pvs=25)を参照してください）。
- `GetTheme.kt` で追加/更新する、適切な JetBrains 名前付き色を選択してください（主要な LLM に試すべき良い提案をさせることができます）。
- 必要に応じて `tailwind.config.js` を更新してください。
- 色を確認するために Theme Test Page を使用してください。これは、dev/debug モードで `Settings` -> `Help` -> `Theme Test Page` に移動することでアクセスできます。

### テスト

私たちは、機能テストに重点を置いた、ユニット、機能、および e2e テストスイートを組み合わせて備えています。これらのテストは、各プルリクエストで実行されます。あなたの PR がこれらのテストのいずれかを失敗させた場合、マージする前にその問題を解決するようにお願いします。

貢献する際は、実装の正当性を検証するのに役立つ適切なテストを更新または作成してください。
