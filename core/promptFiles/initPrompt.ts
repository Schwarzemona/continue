import { SlashCommandWithSource } from "..";
import { RULES_MARKDOWN_FILENAME } from "../llm/rules/constants";
import { BuiltInToolNames } from "../tools/builtIn";

const initFilename = "AGENTS.md";

// Prompt for init slash command
export const INIT_PROMPT_CONTENT = `
コードベースを対象に、AIがプロジェクトをより深く理解し、円滑に作業を進められるよう、包括的な${initFilename}プロジェクトガイドを作成します。

## ステップ1: 必要なツールを確認
まず、必要なツールにアクセスできることを確認:
- ${BuiltInToolNames.FileGlobSearch}: プロジェクトファイルを捜索するため
- ${BuiltInToolNames.ReadFile}: ファイルの内容を分析するため
- ${BuiltInToolNames.LSTool}: ディレクトリ構造を調査するため
- ${BuiltInToolNames.CreateNewFile}: ${initFilename}ファイルを生成するため

これらのツールがいずれも利用できない場合は、作業を進める前に、それらを有効化し、Continueで自律モードを有効にする必要があることを伝えます。

## ステップ2: プロジェクト分析
プロジェクトの構造と主要なファイルを分析し、以下を把握します。
- 使用されているプログラミング言語とフレームワーク
- 全体的なアーキテクチャと構成
- 主要なコンポーネントとその役割
- 重要な設定ファイル
- ビルドおよびデプロイの仕組み

## ステップ3: ${initFilename}の生成
プロジェクトルートディレクトリに、以下のセクションを含む包括的な${initFilename}ファイルを作成または更新:

1. **概要**
- プロジェクトの目的の簡潔な説明

2. **デプロイ**
- コーディング規約や慣習
- テストアプローチ
- ビルドおよびデプロイのプロセス

3. **重要なコンセプト**
- ドメイン固有の用語

分析は徹底しつつも、簡潔にまとめます。プロジェクトに携わるAIにとって最も有益な情報に重点を置きます。コードベースから特定の情報を得られない場合は、妥当な仮定を立てた上で、それらの箇所には検証が必要であることを明記します。

## ステップ4: 完了
${initFilename}ファイルを作成したら、作成内容の概要を出力し、必要に応じてファイルを確認・編集することを案内します。

また、特定のコンポーネントに関するルールが必要な場合は、サブディレクトリにも${RULES_MARKDOWN_FILENAME}ファイルを作成できることを併せて伝えます。
`.trim();

export const initSlashCommand: SlashCommandWithSource = {
  name: "ガイド",
  description: "ガイド作成または更新",
  source: "built-in",
  prompt: INIT_PROMPT_CONTENT,
};
