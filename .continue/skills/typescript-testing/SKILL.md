---
name: typescript-testing
description: テストの基本原則。テストを計画や実行する際には必ず読むスキル。
---

# 純粋関数の単体テスト

新しい純粋関数に対しては、常に包括的な単体テストを作成してください。テストは、正常系、異常系（エッジケース）、および境界条件をカバーする必要があります。

# 単体テストルール

このプロジェクトでの単体テストについては：

## 1. テストフレームワーク

このプロジェクトではテストに Vitest と Jest を使用しています。Vitest を優先してください。

## 2. テストの実行場所

特定のパッケージディレクトリ内からテストを実行してください（例: `cd continue/core && ..`）。

## 3. Vitest テスト

- テストファイルは `*.vitest.ts` というパターンに従います
- 特定のパッケージ/モジュールディレクトリ内から `vitest` を使用してテストを実行してください：
  ```bash
  cd [directory] && npm run vitest -- [cdで移動後のテストファイルパス]
  ```

## 4. Jest テスト

- テストファイルは `*.test.ts` というパターンに従います
- 特定のパッケージ/モジュールディレクトリ内から `npm test` を使用してテストを実行してください：
  ```bash
  cd [directory] && npm test -- [cdで移動後のテストファイルパス]
  ```
- テストスクリプトは NODE_OPTIONS フラグを介して実験的な VM モジュールを使用します

## 5. テスト構造

- テストはトップレベルの `test()` 関数として記述してください - `describe()` ブロックは使用**しないで**ください
- 明確にするために、テストの説明にテスト対象の関数名を含めてください

# テスト実行ガイド

- テストファイルを使用するときは、以下のコマンドを使用してテストを実行してください：

## GUI フォルダのテスト:

- すべてのテストを実行: `cd continue/gui && npm test`

## Core フォルダのテスト:

- Jest テストを実行: `$env:IGNORE_API_KEY_TESTS="true"; cd continue/core && npm test`
- Vitest テストを実行: `$env:IGNORE_API_KEY_TESTS="true"; cd continue/core && npm run vitest`

## テストファイルのパターン:

- GUI: `_.test.ts` または `_.test.tsx` ファイルは Vitest を使用
- Core: `_.test.ts` ファイルは Jest、`_.vitest.ts` ファイルは Vitest を使用

## ベストプラクティス:

- Vitest への移行を進めているため、新しいテストを作成するときは Vitest を使用してください
