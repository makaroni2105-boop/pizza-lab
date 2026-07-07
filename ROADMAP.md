# Pizza-Lab Roadmap

> 開発フェーズと将来計画。  
> 詳細仕様は [PIZZALAB_MASTER.md](./PIZZALAB_MASTER.md) を参照。

---

## 開発の原則

1. **自分が毎日使いたくなるもの** を最初に作る
2. 次に **仲間のピッツァ職人** に使ってもらう
3. Quick Mode だけで価値が出る Phase 完了を v0.1 のゴールとする
4. Lab Mode・コミュニティ・商用化は v0.2 以降

---

## Phase 0: 設計・ドキュメント ✅ 完了

**目標:** 実装前に設計を固める

| タスク | 状態 |
|--------|------|
| MANIFESTO.md | ✅ |
| PIZZALAB_MASTER.md | ✅ |
| ROADMAP.md | ✅ |
| README.md | ✅ |
| profile.schema.json | ✅ |
| quick-mode-flow.md | ✅ |
| die-input.schema.json | ✅ |
| defaults-fallback.md | ✅ |
| docs/adr/001-two-modes.md | ✅ |

---

## Phase 0.5: Knowledge DB + Master JSON + Rules ✅ 完了

**目標:** 知識 OS の設計・データ正本・開発ルールを整備

| タスク | 状態 |
|--------|------|
| docs/knowledge-database.md | ✅ |
| docs/schemas/knowledge-entry.schema.json | ✅ |
| docs/schemas/dna.schema.json | ✅ |
| data/mixer-master.json | ✅ |
| data/flour-master.json | ✅ |
| data/method-presets.json | ✅ |
| data/*.design.md（3件） | ✅ |
| .cursor/rules/（9件） | ✅ |
| PIZZALAB_MASTER v0.3 整合性修正 | ✅ |

---

## Phase 1: プロファイル + DIE コア（v0.1） ✅ 完了

**目標:** 初回セットアップ → Quick Mode で今日のレシピが30秒以内に出る

**期間目安:** 2〜3 週間

### Phase 1a: DIE Core ✅ 完了（2026-07-06）

**目標:** 型定義・defaults 補完・DIE 純粋関数・オーケストレーター

| タスク | 状態 |
|--------|------|
| プロジェクト初期化 | ✅ Next.js + TypeScript |
| 型定義 | ✅ types/die.ts, types/profile.ts |
| 補完ロジック | ✅ lib/defaults/ |
| DIE 摩擦 | ✅ lib/die/friction.ts |
| DIE 水温逆算 | ✅ lib/die/recommend.ts |
| DIE 氷量 | ✅ lib/die/ice.ts |
| DIE 配合 | ✅ lib/die/recipe.ts |
| DIE 酵母補正 | ✅ lib/die/yeast-adjust.ts |
| DIE 発酵スケジュール | ✅ lib/die/fermentation-adjust.ts |
| DIE オーケストレーター | ✅ lib/die/compute.ts, lib/die/index.ts |
| 単体テスト | ✅ 84 tests passed |
| マスタデータ参照 | ✅ data/*.json（読み取り専用） |

**完了条件（DIE Core）:**
- [x] QuickModeRequest から DieOutput を算出できる（`computeDie()`）
- [x] 「わからない」項目は lib/defaults/ で補完される
- [x] fieldResolution / estimatedFieldCount が保持される
- [x] 不足入力でもクラッシュしない

**未実装（Phase 1b へ）:** UI / API Routes / AI / DB / Learning Engine

詳細: [docs/phase-1-die-core-summary.md](./docs/phase-1-die-core-summary.md)

---

### Phase 1b: プロファイル + Quick Mode UI ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| API Route | ✅ `POST /api/die/quick` |
| Quick Mode UI | ✅ `/quick` — 最小入力 → レシピ表示 |
| プロファイル CRUD | ✅ `/profile` — localStorage |
| 信頼度表示 | ✅ Quick 結果画面に confidence 表示 |
| デモ profile fallback | ✅ `shop-1`（`lib/profile/demo-profiles.ts`） |

**完了条件（Phase 1 全体）:**
- [x] 店舗プロファイルを登録できる（localStorage）
- [x] Quick Mode で配合・推奨水温・氷量が出る
- [x] 「わからない」項目は推定値で補完される
- [x] 信頼度が表示される

**localStorage キー:** `pizzalab-profiles-v1`

**Phase 1b 未実装（Phase 2 以降）:** DB / Learning Engine / AI / Lab Mode UI / 初回セットアップウィザード（5分フロー）

詳細: [docs/phase-1b-summary.md](./docs/phase-1b-summary.md)

**AI 使用:** なし  
**DB:** localStorage（Phase 3 で PostgreSQL 移行）

---

## Phase 2: Learning Engine + 環境（v0.1 完成） ✅ 完了

**目標:** 実測記録 → 店舗別摩擦学習 → 予測精度向上 + 環境補完 + 知識参照

**期間目安:** 1〜2 週間

### Phase 2a: Learning Engine 土台 ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| `lib/learning/` 純粋関数 | ✅ learning-types / score / run / summary |
| 摩擦・DDT・推奨補正集計 | ✅ 平均・中央値・件数のみ |
| Vitest | ✅ 18 tests（learning モジュール） |

詳細: [docs/phase-2-summary.md](./docs/phase-2-summary.md)

---

### Phase 2b: Run 記録 + Quick UI ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| Run localStorage 永続化 | ✅ `pizzalab-learning-runs-v1` |
| Quick 実測入力 | ✅ 実測生地温 / 1〜5 / メモ |
| profile.learning 反映 | ✅ 保存時に再計算・API 送信時にマージ |

**localStorage キー:** `pizzalab-learning-runs-v1`

---

### Phase 2c: Run History ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| Run History UI | ✅ `/die/history` — 研究記録一覧・削除 |
| 学習状態表示 | ✅ Run 数 / 学習中 / 補正適用中 / 信頼度高 |
| ナビ連携 | ✅ `/quick` `/profile` からリンク |

**完了条件（Phase 2a〜2c）:**
- [x] 実測生地温を記録できる
- [x] Run 5 回以上で摩擦補正が適用される（`profile.learning` → DIE）
- [x] Run 履歴で予測 vs 実測を確認できる

---

### Phase 2d: 天気 API ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| `lib/weather/` | ✅ types / client / cache / handler |
| API Route | ✅ `GET /api/weather` |
| Quick UI 連携 | ✅ 外気取得 → `body.weather` |
| キャッシュ | ✅ 30 分（インメモリ） |

**プロバイダ:** Open-Meteo（fetch ベース、Workers 移行向け）

---

### Phase 2e: Knowledge Base ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| Markdown 記事 | ✅ `content/knowledge/` 12 本 |
| `lib/knowledge/` | ✅ loader / search |
| Knowledge UI | ✅ `/knowledge` — キーワード検索 |
| AI / RAG | ⬜ Phase 3 以降 |

---

**完了条件（Phase 2 全体）:**
- [x] 実測生地温を記録できる
- [x] Run 5 回以上で摩擦補正が適用される
- [x] 外気温・湿度を API 取得できる（手入力フォールバックあり）
- [x] Knowledge 12 本以上が読める・キーワード検索できる

**Phase 2 未実装（Phase 3 以降）:**
- DB 同期 — profile / Run / Knowledge の PostgreSQL / Cloudflare D1 移行
- AI — Ask LLM（Phase 3 土台）
- RAG — Vector DB / Embedding（Phase 5）

**実装ルート一覧:**

| パス / API | 用途 |
|------------|------|
| `/quick` | Quick Mode + Run 記録 + 外気取得 |
| `/profile` | 店舗プロファイル CRUD |
| `/die/history` | Run History |
| `/knowledge` | Knowledge キーワード検索 |
| `POST /api/die/quick` | DIE 計算 |
| `GET /api/weather` | 外気温・湿度 |

詳細: [docs/phase-2-summary.md](./docs/phase-2-summary.md)

**AI 使用:** なし

---

## Phase 3: 基盤整備（v0.1 リリース）

**目標:** DB 移行、Baker's % Calculator、Ask AI 土台

**期間目安:** 1 週間

### Phase 3 設計: データモデル ✅ 完了（2026-07-06）

| タスク | 状態 |
|--------|------|
| `docs/database/` DDL 定義 | ✅ 6 テーブル |
| ER 図・インデックス案 | ✅ [docs/database/README.md](./docs/database/README.md) |
| D1 / PostgreSQL 移植方針 | ✅ |
| TypeScript 型対応表 | ✅ |

**テーブル:** `shops` / `shop_profiles` / `learning_runs` / `knowledge_entries` / `weather_cache` / `sync_queue`

**未着手（Phase 3a 時点）:** ~~Migration 実行 / D1 作成 / Worker / Repository~~ → Phase 3a で完了（local のみ）

---

### Phase 3a: Cloudflare D1 + Repository + API 土台 ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `wrangler.toml` | ✅ `pizza_lab_db`, binding `DB` |
| `migrations/0001_initial.sql` | ✅ 6 テーブル `pizza_lab_*` |
| local D1 migration | ✅ `--local` 適用済み |
| `lib/db/` Repository | ✅ 5 Repository + mock |
| `GET /api/weather` | ✅ D1 optional cache |
| `/api/profile` | ✅ GET / POST / DELETE |
| `/api/learning-runs` | ✅ GET / POST / DELETE |
| `/api/sync-queue` | ✅ GET / POST / PATCH |
| optional D1 + memory fallback | ✅ |
| 単体テスト | ✅ **172 passed** |

**未実装（Phase 3a 残り → 3b/Worker）:** UI D1 切替 / dual write / sync Worker / remote D1 / 本番運用

詳細: [docs/phase-3a-summary.md](./docs/phase-3a-summary.md)

---

### Phase 3b: sync Worker + Calculator + Ask ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| sync_queue Worker | ✅ `lib/sync/` + `POST /api/sync-worker` |
| Baker's % Calculator | ✅ `/calculator` — `lib/calculator/` |
| Ask 土台 | ✅ `/ask` + `POST /api/ask` — Knowledge 検索のみ |
| LLM / RAG | ✅ Phase 5 mock（`useLlm` opt-in）/ 外部 LLM ⬜ |
| UI → D1 切替 / dual write | ⬜ Phase 4 以降 |
| remote D1 / 本番運用 | ⬜ デプロイ時 |
| 単体テスト | ✅ **210 passed** |

詳細: [docs/phase-3b-summary.md](./docs/phase-3b-summary.md)

**完了条件（Phase 3 全体）:**
- [x] データモデル設計固定
- [x] D1 土台（local migration + Repository + API）
- [x] Baker's % 計算が動く
- [x] Ask は LLM OFF でも UX が破綻しない
- [ ] v0.1 全機能が DB 永続化される（UI 連携含む）→ Phase 4 以降

**AI 使用（Phase 3b）:** なし — Ask は Knowledge キーワード検索のみ

---

## Phase 4: Lab Mode（v0.2） ✅ 完了（2026-07-07）

**目標:** 研究用の LabSession / Dough DNA / 粉ブレンド / Journal / Comparison — localStorage 最小 UI

**期間目安:** 2〜3 週間

### Phase 4 設計: Lab Mode データモデル ✅ 固定（2026-07-07）

| タスク | 状態 |
|--------|------|
| `docs/lab-mode/` 設計正本 | ✅ |
| LabSession / DoughDNA / FlourBlend / DoughJournal / ComparisonRun | ✅ 論理モデル |
| Quick との差分・Learning 境界 | ✅ |
| 将来 AI 参照フィールド | ✅ 設計のみ |
| `types/lab.ts` + `lib/lab/lab-validation.ts` | ✅ |

詳細: [docs/lab-mode/README.md](./docs/lab-mode/README.md)

---

### Phase 4a: LabSession ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `lib/lab/lab-storage.ts` | ✅ |
| `/lab` UI | ✅ 研究ノート下書き |
| localStorage | ✅ `pizzalab-lab-sessions-v1` |

---

### Phase 4b: Dough DNA ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `lib/lab/dna-storage.ts` | ✅ |
| `/lab/dna` UI | ✅ 17 スコア 0–100 |
| localStorage | ✅ `pizzalab-dna-v1` |

---

### Phase 4c: Flour Blend ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `lib/lab/blend-storage.ts` | ✅ |
| `/lab/blend` UI | ✅ 2–5 粉・合計 100% |
| localStorage | ✅ `pizzalab-flour-blends-v1` |

---

### Phase 4d: Dough Journal ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `lib/lab/journal-storage.ts` | ✅ |
| `/lab/journal` UI | ✅ 観察・仮説・次の一枚 |
| localStorage | ✅ `pizzalab-journal-v1` |

---

### Phase 4e: Comparison ✅ 完了（2026-07-07）

| タスク | 状態 |
|--------|------|
| `lib/lab/comparison-storage.ts` | ✅ |
| `/lab/comparison` UI | ✅ Side A/B 比較 |
| localStorage | ✅ `pizzalab-comparisons-v1` |

---

**完了条件（Phase 4 最小実装）:**
- [x] Lab Mode データモデル設計固定
- [x] LabSession を localStorage で作成・一覧・削除できる
- [x] Dough DNA を 17 項目で編集・保存できる
- [x] Flour Blend を比率 100% で保存できる
- [x] Journal / Comparison を研究記録として保存できる
- [ ] DIE 全項目 Lab UI / DNA 逆算レシピ → Phase 4+ / Phase 5 前
- [ ] Lab データ D1 永続化 → UI D1 切替時

**localStorage キー:** `pizzalab-lab-sessions-v1` / `pizzalab-dna-v1` / `pizzalab-flour-blends-v1` / `pizzalab-journal-v1` / `pizzalab-comparisons-v1`

**Phase 4 未実装:** D1 保存 / Lab API / AI / Lab↔DIE 深連携 / flour-master 自動提案

**実装ルート一覧（Lab 追加分）:**

| パス | 用途 |
|------|------|
| `/lab` | LabSession 研究ノート |
| `/lab/dna` | Dough DNA |
| `/lab/blend` | Flour Blend |
| `/lab/journal` | Dough Journal |
| `/lab/comparison` | ComparisonRun |

詳細: [docs/phase-4-summary.md](./docs/phase-4-summary.md)

**AI 使用:** なし  
**DB:** localStorage のみ（D1 / dual write なし）

---

## Phase 5: Ask AI — mock RAG / 研究パートナー土台 ✅ 完了（2026-07-07）

**目標:** 研究パートナー AI — ResearchContext + MockLLMAdapter + Ask opt-in

**期間:** 2026-07-07 完了

### Phase 5 設計 ✅

詳細: [docs/ai/README.md](./docs/ai/README.md)

| タスク | 状態 |
|--------|------|
| `docs/ai/` 設計正本 | ✅ |
| AI Personality / Safety / Ask Flow | ✅ |

### Phase 5 実装 ✅

| 順 | フェーズ | 内容 | 状態 |
|----|---------|------|------|
| 1 | **5a** | `types/ai.ts` + ResearchContext / Memory 合成 | ✅ |
| 2 | **5b** | MockLLMAdapter + prompt + safety | ✅ |
| 3 | **5c API** | `POST /api/ask` — `useLlm: true` | ✅ |
| 4 | **5c UI** | `/ask` toggle + mock 回答表示 | ✅ |
| 5 | **5d（任意）** | Embedding / Vector DB | ⬜ 未着手 |

**完了条件（Phase 5 土台）:**
- [x] AI 人格・安全ルール・RAG 設計固定
- [x] ResearchContext / ResearchMemory 型 + 合成
- [x] MockLLMAdapter + `buildAskPrompt()` + `applyAnswerSafetyRules()`
- [x] Ask `llm_rag` モード（`aiUsed: true`）— feature flag
- [x] 既存 `knowledge_search` 回帰維持
- [ ] 外部 LLM API | Phase 6 以降
- [ ] Vector DB / Embedding | 任意

**AI 使用:** Ask mock RAG のみ（opt-in）。DIE 計算には不使用。外部 LLM / API キー不使用。

詳細: [docs/phase-5-summary.md](./docs/phase-5-summary.md)

---

## Phase 6: 本番公開準備（公開β） ← 次

**目標:** Cloudflare / D1 / 環境変数 / 認証 / バックアップ / ロールバックの安全設計固定

**期間:** 設計 2026-07-07 開始

### Phase 6 設計 ✅（2026-07-07）

| タスク | 状態 |
|--------|------|
| `docs/deploy/` 正本 | ✅ |
| 本番公開チェックリスト | ✅ [production-checklist.md](./docs/deploy/production-checklist.md) |
| Cloudflare D1 remote 手順 | ✅ [cloudflare-d1.md](./docs/deploy/cloudflare-d1.md) — **未実行** |
| 環境変数・外部 LLM 未接続 | ✅ [env-vars.md](./docs/deploy/env-vars.md) |
| セキュリティ・認証 | ✅ [security.md](./docs/deploy/security.md) |
| ロールバック・バックアップ | ✅ [rollback.md](./docs/deploy/rollback.md) |

詳細: [docs/deploy/README.md](./docs/deploy/README.md)

**Phase 6 設計原則:**
- 本番 deploy / remote D1 / remote migration — **まだ実行しない**
- UI は localStorage 継続（公開β）
- 外部 LLM / 独自ドメイン — **接続・設定しない**
- 公開β = **NALIPO 店主専用**
- NALIPO 予約 DB と **絶対に混ぜない**

---

### Phase 6 実装（設計完了後 — 未着手）

| 順 | フェーズ | 内容 |
|----|---------|------|
| 1 | **6a** | remote D1 作成前チェック（checklist ゲート） |
| 2 | **6b** | remote D1 作成 + migration（承認後） |
| 3 | **6c** | ステージング deploy + smoke test |
| 4 | **6d** | 認証（Cloudflare Access 等）+ 公開β Go-Live |
| 5 | **6e（任意）** | UI → D1 切替 — 別 ADR |

**完了条件（Phase 6 公開β）:**
- [x] デプロイチェックリスト固定
- [ ] remote D1 作成 + migration
- [ ] ステージング smoke test
- [ ] NALIPO 店主 UAT
- [ ] 本番 deploy（承認後）

---

## Phase 7 以降

**候補:** 外部 LLM opt-in / UI D1 切替 / Embedding RAG / 一般公開

---

## 将来計画（v1.0 以降）

### 職人コミュニティ

- レシピ・技法の共有
- 店舗間の Learning データ匿名比較（オプトイン）
- フォーラム / Q&A

### 写真記録

- 生地・焼成のビジュアルログ
- Run 履歴と写真の紐づけ
- 将来: 画像解析（発酵状態、焼成色）

### レシピ販売

- 職人のレシピ・DNA を商品化
- デジタルレシピマーケットプレイス

### サブスクリプション

| プラン | 内容（案） |
|--------|------------|
| Free | Quick Mode、Learning（Run 制限）、Knowledge 閲覧 |
| Pro | Lab Mode、DNA 無制限、Ask AI 無制限、写真記録 |
| Shop | 多店舗、チーム共有、データエクスポート |

### その他

- モバイルアプリ（PWA → ネイティブ）
- センサー連携（室温・湿度自動取得）
- 多言語（日本語、英語、イタリア語）
- API 公開（第三者連携）

---

## マイルストーン一覧

| マイルストーン | 内容 | 目標 |
|----------------|------|------|
| **M0** | 設計ドキュメント完成 | Phase 0 ✅ |
| **M0.5** | Knowledge DB + Master JSON + Rules | Phase 0.5 ✅ |
| **M1a** | DIE Core（純粋関数）完成 | Phase 1a ✅ |
| **M1** | Quick Mode で30秒レシピ | Phase 1b ✅ |
| **M2a** | Learning Engine + Run 記録 + History | Phase 2a〜2c ✅ |
| **M2** | 天気 API + Knowledge Base | Phase 2 ✅ |
| **M2.5** | DB データモデル設計 | Phase 3 設計 ✅ |
| **M3a** | Cloudflare D1 土台 + API | Phase 3a ✅ |
| **M3b** | sync Worker + Calculator + Ask | Phase 3b ✅ |
| **M3** | v0.1 リリース（自分が毎日使う） | Phase 3b ✅ |
| **M4** | 仲間の職人に使ってもらう | Phase 3 後 |
| **M5** | Lab Mode 最小 UI（localStorage） | Phase 4 ✅ |
| **M6** | Ask AI mock RAG 土台 | Phase 5 ✅ |
| **M7** | 本番公開準備（公開β設計） | Phase 6 設計 ✅ ← 6a 次 |
| **M8** | 公開β Go-Live（NALIPO 店主） | Phase 6 実装 |
| **M9** | コミュニティ・商用化検討 | v1.0 以降 |

---

## やらないこと（v0.1 — 履歴）

以下は v0.1 時点で見送った項目。Phase 4 で Lab 最小 UI は実装済み（D1 / DIE 深連携除く）。

- ~~Lab Mode UI~~ → Phase 4 ✅（最小）
- ~~Dough DNA 編集 UI~~ → Phase 4b ✅
- ~~粉ブレンド UI~~ → Phase 4c ✅
- コミュニティ・SNS
- 写真アップロード
- モバイルネイティブアプリ
- 多店舗管理
- サブスクリプション課金
- Vector DB / Embedding（Phase 5 検討）

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版作成 |
| 2026-07-06 | Phase 1a DIE Core 完了、Phase 1b を次フェーズに更新 |
| 2026-07-06 | Phase 1b 完了（Quick UI / Profile CRUD / API Route） |
| 2026-07-06 | Phase 2a〜2c 完了（Learning / Run 記録 / Run History） |
| 2026-07-06 | Phase 2 完了（天気 API + Knowledge Base） |
| 2026-07-06 | Phase 3 データモデル設計完了（docs/database/） |
| 2026-07-07 | Phase 3a 完了（D1 local + Repository + API 土台） |
| 2026-07-07 | Phase 3b 完了（sync Worker + Calculator + Ask 土台） |
| 2026-07-07 | Phase 4 設計開始（docs/lab-mode/ — LabSession / DNA / Blend / Journal / Comparison） |
| 2026-07-07 | Phase 4 完了（4a〜4e — Lab localStorage + 最小 UI、257 tests） |
| 2026-07-07 | Phase 5 設計開始（docs/ai/ — AI / RAG / Research Memory） |
| 2026-07-07 | Phase 5 完了（mock RAG 土台 — 5a/5b/5c、297 tests） |
| 2026-07-07 | Phase 6 設計開始（docs/deploy/ — 本番公開準備） |
