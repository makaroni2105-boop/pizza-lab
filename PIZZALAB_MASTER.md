# Pizza-Lab Master Specification

> **正本マスター** — Pizza-Lab の全体仕様を定義するドキュメント。  
> 設計判断の参照元。実装前に本書と MANIFESTO.md を確認すること。

**Version:** 1.5  
**Last Updated:** 2026-07-07

---

## 1. プロダクト概要

| 項目 | 内容 |
|------|------|
| 名称 | Pizza-Lab |
| 目的 | 世界中のピッツァ職人を支援する AI プラットフォーム |
| プラットフォーム | Web（スマホファースト） |
| 核機能 | Dough Intelligence Engine（DIE） |
| 設計原則 | 1エンジン・2UI・プロファイル先行・学習は店舗資産 |

### 1.1 Intelligence 体系

Pizza-Lab は6つの Intelligence が DIE を支える。数値計算は **DIE のみ**、各 Intelligence は知識・初期値・説明を提供する。

| Intelligence | データ源 | 役割 |
|--------------|----------|------|
| **Dough Intelligence** | `lib/die/` | 配合・水温・氷・摩擦・発酵の唯一の計算エンジン |
| **Mixer Intelligence** | `data/mixer-master.json` | ミキサー特性・摩擦初期値 |
| **Method Intelligence** | `data/method-presets.json` | STG/VPN/APN・Preferment・Process |
| **Flour Intelligence** | `data/flour-master.json` | 粉 Personality・吸水・ブレンド |
| **Dough DNA** | `docs/schemas/dna.schema.json` | その店の100点（食感スコア） |
| **Learning Engine** | 店舗 DB | 実測値による摩擦・吸水補正（店舗資産） |

Cursor Rules: `.cursor/rules/dough-intelligence.mdc` 他5件。

---

## 2. 2モード構成

### 2.1 Quick Mode（営業モード）

**目的:** 厨房で30秒以内に今日のレシピを出す。

| 項目 | 仕様 |
|------|------|
| 前提 | 初回に店舗プロファイル登録済み |
| 必須入力 | 用途プロファイル選択、作る枚数（または総生地量） |
| 任意入力 | 店舗室温、メモ |
| 非表示 | ミキサー詳細、粉ブレンド、Dough DNA |
| 出力 | 配合、推奨水温、氷量、発酵スケジュール、信頼度 |
| 実測記録 | 任意（1タップ） |

### 2.2 Lab Mode（ラボモード）

**目的:** 生地の研究・実験・最適化。

| 項目 | 仕様 |
|------|------|
| 入力 | DIE 全項目、粉ブレンド、Dough DNA、実験メモ |
| 出力 | Quick 出力 + 摩擦詳細、DNA 分析、粉ブレンド提案 |
| 実測記録 | 必須推奨（Learning 精度向上） |
| 専用機能 | Dough DNA 編集、粉ブレンド提案 |

---

## 3. プロファイル体系

### 3.1 店舗プロファイル（Shop Profile）

1店舗1つ。初回セットアップ（約5分）で登録。

| 項目 | 説明 |
|------|------|
| 店舗名 | |
| 所在地 | 外気温・湿度の自動取得用 |
| デフォルト用途プロファイル | 営業 / 大会 / 研究 |
| 主力製法 | ナポリ / NY / ローマ 等 |
| 主力粉 | flour-master から選択 |
| 主力ミキサー | 種別 + 機種（不明可） |
| 用途別プリセット | 営業用 / 大会用 / 研究用 |
| Learning データ | ミキサー別摩擦補正、Run 履歴 |

### 3.2 用途別プロファイル（Preset Profile）

営業・大会・研究で同一構造、値のみ異なる。

| 項目 | 例（営業） | 例（大会） |
|------|------------|------------|
| 製法 | ナポリ | ナポリ（厳格） |
| 目標生地温 (DDT) | 24°C | 23°C |
| 加水率 | 65% | 63% |
| 塩 | 2.5% | 2.8% |
| イースト | 乾酵母 0.2% | 生酵母 2% |
| 1枚重量 | 250g | 230g |
| 発酵方針 | 24h 冷蔵 | 48h 冷蔵 |

### 3.3 基本設定（初回登録時）

| カテゴリ | 保存する初期値 |
|----------|----------------|
| 粉 | 主力粉種、粉温デフォルト、W値/タンパク質、吸水補正係数 |
| ミキサー | 種別、機種、低速/高速時間、回転数、摩擦係数 |
| 製法 | 製法名、加水率、塩、イースト、発酵方針 |
| 目標生地温 | 製法×季節×用途のマトリクス |

---

## 4. Dough Intelligence Engine（DIE）

### 4.1 概要

目標生地温（DDT）を基準に、すべての条件を逆算して最適な仕込み条件を提案する。

### 4.2 入力項目

#### 環境

| 項目 | 取得方法 |
|------|----------|
| 外気温 | 天気 API（自動） |
| 外湿度 | 天気 API（自動） |
| 店舗室温 | 手入力（Quick: 任意） |
| 店内湿度 | 手入力（Lab: 推奨） |

#### 材料

| 項目 | 備考 |
|------|------|
| 粉温 | 手入力 or 推定 |
| 水温 | DIE が推奨値を算出 |
| 目標生地温 (DDT) | プロファイル or 手入力 |
| 粉種類 | プロファイル or 選択 |
| イースト種類 | プロファイル or 選択 |

#### ミキサー（Lab Mode 中心）

| 項目 | 備考 |
|------|------|
| 使用ミキサー | 手ごね / スパイラル / フォーク / ダブルアーム / わからない |
| ミキサー機種 | マスタから選択（不明可） |
| 回転数 | 低速・高速 |
| 低速時間 / 高速時間 | 分 |

#### 製法

| 項目 | 備考 |
|------|------|
| 製法 | ナポリ / NY / ローマ 等 |

### 4.3 出力項目

| 出力 | 算出方法 |
|------|----------|
| 推奨水温 | DDT 逆算（4要素モデル） |
| 氷使用の有無 | 推奨水温 < 4°C → 氷推奨 |
| 氷の必要量 (g) | 比熱・潜熱から算出 |
| 予想生地温 | 正算 |
| ミキサーによる摩擦温度上昇 | 基本摩擦 × 係数 × 学習補正 |
| 目標生地温との差 | 予想 − 目標 |
| イースト補正 | 温度差 → ルール表 |
| 発酵スケジュール補正 | 室温・生地温・イースト → ルール表 |
| 信頼度 | 未設定項目数 × Learning Run 数 |

### 4.4 基本計算式

```
目標DDT = (粉温 + 有効水温 + 室温 + 摩擦) / 4

推奨水温 = 目標DDT × 4 − 粉温 − 室温 − 摩擦予測

氷使用時: 有効水温 = 水温 − (氷量 × 氷溶解潜熱 / 水重量)
```

### 4.5 実装構成（Phase 1a 完了）

> 詳細: [docs/phase-1-die-core-summary.md](./docs/phase-1-die-core-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| 型定義 | `types/profile.ts` | 店舗プロファイル・入力 DTO |
| 型定義 | `types/die.ts` | DieRequest / DieOutput / DieResolvedInput |
| 補完 | `lib/defaults/` | master JSON + unknown/null → fieldResolution |
| 計算 | `lib/die/friction.ts` | effectiveFrictionC 加算 |
| 計算 | `lib/die/recommend.ts` | 推奨水温逆算 |
| 計算 | `lib/die/ice.ts` | 氷量推奨（水温 < 4°C） |
| 計算 | `lib/die/recipe.ts` | Baker's % → g |
| 計算 | `lib/die/yeast-adjust.ts` | 酵母量補正 |
| 計算 | `lib/die/fermentation-adjust.ts` | 発酵スケジュール補正 |
| オーケストレーター | `lib/die/compute.ts` | `computeDie()` → DieOutput |
| 公開 API | `lib/die/index.ts` | DIE モジュール re-export |

**データフロー:**

```
DieRequest + ShopProfile
  → lib/defaults/resolveDefaults()
  → lib/die/computeDie()
    → DieOutput（recipe / temperature / yeastAdjustment / fermentationSchedule / confidence）
```

**Phase 1a スコープ外（Phase 1b で実装）:** UI / API Routes — 以下 §4.6 参照

### 4.6 実装構成（Phase 1b 完了）

> 詳細: [docs/phase-1b-summary.md](./docs/phase-1b-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| API | `app/api/die/quick/route.ts` | `POST` のみ、`handleDieQuickRequest` を呼ぶ |
| API ハンドラー | `lib/api/die-quick-handler.ts` | リクエスト検証 → `computeDie()` → JSON レスポンス |
| デモ profile | `lib/profile/demo-profiles.ts` | `shop-1` fallback（DB 未実装時） |
| 永続化 | `lib/profile/profile-storage.ts` | localStorage CRUD（キー: `pizzalab-profiles-v1`） |
| UI | `app/quick/` | Quick Mode — 最小入力・結果表示 |
| UI | `app/profile/` | 店舗プロファイル CRUD |

**Quick Mode API 契約:**

```
POST /api/die/quick
Body: QuickModeRequest + optional profile, useTime, weather
Success: { success: true, output: DieOutput, incompleteBlocks }
Error: 400/404 または 200 + { success: false, error: { code, message } }
```

- 保存済み店舗: `body.profile` に `ShopProfile` を付与（`shopId` と `profile.id` は一致必須）
- 未保存 / サンプル: `shopId: "shop-1"` のみ送信 → サーバー側 demo fallback

**Phase 1b 未実装（Phase 2 以降）:** DB / AI / Lab Mode UI / 5分セットアップウィザード

### 4.7 実装構成（Phase 2a〜2c 完了）

> 詳細: [docs/phase-2-summary.md](./docs/phase-2-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| 型・定数 | `lib/learning/learning-types.ts` | LearningRun / 補正結果 / 閾値定数 |
| 評価 | `lib/learning/learning-score.ts` | 職人評価 1〜5、100点換算、集計 |
| Run | `lib/learning/learning-run.ts` | 摩擦/DDT 誤差、Quick 結果 → Run 変換 |
| 集計 | `lib/learning/learning-summary.ts` | 摩擦・DDT・推奨補正 → LearningSummary |
| 永続化 | `lib/learning/learning-storage.ts` | localStorage（キー: `pizzalab-learning-runs-v1`） |
| UI | `app/quick/quick-run-record.tsx` | 今日の一枚を記録（実測・1〜5・メモ） |
| UI | `app/die/history/` | Run History — 研究記録一覧・削除・学習状態 |

**データフロー（Learning）:**

```
Quick DIE 結果 + 実測入力
  → buildLearningRunFromQuickRecord()
  → learning-storage（localStorage）
  → buildLearningSummariesByMixer()
  → profile.learning（LearningSummary[]）
  → POST /api/die/quick body.profile
  → lib/defaults/resolve-mixer（Run 5+ で learnedFrictionOffset 適用）
```

**localStorage キー:**

| キー | 内容 |
|------|------|
| `pizzalab-profiles-v1` | ShopProfile[] + selectedShopId |
| `pizzalab-learning-runs-v1` | LearningRun[] |
| `pizzalab-lab-sessions-v1` | LabSession[] |
| `pizzalab-dna-v1` | DoughDNA[] |
| `pizzalab-flour-blends-v1` | FlourBlend[] |
| `pizzalab-journal-v1` | DoughJournal[] |
| `pizzalab-comparisons-v1` | ComparisonRun[] |

**Phase 5 完了（mock RAG）:** Ask mock LLM opt-in / ResearchContext — §4.15  
**Phase 6 未実装:** remote D1 / 本番 deploy / UI D1 切替 / 外部 LLM / 独自ドメイン

### 4.8 実装構成（Phase 2d〜2e 完了 — 天気 + Knowledge）

> 詳細: [docs/phase-2-summary.md](./docs/phase-2-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| 天気型 | `lib/weather/weather-types.ts` | WeatherSnapshot / API レスポンス型 |
| 天気取得 | `lib/weather/weather-client.ts` | Open-Meteo fetch |
| 天気キャッシュ | `lib/weather/weather-cache.ts` | 30 分インメモリキャッシュ |
| 天気 API | `app/api/weather/route.ts` | `GET ?latitude=&longitude=` |
| Knowledge 型 | `lib/knowledge/knowledge-types.ts` | KnowledgeEntry / 検索結果 |
| Knowledge 読込 | `lib/knowledge/knowledge-loader.ts` | Markdown + frontmatter |
| Knowledge 検索 | `lib/knowledge/knowledge-search.ts` | キーワードマッチ（AI 不使用） |
| UI | `app/knowledge/` | 記事一覧・キーワード検索（抜粋表示） |
| 記事 | `content/knowledge/` | 12 本（official 3 + science 9） |

**データフロー（Weather → DIE）:**

```
GET /api/weather?latitude=&longitude=
  → weather-client（Open-Meteo）
  → Quick UI「外気を取得」
  → POST /api/die/quick body.weather
  → lib/defaults/resolve-environment（手入力 shopRoomTempC > weather > デフォルト）
```

**データフロー（Knowledge）:**

```
content/knowledge/**/*.md
  → knowledge-loader（fs + frontmatter）
  → /knowledge UI — searchKnowledgeEntries()（クライアント側キーワード）
```

**Phase 2 完了ルート:**

| パス / API | 状態 |
|------------|------|
| `/quick` | ✅ Quick Mode + Run 記録 + 外気取得 |
| `/profile` | ✅ 店舗プロファイル CRUD |
| `/die/history` | ✅ Run History |
| `/knowledge` | ✅ Knowledge 検索 |
| `POST /api/die/quick` | ✅ DIE 計算 |
| `GET /api/weather` | ✅ 外気温・湿度（D1 optional cache） |
| `GET/POST/DELETE /api/profile` | ✅ Profile API（D1 optional + memory fallback） |
| `GET/POST/DELETE /api/learning-runs` | ✅ Learning Run API |
| `GET/POST/PATCH /api/sync-queue` | ✅ Sync Queue API（Outbox 土台） |
| `POST /api/sync-worker` | ✅ sync Worker（D1 必須） |
| `POST /api/ask` | ✅ Ask 土台（Knowledge 検索、`aiUsed: false`） |
| `/calculator` | ✅ Baker's % Calculator |
| `/ask` | ✅ Ask UI（研究パートナー入口） |

### 4.9 データモデル設計（Phase 3 設計完了）

> 詳細: [docs/database/README.md](./docs/database/README.md)

**第一永続化層:** Cloudflare D1（SQLite）。将来 PostgreSQL へ移植可能な DDL。

| テーブル | SQL | 対応 TypeScript / ストレージ |
|----------|-----|------------------------------|
| `shops` | [shop.sql](./docs/database/shop.sql) | `ShopProfile.id`, `name`, `location` |
| `shop_profiles` | [profile.sql](./docs/database/profile.sql) | `ShopProfile` 設定 JSON 列 |
| `learning_runs` | [learning_run.sql](./docs/database/learning_run.sql) | `LearningRun`, `pizzalab-learning-runs-v1` |
| `knowledge_entries` | [knowledge.sql](./docs/database/knowledge.sql) | `KnowledgeEntry`, `content/knowledge/` |
| `weather_cache` | [weather_cache.sql](./docs/database/weather_cache.sql) | `WeatherCurrent`（インメモリ → D1） |
| `sync_queue` | [sync_queue.sql](./docs/database/sync_queue.sql) | localStorage → D1 Outbox（新規） |

**設計原則:**

- `learning_json` はキャッシュ — 真のソースは `learning_runs`（`learning-summary.ts` 再計算）
- `knowledge_entries.shop_id` — Tier 1〜4 は NULL、Tier 5 craftsman のみ必須
- ビジネスロジックはアプリ層（DIE / Learning 変更なし）
- `selectedShopId` は Phase 3b UI 切替までクライアント local

**Migration 実体:** `migrations/0001_initial.sql`（テーブル名 `pizza_lab_*`）。local D1 適用済み。remote / 本番は未実行。

### 4.10 Cloudflare D1 + Repository + API 土台（Phase 3a ✅ 完了 — 2026-07-07）

> 詳細: [docs/phase-3a-summary.md](./docs/phase-3a-summary.md)

| 項目 | 状態 |
|------|------|
| `wrangler.toml` | ✅ `pizza_lab_db`, binding `DB` |
| `migrations/0001_initial.sql` | ✅ 6 テーブル |
| local D1 migration | ✅ `--local` 適用済み |
| `lib/db/` Repository | ✅ 5 Repository + mock + memory fallback |
| optional D1 + memory fallback | ✅ API 層のみ（UI は localStorage 継続） |
| dual write | ❌ 意図的に未実装 |
| sync_queue Worker | ✅ Phase 3b — `lib/sync/` |
| remote D1 / 本番運用 | ⬜ デプロイ時 |

**NALIPO 分離:** `pizza_lab_db` / `pizza_lab_*` テーブルのみ。予約システム DB とは混在しない。

**Repository 層（`lib/db/`）:**

| モジュール | 責務 |
|-----------|------|
| `d1-types.ts` / `d1-client.ts` | D1 型・クエリヘルパ |
| `get-request-db.ts` | optional `env.DB` |
| `shop-repository.ts` | shops |
| `profile-repository.ts` | profiles + ShopProfile 合成 |
| `learning-run-repository.ts` | LearningRun CRUD |
| `weather-cache-repository.ts` | TTL キャッシュ |
| `sync-queue-repository.ts` | Outbox enqueue / list / status |
| `*-memory-store.ts` | Node dev fallback |

**API 方針:** `getOptionalRequestDb()` → D1 ありなら Repository、なしまたは D1 エラー時はサーバーインメモリ。UI / localStorage パスは並行維持（切替なし）。

**未実装（Phase 6 以降）:** UI D1 切替 / dual write / Knowledge D1 API / 外部 LLM / remote migration / Lab↔DIE 深連携

**品質:** 210 tests passed（2026-07-07）

### 4.11 Phase 3b: sync Worker + Calculator + Ask（✅ 完了 — 2026-07-07）

> 詳細: [docs/phase-3b-summary.md](./docs/phase-3b-summary.md)

| 項目 | 状態 |
|------|------|
| sync Worker | ✅ `lib/sync/sync-worker.ts` + `POST /api/sync-worker` |
| Calculator | ✅ `lib/calculator/` + `/calculator` |
| Ask API + UI | ✅ `lib/ask/` + `POST /api/ask` + `/ask` |
| LLM / RAG | ✅ Phase 5 mock（`useLlm` opt-in）/ 外部 LLM ⬜ |
| UI / localStorage | 変更なし |
| DB（Calculator / Ask） | 不使用 |

**sync Worker:** `shop_profile` / `learning_run` の upsert・delete を D1 に反映。`pending` → `processing` → `done` \| `failed`。

**Calculator:** DIE 非連動。Baker's % + ビガ / ポーリッシュ按分。Quick Mode とは別 UI。

**Ask:** `extractAskKeywords` → `searchKnowledgeEntries`。ガイド文は固定テンプレート + Knowledge 抜粋。`aiUsed: false` 固定。

### 4.12 Lab Mode 設計（Phase 4 設計 ✅ — 2026-07-07）

> 詳細: [docs/lab-mode/README.md](./docs/lab-mode/README.md)

| エンティティ | 説明 | 設計 doc |
|-------------|------|----------|
| LabSession | 研究セッション容器 | [lab-session.md](./docs/lab-mode/lab-session.md) |
| DoughDNA | その店の100点（17 食感） | [dough-dna.md](./docs/lab-mode/dough-dna.md) + [dna.schema.json](./docs/schemas/dna.schema.json) |
| FlourBlend | 粉個性ブレンド | [flour-blend.md](./docs/lab-mode/flour-blend.md) |
| DoughJournal | 定性研究記録 | [journal.md](./docs/lab-mode/journal.md) |
| ComparisonRun | 条件比較・検証 | [comparison.md](./docs/lab-mode/comparison.md) |

**Quick との差:** Lab は DIE 全項目 + DNA/Blend 明示 + Session/Journal/Compare。同一 DIE Core。

**Learning 境界:** LearningRun 摩擦学習は既存のまま。Journal / Comparison は摩擦 offset に混ぜない。DNA 自動更新禁止（`craftsmanConfirmed`）。

**将来 AI:** Session.summary / Journal.body / Comparison.conclusion を Ask コンテキスト（Phase 5）。AI は配合・DNA を自動確定しない。

**Phase 4 画面（実装）:** `/lab`, `/lab/dna`, `/lab/blend`, `/lab/journal`, `/lab/comparison`

**Phase 4 最小 UI 完了（2026-07-07）:** `types/lab.ts`, `lib/lab/*-storage.ts`, localStorage 5 キー。DIE 呼び出し・D1・API・AI は未実装。

詳細: [docs/phase-4-summary.md](./docs/phase-4-summary.md)

### 4.13 Lab Mode 最小実装（Phase 4a〜4e ✅ — 2026-07-07）

> 詳細: [docs/phase-4-summary.md](./docs/phase-4-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| 型 | `types/lab.ts` | LabSession / DoughDNA / FlourBlend / DoughJournal / ComparisonRun + `LAB_STORAGE_KEYS` |
| バリデーション | `lib/lab/lab-validation.ts` | validateDoughDNA / validateFlourBlend / validateDoughJournal / validateComparisonRun |
| LabSession | `lib/lab/lab-storage.ts` + `/lab` | 研究ノート下書き CRUD |
| DoughDNA | `lib/lab/dna-storage.ts` + `/lab/dna` | 17 食感スコア CRUD |
| FlourBlend | `lib/lab/blend-storage.ts` + `/lab/blend` | 粉比率 100% CRUD |
| DoughJournal | `lib/lab/journal-storage.ts` + `/lab/journal` | 5 セクション body CRUD |
| ComparisonRun | `lib/lab/comparison-storage.ts` + `/lab/comparison` | Side A/B 比較 CRUD |

**永続化:** localStorage のみ。D1 / API / dual write なし。

**未実装:** DIE Lab UI 連携 / DNA targetParams 導出 / flour-master 提案 / D1 migration / 外部 LLM

### 4.14 AI / RAG / Research Memory 設計（Phase 5 設計 ✅ — 2026-07-07）

> 詳細: [docs/ai/README.md](./docs/ai/README.md)

| 項目 | 内容 |
|------|------|
| 人格 | **研究パートナー**（先生ではない） — [personality.md](./docs/ai/personality.md) |
| ResearchContext | Knowledge / Learning / Weather / Run / DNA / Blend / Journal / Comparison / Profile / DIE Output — [rag-context.md](./docs/ai/rag-context.md) |
| Research Memory | 仮説・実験・結果・未検証・次に試すこと — [research-memory.md](./docs/ai/research-memory.md) |
| 安全 | DIE 上書き禁止・自動確定禁止・NALIPO 分離 — [safety-rules.md](./docs/ai/safety-rules.md) |
| Ask フロー | 断定抑制・根拠・次の一枚 — [ask-flow.md](./docs/ai/ask-flow.md) |

### 4.15 AI / mock RAG 実装（Phase 5a〜5c ✅ — 2026-07-07）

> 詳細: [docs/phase-5-summary.md](./docs/phase-5-summary.md)

| レイヤー | パス | 責務 |
|----------|------|------|
| 型 | `types/ai.ts` | ResearchContext / ResearchMemory / LLMAdapter / AskSourceCitation |
| 合成 | `lib/ai/research-context.ts` | `buildResearchContext()` |
| 合成 | `lib/ai/research-memory.ts` | `synthesizeResearchMemory()` |
| Mock LLM | `lib/ai/llm-mock.ts` | `MockLLMAdapter` — 外部 API 不使用 |
| プロンプト | `lib/ai/prompt-builder.ts` | `buildAskPrompt()` |
| 安全 | `lib/ai/answer-safety.ts` | `applyAnswerSafetyRules()` |
| パイプライン | `lib/ai/ask-llm.ts` | `runAskLlmPipeline()` |
| Ask API | `lib/ask/ask-llm-handler.ts` | `useLlm` 分岐 |
| Ask UI | `app/ask/ask-view.tsx` | toggle opt-in + mock 回答表示 |
| Client context | `lib/ask/ask-client-context.ts` | localStorage → context payload |

**Ask モード:**

| mode | aiUsed | 条件 |
|------|--------|------|
| `knowledge_search` | `false` | デフォルト |
| `llm_rag` | `true` | `useLlm: true` または UI toggle ON |

**Phase 5 未実装:** 外部 LLM API / Embedding / Vector DB / D1 AI migration / DIE Output UI 自動連携

**品質:** 297 tests passed（2026-07-07）

### 4.16 本番公開準備（Phase 6 設計 ✅ — 2026-07-07）

> 詳細: [docs/deploy/README.md](./docs/deploy/README.md)

| 項目 | 内容 |
|------|------|
| チェックリスト | [production-checklist.md](./docs/deploy/production-checklist.md) |
| D1 remote | [cloudflare-d1.md](./docs/deploy/cloudflare-d1.md) — **未実行** |
| 環境変数 | [env-vars.md](./docs/deploy/env-vars.md) — 外部 LLM 未接続 |
| セキュリティ | [security.md](./docs/deploy/security.md) — NALIPO 分離・店主専用β |
| ロールバック | [rollback.md](./docs/deploy/rollback.md) |

**公開β方針:**
- 対象: **NALIPO 店主専用**（招待制）
- UI 永続化: **localStorage 継続**
- remote D1 / migration / 本番 deploy: **まだ実行しない**
- 独自ドメイン: Phase 6 では設定しない

**Phase 6 未実装:** remote D1 作成 / staging deploy / 認証実装 / Go-Live

---

## 5. Learning Engine

### 5.1 目的

各店舗・各ミキサー機種ごとに摩擦係数の実測補正を蓄積し、予測精度を向上させる。

### 5.2 記録データ（1 Run = 1回の仕込み）

| フィールド | 内容 |
|------------|------|
| shop_id | 店舗 |
| mixer_type / mixer_model | ミキサー |
| inputs | 入力スナップショット |
| predicted_friction / predicted_dough_temp | DIE 予測値 |
| actual_dough_temp | 職人が入力する実測値 |
| created_at | 日時 |

### 5.3 学習ロジック

```
実測摩擦 = 実測生地温 × 4 − 粉温 − 水温 − 室温
摩擦誤差 = 実測摩擦 − 予測摩擦
店舗×機種の補正値 = 直近 N 回（20回）の摩擦誤差の移動平均
次回予測摩擦 = 基本摩擦 × マスタ係数 + 店舗×機種補正値
```

| 条件 | 動作 |
|------|------|
| Run 5未満 | 「学習中」表示、マスタ値使用 |
| Run 5以上 | 学習補正値を適用 |
| Run 20以上 | 信頼度「高」 |

**実装（Phase 2a〜2c）:** `lib/learning/` — 純粋関数 + localStorage + Quick 記録 UI + `/die/history`。職人評価 1〜5 は「その店の100点への近さ」として記録（採点ではなく研究記録）。

---

## 6. Dough DNA

> 正式スキーマ: `docs/schemas/dna.schema.json`  
> **Lab Mode 設計:** [docs/lab-mode/dough-dna.md](./docs/lab-mode/dough-dna.md)

### 6.1 定義

その店の **理想の生地** を数値化する「遺伝子プロファイル」。**優劣ではなく個性**。世界共通の評価基準は設けない。

- Quick Mode: 用途プロファイル内 DNA を **暗黙参照**（UI 非表示）
- Lab Mode: DNA を明示編集し、粉ブレンド・DIE 逆算の起点とする

### 6.2 食感スコア（scores — 各 0〜100）

| キー | 日本語 | キー | 日本語 |
|------|--------|------|--------|
| lightness | 軽さ | chewiness | もち感 |
| bite | 歯切れ | extensibility | 伸展性 |
| elasticity | 弾力 | aroma | 香り |
| crustColor | 焼色 | bakeTolerance | 焼成耐性 |
| cornicioneForm | コルニチョーネ形成 | airiness | 気泡 |
| centerTexture | 中心部の食感 | crustTexture | クラストの食感 |
| mouthfeel | 口溶け | digestibility | 消化の軽さ |
| crispness | サク感 | moistness | しっとり感 |
| reheatTolerance | 焼き戻り耐性 | | |

### 6.3 targetParams（DIE 導出目標値）

`scores` から `lib/dna/` が導出し、DIE 逆算の起点とする。

| フィールド | 説明 |
|------------|------|
| hydrationPct | 加水率 |
| targetDdtC | 目標生地温 |
| saltPct | 塩 |
| yeastType / yeastPct | イースト |
| fermentationType / fermentationHours | 発酵 |
| methodId / prefermentId | 製法・前発酵 |

### 6.4 用途別 DNA

| presetType | 用途 |
|------------|------|
| business | 営業用（Quick 内部参照） |
| competition | 大会用 |
| research | 研究用（Lab で編集） |

---

## 7. 粉ブレンド提案

| 項目 | 仕様 |
|------|------|
| 利用モード | Lab Mode 専用 |
| 設計正本 | [docs/lab-mode/flour-blend.md](./docs/lab-mode/flour-blend.md) |
| 入力 | 目標 W値 / タンパク質 / 吸水率 / 製法 / personality |
| 出力 | 粉 A ○% + 粉 B ○% + 予測 W値（個性表示。優劣なし） |
| ロジック（v0.2） | flour-master スペックから線形補間 |
| DIE 連携 | ブレンド → 吸水補正 → 加水率・DDT 逆算（アプリ層） |
| 製法 | STG/VPN/APN Knowledge 参照。唯一解にしない |

---

## 8. 「わからない」補完設計

### 8.1 フォールバック順序

```
① ユーザー入力値
    ↓ 未入力 / 「わからない」
② 店舗プロファイルの保存値
    ↓ 未設定
③ グローバル初期値（master JSON）
    ↓
④ Learning Engine の店舗学習値（摩擦のみ）
```

### 8.2 項目別補完ルール

| 項目 | 補完値 |
|------|--------|
| ミキサー機種 | 種別平均 → 不明ならスパイラル平均 |
| 回転数 | 種別プリセット固定値 |
| 低速・高速時間 | 種別プリセット（例: スパイラル 3min + 8min） |
| 粉温 | 外気温 + 2°C |
| 店舗室温 | 外気温 + 3°C（夏）/ + 5°C（冬） |
| 店内湿度 | 50% 固定 |
| 摩擦係数 | mixer-master → Learning 補正 |
| 粉ブレンド | 主力粉 100% |

### 8.3 信頼度

| レベル | 条件 |
|--------|------|
| 高 | Run 20+ かつ全項目入力 |
| 中 | Run 5+ かつ 1-2項目推定 |
| 低 | Run 0 かつ 3+項目推定 |

---

## 9. mixer-master.json 管理

### 9.1 3層構造

| Layer | 内容 | 管理 |
|-------|------|------|
| 1 | グローバル初期値（機種別摩擦、時間、回転数） | Git 管理 |
| 2 | 店舗プロファイル上書き | ユーザー設定 |
| 3 | Learning Engine 実測補正 | DB 保存 |

### 9.2 優先順位（加算モデル）

```
baseFrictionC = models[modelId].frictionC
             ?? types[mixerType].avgFrictionC

effectiveFrictionC = baseFrictionC
                     + shop.manualFrictionOffsetC      (Layer 2)
                     + learning.learnedFrictionOffsetC  (Layer 3, Run 5+)
```

ミキサー種別: `hand` / `spiral` / `fork` / `double_arm` / `unknown`（`data/mixer-master.json`）。

---

## 10. Knowledge Database

> 全体設計: `docs/knowledge-database.md`  
> 記事スキーマ: `docs/schemas/knowledge-entry.schema.json`

### 10.1 Tier 構造（優先順位）

| Tier | 分類 | スコープ | 例 |
|------|------|----------|-----|
| 1 | `official/` | グローバル | STG, VPN, APN（要約+出典） |
| 2 | `science/` | グローバル | グルテン, 発酵, 酵母, 温度, 水 |
| 3 | `intelligence/` | グローバル | DIE, Flour, Mixer, Method, DNA, Learning |
| 4 | `glossary/` | グローバル | 専門用語（ja/en/it） |
| 5 | `craftsman/` | **shopId** | 実測, 職人メモ, 自己評価, その店の100点 |

### 10.2 原則

- 公式規約は **全文転載禁止**。要約・出典・実践知のみ
- STG/VPN/APN を尊重するが、**STG のみを唯一の正解にしない**
- Ask AI は Tier を区別して回答（公式 / 科学 / 店舗）
- 数値計算は KDB では行わない（DIE + master JSON）

### 10.3 ストレージ

| レイヤー | 場所 |
|----------|------|
| Markdown ソース | `content/knowledge/` |
| 構造化 master | `data/mixer-master.json`, `flour-master.json`, `method-presets.json` |
| 店舗データ | DB（craftsman, Learning, DNA） |

### 10.4 初期目標（v0.1）

intelligence/ 5本 + science/ 2本 + official 3本 = **v0.1 目標**。Phase 2 実装: **official 3 + science 9 = 12 本** ✅。glossary 20語・intelligence/ は Phase 3 以降。

---

## 11. Ask AI

| 項目 | 仕様 |
|------|------|
| 位置づけ | **研究パートナー** — mock RAG 土台 ✅（Phase 5） |
| 用途 | DIE 結果の説明、トラブル相談、Knowledge 検索、Research Memory 参照 |
| デフォルト | `knowledge_search` — `aiUsed: false`（Phase 3b 互換） |
| mock RAG | `llm_rag` — `useLlm: true` または `/ask` toggle ON — MockLLMAdapter のみ |
| UI | `/ask` — toggle opt-in / answer / sources / nextStep / disclaimers / warnings |
| API | `POST /api/ask` — `lib/ask/` + `lib/ai/` |
| 設計 | [docs/ai/](./docs/ai/) |
| トーン | 断定せず根拠を示し「次の一枚」につなぐ。職人の判断を尊重 |
| 未実装 | 外部 LLM API / Embedding / D1 AI 永続化 |

---

## 12. Baker's % Calculator

| 項目 | 仕様 |
|------|------|
| 位置づけ | サブ機能（Quick Mode とは別） |
| パス | `/calculator` |
| 入力 | 総生地量 or 粉量、加水率、塩、酵母、油、preferment 比率 |
| 出力 | 粉、水、塩、酵母、油の重量、ビガ / ポーリッシュ按分 |
| 実装 | `lib/calculator/` — `bakers-percent.ts` / `preferment.ts` |
| DIE 連動 | なし（単純 Baker's % 算術のみ） |
| AI | 不使用 |

---

## 13. 技術方針（参考）

| レイヤー | 推奨技術 |
|----------|----------|
| Frontend | Next.js + TypeScript（スマホファースト） |
| DB（Phase 3a） | Cloudflare D1（SQLite）— [docs/database/](./docs/database/) |
| DB（将来） | PostgreSQL（D1 スキーマ互換設計） |
| AI | LLM API（説明・例外判断のみ） |
| 計算 | 純粋関数（`lib/die/` + `lib/calculator/` + `lib/learning/`） |
| Ask（Phase 3b） | Knowledge キーワード検索（`lib/ask/` — LLM 未使用） |
| 天気 | Open-Meteo + D1 キャッシュ（30 分） |

> 技術選定の最終決定は ADR（Architecture Decision Record）で行う。

---

## 14. 画面一覧

| パス | 画面 | モード | 状態 |
|------|------|--------|------|
| / | トップ（モード選択） | 共通 | プレースホルダ |
| /quick | Quick Mode + Run 記録 + 外気取得 | 営業 | ✅ Phase 2 |
| /profile | 店舗プロファイル CRUD | 共通 | ✅ Phase 1b |
| /lab | Lab Mode — LabSession | 研究 | ✅ Phase 4a |
| /lab/dna | Dough DNA | 研究 | ✅ Phase 4b |
| /lab/blend | 粉ブレンド | 研究 | ✅ Phase 4c |
| /lab/journal | 研究ジャーナル | 研究 | ✅ Phase 4d |
| /lab/comparison | 条件比較 | 研究 | ✅ Phase 4e |
| /settings/profile | 店舗・用途プロファイル | 共通 | 将来（現状は `/profile`） |
| /settings/defaults | 粉・ミキサー・製法・DDT 設定 | 共通 | 未実装 |
| /die/history | Run 履歴・学習状況 | 共通 | ✅ Phase 2c |
| /knowledge | Knowledge キーワード検索 | 共通 | ✅ Phase 2e |
| /calculator | Baker's % + preferment | 共通 | ✅ Phase 3b |
| /ask | Ask（Knowledge 検索） | 共通 | ✅ Phase 3b |

---

## 15. 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| MANIFESTO.md | 理念・憲章 |
| ROADMAP.md | 開発フェーズ・将来計画 |
| README.md | 開発者向け説明 |
| docs/knowledge-database.md | Knowledge Database 全体設計 |
| docs/quick-mode-flow.md | Quick Mode 30秒フロー |
| docs/defaults-fallback.md | 「わからない」補完ルール |
| docs/phase-1-die-core-summary.md | Phase 1a DIE Core 完了サマリー |
| docs/phase-1b-summary.md | Phase 1b Quick UI + Profile CRUD 完了サマリー |
| docs/phase-2-summary.md | Phase 2 完了サマリー（Learning / Weather / Knowledge） |
| docs/phase-3a-summary.md | Phase 3a 完了サマリー（D1 + Repository + API 土台） |
| docs/phase-3b-summary.md | Phase 3b 完了サマリー（sync Worker + Calculator + Ask） |
| docs/phase-4-summary.md | Phase 4 完了サマリー（Lab Mode 最小 UI） |
| docs/lab-mode/README.md | Phase 4 Lab Mode 設計 + 実装状態 |
| docs/lab-mode/*.md | LabSession / DNA / Blend / Journal / Comparison |
| docs/deploy/README.md | Phase 6 本番公開準備設計正本 |
| docs/deploy/*.md | チェックリスト / D1 / env / security / rollback |
| docs/database/README.md | Phase 3 DB 設計正本（D1 / PostgreSQL 互換） |
| docs/database/*.sql | 6 テーブル DDL（論理名・設計正本） |
| migrations/0001_initial.sql | D1 migration（`pizza_lab_*`、local 適用済み） |
| docs/schemas/profile.schema.json | 店舗プロファイル |
| docs/schemas/die-input.schema.json | DIE 入出力 |
| docs/schemas/dna.schema.json | Dough DNA |
| docs/schemas/knowledge-entry.schema.json | Knowledge 記事 |
| docs/adr/001-two-modes.md | Quick/Lab 分離 ADR |
| data/mixer-master.json | ミキサー master |
| data/flour-master.json | 粉 master |
| data/method-presets.json | 製法 preset |
| .cursor/rules/ | Cursor Rules（9件） |

---

## 変更履歴

| Version | Date | 変更内容 |
|---------|------|----------|
| 0.1 | 2026-07-06 | 初版（MVP v0.1: Calculator, Knowledge, Ask 土台） |
| 0.2 | 2026-07-06 | DIE、2モード、プロファイル、DNA、Learning 追加 |
| 0.3 | 2026-07-06 | Intelligence 体系、KDB Tier、DNA 17項目、ミキサー5種、摩擦加算モデル、関連 doc 最新化 |
| 0.4 | 2026-07-06 | Phase 1a DIE Core 実装構成（§4.5）追記 |
| 0.5 | 2026-07-06 | Phase 1b 実装構成（§4.6）、画面一覧 `/profile` 追記 |
| 0.6 | 2026-07-06 | Phase 2 実装構成（§4.7）、Learning 実装注記、`/die/history` ✅ |
| 0.7 | 2026-07-06 | Phase 2 完了（§4.8 天気 + Knowledge）、`/knowledge` `/api/weather` ✅、136 tests |
| 0.8 | 2026-07-06 | Phase 3 DB 設計（§4.9）、D1 第一層 + PG 移植方針、`docs/database/` |
| 0.9 | 2026-07-07 | Phase 3a 完了（§4.10）、Repository + API 土台、172 tests |
| 1.0 | 2026-07-07 | Phase 3b 完了（§4.11）、sync Worker + Calculator + Ask、210 tests |
| 1.1 | 2026-07-07 | Phase 4 設計（§4.12）、docs/lab-mode/ 固定 |
| 1.2 | 2026-07-07 | Phase 4 最小 UI 完了（§4.13）、Lab localStorage 5 キー、257 tests |
| 1.3 | 2026-07-07 | Phase 5 設計（§4.14）、docs/ai/ — AI / RAG / Research Memory 固定 |
| 1.4 | 2026-07-07 | Phase 5 完了（§4.15）、mock RAG 土台 + Ask opt-in、297 tests |
| 1.5 | 2026-07-07 | Phase 6 設計（§4.16）、docs/deploy/ — 本番公開準備 |
