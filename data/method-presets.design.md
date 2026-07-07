# method-presets.json 設計

> Method Intelligence のグローバル初期値（Layer 1）。  
> 実 JSON は未作成。本ドキュメントが設計正本。  
> 関連: `.cursor/rules/method-intelligence.mdc` / `docs/schemas/profile.schema.json`

**Version:** 0.1.0

---

## 1. ファイル概要

| 項目 | 内容 |
|------|------|
| パス | `data/method-presets.json` |
| 役割 | 製法・Official Method・Preferment・Process の preset と DIE 初期値 |
| 思想 | STG/VPN/APN を尊重。STG のみ正解にしない |
| Layer | 1 → 用途プロファイル → Lab 上書き |

---

## 2. トップレベル構造

```json
{
  "version": "0.1.0",
  "updatedAt": "ISO8601",
  "officialMethods": { },
  "regionalMethods": { },
  "preferments": { },
  "processes": { },
  "presets": [ ],
  "learningTargetFields": [ ]
}
```

---

## 3. officialMethods{} — STG / VPN / APN

### 3.1 各公式メソッドフィールド

| フィールド | 型 | 説明 |
|------------|-----|------|
| `id` | `stg` \| `vpn` \| `apn` | |
| `label` | `{ ja, en, it }` | |
| `summary` | `{ ja, en }` | **要約のみ**（規約全文禁止） |
| `sources` | SourceReference[] | 出典必須 |
| `knowledgeEntryIds` | string[] | KDB Tier 1 リンク |
| `referenceParams` | object | 参照パラメータ（DIE 強制値ではない） |
| `isMandatoryDefault` | boolean | **常に false** |

### 3.2 referenceParams 例（vpn）

| パラメータ | 参照値 | 備考 |
|------------|--------|------|
| ballWeightG | 200-280 | 規約範囲要約 |
| targetDdtC | 20-24 | 参照 |
| hydrationPct | 58-65 | 参照 |
| ovenTempC | 485 | 焼成（DIE 外） |

→ **ユーザー・DNA が優先**。reference は Ask 説明用。

---

## 4. regionalMethods{} — 地域製法

| id | 名称 | 位置づけ |
|----|------|----------|
| `napoli` | ナポリ | 一般ナポリスタイル |
| `ny` | NY | ニューヨーク |
| `roma` | ローマ | テッツァ/ビanca 系 |
| `custom` | カスタム | 店舗独自 |

### regional フィールド（DIE 初期値）

| フィールド | 型 |
|------------|-----|
| `hydrationPct` | number |
| `saltPct` | number |
| `yeastType` | dry / fresh / sourdough |
| `yeastPct` | number |
| `oilPct` | number |
| `targetDdtC` | number |
| `ddtSeasonal` | `{ summer, winter }` |
| `fermentationType` | room / cold / mixed |
| `fermentationHours` | number |
| `ballWeightG` | number |

### 初期値

| id | hydration | salt | yeast | yeast% | DDT | ferment | hours | ballG |
|----|-----------|------|-------|--------|-----|---------|-------|-------|
| napoli | 65 | 2.5 | dry | 0.2 | 24 | cold | 24 | 250 |
| ny | 60 | 2.0 | dry | 0.3 | 22 | cold | 48 | 280 |
| roma | 70 | 2.5 | dry | 0.1 | 23 | cold | 48 | 200 |

---

## 5. preferments{} — 前発酵

| id | 名称 | 概要 |
|----|------|------|
| `biga` | Biga | イタリア式硬質前発酵 |
| `poolish` | Poolish | 液状前発酵 |
| `lievito_madre` | Lievito Madre | サワー系 |
| `hybrid` | Hybrid | 複合 |

### preferment フィールド

| フィールド | 型 | 説明 |
|------------|-----|------|
| `ratioPct` | `{ min, max }` | 総粉に対する % |
| `hydrationPct` | number | 前発酵加水 |
| `fermentHours` | `{ min, max }` | 時間 |
| `tempC` | `{ min, max }` | 温度 |
| `yeastAdjustmentPct` | number | 本酵母減量目安 |
| `mixerSuitability` | object | ミキサー type → 0-100 |
| `flourSuitability` | object | flour id → 0-100 |

---

## 6. processes{} — 工程

| id | 名称 |
|----|------|
| `straight` | ストレート |
| `autolyse` | オートリーズ |
| `bench` | ベンチタイム |
| `punch` | パンチ（degas） |

### process フィールド

| フィールド | 型 |
|------------|-----|
| `durationMin` | number \| null |
| `ddtAdjustmentC` | number |
| `order` | number（工程順） |
| `notes` | `{ ja, en }` |

---

## 7. presets[] — 組み合わせプリセット

Quick / 初回セットアップ用の完成 preset。

```json
{
  "id": "preset-napoli-straight-cold",
  "label": { "ja": "ナポリ・ストレート・冷蔵24h" },
  "regionalMethodId": "napoli",
  "prefermentId": null,
  "processIds": ["straight"],
  "officialReferenceId": null,
  "params": { },
  "knowledgeEntryId": null
}
```

### v0.1 初期 preset 候補

| id | regional | preferment | process |
|----|----------|------------|---------|
| preset-napoli-straight-cold | napoli | — | straight |
| preset-napoli-biga-cold | napoli | biga | straight |
| preset-ny-poolish-cold | ny | poolish | straight |
| preset-vpn-reference | napoli | — | straight |
| preset-stg-reference | napoli | biga | autolyse |

`preset-vpn-reference` / `preset-stg-reference` は **参照ラベル付き**。強制ではない。

---

## 8. official と regional の関係

```
respect（尊重）:
  officialMethods[].sources + knowledgeEntryIds → Ask Tier 1

default（DIE 初期値）:
  regionalMethods + presets → lib/defaults/

ユーザー100点:
  Dough DNA + 店舗プロファイル → regional/official を上書き
```

---

## 9. learningTargetFields

```json
[
  "fermentationHours",
  "yeastPct"
]
```

店舗×製法で発酵・酵母の実践補正（将来）。

---

## 10. DIE / DNA 連携

```
Method preset + DNA.targetParams
  → lib/defaults/ マージ
    → DieResolvedInput.method / yeast / fermentation
      → lib/die/
```

---

## 11. Knowledge 連携

| 公式 | KDB パス |
|------|----------|
| STG | `content/knowledge/official/stg/` |
| VPN | `content/knowledge/official/vpn/` |
| APN | `content/knowledge/official/apn/` |

各 preset に `knowledgeEntryId` を optional 紐づけ。

---

## 12. 禁止事項

- `isMandatoryDefault: true` の preset
- 規約全文の JSON 埋め込み
- STG を `defaultMethodId` 唯一値に固定
- AI による preset パラメータ生成

---

## 13. 実装順序

1. `regionalMethods` 4種
2. `officialMethods` 3種（referenceParams + sources）
3. `preferments` 4種 + `processes` 4種
4. `presets` 5件
5. profile 初回セットアップ連携
