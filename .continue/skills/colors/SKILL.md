---
name: colors
description: GUIコンポーネントで色にかかわる編集するときのスキル。
---

# テーマカラー

コンポーネントに色を追加するときは、Tailwindのカラークラスを使用してください。
`text-gray-400` のような明示的な色は使用**しないで**ください。代わりにテーマカラーを使用してください。

## 利用可能なテーマカラー

### 通常のテキスト

- `foreground`, `description`, `description-muted`

### その他のテキスト、アイコンなど

- `success`, `warning`, `error`, `accent`, `link`

### 一般的なコンポーネント

- `background`, `border`, `border-focus`

### 特定のコンポーネント

#### ボタン (Button)

- `primary`, `primary-foreground`, `primary-hover`
- `secondary`, `secondary-foreground`, `secondary-hover`

#### 入力 (Input)

- `input`, `input-foreground`, `input-border`, `input-placeholder`

#### バッジ (Badge)

- `badge`, `badge-foreground`

#### リスト/ドロップダウン項目 (List/Dropdown items)

- `list-hover`, `list-active`, `list-active-foreground`

#### コードエディタ (Code Editor)

- `editor`, `editor-foreground`

## 使用例

これらの色はすべて Tailwind クラスで使用できます：

- `bg-primary`
- `text-success`
- `border-error`
- `hover:bg-list-hover`

## 除外される色

以下の使用頻度の低い色は、このガイドから除外されています：

- コマンド (tip-tapでのみ使用): `command`, `command-foreground`, `command-border`, `command-border-focus`
- 検索ウィジェットの色: `find-match`, `find-match-selected`
- `table-oddRow`
