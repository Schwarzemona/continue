---
name: limiting-gui-runtime-imports-of-core
description: gui配下のファイルがcore実行時モジュールをimportする際に読む。
alwaysApply: false
---

`gui` は `core` の TS ソースを直接 import すると Vite の GUI バンドルへ実行時コードが取り込まれる。

- `core/llm/countTokens`、`core/llm/**` のトークナイザ系(js-tiktoken / llamaTokenizer を依存とする Module)を GUI から import しない。参照時に `core/llm/*` が見つかったら、GUI 側では文字数ベース見積もりへ置き換える
- 正確なトークン計数・発動判定は core が返す値(`llm/compileChat` の `contextPercentage` など)へ委譲し、GUI は相对配分の計算にだけ見積もりを使う
- 型-only の import(`import { ChatHistoryItem } from "core"` など)は消除されるため可
- core と同じ数値が必要な場合(MAX_TOKEN_SAFETY_BUFFER, MIN_RESPONSE_TOKENS 等)は GUI 側にローカル定数を置き、`core/llm/countTokens.ts の X と同期させること` というコメントで同期元を明記する
- 変更後は `cd gui && npm run build` で `dist/assets/index.js` が 3 MB 前後に収まることを確認する(数百 MB / 数 MB の急増は依存取り込みの兆候)
