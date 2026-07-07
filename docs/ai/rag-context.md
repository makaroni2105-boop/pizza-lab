# RAG / ResearchContext 設計

> **Phase 5 設計正本。** Vector DB は Phase 5d 以降の任意拡張。Phase 5b 初期は **構造化コンテキスト + Knowledge キーワード** を前提とする。

---

## 1. ResearchContext とは

Ask / 将来 Lab 支援 AI が **1 回の質問に対して参照してよい情報の束**。

```typescript
// 設計スケッチ（Phase 5a で types/ai.ts に正式化）
interface ResearchContext {
  shopId: string;
  question: string;
  knowledge: KnowledgeSnippet[];      // Tier 付き抜粋
  profile?: ShopProfileSummary;
  learning?: LearningSummarySlice[];
  weather?: WeatherSnapshot;
  recentRuns?: RunHistorySlice[];     // 直近 N 件
  doughDna?: DNASnapshotSlice[];
  flourBlends?: FlourBlendSlice[];
  journal?: JournalSlice[];
  comparisons?: ComparisonSlice[];
  dieOutput?: DieOutputSummary;       // 直近計算結果。再計算しない
  meta: ResearchContextMeta;          // トークン上限・欠損フラグ
}
```

**原則:** 読取専用。AI レイヤーは **どのストレージにも書き込まない**。

---

## 2. ソース別仕様

### 2.1 Knowledge

| 項目 | 内容 |
|------|------|
| 取得 | 既存 `searchKnowledgeEntries` + 将来 Tier 重み |
| 上限 | 2〜3 記事、各 500 字以内（MASTER 既存方針） |
| Tier | official > science > intelligence > glossary |
| 出典 | `titleJa`, `relativePath`, `tier` を回答に必須表示 |

### 2.2 Learning

| 項目 | 内容 |
|------|------|
| 取得 | `profile.learning[]` — mixerKey 別サマリ |
| 用途 | 摩擦補正の説明「なぜ DIE がこの摩擦を使ったか」 |
| 禁止 | 補正値の AI 提案による上書き |

### 2.3 Weather

| 項目 | 内容 |
|------|------|
| 取得 | 直近 `WeatherSnapshot`（Quick セッション or API） |
| 用途 | 室温・湿度と発酵/DIE 入力の関係説明 |

### 2.4 Run History

| 項目 | 内容 |
|------|------|
| 取得 | `listLearningRuns` 直近 N 件（案: 5） |
| フィールド | 日時、予測 vs 実測生地温、craftsmanScore、memo 抜粋 |
| 用途 | トレンド説明。Run 5 未満は「学習中」と明示 |

### 2.5 Dough DNA

| 項目 | 内容 |
|------|------|
| 取得 | 選択中 shop の default / 明示指定 DNA |
| フィールド | scores（設定済み軸のみ）、description |
| 用途 | 「理想との差」の **提案**（断定禁止） |

### 2.6 Flour Blend

| 項目 | 内容 |
|------|------|
| 取得 | shop スコープの Blend 一覧 or 指定 ID |
| 用途 | 個性・比率の文脈。W 値自動計算は Phase 4+ |

### 2.7 Journal

| 項目 | 内容 |
|------|------|
| 取得 | 直近エントリ or キーワード関連 |
| フィールド | title, entryType, body 抜粋（観察・次に試すこと優先） |
| 用途 | 定性文脈。AI による新 Journal 自動生成は Phase 5 禁止 |

### 2.8 Comparison

| 項目 | 内容 |
|------|------|
| 取得 | 直近 ComparisonRun |
| フィールド | hypothesis, sideA/B label, dimensions 差分, conclusion, nextSteps |
| 用途 | 「違いを見る」文脈。勝ち負け表現禁止 |

### 2.9 Profile

| 項目 | 内容 |
|------|------|
| 取得 | 選択 shop の name, preset, 粉・ミキサー要約 |
| 用途 | 店舗コンテキストの固定 |

### 2.10 DIE Output

| 項目 | 内容 |
|------|------|
| 取得 | クライアントが直前に受け取った `DieOutput` 要点 |
| フィールド | hydration, water temp, ice, friction, fieldResolution |
| 禁止 | AI による再計算・数値修正 |

---

## 3. RAG パイプライン（Phase 5b 設計）

```
User Question
    │
    ▼
extractAskKeywords (既存 lib/ask)
    │
    ▼
buildResearchContext (新規 lib/ai — 5a/5b)
    ├── Knowledge search
    ├── localStorage readers (shop scoped)
    ├── optional: client-supplied DieOutput
    └── truncate to token budget
    │
    ▼
assemblePrompt (personality + safety + context JSON)
    │
    ▼
LLM Adapter (5b — 外部 API、モック可能)
    │
    ▼
postProcess (出典付与、禁止フレーズ検査 — 5b)
    │
    ▼
AskResponse { aiUsed: true, mode: "llm_rag", ... }
```

**Phase 5b 初期:** Embedding なし。Knowledge はキーワード、Lab は直近 N 件 + 関連キーワードマッチ。

**Phase 5d（任意）:** `content/knowledge/` + Journal body の Embedding。Vector DB は Pizza-Lab 専用。NALIPO 非混在。

---

## 4. トークン・プライバシー予算

| ブロック | 上限（案） | 優先度 |
|----------|-----------|--------|
| Knowledge | 1500 tokens | 高 |
| DIE Output | 400 tokens | 高（質問が DIE 関連時） |
| Run History | 600 tokens | 中 |
| Journal / Comparison | 各 400 tokens | 中 |
| DNA / Blend | 各 300 tokens | 低〜中 |
| Profile / Learning / Weather | 各 200 tokens | 低 |

**shopId 隔离:** 他店データは絶対に混入しない。

---

## 5. 欠損時の振る舞い

| 状態 | AI の言い方 |
|------|------------|
| Run 0 件 | 「まだ Run 記録がないので、店舗の傾向は読み取れません」 |
| DNA 未設定 | 「うちの100点（DNA）が未設定です。Lab で育てると比較がしやすくなります」 |
| Knowledge 0 件 | 一般論を避け、「記事が見つかりませんでした。質問を変えてみてください」 |
| DIE Output なし | DIE 数値について推測しない |

---

## 6. 既存実装との境界

| モジュール | Phase 5 設計時の扱い |
|------------|---------------------|
| `lib/knowledge/*` | 読取のみ。変更しない |
| `lib/learning/*` | 読取のみ |
| `lib/lab/*-storage.ts` | 読取のみ（新規 reader は `lib/ai/`） |
| `lib/ask/*` | 5b で handler が `lib/ai` を呼ぶ。既存 `knowledge_search` モード維持 |
| `lib/die/*` | **触らない** |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
