# Pizza-Lab AI 設計 + 実装（Phase 5 正本）

> **Status:** mock RAG 土台 ✅ 完了（2026-07-07）  
> **LLM:** MockLLMAdapter のみ — 外部 API / API キー **未使用**  
> **完了サマリー:** [docs/phase-5-summary.md](../phase-5-summary.md)

---

## 1. 目的

Pizza-Lab の AI を **先生** ではなく **研究パートナー** として振る舞わせる。

| 原則 | 内容 |
|------|------|
| 職人第一 | 判断の最終権は常に職人 |
| DIE 不変 | 数値計算は DIE Core。AI は上書きしない |
| わからないを許容 | 不確実性を隠さない |
| 製法の尊重 | STG / VPN / APN を参照するが唯一解にしない |
| 粉は個性 | 優劣・ランキングで語らない |

---

## 2. ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| [personality.md](./personality.md) | AI 人格・トーン・禁止事項 |
| [rag-context.md](./rag-context.md) | ResearchContext — RAG 参照ソース |
| [research-memory.md](./research-memory.md) | Research Memory — 仮説・実験・次の一枚 |
| [safety-rules.md](./safety-rules.md) | 安全ルール・自動確定禁止 |
| [ask-flow.md](./ask-flow.md) | Ask 回答方針・フロー |

---

## 3. 実装状態（Phase 5 ✅）

| 項目 | 状態 | 場所 |
|------|------|------|
| ResearchContext 型 + 合成 | ✅ | `types/ai.ts`, `lib/ai/research-context.ts` |
| ResearchMemory 合成 | ✅ | `lib/ai/research-memory.ts` |
| MockLLMAdapter | ✅ | `lib/ai/llm-mock.ts` |
| buildAskPrompt() | ✅ | `lib/ai/prompt-builder.ts` |
| applyAnswerSafetyRules() | ✅ | `lib/ai/answer-safety.ts` |
| runAskLlmPipeline() | ✅ | `lib/ai/ask-llm.ts` |
| POST /api/ask useLlm | ✅ | `lib/ask/ask-llm-handler.ts` |
| /ask UI toggle + 表示 | ✅ | `app/ask/ask-view.tsx` |
| localStorage → context | ✅ | `lib/ask/ask-client-context.ts` |

### Ask モード

| mode | aiUsed | トリガー |
|------|--------|----------|
| `knowledge_search` | `false` | `useLlm` 未指定 / false（デフォルト） |
| `llm_rag` | `true` | `useLlm: true` または UI toggle ON |

---

## 4. ResearchContext（概要）

AI が参照 **してよい** 情報源（詳細: [rag-context.md](./rag-context.md)）:

| ソース | 取得元 | Phase 5 |
|--------|--------|---------|
| Knowledge | `lib/knowledge/` | ✅ |
| Learning | `profile.learning` | ✅ 読取 |
| Weather | snapshot / API | 型のみ（UI 未連携） |
| Run History | `pizzalab-learning-runs-v1` | ✅ 読取 |
| Dough DNA | `pizzalab-dna-v1` | ✅ 読取 |
| Flour Blend | `pizzalab-flour-blends-v1` | ✅ 読取 |
| Journal | `pizzalab-journal-v1` | ✅ 読取 |
| Comparison | `pizzalab-comparisons-v1` | ✅ 読取 |
| Profile | `pizzalab-profiles-v1` | ✅ 読取 |
| DIE Output | クライアント経由 | 型 + API 対応（UI 自動送信は未） |

**NALIPO 分離:** 予約 DB・外部システムは ResearchContext に含めない。

---

## 5. Phase 5 未実装

| 項目 | 備考 |
|------|------|
| 外部 LLM API | OpenAI 等 — adapter 差し替え |
| 本格 RAG（Embedding / Vector DB） | Phase 5d 任意 |
| D1 AI テーブル / migration | 別 ADR |
| DIE Output / Weather UI 自動連携 | Ask toggle からの自動送信 |
| Lab / DIE 深連携 | Phase 4+ 継続 |

---

## 6. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [MANIFESTO.md](../../MANIFESTO.md) | 憲章 |
| [PIZZALAB_MASTER.md](../../PIZZALAB_MASTER.md) | §4.14–4.15 / §11 |
| [ROADMAP.md](../../ROADMAP.md) | Phase 5 完了 |
| [docs/phase-5-summary.md](../phase-5-summary.md) | 完了サマリー |
| [docs/lab-mode/README.md](../lab-mode/README.md) | Lab データソース |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — Phase 5 設計固定 |
| 2026-07-07 | mock RAG 土台実装完了 — 5a/5b/5c |
