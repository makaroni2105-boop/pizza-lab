# Phase 5 完了サマリー（Ask AI — mock RAG / 研究パートナー土台）

> **完了日:** 2026-07-07  
> **スコープ:** ResearchContext / ResearchMemory / MockLLMAdapter / Ask API `useLlm` / `/ask` UI opt-in  
> **未スコープ:** 外部 LLM API / 本格 RAG（Embedding）/ D1 AI 永続化 / DIE Output UI 連携強化

---

## 1. フェーズ内訳

| フェーズ | 内容 | 主な成果物 |
|---------|------|-----------|
| 5 設計 | AI 人格・安全・RAG 設計固定 | `docs/ai/*` |
| 5a | 型 + 純粋合成 | `types/ai.ts`, `lib/ai/research-context.ts`, `lib/ai/research-memory.ts` |
| 5b | Mock LLM + プロンプト + 安全後処理 | `lib/ai/llm-mock.ts`, `prompt-builder.ts`, `answer-safety.ts` |
| 5c API | `POST /api/ask` useLlm 分岐 | `lib/ask/ask-llm-handler.ts` |
| 5c UI | opt-in toggle + mock 回答表示 | `app/ask/ask-view.tsx` |

---

## 2. 設計正本

| ドキュメント | 内容 |
|-------------|------|
| [docs/ai/README.md](./ai/README.md) | AI レイヤー概要・実装状態 |
| [docs/ai/personality.md](./ai/personality.md) | 研究パートナー人格 |
| [docs/ai/rag-context.md](./ai/rag-context.md) | ResearchContext |
| [docs/ai/research-memory.md](./ai/research-memory.md) | Research Memory 5 要素 |
| [docs/ai/safety-rules.md](./ai/safety-rules.md) | Hard / Soft 安全ルール |
| [docs/ai/ask-flow.md](./ai/ask-flow.md) | Ask フロー・レスポンス形 |

---

## 3. コード構成

### types/ai.ts

- `ResearchContext` / `ResearchMemory` / `ResearchMemoryItem`
- `ResearchContextSource` / `ResearchMemorySource`
- `AskSourceCitation` / `LLMAdapter` / `AnswerSafetyResult`

### lib/ai/

| ファイル | 責務 |
|----------|------|
| `research-memory.ts` | `synthesizeResearchMemory()` |
| `research-context.ts` | `buildResearchContext()`, `mapDieOutputToContextSlice()` |
| `llm-adapter.ts` | `LLMAdapter` 型・定数 |
| `llm-mock.ts` | `MockLLMAdapter` — 外部 fetch 不使用 |
| `prompt-builder.ts` | `buildAskPrompt()` — 研究パートナー system 指示 |
| `answer-safety.ts` | `applyAnswerSafetyRules()`, `extractSourcesFromContext()` |
| `ask-llm.ts` | `runAskLlmPipeline()` |
| `index.ts` | 公開 API |

### lib/ask/（Phase 5c 拡張）

| ファイル | 責務 |
|----------|------|
| `ask-types.ts` | `AskLlmSuccessResponse`, `useLlm` リクエスト型 |
| `ask-llm-handler.ts` | `handleAskLlmRequest()`, `resolveAskResearchContext()` |
| `ask-client-context.ts` | localStorage → context payload 収集 |
| `index.ts` | `useLlm` 分岐 |

**変更していないもの:** `lib/die/*`, `lib/learning/*`, `lib/lab/*`, `lib/calculator/*`（storage ロジック）

---

## 4. POST /api/ask

| `useLlm` | mode | aiUsed | 説明 |
|----------|------|--------|------|
| 未指定 / `false` | `knowledge_search` | `false` | Phase 3b 互換 |
| `true` | `llm_rag` | `true` | MockLLMAdapter のみ |

**mock RAG リクエスト例:**

```json
{
  "question": "冷蔵発酵について",
  "useLlm": true,
  "shopId": "shop-1",
  "context": {
    "shopId": "shop-1",
    "learningRuns": [],
    "labSessions": []
  }
}
```

`context` 省略時は Knowledge 検索結果 + 最小 ResearchContext を API 側で組み立て。

---

## 5. /ask UI

| 項目 | 仕様 |
|------|------|
| デフォルト | toggle OFF → knowledge_search |
| opt-in | 「研究パートナー回答を使う（mock）」チェック ON |
| 表示 | aiUsed badge / answer / sources / nextStep / disclaimers / warnings |
| mock 明記 | `AI 生成 · mock` / provider / model 表示 |
| context | 選択 shop の Lab / Run / Profile を localStorage から送信 |

---

## 6. 原則（実装で守ったこと）

- AI は **先生ではなく研究パートナー**
- DIE 数値は **referenceOnly** — 上書き・再計算しない
- 粉・製法の **優劣表現禁止**（プロンプト + 後処理）
- **NALIPO 予約 DB 非接触**
- **D1 migration なし**
- 外部 LLM / API キー **不使用** — MockLLMAdapter のみ

---

## 7. Phase 5 未実装（Phase 6 以降）

| 項目 | 備考 |
|------|------|
| 外部 LLM API（OpenAI 等） | opt-in adapter 追加 |
| 本格 RAG（Embedding / Vector DB） | Phase 5d 任意 |
| D1 AI テーブル / migration | 別 ADR |
| DIE Output / Weather の Ask UI 自動連携 | Quick セッション連携 |
| UI → D1 切替 / dual write | Phase 4 以降継続 |

---

## 8. 品質

| 項目 | 結果 |
|------|------|
| 単体テスト | **297 passed**（50 files） |
| build / lint | ✅ |

**変更していないモジュール:** DIE Core / Learning / Lab / Calculator の計算・storage ロジック

---

## 9. 関連リンク

- [PIZZALAB_MASTER.md §4.14–4.15](../PIZZALAB_MASTER.md)
- [ROADMAP.md Phase 5](../ROADMAP.md)
- [docs/phase-4-summary.md](./phase-4-summary.md)
