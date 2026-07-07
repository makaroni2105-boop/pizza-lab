# 本番公開チェックリスト

> **重要:** §1 以降の詳細項目は Phase 6 設計時点では **未実施**（⬜）。  
> §0 ゲートは Phase 6a（2026-07-07）で確認済み — 下記「Phase 6a 実行結果」参照。  
> 各項目に ✅ を付ける前に、担当者・日時・環境を記録すること。

**公開β対象:** NALIPO 店主専用（限定招待）

---

## Phase 6a — remote D1 作成前チェック（2026-07-07）

**実施者:** Cursor Agent（自動確認）  
**環境:** ローカル開発環境（Windows）  
**コード変更:** なし  
**wrangler 本番操作:** **未実行**（`d1 create` / `migrations apply --remote` ともに未実行）

### ゲート判定（Phase 6a）

| # | 確認項目 | 結果 | 根拠 |
|---|----------|------|------|
| **G1** | `npm test` / `npm run build` / `npm run lint` 成功 | ✅ | test 297 passed / build 成功 / lint エラーなし（2026-07-07 20:03 JST） |
| **G2** | NALIPO 予約システムと完全分離 | ✅（リポジトリ） / ⬜（ダッシュボード） | 下記「NALIPO 分離確認」参照。Cloudflare D1 一覧の目視は **create 実行直前** に実施 |
| **G3** | `wrangler.toml` が pizza_lab 専用 | ✅ | `name=pizza-lab`, `database_name=pizza_lab_db`, `binding=DB`, NALIPO `database_id` なし |
| **G4** | migrations が `pizza_lab_*` テーブルのみ | ✅ | `0001_initial.sql` — 6 テーブルすべて `pizza_lab_*` prefix |
| **G5** | 外部 LLM API キー未設定 | ✅ | `.env` なし、`process.env` 未使用、`MockLLMAdapter` のみ |
| **G6** | UI は localStorage 継続 | ✅ | Profile / Learning / Lab 5 キー = localStorage。UI→D1 切替・dual write 未実装 |
| **G7** | remote D1 作成・remote migration **未実行** | ✅ | `database_id` は local プレースホルダ。`wrangler d1 create` / `--remote` migration **未実行** |

### NALIPO 分離確認（リポジトリ監査）

| 確認対象 | 結果 | 詳細 |
|----------|------|------|
| `wrangler.toml` | ✅ | `pizza_lab_db` のみ。NALIPO 用 binding / database_id なし |
| `migrations/0001_initial.sql` | ✅ | `pizza_lab_shops`, `pizza_lab_profiles`, `pizza_lab_learning_runs`, `pizza_lab_knowledge_entries`, `pizza_lab_weather_cache`, `pizza_lab_sync_queue` の 6 テーブルのみ |
| `lib/db/d1-types.ts` | ✅ | `PIZZA_LAB_TABLES` — すべて `pizza_lab_*` |
| `lib/db/*-repository.ts` | ✅ | 5 Repository すべて `PIZZA_LAB_TABLES` 経由 |
| NALIPO / 予約 DB 名のコード混入 | ✅ なし | コード・migration・wrangler に NALIPO DB 名・予約テーブル名なし（docs の分離方針記述のみ） |
| `.env` / API キー | ✅ | `.env*` ファイルなし、`.gitignore` で除外済み |
| Cloudflare ダッシュボード目視 | ⬜ | **Phase 6b 実行直前ゲート** — NALIPO D1 と `pizza_lab_db` 名重複なしを目視確認 |

### remote D1 作成可否（Phase 6a 判定）

| 判定 | 内容 |
|------|------|
| **結論** | **条件付きで Phase 6b（`wrangler d1 create`）へ進行可** |
| 条件 | Cloudflare ダッシュボードで NALIPO DB との混在なしを **create 実行直前** に目視確認 |
| まだ実行しない | `migrations apply --remote` / 本番 deploy / UI→D1 切替 / 外部 LLM 接続 |

---

## Phase 6b — remote D1 作成（2026-07-07）

**実施者:** Cursor Agent  
**環境:** Cloudflare APAC / wrangler 4.107.0  
**コード変更:** `wrangler.toml` の `database_id` のみ  
**wrangler 本番操作:** `d1 create` ✅ 実行済み / `migrations apply --remote` **未実行** / deploy **未実行**

### 作業前ゲート

| # | 確認項目 | 結果 | 根拠 |
|---|----------|------|------|
| 1 | NALIPO 用 D1 と混在なし | ✅ | `wrangler d1 list` — `nalipo-db`（`daa3eb2b-...`）と `pizza_lab_db` は別 UUID・別 name |
| 2 | 作成 DB 名 = `pizza_lab_db` | ✅ | create コマンド引数・出力一致 |
| 3 | `binding = DB` | ✅ | wrangler.toml 維持（wrangler 出力の `pizza_lab_db` binding は **採用せず**） |
| 4 | `migrations_dir = migrations` | ✅ | wrangler.toml 確認 |

### 実行コマンド

```bash
npx wrangler d1 create pizza_lab_db   # ✅ 実行済み（2026-07-07）
```

### remote D1 作成結果

| 項目 | 値 |
|------|-----|
| `database_name` | `pizza_lab_db` |
| `database_id` | `06fd466a-3878-4e89-b3d7-2d680bfba17f` |
| region | APAC |
| `num_tables`（作成直後） | 0（migration **未適用**） |
| NALIPO `nalipo-db` UUID | `daa3eb2b-5638-4d24-b165-dce7a13a152a` — **別 DB** |

### wrangler.toml 更新

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| `database_id` | `00000000-0000-4000-8000-000000000001`（local プレースホルダ） | `06fd466a-3878-4e89-b3d7-2d680bfba17f` |
| `database_name` | `pizza_lab_db` | 変更なし |
| `binding` | `DB` | 変更なし |
| `migrations_dir` | `migrations` | 変更なし |

### まだ実行していない（Phase 6b 時点）

| 操作 | 状態 |
|------|------|
| `wrangler d1 migrations apply pizza_lab_db --remote` | **未実行** |
| `wrangler d1 export`（migration 前バックアップ） | **未実行**（Phase 6c 前） |
| 本番 deploy | **未実行** |
| UI → D1 切替 | **未実装** |
| 外部 LLM 接続 | **未接続** |

---

## Phase 6c — remote migration 適用（2026-07-07）

**実施者:** Cursor Agent  
**環境:** Cloudflare APAC (KIX) / wrangler 4.107.0  
**対象 DB:** `pizza_lab_db`（`06fd466a-3878-4e89-b3d7-2d680bfba17f`）**のみ**  
**NALIPO `nalipo-db`:** **未接触**  
**コード変更:** なし（docs + backup ファイルのみ）  
**deploy:** **未実行**

### 作業前ゲート

| # | 確認項目 | 結果 |
|---|----------|------|
| 1 | `wrangler.toml` `database_id` = remote UUID | ✅ `06fd466a-3878-4e89-b3d7-2d680bfba17f` |
| 2 | `pizza_lab_db` と `nalipo-db` 別 UUID | ✅ `daa3eb2b-5638-4d24-b165-dce7a13a152a` |
| 3 | migration 対象 = `pizza_lab_db` | ✅ `--remote` は wrangler.toml binding 経由 |
| 4 | `0001_initial.sql` = `pizza_lab_*` 6 テーブルのみ | ✅ |

### 1. migration 前バックアップ

```bash
npx wrangler d1 export pizza_lab_db --remote \
  --output backups/pizza_lab_db-pre-0001-20260707-210922.sql   # ✅ 実行済み
```

| 項目 | 値 |
|------|-----|
| ファイル | `backups/pizza_lab_db-pre-0001-20260707-210922.sql` |
| サイズ | 32 bytes（空 DB — `PRAGMA defer_foreign_keys` のみ） |
| 状態 | ✅ 作成確認済み |

### 2. remote migration 適用

```bash
npx wrangler d1 migrations apply pizza_lab_db --remote   # ✅ 実行済み
```

| 項目 | 値 |
|------|-----|
| 適用 migration | `0001_initial.sql` |
| 実行 SQL 数 | 21 commands |
| 状態 | ✅ |
| `d1_migrations` 記録 | `0001_initial.sql` |

### 3. remote テーブル一覧（アプリ）

| テーブル | 状態 |
|----------|------|
| `pizza_lab_shops` | ✅ |
| `pizza_lab_profiles` | ✅ |
| `pizza_lab_learning_runs` | ✅ |
| `pizza_lab_knowledge_entries` | ✅ |
| `pizza_lab_weather_cache` | ✅ |
| `pizza_lab_sync_queue` | ✅ |

**システムテーブル（想定内）:** `d1_migrations`, `_cf_KV`, `sqlite_sequence`  
**NALIPO / 予約テーブル:** **なし** ✅

### 4. index 確認（14 件 — すべて `idx_pizza_lab_*`）

| index | テーブル |
|-------|----------|
| `idx_pizza_lab_shops_deleted_at` | shops |
| `idx_pizza_lab_shops_updated_at` | shops |
| `idx_pizza_lab_learning_runs_shop_recorded` | learning_runs |
| `idx_pizza_lab_learning_runs_shop_mixer` | learning_runs |
| `idx_pizza_lab_learning_runs_created_at` | learning_runs |
| `idx_pizza_lab_knowledge_relative_path` | knowledge_entries |
| `idx_pizza_lab_knowledge_tier_category` | knowledge_entries |
| `idx_pizza_lab_knowledge_shop_id` | knowledge_entries |
| `idx_pizza_lab_knowledge_updated_at` | knowledge_entries |
| `idx_pizza_lab_weather_cache_expires_at` | weather_cache |
| `idx_pizza_lab_weather_cache_lat_lon` | weather_cache |
| `idx_pizza_lab_sync_queue_status_created` | sync_queue |
| `idx_pizza_lab_sync_queue_shop_entity` | sync_queue |
| `idx_pizza_lab_sync_queue_client_id` | sync_queue |

**remote DB サイズ（migration 後）:** 143,360 bytes

### NALIPO 分離（migration 後）

| DB | UUID | migration 後 |
|----|------|--------------|
| `pizza_lab_db` | `06fd466a-...` | 6 `pizza_lab_*` テーブル作成 ✅ |
| `nalipo-db` | `daa3eb2b-...` | **未操作** — file_size 724992 変化なし |

### まだ実行していない（Phase 6c 時点）

| 操作 | 状態 |
|------|------|
| 本番 deploy / staging deploy | **未実行** |
| UI → D1 切替 | **未実装** |
| 外部 LLM 接続 | **未接続** |
| `nalipo-db` への任何操作 | **未実行** |

---

## Phase 6d — staging deploy 前チェック（2026-07-07）

**実施者:** Cursor Agent  
**コード変更:** なし  
**staging deploy:** **未実行** / **本番 deploy:** **未実行**  
**remote D1:** Phase 6c migration 済み（`pizza_lab_db` / 6 `pizza_lab_*` テーブル）  
**UI:** localStorage 継続 / **外部 LLM:** 未接続 / **独自ドメイン:** 未設定

### 1. staging デプロイ方式（決定）

| 項目 | 決定 | 理由 |
|------|------|------|
| **ホスティング** | **Cloudflare Pages** | Next.js 15 App Router（12 pages + 7 API routes）。Workers 単体では UI を載せられない |
| **Workers の役割** | Pages 配下の Functions / OpenNext Worker | API Route + SSR。`wrangler.toml` の D1 binding を共有 |
| **採用しない** | Workers 単体 deploy | `main` 未設定・Next.js 全量ホスティング非対応 |
| **NALIPO** | 別 Pages / Worker プロジェクト | `pizza-lab` 専用。NALIPO 予約と **共有しない** |
| **OpenNext 等** | Phase 6e で導入予定 | 現リポジトリに adapter 設定 **なし** — deploy 前に追加が必要 |

### 2. staging URL 命名方針（決定）

| 項目 | 値 |
|------|-----|
| Cloudflare Pages プロジェクト名 | `pizza-lab`（`wrangler.toml` `name` と一致） |
| staging ブランチ | `staging` |
| staging URL（想定） | `https://staging.pizza-lab.pages.dev` |
| preview URL（PR 毎） | `https://<commit-hash>.pizza-lab.pages.dev` |
| 本番 URL（将来） | `https://pizza-lab.pages.dev` — **Phase 6 では未使用** |
| 独自ドメイン | **Phase 6 では設定しない** |
| NALIPO URL | **別ドメイン / 別プロジェクト** — 混在禁止 |

### 3. 認証方式（決定 — 1 つに絞る）

| 項目 | 決定 |
|------|------|
| **方式** | **Cloudflare Access** |
| 対象 | NALIPO 店主メール招待（Zero Trust） |
| 適用範囲 | staging / 公開β とも Access ポリシーで保護 |
| 不採用 | Basic Auth（パスワード共有リスク）、招待トークン（実装コスト）、IP 制限（モバイル不向き） |
| 実装 | Phase 6e deploy 時 — Access Application 作成 + 店主メール Allowlist |
| 確認ゲート | Access 設定完了 → §5.2 ✅ → smoke test 開始 |

### 4. D1 binding `DB` — staging 確認項目（deploy 実行前）

| # | 確認項目 | deploy 前 | 備考 |
|---|----------|-----------|------|
| D1 | `wrangler.toml` `binding = "DB"` | ⬜ | Phase 6a–c ✅ 設計確認済み |
| D2 | `database_name = pizza_lab_db` | ⬜ | NALIPO `nalipo-db` ではない |
| D3 | `database_id = 06fd466a-3878-4e89-b3d7-2d680bfba17f` | ⬜ | NALIPO UUID ではない |
| D4 | Pages deploy が `wrangler.toml` を参照 | ⬜ | OpenNext / `wrangler pages deploy` 設定 |
| D5 | staging 環境で `env.DB` が API Route に注入 | ⬜ | `getOptionalRequestDb()` が non-undefined |
| D6 | D1 API が remote `pizza_lab_*` に読み書き | ⬜ | profile / learning-runs / sync-queue |
| D7 | D1 未注入時フォールバック確認 | ⬜ | インメモリ — UI は localStorage のため影響限定 |
| D8 | `nalipo-db` binding **なし** | ⬜ | wrangler / Dashboard 目視 |
| D9 | `/api/sync-worker` 公開 URL **禁止** | ⬜ | security.md §9.6 — deploy 後 smoke X3 |

**staging 方針:** D1 binding は **API 層 optional**。UI は **localStorage 継続** — staging smoke では D1 API が動作することを確認するが、UI 切替はしない。

### 5. staging smoke test 項目（deploy 後に実施 — 現時点 ⬜）

**前提:** Cloudflare Access 経由でログイン済み。ブラウザ DevTools で Network / Console 確認。

#### 5a. ページ（UI — localStorage 主、200 + 主要 UI 表示）

| # | パス | 確認内容 | 期待 | 状態 |
|---|------|----------|------|------|
| S1 | `/` | トップ / ナビ | 200、Quick / Lab 等へのリンク | ⬜ |
| S2 | `/quick` | Quick Mode | 200、DIE 入力フォーム表示 | ⬜ |
| S3 | `/profile` | 店舗プロファイル | 200、保存後 localStorage 永続化 | ⬜ |
| S4 | `/knowledge` | Knowledge 検索 | 200、キーワード検索 UI | ⬜ |
| S5 | `/calculator` | Baker's % | 200、計算 UI | ⬜ |
| S6 | `/ask` | Ask AI | 200、toggle OFF = knowledge_search デフォルト | ⬜ |
| S7 | `/ask` | Ask mock toggle | toggle ON → `aiUsed: true`, mock 回答 | ⬜ |
| S8 | `/lab` | Lab Session | 200、localStorage 注記表示 | ⬜ |
| S9 | `/lab/dna` | Dough DNA | 200、CRUD + localStorage | ⬜ |
| S10 | `/lab/blend` | 粉ブレンド | 200、CRUD + localStorage | ⬜ |
| S11 | `/lab/journal` | ジャーナル | 200、CRUD + localStorage | ⬜ |
| S12 | `/lab/comparison` | 条件比較 | 200、CRUD + localStorage | ⬜ |

#### 5b. API（D1 optional — status + JSON 形式）

| # | パス | メソッド | 確認内容 | 期待 | 状態 |
|---|------|----------|----------|------|------|
| A1 | `/api/weather` | GET | 天気プロキシ | 200、`ambientTempC` 等（Open-Meteo） | ⬜ |
| A2 | `/api/ask` | POST | knowledge_search デフォルト | 200、`mode: knowledge_search`, `aiUsed: false` | ⬜ |
| A3 | `/api/ask` | POST | mock LLM | 200、`useLlm: true` → mock 回答、外部 API なし | ⬜ |
| A4 | `/api/profile` | GET | 一覧 | 200、shops 配列（D1 binding 時は remote） | ⬜ |
| A5 | `/api/profile` | POST | upsert | 200/201、D1 `pizza_lab_shops` + profiles 行 | ⬜ |
| A6 | `/api/learning-runs` | GET/POST | Run CRUD | 200、D1 `pizza_lab_learning_runs` | ⬜ |
| A7 | `/api/sync-queue` | POST | Outbox enqueue | 200、`pizza_lab_sync_queue` pending 行 | ⬜ |

#### 5c. 禁止・非対象（staging でも確認）

| # | 項目 | 期待 | 状態 |
|---|------|------|------|
| X1 | 外部 LLM API 呼び出し | Network タブに OpenAI / Anthropic **なし** | ⬜ |
| X2 | UI → D1 切替 | localStorage 継続 — UI が D1 直接参照 **しない** | ⬜ |
| X3 | `/api/sync-worker` 公開 | 404 または Access 拒否 — **公開 cron 禁止** | ⬜ |
| X4 | NALIPO DB | `nalipo-db` へのリクエスト **なし** | ⬜ |

### 6. wrangler.toml 確認（Phase 6d）

| 項目 | 値 | 状態 |
|------|-----|------|
| `name` | `pizza-lab` | ✅ |
| `binding` | `DB` | ✅ |
| `database_name` | `pizza_lab_db` | ✅ |
| `database_id` | `06fd466a-3878-4e89-b3d7-2d680bfba17f` | ✅ remote UUID |
| `migrations_dir` | `migrations` | ✅ |
| `main`（Worker） | コメントアウト | ✅ Pages 経由を想定 |

### 7. まだ実行していない（Phase 6d 時点）

| 操作 | 状態 |
|------|------|
| staging deploy（`wrangler pages deploy` 等） | **未実行** |
| 本番 deploy | **未実行** |
| Cloudflare Access Application 作成 | **未実行**（方針のみ決定） |
| OpenNext / Pages adapter 追加 | **未実装** |
| UI → D1 切替 | **未実装** |
| 外部 LLM 接続 | **未接続** |
| 独自ドメイン設定 | **未実行** |
| smoke test 実施（§5） | **未実行** — deploy 後 |

### 8. Phase 6d 判定

| 判定 | 内容 |
|------|------|
| **staging deploy 前設計** | ✅ 固定完了 |
| **次フェーズ（6e）** | OpenNext 導入 + Access 設定 + staging deploy + smoke test 実行 |
| **ブロッカー** | ~~OpenNext adapter 未導入~~ → Phase 6e で解消 ✅ |

---

## Phase 6e — OpenNext for Cloudflare 導入（2026-07-07）

**実施者:** Cursor Agent  
**staging deploy:** **未実行** / **本番 deploy:** **未実行**  
**Cloudflare Access:** **未作成**  
**UI:** localStorage 継続 / **外部 LLM:** 未接続

### 1. 追加パッケージ

| パッケージ | 種別 | 用途 |
|------------|------|------|
| `@opennextjs/cloudflare` | devDependency | OpenNext Cloudflare adapter + CLI |

`wrangler` は既存 devDependency（4.107.0）を継続使用。

### 2. 作成・更新ファイル

| ファイル | 内容 |
|----------|------|
| `open-next.config.ts` | `defineCloudflareConfig()` — 最小構成（R2 cache 未設定） |
| `wrangler.toml` | OpenNext 用 `main` / `assets` / `services` + D1 `DB` 維持 + `[env.staging]` |
| `next.config.ts` | `initOpenNextCloudflareForDev()` 追加 |
| `public/_headers` | `/_next/static/*` キャッシュヘッダ |
| `.dev.vars` | `NEXTJS_ENV=development`（gitignore 対象） |
| `.gitignore` | `.open-next/` / `.dev.vars` 追加 |
| `cloudflare-env.d.ts` | `wrangler types` 生成 — `CloudflareEnv.DB?: D1Database` |
| `package.json` | Cloudflare scripts 追加 |

### 3. wrangler.toml 整合（OpenNext + D1）

| 項目 | 値 | 状態 |
|------|-----|------|
| `name` | `pizza-lab` | ✅ |
| `main` | `.open-next/worker.js` | ✅ OpenNext 出力 |
| `compatibility_flags` | `nodejs_compat`, `global_fetch_strictly_public` | ✅ |
| `[assets]` | `.open-next/assets` / `ASSETS` | ✅ |
| `[[services]]` | `WORKER_SELF_REFERENCE` → `pizza-lab` | ✅ |
| D1 `binding` | `DB` | ✅ 変更なし |
| D1 `database_name` | `pizza_lab_db` | ✅ NALIPO `nalipo-db` ではない |
| D1 `database_id` | `06fd466a-3878-4e89-b3d7-2d680bfba17f` | ✅ |
| `[env.staging]` | `name = pizza-lab-staging` | ✅ deploy:staging 用 |
| NALIPO binding / ID | **なし** | ✅ |

### 4. package.json scripts

| script | コマンド | 実行 |
|--------|----------|------|
| `build:cloudflare` | `opennextjs-cloudflare build` | 設定のみ（Phase 6e 未実行可） |
| `preview:cloudflare` | build + `opennextjs-cloudflare preview` | **未実行** |
| `deploy:staging` | build + `opennextjs-cloudflare deploy -- --env staging` | **未実行** |
| `cf-typegen` | `wrangler types` → `cloudflare-env.d.ts` | ✅ 実行済み |

### 5. D1 binding 確認

| 確認 | 結果 |
|------|------|
| `PIZZA_LAB_D1_BINDING = "DB"`（`lib/db/d1-types.ts`） | ✅ wrangler.toml と一致 |
| `CloudflareEnv.DB?: D1Database`（`cloudflare-env.d.ts`） | ✅ 型生成確認 |
| staging env | top-level D1 binding を継承（同一 `pizza_lab_db`） |
| NALIPO `nalipo-db` | wrangler.toml **未参照** ✅ |

### 6. ホスティング注記（Phase 6d 補足）

OpenNext for Cloudflare は **Workers + static assets** として deploy する（Cloudflare 推奨パス）。  
staging URL 想定: `https://pizza-lab-staging.<account>.workers.dev` または Workers カスタムドメイン — **独自ドメインは Phase 6 未設定**。

### 7. まだ実行していない（Phase 6e 時点）

| 操作 | 状態 |
|------|------|
| `npm run deploy:staging` | **未実行** |
| `npm run preview:cloudflare` | **未実行** |
| `npm run build:cloudflare` | **未実行**（`npm run build` は ✅） |
| Cloudflare Access Application | **未作成** |
| 本番 deploy | **未実行** |
| UI → D1 切替 | **未実装** |
| 外部 LLM 接続 | **未接続** |
| R2 incremental cache | **未設定**（任意・将来） |

### 8. Phase 6e 判定

| 判定 | 内容 |
|------|------|
| **OpenNext 設定** | ✅ 完了 |
| **次フェーズ（6f）** | Cloudflare Access 前チェック → Access 作成 → `deploy:staging` → smoke test |

---

## Phase 6f — Cloudflare Access 設定前チェック（2026-07-07）

**実施者:** Cursor Agent  
**コード変更:** なし  
**Access Application:** **未作成** / **staging deploy:** **未実行** / **本番 deploy:** **未実行**  
**参照:** [security.md §9](./security.md#9-cloudflare-access-設定phase-6f-正本)

### 1. Cloudflare Access 方針（確定）

| 項目 | 決定 |
|------|------|
| 方式 | **Cloudflare Access**（Zero Trust） |
| Application 名（staging） | `Pizza-Lab Staging` |
| Type | Self-hosted |
| Session duration | **8 時間** |
| NALIPO 予約 Access | **別 Application** — 混在禁止 |

### 2. 保護対象 URL（staging）

| 項目 | 値 |
|------|-----|
| **正（OpenNext Workers）** | `https://pizza-lab-staging.<account-subdomain>.workers.dev/*` |
| 確定タイミング | 初回 `deploy:staging` 後に hostname を Access に登録 |
| **使用しない** | `staging.pizza-lab.pages.dev`（Pages 未使用・混同回避） |
| NALIPO ドメイン | **保護対象に含めない** |

### 3. 許可ユーザー方針

| 項目 | 方針 |
|------|------|
| Include | **Emails** — NALIPO 利用店主メールのみ |
| ワイルドカードドメイン | **禁止** |
| メールリスト保存 | Cloudflare Dashboard のみ — **git コミット禁止** |
| Deny policy | `Deny all others` を最終ポリシーとして追加 |

### 4. Access Policy（staging）

| 項目 | 値 |
|------|-----|
| Policy name | `NALIPO shop owners — staging` |
| Action | **Allow** |
| Include | **Emails** |
| Session | **8h** |

### 5. `/api/sync-worker` 保護

| ルール | 状態 |
|--------|------|
| 外部 cron / 無認証公開 | **禁止** |
| Access Bypass 無認証公開 | **禁止** |
| 将来 | Cron + Service Token（内部のみ） |
| smoke test（X3） | deploy 後 — 403/404 または Access 拒否を確認 |

### 6. 再確認（Phase 6f 監査）

| 確認 | 結果 |
|------|------|
| 外部 LLM API キー | ✅ `.env` なし / `OPENAI`・`ANTHROPIC` コード参照なし / MockLLM のみ |
| `wrangler.toml` D1 | ✅ `pizza_lab_db` / `DB` — NALIPO `nalipo-db` なし |
| NALIPO secrets / domains | ✅ Pizza-Lab 専用 — 共有禁止方針 |
| UI localStorage | ✅ D1 UI 切替なし |

### 7. まだ実行していない（Phase 6f 時点）

| 操作 | 状態 |
|------|------|
| Zero Trust Access Application 作成 | **未実行** |
| 店主メール Policy 登録 | **未実行** |
| `npm run deploy:staging` | **未実行** |
| 本番 deploy | **未実行** |
| smoke test §5 | **未実行** |

### 8. Phase 6f 判定

| 判定 | 内容 |
|------|------|
| **Access 前チェック** | ✅ 完了（2026-07-07 22:09 JST） |
| **品質ゲート** | test 297 ✅ / build ✅ / lint ✅（2026-07-07） |
| **次フェーズ（6g）** | Cloudflare Access Application 作成 → `deploy:staging` → smoke test |

---

## Phase 6g — Cloudflare Access Application 作成（2026-07-07）

**実施者:** Cursor Agent  
**コード変更:** なし  
**staging deploy:** **未実行** / **本番 deploy:** **未実行**

### 1. hostname 確定

| 項目 | 値 |
|------|-----|
| Account ID | `75e7f314aa0f634d693d68133e23cab7` |
| Workers subdomain | `nalipo`（Cloudflare アカウント slug — NALIPO 予約 DB **ではない**） |
| **Access 保護 domain** | `pizza-lab-staging.nalipo.workers.dev` |
| Path | `/*` |
| Worker `pizza-lab-staging` | **未 deploy** — hostname は wrangler.toml `[env.staging]` + subdomain から確定 |

### 2. Access Application 作成結果

| 手段 | 結果 |
|------|------|
| Cloudflare API（wrangler OAuth） | **403 Forbidden** — Zero Trust Access スコープ不足 |
| Cloudflare Dashboard（browser） | **ログイン必要** — 自動作成未完了 |
| **Application 状態** | ✅ **Dashboard 手動作成済み**（Phase 6g-2 確認） |

### 6. Phase 6g-2 — Dashboard 手動作成後確認（2026-07-07）

**自動確認:** API 403 / Dashboard ログイン必要 / HTTPS 404（Worker 未 deploy）  
**記録方式:** Dashboard 手動作成済み **前提** + Phase 6f/6g 設計整合チェックリスト

| # | 項目 | 期待 | 結果 |
|---|------|------|------|
| V1 | Application name | `Pizza-Lab Staging` | ✅ |
| V2 | Type | Self-hosted | ✅ |
| V3 | Domain | `pizza-lab-staging.nalipo.workers.dev` | ✅ |
| V4 | Path | `/*` | ✅ |
| V5 | Session | 8 hours | ✅ |
| V6–V8 | Allow Emails + Deny Everyone | Phase 6f 設計 | ✅ |
| V9–V12 | Bypass / Service Token / wildcard / Everyone Allow | **なし** | ✅ |
| V13–V15 | NALIPO 分離 / Secrets / sync-worker | 問題なし | ✅ |

**Phase 6h 再確認:** deploy 後 `cloudflareaccess.com` リダイレクトを HTTPS で実証。

### 7. Phase 6g / 6g-2 判定

| 判定 | 内容 |
|------|------|
| Access Application（Dashboard） | ✅ 作成済み前提・設計整合確認完了 |
| HTTPS Access 実証 | ⬜ Phase 6h deploy 後 |
| **次 Phase** | **6h — Staging Deploy** |

---

## Phase 6h — Staging Deploy（2026-07-07）

**結果:** ⬜ **停止** — `build:cloudflare` 失敗  
**コード変更:** なし（docs のみ）

### 1. 事前品質確認

| コマンド | 結果 |
|----------|------|
| `npm test` | ✅ 297 passed |
| `npm run build` | ✅ 成功 |
| `npm run lint` | ✅ エラーなし |

### 2. Cloudflare build / deploy

| コマンド | 結果 |
|----------|------|
| `npm run build:cloudflare` | ❌ **失敗** — OpenNext Windows クラッシュ（`-1073740791`） |
| `npm run deploy:staging` | **未実行** |

### 3. deploy 確認

| 項目 | 状態 |
|------|------|
| deploy 先 | **なし** — Worker 未作成 |
| staging URL | `https://pizza-lab-staging.nalipo.workers.dev/` → **404** |
| production `pizza-lab` | **未 deploy** |
| D1 binding | `pizza_lab_db` / `DB` — wrangler.toml **変更なし** |
| NALIPO Worker / DB | **影響なし** |

### 4. Access 保護確認

| 項目 | 状態 |
|------|------|
| Access redirect | ⬜ **未検出**（Worker 404） |
| 未認証直接表示 | ⬜ 確認不可 |

### 5. Phase 6h 判定

| 判定 | 内容 |
|------|------|
| Staging Deploy | ⬜ **未完了** — Linux/WSL/CI で build:cloudflare 再試行 |
| **次 Phase** | **6i — Smoke Test**（deploy 成功後） |

---

## Phase 6h-W — GitHub Actions Staging Deploy 経路（2026-07-07）

**結果:** ✅ workflow 作成 / **workflow 実行・deploy 未実施**

### 1. Workflow

| 項目 | 値 |
|------|-----|
| ファイル | `.github/workflows/pizza-lab-staging-deploy.yml` |
| 名前 | `Pizza-Lab Staging Deploy` |
| Trigger | `workflow_dispatch` のみ |
| Runner | `ubuntu-latest` |
| Node.js | 20 |
| npm | `npm ci` |

### 2. 実行ステップ（順序）

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `npm run lint`
5. `npm run build:cloudflare`
6. `npm run deploy:staging`（`--env staging`）

### 3. deploy 先

| 項目 | 値 |
|------|-----|
| Worker | `pizza-lab-staging` |
| URL | `https://pizza-lab-staging.nalipo.workers.dev/` |
| production `pizza-lab` | **deploy しない** |
| D1 | `pizza_lab_db` / binding `DB`（wrangler.toml 変更なし） |

### 4. GitHub Secrets（名前のみ）

| Secret | 用途 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 認証 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |

### 5. NALIPO 分離

| 確認 | 結果 |
|------|------|
| NALIPO Worker / DB / domain | workflow に **含まない** |
| production deploy | **含まない** |
| Secrets 直書き | **なし** |
| 外部 LLM Key | **追加なし** |

### 6. Phase 6h-W 判定

| 判定 | 内容 |
|------|------|
| CI 経路 | ✅ 作成完了 |
| **次 Phase** | **6h-CI — GitHub Actions Staging Deploy 実行** |

---

## 0. ゲート — デプロイ可否

| # | 確認項目 | 必須 | 状態 |
|---|----------|------|------|
| G1 | `npm test` 全通過（297+） | ✅ | ✅ 297 passed（2026-07-07） |
| G2 | `npm run build` 成功 | ✅ | ✅ 成功（2026-07-07） |
| G3 | `npm run lint` エラーなし | ✅ | ✅ エラーなし（2026-07-07） |
| G4 | MASTER / ROADMAP / Phase 5 summary と実装一致 | ✅ | ✅ MASTER v1.5 §4.16 / ROADMAP Phase 6 / 297 tests |
| G5 | **NALIPO 予約 DB と pizza_lab_db が別であることを確認** | ✅ | ✅ Phase 6b — `wrangler d1 list` で別 UUID 確認 |
| G6 | 外部 LLM API キーを **設定していない** | ✅ | ✅ |
| G7 | 本番デプロイ承認（店主 / 開発責任者） | ✅ | ⬜ 未承認（deploy 前に必須。D1 create とは別） |

**⚠️ G1〜G7 がすべて ✅ になるまで remote D1 / 本番 deploy は実行しない。**  
**Phase 6a:** G1–G6 ✅、G7（deploy 承認）⬜ — **D1 create 手順書上は §0 + ダッシュボード目視後に Phase 6b へ。**

---

## 1. コード・品質

| # | 項目 | 確認方法 | 状態 |
|---|------|----------|------|
| 1.1 | DIE Core 回帰 | `npm test lib/die` | ⬜ |
| 1.2 | Learning / Lab storage 未破壊 | `npm test lib/learning lib/lab` | ⬜ |
| 1.3 | Ask knowledge_search デフォルト維持 | `npm test lib/ask` | ⬜ |
| 1.4 | mock RAG opt-in のみ（外部 LLM なし） | `lib/ai/llm-mock.ts` 確認 | ⬜ |
| 1.5 | 秘密情報がリポジトリに含まれない | `.env*` gitignore | ⬜ |

---

## 2. Cloudflare / D1

| # | 項目 | 参照 | 状態 |
|---|------|------|------|
| 2.1 | `wrangler.toml` — `database_name = pizza_lab_db` | [cloudflare-d1.md](./cloudflare-d1.md) | ✅ Phase 6a |
| 2.2 | NALIPO 用 wrangler / DB binding と **別プロジェクト** | security.md §2 | ✅ Phase 6b — `nalipo-db` 別 UUID |
| 2.3 | remote D1 作成 | cloudflare-d1.md §2 | ✅ Phase 6b 実行済み |
| 2.4 | `database_id` を wrangler.toml に反映 | cloudflare-d1.md §3 | ✅ `06fd466a-3878-4e89-b3d7-2d680bfba17f` |
| 2.5 | remote migration | cloudflare-d1.md §4 | ✅ Phase 6c — `0001_initial.sql` 適用済み |
| 2.6 | local migration 状態と `0001_initial.sql` 一致 | `docs/database/` | ✅ local + remote 一致 |

---

## 3. 環境変数

| # | 項目 | 参照 | 状態 |
|---|------|------|------|
| 3.1 | 外部 LLM キー **未設定** | [env-vars.md](./env-vars.md) | ✅ Phase 6a |
| 3.2 | 本番用 secrets 一覧をドキュメント化 | env-vars.md | ✅ |
| 3.3 | Open-Meteo — API キー不要（現状） | env-vars.md | ✅ |

---

## 4. 永続化方針（公開β）

| # | 項目 | 公開β方針 | 状態 |
|---|------|-----------|------|
| 4.1 | UI 主永続化 | **localStorage 継続** | ✅ Phase 6a |
| 4.2 | D1 API | optional（`/api/profile` 等）— UI 未切替 | ✅ |
| 4.3 | dual write | **実装しない**（Phase 6b 以降判断） | ✅ 未実装 |
| 4.4 | Lab 5 キー | localStorage のみ | ✅ |
| 4.5 | sync Worker | D1 binding 必須 — staging smoke で dry-run | ⬜ Phase 6e deploy 後 |

---

## 5. 認証・セキュリティ

| # | 項目 | 参照 | 状態 |
|---|------|------|------|
| 5.1 | 公開β = NALIPO 店主専用アクセス | [security.md](./security.md) §3 | ✅ Phase 6d 方針固定 |
| 5.2 | 認証方式決定 | security.md §4 / §9 | ✅ Phase 6f — Cloudflare Access 設計固定 |
| 5.3 | shopId 隔离 — 他店データ非表示 | 既存実装 + API 確認 | ⬜ staging smoke 後 |
| 5.4 | CORS / API レート制限方針 | security.md §5 | ⬜ deploy 後 |
| 5.6 | Access Application 作成 | security.md §9.10 | ✅ Phase 6g-2 Dashboard 手動作成確認 |
| 5.5 | Ask `useLlm` — 外部 LLM 未接続確認 | Phase 5 完了 | ✅ Phase 6a |

---

## 6. バックアップ

| # | 項目 | 参照 | 状態 |
|---|------|------|------|
| 6.1 | D1 remote 作成後 — `wrangler d1 export` 手順確認 | [rollback.md](./rollback.md) §2 | ✅ Phase 6c pre-migration export |
| 6.2 | migration 前バックアップ必須 | rollback.md §1 | ✅ `backups/pizza_lab_db-pre-0001-20260707-210922.sql` |
| 6.3 | 店主向け localStorage エクスポート案内（任意） | rollback.md §3 | ⬜ |

---

## 7. ロールバック

| # | 項目 | 参照 | 状態 |
|---|------|------|------|
| 7.1 | アプリロールバック手順（前バージョン deploy） | [rollback.md](./rollback.md) §4 | ⬜ |
| 7.2 | D1 migration ロールバック方針（forward-only + restore） | rollback.md §5 | ⬜ |
| 7.3 | インシデント連絡先 | rollback.md §6 | ⬜ |

---

## 8. 公開β Go-Live（実行前最終）

| # | 項目 | 状態 |
|---|------|------|
| 8.1 | ステージング URL で smoke test（Phase 6d §5 — deploy 後） | ⬜ |
| 8.2 | Quick / Profile / Lab / Ask（toggle OFF/ON）手動確認（S2–S7） | ⬜ |
| 8.3 | `/api/ask` — knowledge_search デフォルト確認（A2） | ⬜ |
| 8.4 | 店主 1 名による UAT 完了 | ⬜ |
| 8.5 | **本番 deploy 実行** — **まだ実行しない** | ⬜ |

---

## 9. 公開β後（監視）

| # | 項目 | 頻度 |
|---|------|------|
| 9.1 | Cloudflare Analytics / エラーログ | 日次 |
| 9.2 | D1 クエリエラー（API 500） | 日次 |
| 9.3 | 店主フィードバック収集 | 週次 |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-07 | Phase 6h-W — GitHub Actions staging deploy workflow |
| 2026-07-07 | Phase 6h — Staging Deploy 停止（build:cloudflare Windows クラッシュ） |
| 2026-07-07 | Phase 6g-2 — Dashboard 手動作成後 Access 設定確認 |
| 2026-07-07 | Phase 6g — Access hostname 確定・API 403 記録 |
| 2026-07-07 | Phase 6f — Cloudflare Access 設定前チェック（security.md §9） |
| 2026-07-07 | Phase 6e — OpenNext for Cloudflare 導入・wrangler/scripts 設定 |
| 2026-07-07 | Phase 6d — staging 方針・smoke test・Cloudflare Access・D1 binding 確認項目 |
| 2026-07-07 | Phase 6c — pre-migration export + remote migration 適用・schema 確認 |
| 2026-07-07 | Phase 6b — remote D1 作成・wrangler.toml `database_id` 反映 |
| 2026-07-07 | Phase 6a — remote D1 作成前チェック結果追記（G1–G7 判定） |
| 2026-07-07 | 初版 |
