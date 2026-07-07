# mixer-master.json 設計

> ミキサー Intelligence のグローバル初期値（Layer 1）。  
> 実 JSON は未作成。本ドキュメントが設計正本。  
> 関連: `.cursor/rules/mixer-intelligence.mdc` / `docs/defaults-fallback.md`

**Version:** 0.1.0

---

## 1. ファイル概要

| 項目 | 内容 |
|------|------|
| パス | `data/mixer-master.json` |
| 役割 | 種別・機種別の摩擦・時間・適性。DIE + Ask 説明 |
| Layer | 1（グローバル）→ 2（店舗）→ 3（Learning）で上書き |
| 更新 | Git 管理。ADR + MASTER 更新必須 |

---

## 2. トップレベル構造

```json
{
  "version": "0.1.0",
  "updatedAt": "ISO8601",
  "types": { },
  "models": [ ],
  "learningTargetFields": [ ]
}
```

---

## 3. types{} — ミキサー種別（必須5種）

| type | 名称 | 用途 |
|------|------|------|
| `hand` | 手ごね | 摩擦最小 |
| `spiral` | スパイラル | ナポリ一般 |
| `fork` | フォーク | 低摩擦・短時間 |
| `double_arm` | ダブルアーム | 高加水・大量 |
| `unknown` | わからない | spiral 同一値 |

### 3.1 各 type が持つフィールド

| フィールド | 型 | DIE | Ask |
|------------|-----|-----|-----|
| `label` | `{ ja, en }` | — | ✅ |
| `characteristics` | `{ ja, en }` | — | ✅ |
| `glutenDevelopment` | `low/medium/high` | — | ✅ |
| `oxidationTendency` | `low/medium/high` | — | ✅ |
| `avgFrictionC` | number | **✅ 摩擦** | ✅ |
| `doughTempRiseTendency` | `low/medium/high` | 補助 | ✅ |
| `lowSpeedMin` | number | **✅** | ✅ |
| `highSpeedMin` | number | **✅** | ✅ |
| `lowRpm` | number | 補助 | ✅ |
| `highRpm` | number | 補助 | ✅ |
| `recommendedHydrationPct` | `{ min, max }` | 警告 | ✅ |
| `bigaSuitability` | 0-100 | Lab | ✅ |
| `poolishSuitability` | 0-100 | Lab | ✅ |
| `straightSuitability` | 0-100 | Lab | ✅ |
| `autolyseCompatibility` | 0-100 | Lab | ✅ |
| `highHydrationCompatibility` | 0-100 | Lab | ✅ |
| `napoliCompatibility` | 0-100 | Lab | ✅ |

---

## 4. 種別初期値（v0.1 提案）

| type | avgFrictionC | lowSpeedMin | highSpeedMin | lowRpm | highRpm |
|------|-------------|-------------|--------------|--------|---------|
| hand | 2 | — | — | — | — |
| spiral | 14 | 3 | 8 | 80 | 160 |
| fork | 10 | 2 | 6 | 60 | 120 |
| double_arm | 16 | 4 | 10 | 70 | 140 |
| unknown | 14 | 3 | 8 | 80 | 160 |

手ごね: 時間ベース摩擦 `frictionPerMinC: 0.3` を別フィールドで保持。

### 適性スコア例（spiral）

| フィールド | 値 |
|------------|-----|
| bigaSuitability | 85 |
| poolishSuitability | 70 |
| straightSuitability | 90 |
| autolyseCompatibility | 75 |
| highHydrationCompatibility | 80 |
| napoliCompatibility | 95 |

---

## 5. models[] — 機種別（初期候補）

| id | maker | model | type | frictionC | confidence |
|----|-------|-------|------|-----------|------------|
| `spiral-fork-40` | Fork | HS40 | spiral | 12 | medium |
| `spiral-spiral-55` | Spiral | SP 55 | spiral | 14 | medium |
| `fork-sancassiano` | Sancassiano | — | fork | 10 | low |
| `doublearm-diosna` | Diosna | SPI | double_arm | 16 | medium |
| `hand-manual` | — | 手ごね | hand | 2 | high |

`confidence`: `high` | `medium` | `low` — 信頼度表示用。

### model 追加フィールド

```json
{
  "id": "string",
  "maker": "string",
  "model": "string",
  "type": "MixerType",
  "frictionC": "number",
  "lowSpeedMin": "number | null",
  "highSpeedMin": "number | null",
  "lowRpm": "number | null",
  "highRpm": "number | null",
  "capacityKg": "number",
  "notes": { "ja": "string" },
  "confidence": "high | medium | low",
  "knowledgeEntryId": "string | null"
}
```

---

## 6. learningTargetFields

```json
[
  "avgFrictionC",
  "lowSpeedMin",
  "highSpeedMin"
]
```

Learning Engine が店舗×ミキサーで補正可能なフィールド一覧。

---

## 7. DIE への渡し方

```
effectiveFrictionC =
  models[id].frictionC ?? types[type].avgFrictionC
  + shop.manualFrictionOffsetC
  + learning.learnedFrictionOffsetC
```

---

## 8. Knowledge 連携

各 type / model に `knowledgeEntryId` を optional で紐づけ。  
`content/knowledge/intelligence/mixer-intelligence/` に解説記事。

---

## 9. 禁止事項

- UI / コンポーネント内への friction マジックナンバー
- 新 master ファイルの独自追加
- AI による friction 値生成

---

## 10. 実装順序

1. `types` 5種 + `unknown`
2. `models` 初期5機種
3. `lib/die/friction.ts` 接続
4. Knowledge 記事3本
