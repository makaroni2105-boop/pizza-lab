# flour-master.json 設計

> Flour Intelligence のグローバル初期値（Layer 1）。  
> 実 JSON は未作成。本ドキュメントが設計正本。  
> 関連: `.cursor/rules/flour-intelligence.mdc` / `docs/schemas/die-input.schema.json`

**Version:** 0.1.0

---

## 1. ファイル概要

| 項目 | 内容 |
|------|------|
| パス | `data/flour-master.json` |
| 役割 | 粉のスペック + Flour Personality。DIE 吸水補正・ブレンド |
| 思想 | **最強の粉ではなく、個性（Personality）** |
| Layer | 1 → 店舗主力粉 → Learning 店舗×粉補正 |

---

## 2. トップレベル構造

```json
{
  "version": "0.1.0",
  "updatedAt": "ISO8601",
  "flours": [ ],
  "personalityAxes": [ ],
  "learningTargetFields": [ ]
}
```

---

## 3. flours[] — 各粉エントリ

### 3.1 基本情報

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | ✅ | スラッグ。例: `caputo-pizzeria` |
| `maker` | string | ✅ | メーカー |
| `brand` | string | | ブランドライン |
| `name` | `{ ja, en, it? }` | ✅ | 粉名 |
| `type` | enum | ✅ | `00` / `0` / `strong` / `whole` / `local` / `blend-base` |
| `country` | string | | 原産国 |
| `recommendedUse` | `{ ja, en }` | | 推奨用途 |

### 3.2 スペック（DIE 用）

| フィールド | 型 | DIE |
|------------|-----|-----|
| `wValue` | number \| null | ブレンド線形補間 |
| `proteinPercent` | number | 表示・補助 |
| `ashPercent` | number \| null | 表示 |
| `recommendedHydrationPct` | `{ min, max }` | 警告 |
| `absorptionFactor` | number | **✅ 有效加水率** |

`absorptionFactor`: 1.0 = 基準。Caputo Pizzeria = 1.0 等。

### 3.3 Flour Personality（0-100）

**優劣ではなく個性。** Ask / Lab / DNA マッピング用。

| キー | 日本語 |
|------|--------|
| `extensibility` | 伸展性 |
| `elasticity` | 弾力 |
| `absorption` | 吸水性 |
| `crustColor` | 焼色 |
| `aroma` | 香り |
| `bite` | 歯切れ |
| `lightness` | 軽さ |
| `chewiness` | もち感 |
| `crispness` | サク感 |
| `cornicioneForm` | コルニチョーネ形成 |
| `bakeTolerance` | 焼成耐性 |
| `highTempSuitability` | 高温適性 |
| `longFermentSuitability` | 長時間発酵適性 |
| `shortFermentSuitability` | 短時間発酵適性 |
| `bigaSuitability` | ビガ適性 |
| `poolishSuitability` | ポーリッシュ適性 |
| `straightSuitability` | ストレート法適性 |
| `autolyseSuitability` | オートリーズ適性 |

```json
"personality": {
  "extensibility": 75,
  "elasticity": 70,
  ...
}
```

### 3.4 その他

| フィールド | 型 | 説明 |
|------------|-----|------|
| `characteristics` | `{ ja, en }` | 特徴テキスト（Ask） |
| `knowledgeEntryId` | string \| null | KDB 記事リンク |
| `confidence` | enum | high / medium / low |

---

## 4. 初期候補粉（v0.1）

| id | maker | name | wValue | protein% | absorptionFactor |
|----|-------|------|--------|----------|------------------|
| `caputo-saccorosso` | Caputo | Saccorosso | 320 | 14.5 | 1.05 |
| `caputo-cuoco` | Caputo | Cuoco | 300 | 13.5 | 0.98 |
| `caputo-nuvola` | Caputo | Nuvola | 260 | 12.5 | 1.10 |
| `caputo-nuvola-super` | Caputo | Nuvola Super | 280 | 13.0 | 1.12 |
| `doppia-esse` | Doppia Esse | — | 290 | 13.0 | 1.02 |
| `5stagioni-napoletana` | Le 5 Stagioni | Napoletana | 310 | 13.5 | 1.03 |
| `petra-00` | Petra | 00 Molino Quaglia | 270 | 12.0 | 1.08 |
| `pizzuti-00` | Molini Pizzuti | 00 | 295 | 13.0 | 1.00 |
| `japan-local` | — | 国産小麦（汎用） | 220 | 11.0 | 0.95 |
| `other` | — | その他 | null | null | 1.00 |

> W値・タンパク質は参照初期値。メーカー公表値で後から更新。  
> `flour-master.json` は上記10件。`absorptionFactor: 1.0` の基準参照例として Caputo Pizzeria（blue）は JSON 未収載。

### Personality 例（5stagioni-napoletana）

| 軸 | 値 | 軸 | 値 |
|----|-----|-----|-----|
| extensibility | 70 | longFerment | 84 |
| elasticity | 80 | highTemp | 87 |
| absorption | 72 | cornicioneForm | 83 |
| aroma | 77 | lightness | 68 |

---

## 5. personalityAxes[]

UI / DNA マッピング用メタデータ。

```json
{
  "key": "extensibility",
  "label": { "ja": "伸展性", "en": "Extensibility" },
  "dnaKeys": ["extensibility"],
  "description": { "ja": "..." }
}
```

---

## 6. learningTargetFields

```json
["absorptionFactor"]
```

店舗×粉で「うちではこうなる」吸水補正。

---

## 7. ブレンド（Lab）

```
flours[].personality × ratioPct → ブレンド Personality（線形補間）
→ DNA ターゲットとの距離最小化 → lib/blend/
→ effectiveAbsorptionFactor → DIE
```

---

## 8. DIE 連携

```
adjustedHydrationPct = baseHydrationPct × flour.effectiveAbsorptionFactor
effectiveFlourTempC = Σ(flourTemp × ratioPct)
```

---

## 9. 禁止事項

- 特定粉を `isBest: true` 等で最高断言
- STG/APN 公式と粉評価の混同フィールド
- AI による Personality スコア自動確定（初期値は人間定義）
- flour-master 外への absorption マジックナンバー

---

## 10. 実装順序

1. `flours` 11件（other 含む）
2. `personalityAxes` 定義
3. `lib/die/` 吸水補正接続
4. Knowledge `intelligence/flour-intelligence/` 3本
