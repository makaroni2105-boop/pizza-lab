# FlourBlend — 粉ブレンド（個性の配合）

> **データ源:** `data/flour-master.json` — personality 軸・W 値・吸水  
> **MASTER:** PIZZALAB_MASTER.md §7

---

## 1. 定義

複数粉を **比率で混ぜた配合**。目標は W 値・タンパク質・吸水の **線形補間** と、Flour Intelligence の **personality ベクトル**。

| 原則 | 内容 |
|------|------|
| 粉に優劣なし | personality は個性軸。ランキング UI 禁止 |
| Lab 専用 | Quick Mode 非表示 |
| DIE 連携 | ブレンド → 吸水補正 → hydration / DDT 入力（アプリ層） |

---

## 2. 型（FlourBlend）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | UUID |
| `shopId` | string | ✅ | 店舗スコープ |
| `name` | string | ✅ | 例: 「Caputo + 国産 30%」 |
| `components` | FlourBlendComponent[] | ✅ | 2–5 粉。合計 100% |
| `targetPersonality` | PersonalityVector | | 目標 personality（DNA から逆算可） |
| `predictedSpecs` | FlourSpecs | | 補間後 W / protein / absorption |
| `methodContext` | string | | napoli / ny / roma / vpn / apn / stg |
| `dnaId` | string | | 紐づく DoughDNA |
| `notes` | string | | 職人メモ |
| `createdAt` | ISO8601 | ✅ | |
| `updatedAt` | ISO8601 | ✅ | |

### FlourBlendComponent

| フィールド | 説明 |
|-----------|------|
| `flourId` | `flour-master.json` の id |
| `percent` | 0–100。合計 100 |
| `label` | 表示名（master からコピー可） |

### FlourBlendSnapshot

LabSession 用。`FlourBlend` + `capturedAt`。

---

## 3. 計算ロジック（Phase 4 実装方針）

**v0.2 線形補間のみ** — DIE / AI 変更なし。

```
predictedW = Σ (component.percent / 100 × flour.wValue)
predictedProtein = Σ (… × flour.proteinPercent)
predictedAbsorption = Σ (… × flour.absorptionFactor)

hydrationAdjust = f(predictedAbsorption, methodContext)
→ LabSession.dieInput に反映
```

| 入力 | 出力 |
|------|------|
| 目標 W / protein / absorption | 推奨 component 比率（探索・グリッド簡易） |
| 手動比率 | predictedSpecs + personality 合成 |

**personality 合成:** master の `personalityAxes` 各軸を加重平均。軸名は master 正本に従う。

---

## 4. 製法コンテキスト（STG / VPN / APN）

| methodContext | 扱い |
|---------------|------|
| `stg` | Knowledge Tier 1 要約参照。推奨吸水 **範囲** のみ |
| `vpn` / `apn` | 同左。大会・認定文脈 |
| `napoli` / `ny` / `roma` | Method Intelligence preset |

**唯一解にしない:** 同一 W でも複数ブレンド候補を提示。職人が選択。

---

## 5. DoughDNA との関係

```
DoughDNA.scores (extensibility, chewiness, …)
    → targetPersonality ヒント（将来 lib/dna/ → blend 提案）
    → FlourBlend.components 手動調整
    → predictedSpecs → DIE hydration
```

DNA の `linkedFlourIds` はブレンド候補のショートリスト。

---

## 6. 永続化（将来）

| 層 | 識別子 |
|----|--------|
| localStorage | `pizzalab-flour-blends-v1` |
| D1（案） | `pizza_lab_flour_blends` — components_json |

---

## 7. UI 方針（`/lab/blend`）

- 粉選択（flour-master リスト）+ 比率スライダー（合計 100% 拘束）
- 予測 W / protein / absorption リアルタイム表示
- personality レーダー（個性表示。スコア順ランキング禁止）
- 「提案」ボタン → 線形補間候補 2–3 件（職人が確定）
- Calculator へのリンク（Baker's % は独立）

---

## 8. 将来 AI 参照

- `components` + `notes` + `methodContext`
- Knowledge flour / official 記事
- **禁止:** AI が粉の優劣を述べるプロンプト設計

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | 初版 |
