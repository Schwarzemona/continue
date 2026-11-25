---
name: LLM情報の更新
description: LLMブロックを最新の情報で更新する
invokable: true
---

特定のプロバイダーからの大規模言語モデルに関する最新情報を使用して、このリポジトリを更新してください。
情報は `packages/llm-info` ディレクトリに保存されており、これは独自の npm パッケージとして動作します。
情報はシンプルな JSON 形式で保存されており、「プロバイダー」（例: gemini, ollama, openai など）ごとに 1 つのモデルファイルがあります。
例えば、Gemini のモデル情報は `packages/llm-info/src/providers/gemini.ts` に保存されています。

特定のプロバイダーに対してこれらの更新を行うには、以下の手順を一つずつ実行してください：

1. 現在の情報を確認する

現在の LLM 情報を確認するには、read_file ツールを使用してファイル（例: `packages/llm-info/src/providers/gemini.ts`）を読み込んでください。
ファイルを読み込むためのツールが見当たらない場合は、教えてください。

参考までに、情報を保存するために使用される LLMInfo インターフェースは以下の通りです：

```typescript
export interface LlmInfo {
  model: string; // API レイヤーでモデルを区別するために使用されるモデル名。例: "gemini-2.5-pro-preview-05-06"
  displayName?: string; // 適切な表示名。例: "Gemini 2.5 Pro Preview"
  description?: string; // モデルの短い説明。プロバイダーのウェブサイトにある説明にできるだけ近づけてください。
  contextLength?: number; // コンテキストウィンドウのサイズ（トークン数）。多くの場合「max input tokens」または「context length」と呼ばれます。
  maxCompletionTokens?: number; // モデルが出力できる最大トークン数
  regex?: RegExp; // モデル名にわずかな変更やアップグレードがあった場合に一意に一致させるための正規表現。例: /gemini-2\.5-pro-preview/i
  mediaTypes?: MediaType[]; // モデルがサポートする入出力タイプ。例: [MediaType.Text, MediaType.Image]
}

export enum MediaType {
  Text = "text",
  Image = "image",
  Audio = "audio",
  Video = "video",
}

export const AllMediaTypes = [
  MediaType.Text,
  MediaType.Image,
  MediaType.Audio,
  MediaType.Video,
];
```

2. 新しい情報を抽出する

search web および read url ツールを使用して、インターネットから情報を取得してください。
これらのツールのいずれも見当たらない場合は、停止して教えてください。

以下のプロバイダーについて各サイトから情報を取得し、情報の抽出方法に関する以下の注意点を考慮してください：

- "gemini": https://ai.google.dev/gemini-api/docs/models - maxCompletionTokens は "Output token limit" と呼ばれ、contextLength は "Input token limit" と呼ばれます
  // TODO: openai, ollama などの情報を追加する

その他のプロバイダーについては、ウェブで "latest [provider] models" を検索し、最善の判断で最も関連性の高いモデル情報を見つけてください。
一般的に、テキスト出力に対応していないモデルは無視してください。これらのモデルは、テキスト/画像入力およびテキスト/出力のみをサポートするコーディングエージェントクライアントで使用されるため、余分な機能は無視して構いません。
モデルによっては、「Experimental」、「Preview」、またはそれに類するバージョンが利用可能な場合があります。それぞれの最新日付のバージョンについて、個別に情報を維持する必要があります。

3. 情報を更新する

edit file ツールを使用して、関連するプロバイダーのファイル（例: `packages/llm-info/src/providers/gemini.ts`）に更新を送信してください。
ファイルを編集するためのツールが見当たらない場合は、教えてください。

既存の情報はすでに最新である可能性が高いため、一般的には変更を避けてください。
主に、新しいモデルの追加、または既存のモデルへの不足情報の追加に重点を置いてください。
既存のモデルを絶対に削除しないでください。ただし、削除すべきだと思う場合は教えてください。
変更について不明な点がある場合は停止して質問してください。また、微妙な違いがある更新、複雑な更新、または非常に注目すべき更新がある場合は教えてください。
完了後に変更の要約を提供してください。

4. NPM への公開を希望するか確認する
   すべての更新が完了したら、変更を npm に公開する必要があることを私にリマインドしてください。

// TODO 現時点では機密性が高すぎる
// もし公開する場合は、packages/llm-info/package.json を新しいバージョン番号で更新し、その後
// - ターミナルツールを使用して変更をコミットする
// - ターミナルツールを使用して変更を npm に公開する
// ターミナルコマンドを実行するためのツールが見当たらない場合は、教えてください。

// ユーザー入力
以下のプロバイダーの LLM 情報を更新してください。「all」の場合は、上記のすべてのプロバイダーを更新してください：
