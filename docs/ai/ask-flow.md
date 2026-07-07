# Ask Flow — 回答方針とフロー

> **現状:** Phase 3b — Knowledge キーワード検索 + 固定ガイド（`aiUsed: false`）  
> **目標:** Phase 5b — ResearchContext + LLM RAG（`aiUsed: true`）を **追加** し、既存モードを維持

---

## 1. 回答方針（Phase 5）

| 方針 | 内容 |
|------|------|
| 断定しすぎない | 推測と事実を分離。強い断言を避ける |
| 根拠を示す | Knowledge 記事・Run 記録・Journal 抜粋を引用 |
| 次の一枚につながる | 毎回答に optional な「次に試すこと」1 件 |
| 職人の判断を尊重 | 命令ではなく選択肢。最終決定は職人 |

詳細: [personality.md](./personality.md)

---

## 2. 現行フロー（Phase 3b — 変更しない）

```
POST /api/ask { question }
    │
    ▼
normalizeAskQuestion
    │
    ▼
extractAskKeywords
    │
    ▼
searchKnowledgeEntries
    │
    ▼
buildAskGuide (固定テンプレート)
    │
    ▼
{ success, mode: "knowledge_search", aiUsed: false, candidates[], guide }
```

**UI:** `/ask` — 候補記事 + ガイド文。LLM なし。

---

## 3. 目標フロー（Phase 5b — 追加）

```
POST /api/ask { question, shopId?, contextHints?, dieOutput? }
    │
    ▼
Route: useLlm? (feature flag / env / 明示 opt-in)
    │
    ├─ false ──► 現行 knowledge_search（§2）
    │
    └─ true ──►
          buildResearchContext
          synthesizeResearchMemory
          assemblePrompt (personality + safety)
          LLM Adapter (mock in test)
          postProcessSafety
          │
          ▼
          { success, mode: "llm_rag", aiUsed: true,
            answer, sources[], nextStep?, memorySnapshot? }
```

**デフォルト:** Phase 5b リリース時も `useLlm: false` を維持し、段階的 opt-in。

---

## 4. レスポンス形（設計 — Phase 5a 型化）

### 4.1 既存（維持）

```typescript
interface AskSuccessResponse {
  success: true;
  mode: "knowledge_search";
  aiUsed: false;
  question: string;
  keywords: string[];
  guide: string;
  candidates: AskCandidate[];
}
```

### 4.2 新規（追加）

```typescript
interface AskLlmSuccessResponse {
  success: true;
  mode: "llm_rag";
  aiUsed: true;
  question: string;
  answer: string;              // LLM 生成（後処理済み）
  sources: AskSource[];        // Knowledge + Memory 出典
  nextStep?: string;           // 次の一枚（1 件）
  disclaimers?: string[];      // Run 不足等
}

interface AskSource {
  type: "knowledge" | "run" | "journal" | "comparison" | "dna" | "die";
  id: string;
  label: string;
  href?: string;
}
```

**Union:** `AskApiResponse = AskSuccessResponse | AskLlmSuccessResponse | AskErrorResponse`

---

## 5. 質問タイプ別コンテキスト

| 質問タイプ | 優先コンテキスト | 例 |
|------------|-----------------|-----|
| 概念・用語 | Knowledge | 「DDT とは」 |
| DIE 結果の説明 | DIE Output + Learning + Knowledge | 「なぜ水温が低いのか」 |
| トラブル | Run History + Weather + Knowledge | 「生地が硬い」 |
| 理想との差 | DNA + Journal + Comparison | 「100点に近づくには」 |
| 粉・ブレンド | Blend + Knowledge flour | 「この配合の意味は」 |
| 研究の続き | Research Memory 全体 | 「前回の続き」 |

ルーティングは Phase 5b の `classifyAskIntent()`（キーワード + ルールベース）。LLM 分類は後回し。

---

## 6. UI 方針（Phase 5c）

| 要素 | 表示 |
|------|------|
| aiUsed badge | 「AI 生成」/「記事検索のみ」 |
| sources | 折りたたみ出典リスト |
| nextStep | カード「次の一枚」→ Journal 作成導線（将来） |
| disclaimers | Run 不足・DNA 未設定 |
| Knowledge 候補 | llm モードでも Knowledge リンクを残す |

**既存 `/ask` UI:** knowledge_search モードは Phase 5c まで現状維持。

---

## 7. Phase 5 実装順序

| 順 | 内容 | 成果物 |
|----|------|--------|
| 1 | 設計固定 | `docs/ai/*` ✅ |
| 2 | **5a** 型定義 | `types/ai.ts`, `ResearchContext`, `ResearchMemory` |
| 3 | **5a** 合成関数 | `lib/ai/build-context.ts`, `synthesize-memory.ts` + tests |
| 4 | **5a** Ask レスポンス型拡張 | `types/ask` または `types/ai` — **後方互換** |
| 5 | **5b** LLM アダプタ | `lib/ai/llm-adapter.ts`（interface + mock） |
| 6 | **5b** RAG パイプライン | `lib/ai/ask-llm.ts` |
| 7 | **5b** API 分岐 | `POST /api/ask` — flag で llm / search |
| 8 | **5c** UI | `/ask` 拡張 |
| 9 | **5d（任意）** | Embedding / Vector |

**ゲート:** 5a 完了 + テスト通過後に 5b の外部 API 接続。

---

## 8. テスト方針

| 層 | 内容 |
|----|------|
| 5a | Memory 合成、Context truncate、shopId 隔离 |
| 5b | Mock LLM、禁止フレーズ後処理、aiUsed フラグ |
| E2E | knowledge_search 回帰（既存 13 tests 維持） |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
