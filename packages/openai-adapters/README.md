# OpenAI アダプター

OpenAI アダプターは、OpenAI 互換のリクエストを別の API 用のリクエストに変換し、その逆も行います。

これらは純粋な変換レイヤーであり、以下については関与しません：

- テンプレート
- モデルがツールや画像などをサポートしているかどうか
- モデルに応じた API ベースの動的な変更
- システムメッセージの追跡（`systemMessage` を持つ最初のメッセージになります）
- OpenAI リクエストボディを通じて既に渡されているものに関するプライベート変数の保持
- `apiBase` への "/" の追加（これは TODO です）
- エンベディングのバッチ処理（はい、最大バッチサイズに関する知識が必要ですが、1リクエスト = 1リクエストを維持することの方が重要です）
- 片方が定義されていない場合に、`streamComplete` に対して `streamChat` を使用すること、またはその逆

目標は、この変更を可能な限り少なくすることです。実際の API フォーマットが変更されたときにのみ更新が必要になるようにします。

これらは以下に関与します：

- モデルエイリアスの変換
- キャッシュの動作
- 最大停止単語（max stop words）
- レガシーな completions エンドポイントを使用するかどうか？
- プロキシの背後にあるエンドポイントをクライアントが知ることができないため、推測不可能なその他の事項

## サポートされている API

- [x] Anthropic
- [ ] AskSage
- [x] Azure
- [x] Bedrock
- [ ] Bedrock Import
- [x] Cerebras
- [ ] Cloudflare
- [x] Cohere
- [x] DeepInfra
- [x] Deepseek
- [ ] Flowise
- [x] Function Network
- [x] Gemini
- [x] Groq
- [ ] HuggingFace Inference API
- [ ] HuggingFace TGI
- [x] Kindo
- [x] LMStudio
- [x] LlamaCpp
- [x] Llamafile
- [x] Msty
- [x] Mistral
- [x] Nvidia
- [x] Nebius
- [x] OpenRouter
- [x] OpenAI
- [ ] !Ollama
- [x] OVHCLoud
- [ ] Replicate
- [ ] SageMaker
- [x] SambaNova
- [x] Scaleway
- [ ] Silicon Flow
- [x] TextGen Web UI
- [x] Together
- [x] Novita AI
- [x] Vllm
- [x] Vertex AI
- [x] Voyage AI
- [x] WatsonX
- [x] xAI
- [x] Fireworks
- [x] Moonshot
