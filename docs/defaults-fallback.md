# 「わからない」補完ルール設計

> 未入力・「わからない」を許容し、店舗プロファイル → グローバル初期値 → Learning 補正の順で補完する。  
> 仕様正本: [PIZZALAB_MASTER.md](../PIZZALAB_MASTER.md)  
> プロファイルスキーマ: [schemas/profile.schema.json](./schemas/profile.schema.json)

---

## 1. 基本方針

| 原則 | 内容 |
|------|------|
| **エラーにしない** | 未入力は推定値で計算を続行する |
| **店舗プロファイル優先** | 初回設定値を最優先で使用 |
| **透明性** | 推定値使用時は信頼度バッジを表示 |
| **学習で改善** | Learning Engine が摩擦のみ店舗補正 |
| **Quick は隠す** | Quick Mode では推定項目を入力フォームに出さない |

---

## 2. フォールバック順序（共通）

すべての項目に適用される4段階フォールバック:

```
Priority 1: ユーザー入力値（Quick / Lab のその場入力）
    ↓ null / "unknown" / 未入力
Priority 2: 店舗プロファイル保存値（ShopProfile）
    ↓ 未設定
Priority 3: グローバル初期値（master JSON / 統計平均）
    ↓
Priority 4: Learning Engine 店舗学習値（摩擦係数のみ）
```

---

## 3. 項目別補完ルール

### 3.1 環境

| 項目 | P2: プロファイル | P3: グローバル初期値 | 備考 |
|------|------------------|----------------------|------|
| 外気温 | — | 天気 API | API 失敗時: 20°C 固定 |
| 外湿度 | — | 天気 API | API 失敗時: 50% 固定 |
| 店舗室温 | 保存値（任意） | 外気温 + 季節補正 | 下表参照 |
| 店内湿度 | 保存値（任意） | 50% 固定 | |

#### 店舗室温の季節補正（P3）

| 条件 | 補完値 |
|------|--------|
| 外気温 ≥ 25°C（夏） | 外気温 + 3°C |
| 外気温 < 10°C（冬） | 外気温 + 5°C |
| それ以外（春秋） | 外気温 + 4°C |

### 3.2 材料

| 項目 | P2: プロファイル | P3: グローバル初期値 | 備考 |
|------|------------------|----------------------|------|
| 粉温 | flour.defaultFlourTemp | 外気温 + 2°C | |
| 粉種類 | flour.primaryFlourId | — | 未設定時はセットアップ必須 |
| W値 / タンパク質 | flour から自動 | flour-master.json | |
| 吸水補正係数 | flour から自動 | flour-master.json | |
| 水温 | — | DIE が逆算 | 入力不要 |
| 目標生地温 (DDT) | ddt.defaultDdt + 季節 | method-presets.json | 下表参照 |
| イースト種類 | method.yeastType | 製法プリセット | |
| イースト量 | method.yeastPercent | 製法プリセット | |

#### 目標生地温の季節補正（P2/P3）

| 条件 | 使用する DDT |
|------|-------------|
| 外気温 ≥ 25°C | ddt.summerDdt ?? ddt.defaultDdt |
| 外気温 < 10°C | ddt.winterDdt ?? ddt.defaultDdt |
| それ以外 | ddt.defaultDdt |

#### 製法別 DDT プリセット（P3）

| 製法 | defaultDdt | summerDdt | winterDdt |
|------|------------|-----------|-----------|
| ナポリ | 24°C | 24°C | 26°C |
| NY | 22°C | 22°C | 24°C |
| ローマ | 23°C | 23°C | 25°C |

### 3.3 ミキサー

| 項目 | P2: プロファイル | P3: グローバル初期値 | 備考 |
|------|------------------|----------------------|------|
| 種別 | mixer.type | `"unknown"` → スパイラル平均 | |
| 機種 | mixer.modelId | 種別平均 | |
| 低速時間 (min) | mixer.lowSpeedMin | 種別プリセット | 下表 |
| 高速時間 (min) | mixer.highSpeedMin | 種別プリセット | 下表 |
| 低速回転数 | mixer.lowRpm | 種別プリセット | 下表 |
| 高速回転数 | mixer.highRpm | 種別プリセット | 下表 |
| 摩擦係数 (°C) | mixer.manualFrictionOffset | mixer-master.json | P4: Learning 加算 |

#### 種別プリセット（P3: mixer-master.json types）

| 種別 | avg_friction | low_speed_min | high_speed_min | low_rpm | high_rpm |
|------|-------------|---------------|----------------|---------|----------|
| hand（手ごね） | 2 | — | — | — | — |
| spiral（スパイラル） | 14 | 3 | 8 | 80 | 160 |
| fork（フォーク） | 10 | 2 | 6 | 60 | 120 |
| double_arm（ダブルアーム） | 16 | 4 | 10 | 70 | 140 |
| unknown（わからない） | 14 | 3 | 8 | 80 | 160 |

→ `unknown` は **spiral と同一値** を使用。  
→ `hand` は時間ベース摩擦 `frictionPerMinC: 0.3` を別途適用（`mixer-master.json`）。

#### 摩擦係数の最終計算

```
base_friction = models[modelId].friction
             ?? types[mixerType].avg_friction

final_friction = base_friction
               + shop.mixer.manualFrictionOffset     (P2, デフォルト 0)
               + learning.learnedFrictionOffset       (P4, Run 5+ のみ)
```

### 3.4 製法・配合

| 項目 | P2: プロファイル | P3: グローバル初期値 |
|------|------------------|----------------------|
| 製法 | method.method | `"napoli"` |
| 加水率 (%) | method.hydrationPercent | 製法プリセット |
| 塩 (%) | method.saltPercent | 製法プリセット |
| 1枚重量 (g) | preset.ballWeightG | 250 |
| 発酵種別 | method.fermentationType | 製法プリセット |
| 発酵時間 (h) | method.fermentationHours | 製法プリセット |
| 粉ブレンド | 主力粉 100% | 主力粉 100% |

#### 製法別配合プリセット（P3: method-presets.json）

| 製法 | hydration | salt | yeastType | yeast% | fermentation | hours |
|------|-----------|------|-----------|--------|--------------|-------|
| ナポリ | 65 | 2.5 | dry | 0.2 | cold | 24 |
| NY | 60 | 2.0 | dry | 0.3 | cold | 48 |
| ローマ | 70 | 2.5 | dry | 0.1 | cold | 48 |

### 3.5 Quick Mode 専用

| 項目 | 補完元 |
|------|--------|
| 用途プロファイル | shop.defaultPresetId |
| 作る枚数 | 前回値 → shop.pizzaCountDaily |
| 店舗室温 | ユーザー入力 → 季節補正推定 |

---

## 4. 信頼度（Confidence）の算出

### 4.1 推定項目のカウント

DIE 計算時、P1（ユーザー入力）以外から値を取得した項目を「推定項目」とカウント。

| 推定項目の例 | カウント |
|-------------|----------|
| 粉温（P3 使用） | +1 |
| 店舗室温（P3 使用） | +1 |
| ミキサー機種（P3 使用） | +1 |
| 回転数（P3 使用） | +1 |
| 低速・高速時間（P3 使用） | +1 |
| 摩擦（Learning 未適用） | +1 |

### 4.2 信頼度レベル

| レベル | 条件 | UI 表示 |
|--------|------|---------|
| **高** | 推定 0〜1 項目 かつ Run ≥ 20 | ●●● 高 |
| **中** | 推定 1〜2 項目 かつ Run ≥ 5 | ●●○ 中 |
| **低** | 推定 3+ 項目 または Run = 0 | ●○○ 低 |

### 4.3 Quick Mode での表示

- **高**: バッジ非表示（推定を意識させない）
- **中**: 「推定値を使用中」小バッジ
- **低**: 「推定値を使用中」+ 「設定を見直すと精度が上がります」リンク

---

## 5. 「わからない」の UI 表現

### 5.1 初回セットアップ

| 場面 | 表現 |
|------|------|
| ミキサー種別 | 選択肢に「わからない」カードを常設 |
| ミキサー機種 | 「スキップ（後で設定）」リンク |
| その他 | 未入力 = 推定値使用を明示しない（シンプルに） |

### 5.2 Quick Mode

- 「わからない」項目は **入力フォームに表示しない**
- 結果画面の折りたたみ内に「推定値一覧」を表示（任意確認）

### 5.3 Lab Mode（v0.2）

- 各項目に **「推定値使用中」** バッジ
- 推定値をタップで上書き入力可能
- 上書き値は店舗プロファイルには保存しない（その Run のみ）

---

## 6. 補完値のソース表示（Lab / 結果詳細）

結果画面の折りたたみ「環境（参考）」に表示:

```
粉温:     34°C  (推定: 外気温+2°C)
室温:     26°C  (推定: 外気温+3°C)
ミキサー:  スパイラル (プロファイル)
摩擦:     14°C  (マスタ値 / 学習中)
```

各値に `(入力)` / `(プロファイル)` / `(推定: 理由)` / `(学習)` のラベルを付与。

---

## 7. 補完ルールの優先順位まとめ（摩擦係数）

```
final_friction =
    mixer-master.json
      .models[modelId].friction          // 機種指定あり
      ?? types[mixerType].avg_friction   // 種別平均
      ?? types.unknown.avg_friction      // 14°C
  + shop.mixer.manualFrictionOffset      // Lab で手動調整
  + learning.learnedFrictionOffset         // Run 5+ の移動平均
```

| Run 数 | learning.learnedFrictionOffset |
|--------|-------------------------------|
| 0〜4 | 0（「学習中」表示） |
| 5〜19 | 直近 20 Run の移動平均 |
| 20+ | 同上（信頼度「高」） |

---

## 8. 禁止事項

| やってはいけないこと | 理由 |
|----------------------|------|
| 未入力でエラー停止 | 営業中に使えなくなる |
| Quick Mode で推定項目の入力フォーム表示 | 30秒ルール違反 |
| 推定値を「正確」と表示 | 職人の信頼を損なう |
| 推定値のソースを隠す | Lab Mode では必ず明示 |
| Learning 未適用で「学習済み」表示 | 誤解を招く |

---

## 9. 関連マスタファイル（今後作成）

| ファイル | 役割 |
|----------|------|
| `data/mixer-master.json` | 種別・機種別摩擦、時間、回転数 |
| `data/flour-master.json` | 粉種別 W値、タンパク質、吸水係数 |
| `data/method-presets.json` | 製法別配合・DDT・発酵プリセット |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版作成 |
