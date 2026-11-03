# Continue VS Code 拡張機能

これは Continue VS Code 拡張機能です。主な役割は以下の通りです：

1. Continue IDE プロトコルの IDE 側の実装。これにより、Continue サーバーが IDE 内でネイティブに相互作用できるようになります。これは `src/continueIdeClient.ts` で行われます。
2. サイドパネルで Continue React アプリを開く。React アプリのソースコードは `gui` ディレクトリにあります。パネルは `src/commands.ts` で定義されている `continue.openContinueGUI` コマンドによって開かれます。

# 拡張機能の実行方法

[環境構築](../../CONTRIBUTING.md#環境構築) を参照してください。

# テストの実行とデバッグ方法

[環境構築](../../CONTRIBUTING.md#環境構築) のセットアップを行った後、VS Code で `Extension (VSCode)` の起動構成を実行できます。
