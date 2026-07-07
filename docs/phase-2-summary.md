# Phase 2 完了サマリー

> **完了日:** 2026-07-06  
> **スコープ:** Learning Engine / Run 記録 / Run History / Weather API / Knowledge Base  
> **未スコープ:** DB 同期 / AI / RAG / Cloudflare D1 永続化

---

## 1. フェーズ内訳

| フェーズ | 内容 | 主要パス |
|---------|------|----------|
| **2a** | Learning Engine 純粋関数 | `lib/learning/learning-*.ts` |
| **2b** | Run localStorage + Quick 記録 UI | `learning-storage.ts`, `quick-run-record.tsx` |
| **2c** | Run History 画面 | `app/die/history/` |
| **2d** | 天気 API | `lib/weather/`, `app/api/weather/` |
| **2e** | Knowledge Base + 検索 UI | `content/knowledge/`, `lib/knowledge/`, `app/knowledge/` |

---

## 2. 実装ルート一覧

| パス / API | 用途 |
|------------|------|
| `/quick` | Quick Mode + Run 記録 + 外気取得 |
| `/profile` | 店舗プロファイル CRUD |
| `/die/history` | Run History — 研究記録一覧 |
| `/knowledge` | Knowledge キーワード検索 |
| `POST /api/die/quick` | DIE 計算 |
| `GET /api/weather` | 外気温・湿度取得 |

---

## 3. lib/learning/ モジュール

| パス | 責務 |
|------|------|
| `learning-types.ts` | LearningRun / 補正結果型、閾値定数（Run 5 / 20） |
| `learning-score.ts` | 職人評価 1〜5、100点換算、平均・中央値 |
| `learning-run.ts` | 摩擦/DDT 誤差、`buildLearningRunFromQuickRecord()` |
| `learning-summary.ts` | 摩擦・DDT・推奨補正集計 → `LearningSummary` |
| `learning-storage.ts` | localStorage CRUD、profile.learning 反映 |
| `index.ts` | 公開 API |

**学習ロジック（設計正本と一致）:**

```
実測摩擦 = 実測生地温 × 4 − 粉温 − 水温 − 室温
摩擦誤差 = 実測摩擦 − 予測摩擦
learnedFrictionOffset = 直近 20 Run の摩擦誤差の平均（Run ≥ 5 で適用）
```

- 推論・AI 不使用。平均・中央値・件数のみ。

---

## 4. localStorage

| キー | 構造 | 用途 |
|------|------|------|
| `pizzalab-learning-runs-v1` | `{ runs: LearningRun[] }` | 研究記録（Run） |
| `pizzalab-profiles-v1` | `{ profiles, selectedShopId }` | 店舗プロファイル（Phase 1b） |

**LearningRun 主要フィールド:** shopId, mixerKey, snapshot, predictedFrictionC, predictedDoughTempC, actualDoughTempC, targetDdtC, craftsmanScore (1〜5), memo

---

## 5. Quick UI からの記録（Phase 2b）

**場所:** `/quick` — DIE 結果表示後「今日の一枚を記録する」

**入力:**

| 項目 | 内容 |
|------|------|
| 実測生地温 | 職人が計測した値 (°C) |
| 100点に近さ | 1〜5（5 = その店の100点に近い） |
| メモ | 任意 |

**保存フロー:**

1. `buildLearningRunFromQuickRecord()` — DIE 出力 + 入力 → LearningRun
2. `recordLearningRun()` — localStorage 保存
3. `buildLearningSummariesByMixer()` → `profile.learning` 更新
4. 保存済み店舗: `saveProfile()` / サンプル: 次回 API で `body.profile` に learning 付与

---

## 6. profile.learning への反映

```
LearningRun[]（shopId 単位）
  → buildLearningSummariesByMixer()
  → toProfileLearningSummary()   // types/profile LearningSummary
  → mergeLearningSummaries()
  → ShopProfile.learning[]
```

**DIE への適用:** Quick Mode が `applyStoredLearningToProfile()` 済み profile を API に送信 → `lib/defaults/resolve-mixer.ts` が `runCount >= 5` で `learnedFrictionOffset` を適用。

---

## 7. Run History（Phase 2c）

**URL:** `/die/history`

**機能:**

- `listLearningRuns()` から全 Run を店舗別に表示
- 予測 vs 実測（摩擦・DDT 誤差は純粋関数で算出）
- Run 削除 + `persistProfileLearningFromRuns()` で learning 再計算
- 学習状態バッジ:
  - 1〜4 件: 学習中
  - 5〜19 件: 補正適用中
  - 20 件以上: 信頼度高

**文言:** 「採点」ではなく「研究記録」

**ナビ:** `/quick` `/profile` からリンク

---

## 8. Weather API（Phase 2d）

**モジュール:** `lib/weather/`

| パス | 責務 |
|------|------|
| `weather-types.ts` | WeatherSnapshot / API レスポンス型 |
| `weather-client.ts` | Open-Meteo fetch |
| `weather-cache.ts` | 30 分インメモリキャッシュ |
| `weather-handler.ts` | 座標検証・キャッシュ付き取得 |

**API:** `GET /api/weather?latitude=&longitude=`

- デフォルト座標: 東京（35.6762, 139.6503）
- 失敗時: HTTP 500 ではなく安全な JSON（手入力フォールバック維持）
- Quick UI: 緯度・経度 +「外気を取得」→ `body.weather` を `/api/die/quick` に付与
- **手入力 `shopRoomTempC` は weather で上書きしない**（`resolve-environment` 優先順位: 手入力 > weather > デフォルト）

**データフロー:**

```
GET /api/weather
  → Open-Meteo（current temperature_2m, relative_humidity_2m）
  → Quick UI
  → POST /api/die/quick { ..., weather: { outdoorTempC, outdoorHumidityPct, ... } }
  → lib/defaults/resolve-environment()
```

---

## 9. Knowledge Base（Phase 2e）

**記事:** `content/knowledge/` — **12 本**

| Tier | 件数 | 例 |
|------|------|-----|
| `official/` | 3 | VPN, STG, APN 要約 |
| `science/` | 9 | グルテン, 発酵, 酵母, 粉, 摩擦, 温度, 加水, 焼成, 地域スタイル |

**モジュール:** `lib/knowledge/`

| パス | 責務 |
|------|------|
| `knowledge-types.ts` | KnowledgeEntry / 検索結果型 |
| `knowledge-loader.ts` | fs + frontmatter 読込 |
| `knowledge-search.ts` | キーワードマッチ（純粋関数、AI 不使用） |

**UI:** `/knowledge` — キーワード検索、抜粋表示（全文は Markdown ソース参照）

**設計正本:** `docs/knowledge-database.md`, `docs/schemas/knowledge-entry.schema.json`

---

## 10. 品質状態（2026-07-06 時点）

| コマンド | 結果 |
|---------|------|
| `npm test` | **136 tests passed**（22 files） |
| `npm run build` | 成功（`/knowledge`, `/api/weather` 含む） |
| `npm run lint` | No ESLint warnings or errors |

**テスト内訳（Phase 2 追加分）:**

| モジュール | tests |
|-----------|-------|
| learning（score / run / summary / storage） | 18 |
| weather | 11 |
| knowledge | 7 |

---

## 11. Phase 2 未実装（Phase 3 以降）

| 項目 | 予定 |
|------|------|
| DB 同期 | Phase 3 — profile / Run → PostgreSQL |
| Cloudflare D1 永続化 | Phase 3 以降 |
| AI | Phase 3 — Ask LLM 土台 |
| RAG | Phase 5 — Vector DB / Embedding |
| glossary 20語 | Phase 3 以降 |

---

## 12. 設計正本との整合

| 正本 | 整合 | 備考 |
|------|------|------|
| `PIZZALAB_MASTER.md` §5 Learning | ✅ | 摩擦公式・Run 5/20 閾値 |
| `PIZZALAB_MASTER.md` §10 Knowledge | ✅ | Tier 構造・12 本記事 |
| `docs/defaults-fallback.md` §7 | ✅ | learnedFrictionOffset 適用条件 |
| `docs/defaults-fallback.md` 環境 | ✅ | 手入力 > weather > デフォルト |
| `docs/knowledge-database.md` | ✅ | キーワード検索（AI 不使用） |
| `types/profile.ts` LearningSummary | ✅ | `toProfileLearningSummary()` |
| `lib/die/*` | ✅ | 変更なし |
| `lib/defaults/*` | ✅ | 変更なし（既存 learning / environment 読取のみ） |
| `docs/quick-mode-flow.md` 実測記録 | △ | 1タップ記録は Phase 2b で実装（焼成後フォーム） |

---

## 13. 次のステップ（Phase 3）

1. **DB 移行** — Shop / MixerProfile / DoughRun → PostgreSQL（Cloudflare D1 検討）
2. **Baker's % Calculator** — `/calculator`
3. **Ask AI 土台** — `/ask` キーワード検索 + LLM オプション（`AI_ENABLED`）

詳細は [ROADMAP.md](../ROADMAP.md) Phase 3 を参照。

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版（Phase 2a〜2c 完了記録） |
| 2026-07-06 | Phase 2 完了追記（Weather API + Knowledge Base、136 tests） |
