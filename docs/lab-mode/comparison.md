# ComparisonRun — 条件比較・検証

> **目的:** 「A と B どちらが **その店の100点** に近いか」を、職人と一緒に検証する記録。

---

## 1. 定義

2 つ以上の **Run / LabSession / DNA 状態** を並べ、差分と職人の結論を残す。

AI は結論を出さない。ComparisonRun の `conclusion` は **職人が書く**。

---

## 2. 型（ComparisonRun）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | UUID |
| `shopId` | string | ✅ | |
| `title` | string | ✅ | 例: 「65% vs 62% 加水」 |
| `status` | enum | ✅ | `draft` \| `ready` \| `concluded` |
| `sideA` | ComparisonSide | ✅ | 条件 A |
| `sideB` | ComparisonSide | ✅ | 条件 B |
| `sideC` | ComparisonSide | | 任意 3 条件目 |
| `dimensions` | ComparisonDimension[] | ✅ | 比較軸 |
| `hypothesis` | string | | 比較前の仮説 |
| `conclusion` | string | | 職人による結論（断定は職人の言葉） |
| `nextSteps` | string | | 次の実験 |
| `journalEntryIds` | string[] | | 関連 Journal |
| `createdAt` | ISO8601 | ✅ | |
| `updatedAt` | ISO8601 | ✅ | |

### ComparisonSide

| フィールド | 説明 |
|-----------|------|
| `label` | 「A: 65% 加水」 |
| `runId` | LearningRun 参照 |
| `labSessionId` | LabSession 参照 |
| `dnaSnapshot` | その側の DNA スナップショット |
| `blendSnapshot` | 粉ブレンド |
| `dieOutputSnapshot` | DIE 結果要点（配合 g, DDT, 摩擦） |

**runId と labSessionId:** 少なくとも一方必須。

### ComparisonDimension

比較表の行。Phase 4 UI はテンプレ + カスタム。

| キー | 自動取得 | 説明 |
|------|----------|------|
| `hydrationPct` | dieInput | 加水率 |
| `targetDdtC` | dieOutput | 目標 DDT |
| `actualDoughTempC` | LearningRun | 実測生地温 |
| `craftsmanScore` | LearningRun | 1–5 |
| `predictedFrictionC` | LearningRun | 予測摩擦 |
| `flourBlendName` | blendSnapshot | 粉 |
| `dnaScore:*` | dnaSnapshot | 任意 DNA 軸 |
| `custom:*` | 手入力 | 職人定義 |

---

## 3. フロー

```
hypothesis 記入
    → sideA / sideB を Run または Session から選択
    → dimensions 自動差分表示
    → 職人が side を食べ比べ / 観察
    → conclusion + nextSteps（職人執筆）
    → status: concluded
    → 必要なら新 LabSession（nextSteps から）
```

---

## 4. Learning / DNA との関係

| 関係 | 説明 |
|------|------|
| LearningRun | side の実測ソース。摩擦学習は各 Run 独立 |
| DoughDNA | 比較の「理想」参照。side ごと snapshot |
| Journal | 比較の定性メモ |
| Learning 集計 | Comparison は **摩擦 offset に直接混ぜない** |

---

## 5. Quick Mode との差

Quick に A/B 比較 UI なし。ComparisonRun は **Lab 専用**。

---

## 6. 永続化（将来）

| 層 | 識別子 |
|----|--------|
| localStorage | `pizzalab-comparisons-v1` |
| D1（案） | `pizza_lab_comparison_runs` — sides_json, dimensions_json |

---

## 7. UI 方針（`/lab/compare`）

- Step 1: 比較タイトル + hypothesis
- Step 2: A / B を History または Session からピック
- Step 3: 差分テーブル（数値 + DNA 差分ハイライト）
- Step 4: conclusion / nextSteps 入力
- 文言: 「どちらが正解かではなく、**うちの100点に近いのはどちらか**」

---

## 8. 将来 AI 参照

| フィールド | Ask / LLM（Phase 5+） |
|-----------|------------------------|
| `hypothesis`, `conclusion` | 検証の文脈 |
| `dimensions` 差分 | 説明用表（AI 生成表禁止 → 既存 diff 表示） |
| `nextSteps` | 次セッション提案の **参考**（職人承認必須） |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
