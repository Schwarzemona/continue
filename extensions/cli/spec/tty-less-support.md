# TTY なし環境のサポート

## 概要

Continue CLI は TTY なし環境（ターミナル／TTY が存在しない環境）での実行をサポートしています。これは次に不可欠なものです。

- `run_terminal_command` ツールを使用する VSCode および IntelliJ 拡張機能
- TTY 割り当てを行わない Docker コンテナ
- CI/CD パイプライン
- 自動化スクリプトやツール
- バックグラウンドプロセス

## アーキテクチャ

### モードの分離

CLI は、完全に分離された 2 つの実行モードを持ちます。

1. **インタラクティブモード（TUI）**: TTY を必要とし、レンダリングに Ink を使用します
2. **ヘッドレスモード**: TTY なし環境で動作し、stdout／stderr へ出力します

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                       │
│                         (src/index.ts)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
    ┌───────▼────────┐       ┌───────▼─────────┐
    │ Interactive    │       │   Headless      │
    │ Mode (TUI)     │       │   Mode (-p)     │
    │                │       │                 │
    │ • Requires TTY │       │ • No TTY needed │
    │ • Uses Ink     │       │ • Stdin/stdout  │
    │ • Keyboard UI  │       │ • One-shot exec │
    └────────────────┘       └─────────────────┘
```

### 実装済みのセーフガード

#### 1. **TTY 検出ユーティリティ**（`src/util/cli.ts`）

```typescript
// Check if running in TTY-less environment
export function isTTYless(): boolean;

// Check if environment supports interactive features
export function supportsInteractive(): boolean;

// Check if prompt was supplied via CLI arguments
export function hasSuppliedPrompt(): boolean;
```

#### 2. **Stdin 読み取りの保護**（`src/util/stdin.ts`）

次が該当する場合、stdin の読み取りを防止します。

- プロンプトが指定されたヘッドレスモードで実行中
- `FORCE_NO_TTY` 環境変数が設定されている
- テスト環境である

これにより、stdin が存在しない、または読み取りできない TTY なし環境でのブロッキング／ハングを回避します。

#### 3. **TUI 初期化のガード**（`src/ui/index.ts`）

`startTUIChat()` 関数には複数のセーフガードが含まれています。

- **ヘッドレスモードのチェック**: ヘッドレスモードで呼び出された場合はエラーをスローします
- **TTY なしのチェック**: TTY が利用できない場合はエラーをスローします
- **raw モードの検証**: stdin が Ink の必要とする raw モードをサポートしているか検証します
- **明示的な stdin／stdout**: ストリームを明示的に Ink へ渡します

```typescript
// Critical safeguard: Prevent TUI in headless mode
if (isHeadlessMode()) {
  throw new Error("Cannot start TUI in headless mode");
}

// Critical safeguard: Prevent TUI in TTY-less environment
if (isTTYless() && !customStdin) {
  throw new Error("Cannot start TUI in TTY-less environment");
}
```

#### 4. **ヘッドレスモードの検証**（`src/commands/chat.ts`）

ヘッドレスモードに必要な入力がすべて揃っていることを確認します。

```typescript
if (!prompt) {
  throw new Error("Headless mode requires a prompt");
}
```

#### 5. **ロガー設定**（`src/util/logger.ts`）

TTY なし環境向けに出力処理を設定します。

- UTF-8 エンコーディングを設定します
- ヘッドレスモードでは stdout／stderr のバッファリングを変更しません。
- 進行状況の表示を無効化します

## 使用例

### VSCode／IntelliJ 拡張機能から

```typescript
// Using the run_terminal_command tool
const command = 'cn -p "Analyze the current git diff"';
const result = await runTerminalCommand(command);
```

### Docker コンテナから

```bash
# Without TTY allocation (-t flag)
docker run --rm my-image cn -p "Generate a README"
```

### CI/CD パイプラインから

```yaml
- name: Run Continue CLI
  run: |
    cn -p "Review code changes" --format json
```

### 自動化スクリプトから

```bash
#!/bin/bash
# Non-interactive script
cn -p "Generate commit message for current changes" --silent
```

## 環境変数

- `FORCE_NO_TTY`: TTY なしモードを強制し、stdin の読み取りを防止します
- `CONTINUE_CLI_TEST`: テスト環境であることを示し、stdin の読み取りを防止します

## テスト

### TTY なしテスト

```typescript
const result = await runCLI(context, {
  args: ["-p", "Hello, world!"],
  env: {
    FORCE_NO_TTY: "true",
  },
});
```

### 期待される挙動

- ✅ stdin でハングすべきではありません
- ✅ Ink の初期化を試みるべきではありません
- ✅ 結果を stdout へ出力すべきです
- ✅ 正常に終了すべきです

## エラーメッセージ

### TTY なし環境で TUI を起動しようとした場合

```
Error: Cannot start TUI in TTY-less environment. No TTY available for interactive mode.
For non-interactive use, run with -p flag:
  cn -p "your prompt here"
```

### ヘッドレスモードでプロンプトがない場合

```
Error: A prompt is required when using the -p/--print flag, unless --prompt or --agent is provided.

Usage examples:
  cn -p "please review my current git diff"
  echo "hello" | cn -p
  cn -p "analyze the code in src/"
  cn -p --agent my-org/my-agent
```

## トラブルシューティング

### Docker／CI で CLI がハングする

**原因**: TTY なし環境で CLI が stdin の読み取りを試みている

**解決策**: `-p` フラグとプロンプトを必ず指定してください:

```bash
cn -p "your prompt" --config config.yaml
```

### "Cannot start TUI" エラー

**原因**: TTY なし環境でインタラクティブモードを起動しようとしている

**解決策**: ヘッドレスモードを使用してください:

```bash
cn -p "your prompt"
```

### raw モードのエラー

**原因**: ターミナルが raw モード（Ink に必要）をサポートしていない

**解決策**: インタラクティブモードの代わりにヘッドレスモードを使用してください

## 設計原則

1. **Fail Fast**: 環境を早期に検出し、明確なメッセージで失敗します
2. **明示的な分離**: どのコード経路でもヘッドレスモードで Ink が読み込まれることを許しません
3. **ブロッキングなし**: TTY なし環境で stdin を決してブロックしません
4. **明確なエラー**: 使用例を添えた、実効性のあるエラーメッセージを提供します
5. **テスト**: TTY なしシナリオに対する包括的なテスト

## 実装チェックリスト

- [x] TTY 検出ユーティリティを追加
- [x] ヘッドレスモードでの stdin 読み取りを保護
- [x] TUI 初期化をガード
- [x] ヘッドレスモードの入力を検証
- [x] TTY なし出力向けにロガーを設定
- [x] テストヘルパーを更新
- [x] TTY なしテストを追加
- [x] TTY なしサポートをドキュメント化

## 関連ファイル

- `src/util/cli.ts` - TTY 検出ユーティリティ
- `src/util/stdin.ts` - Stdin 読み取りの保護
- `src/ui/index.ts` - TUI 初期化のガード
- `src/commands/chat.ts` - モードルーティングと検証
- `src/util/logger.ts` - 出力設定
- `src/test-helpers/cli-helpers.ts` - テストサポート
- `src/e2e/headless-minimal.test.ts` - TTY なしテスト
