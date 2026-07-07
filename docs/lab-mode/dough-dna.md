# DoughDNA — その店の100点

> **正式スキーマ:** [docs/schemas/dna.schema.json](../schemas/dna.schema.json)  
> **MASTER:** PIZZALAB_MASTER.md §6

---

## 1. 定義

その店だけの **理想の生地** を 17 食感軸（0–100）で記録するプロファイル。

| 原則 | 内容 |
|------|------|
| 優劣なし | スコアは「その店の100点」基準。世界共通ランキングなし |
| 個性 | NY 硬めも VPN 軽めも正当 |
| Quick | 用途プリセットに紐づき **暗黙参照**（UI 非表示） |
| Lab | 明示編集。FlourBlend・DIE 逆算の起点 |

---

## 2. 型（DoughDNA）

`dna.schema.json` の `DoughDNA` に準拠。

| フィールド | 説明 |
|-----------|------|
| `id`, `shopId`, `name` | 識別。shopId で他店隔离 |
| `presetType` | `business` \| `competition` \| `research` |
| `presetId` | `ShopProfile.presets[].id` へのリンク |
| `scores` | 17 キー（lightness … reheatTolerance）各 0–100 |
| `targetParams` | scores から導出する DIE 目標（hydration, DDT, 発酵…） |
| `description` | 職人の言語による「うちの100点」 |
| `isDefault` | 用途別デフォルト DNA |
| `learningHistory` | DNA 更新履歴（自動確定禁止） |
| `linkedFlourIds` | FlourBlend 候補 |
| `linkedMixerKey` | ミキサー文脈 |

---

## 3. 17 食感軸

| キー | 日本語 | キー | 日本語 |
|------|--------|------|--------|
| lightness | 軽さ | chewiness | もち感 |
| bite | 歯切れ | extensibility | 伸展性 |
| elasticity | 弾力 | aroma | 香り |
| crustColor | 焼色 | bakeTolerance | 焼成耐性 |
| cornicioneForm | コルニチョーネ | airiness | 気泡 |
| centerTexture | 中心食感 | crustTexture | クラスト |
| mouthfeel | 口溶け | digestibility | 消化の軽さ |
| crispness | サク感 | moistness | しっとり |
| reheatTolerance | 焼き戻り | | |

未設定項目は `null` 可 — 段階的に「100点」を育てる。

---

## 4. targetParams と DIE

```
DoughDNA.scores
    → lib/dna/ 導出（Phase 4 新規・DIE Core は触らない）
    → targetParams (hydrationPct, targetDdtC, …)
    → DieInput 初期値
    → lib/die/ 計算
```

| targetParams | DIE への渡し方 |
|--------------|----------------|
| hydrationPct | method.hydrationPercent |
| targetDdtC | ddt / 目標生地温 |
| methodId / prefermentId | method 選択（STG/VPN/APN は **提案** のみ） |
| fermentationType/Hours | 発酵スケジュール |

**製法:** Knowledge Tier 1（official）要約を参照。STG を唯一正解にしない（MANIFESTO §2）。

---

## 5. DNASnapshot

LabSession / ComparisonRun / LearningRun 記録時に **その時点の DNA** を固定。

```typescript
interface DNASnapshot {
  dnaId: string;
  scores: DNAScores;
  targetParams?: DNATargetParams;
  capturedAt: string; // ISO8601
}
```

Run 後の craftsmanScore（1–5）は DNA スコアを **自動更新しない**。将来 `DNALearningRecord` で職人確認後のみ。

---

## 6. Learning との境界

| 経路 | 更新対象 |
|------|----------|
| LearningRun → friction | `profile.learning`（既存） |
| craftsmanScore | 研究記録。DNA 自動連動なし（Phase 4） |
| Lab Journal | 定性。DNA 参照 |
| DNALearningRecord | DNA.scores 更新（`craftsmanConfirmed: true` 必須） |

---

## 7. 永続化（将来）

| 層 | 識別子 |
|----|--------|
| localStorage | `pizzalab-dna-v1` — `Record<shopId, DoughDNA[]>` |
| D1（案） | `pizza_lab_dough_dna` — shop_id FK, scores_json, target_params_json |

Profile の `PresetProfile.dnaId` と双方向リンク。

---

## 8. UI 方針（`/lab/dna`）

- 17 スライダー（0–100）+ 用途タブ（business / competition / research）
- targetParams プレビュー（DIE へ渡る値を表示、編集は Lab 上級者向け）
- description 自由記述
- 「世界の正解ではなく、うちの100点」固定文言

---

## 9. 将来 AI 参照

- `scores` + `description` → Ask が「理想との差」を **提案**（断定禁止）
- `learningHistory` → いつ・なぜ DNA を変えたか
- Knowledge `intelligence/dna` 記事（Phase 4 以降追加）と併読

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 — schema 正本との対応表 |
