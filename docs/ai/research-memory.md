# Research Memory — 研究記憶

> **定義:** 職人と AI が共有する「その店の研究の続き」。DB テーブルではなく、**既存 Lab + Learning データから合成する論理層**（Phase 5a 型化）。

---

## 1. 目的

- バラバラな Run / Journal / Comparison / DNA を **1 つの研究ストーリー** として Ask に渡す。
- AI が「昨日何を試して、今日何が分かり、次に何を試すか」を **職人の記録に基づいて** 語れるようにする。
- 新しい永続化層（D1 migration）は Phase 5 設計では **作らない**。localStorage + 既存型から都度合成。

---

## 2. Research Memory 5 要素

| 要素 | 意味 | 主なデータソース |
|------|------|-----------------|
| **仮説** (hypothesis) | まだ検証していない問い | LabSession.hypothesis, Comparison.hypothesis, Journal（仮説セクション） |
| **実験** (experiment) | 試した条件・手順 | Run snapshot, Journal（手順）, LabSession title, Blend 名 |
| **結果** (result) | 観察された事実 | Run 実測, craftsmanScore, Journal（結果・観察）, Comparison dimensions |
| **未検証事項** (openQuestions) | まだ分からないこと | DNA 未設定軸, Comparison status=draft, mood=unsure |
| **次に試すこと** (nextSteps) | 次の一枚への接続 | Journal nextTry, Comparison.nextSteps, LabSession 下書き |

---

## 3. 論理モデル（設計）

```typescript
// Phase 5a — types/ai.ts 想定
interface ResearchMemory {
  shopId: string;
  synthesizedAt: string;           // ISO8601
  hypotheses: MemoryItem[];
  experiments: MemoryItem[];
  results: MemoryItem[];
  openQuestions: MemoryItem[];
  nextSteps: MemoryItem[];
}

interface MemoryItem {
  id: string;                      // ソース entity id
  source: ResearchMemorySource;
  label: string;                   // 短い見出し
  excerpt: string;                 // 200字以内
  recordedAt: string;
  confidence: "fact" | "hypothesis" | "subjective";
}

type ResearchMemorySource =
  | "learning_run"
  | "lab_session"
  | "dough_dna"
  | "flour_blend"
  | "journal"
  | "comparison";
```

---

## 4. 合成ルール（Phase 5a 純粋関数）

### 4.1 優先順位（新しい順）

各カテゴリ内は `recordedAt` / `updatedAt` 降順。全体上限: 各 5 件（案）。

### 4.2 マッピング

| ソース | → hypotheses | → experiments | → results | → openQuestions | → nextSteps |
|--------|-------------|-----------------|-----------|-----------------|-------------|
| LabSession | hypothesis | title + status | — | draft status | — |
| LearningRun | memo 内仮説 | snapshot 要点 | 実測 vs 予測, score | Run < 5 | memo |
| DoughDNA | description | presetType | 設定済み scores | null scores | — |
| FlourBlend | notes | name + components | — | 比率≠100% | notes |
| Journal | 仮説 section | 手順 section | 結果・観察 | entryType=reflection + unsure mood | nextTry section |
| Comparison | hypothesis | sideA vs sideB | dimensions, 観察 | status≠concluded | nextSteps |

### 4.3 confidence 付与

| confidence | 条件 |
|------------|------|
| `fact` | Run 実測値、Journal 観察、Comparison dimensions |
| `hypothesis` | hypothesis フィールド、Lab 下書き |
| `subjective` | craftsmanScore, craftsmanMood, DNA description |

AI は `confidence` を回答で明示する（「記録上の事実」「仮説」「職人の感覚」）。

---

## 5. Research Memory と ResearchContext の関係

```
localStorage / client state
        │
        ▼
synthesizeResearchMemory(shopId)  ──► ResearchMemory
        │
        ▼
buildResearchContext(...)         ──► ResearchContext
        │                              (memory を要約ブロックとして含む)
        ▼
LLM Prompt
```

Research Memory は ResearchContext の **サブセット + 時系列要約**。重複は許容するがトークン予算内で dedupe。

---

## 6. 更新トリガー

| イベント | Memory への反映 |
|----------|----------------|
| Run 保存 | experiments + results 更新 |
| Journal 保存 | 全 5 要素に影響しうる |
| Comparison 保存 | hypotheses, results, nextSteps |
| DNA / Blend 編集 | openQuestions（未設定軸） |
| AI 回答 | **書き込まない** — 職人が Journal に記録 |

**禁止:** AI が Research Memory を直接更新する API。職人確認後も Phase 5 では Journal 経由のみ。

---

## 7. Phase 5 未実装

| 項目 | フェーズ |
|------|---------|
| `synthesizeResearchMemory()` | 5a |
| Memory → Ask UI プレビュー | 5c |
| 長期 Memory の D1 永続化 | Phase 5 以降・別 ADR |
| 店舗間 Memory 共有 | v1.0 以降・オプトイン |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
