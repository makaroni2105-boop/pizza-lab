# Pizza-Lab Database Design（Phase 3a）

> **Version:** 0.1.0  
> **Last Updated:** 2026-07-06  
> **Status:** 設計固定 — Phase 3a + 3b 実装完了。remote migration / UI D1 切替 / Ask LLM は Phase 4–5

Cloudflare D1（SQLite）を Phase 3 の第一永続化層とし、将来 PostgreSQL へ移行可能なスキーマを定義する。

**正本との関係:**

| 正本 | 対応 |
|------|------|
| `types/profile.ts` | `shops` + `shop_profiles` |
| `lib/learning/learning-types.ts` | `learning_runs` |
| `lib/knowledge/knowledge-types.ts` | `knowledge_entries` |
| `lib/weather/weather-types.ts` | `weather_cache` |
| localStorage 同期 | `sync_queue` |

---

## 1. 設計方針

### 1.1 Cloudflare D1 前提

| 項目 | 方針 |
|------|------|
| エンジン | SQLite 3（D1） |
| ID | `TEXT` UUID v4（`shop-1` 等の既存 ID も移行期間中は許容） |
| 日時 | ISO 8601 `TEXT`（`2026-07-06T12:00:00.000Z`）— タイムゾーン明示 |
| 真偽値 | `INTEGER NOT NULL DEFAULT 0`（0=false, 1=true） |
| JSON | `TEXT` + アプリ側パース（D1 JSON 関数は補助的に使用可） |
| FK | `ON DELETE RESTRICT`（Run がある shop は削除不可。soft delete で対応） |
| マイグレーション | Wrangler `d1 migrations` — Phase 3b で実行 |

### 1.2 PostgreSQL 移植性

| D1 / SQLite | PostgreSQL 移行時 |
|-------------|-------------------|
| `TEXT` UUID | `UUID` または `TEXT` |
| `TEXT` ISO8601 | `TIMESTAMPTZ`（移行スクリプトで `::timestamptz`） |
| `INTEGER` bool | `BOOLEAN` |
| `TEXT` JSON | `JSONB`（GIN インデックス追加） |
| `REAL` | `DOUBLE PRECISION` |
| `INSERT OR REPLACE` | `INSERT ... ON CONFLICT DO UPDATE` |

**移植ルール:**

1. SQLite 専用構文（`AUTOINCREMENT`, `WITHOUT ROWID`）は使わない
2. 部分インデックスは PG でも同等定義可能な条件のみ
3. トリガー・ストアドプロシージャにビジネスロジックを置かない（DIE / Learning はアプリ層）
4. 集計（`profile.learning`）は DB ビューではなくアプリ再計算（既存 `learning-summary.ts` 維持）

### 1.3 正規化 vs JSON ハイブリッド

| エンティティ | 方針 | 理由 |
|-------------|------|------|
| shops | リレーショナル | 一覧・所在地検索 |
| shop_profiles | JSON カラム | `ShopProfile` 1:1 移行、presets 配列の変更コスト低 |
| learning_runs | リレーショナル | 履歴クエリ・集計・インデックス |
| knowledge_entries | リレーショナル + body TEXT | 検索・Tier フィルタ。RAG 用 embedding は Phase 5 |
| weather_cache | リレーショナル | TTL 期限切れ削除 |
| sync_queue | リレーショナル | オフライン同期キュー |

---

## 2. ER 図

```mermaid
erDiagram
    shops ||--|| shop_profiles : "has"
    shops ||--o{ learning_runs : "records"
    shops ||--o{ knowledge_entries : "owns_tier5"
    shops ||--o{ sync_queue : "scopes"

    shops {
        text id PK
        text name
        text city
        text country
        real latitude
        real longitude
        text setup_completed_at
        text created_at
        text updated_at
        text deleted_at
    }

    shop_profiles {
        text shop_id PK_FK
        text default_preset_id
        text flour_json
        text mixer_json
        text method_json
        text ddt_json
        text presets_json
        text learning_json
        integer schema_version
        text updated_at
    }

    learning_runs {
        text id PK
        text shop_id FK
        text mixer_key
        text recorded_at
        real flour_temp_c
        real water_temp_c
        real room_temp_c
        real predicted_friction_c
        real predicted_dough_temp_c
        real actual_dough_temp_c
        real target_ddt_c
        integer craftsman_score
        text memo
        text created_at
    }

    knowledge_entries {
        text id PK
        integer tier
        text category
        text title_ja
        text summary_type
        text tags_json
        text keywords_json
        integer ai_usable
        text body
        text relative_path
        text shop_id FK
        text content_hash
        text published_at
        text updated_at
    }

    weather_cache {
        text cache_key PK
        real latitude
        real longitude
        real ambient_temp_c
        real ambient_humidity_pct
        text source
        text fetched_at
        text expires_at
    }

    sync_queue {
        text id PK
        text shop_id FK
        text entity_type
        text entity_id
        text operation
        text payload_json
        text client_id
        text status
        integer retry_count
        text error_message
        text created_at
        text processed_at
    }
```

**関係の補足:**

- `shops` ↔ `shop_profiles` は **1:1**（v0.1）。多店舗 Pro プランは `shops` を複数持つ
- `knowledge_entries.shop_id` は **NULL = グローバル**（Tier 1〜4）、**NOT NULL = 店舗スコープ**（Tier 5 craftsman）
- `weather_cache` は shop 非依存（座標キー）
- `sync_queue` は localStorage → D1 同期の Outbox パターン

---

## 3. テーブル一覧

| テーブル | SQL ファイル | 説明 | localStorage 対応 |
|----------|-------------|------|-------------------|
| `shops` | [shop.sql](./shop.sql) | 店舗エンティティ（id, 名称, 所在地） | `ShopProfile.id`, `name`, `location` |
| `shop_profiles` | [profile.sql](./profile.sql) | 粉・ミキサー・配合・presets・learning 集計 | `ShopProfile` 残りフィールド |
| `learning_runs` | [learning_run.sql](./learning_run.sql) | 研究記録（1 Run = 1 仕込み） | `pizzalab-learning-runs-v1` |
| `knowledge_entries` | [knowledge.sql](./knowledge.sql) | KDB 記事インデックス | `content/knowledge/` |
| `weather_cache` | [weather_cache.sql](./weather_cache.sql) | 外気温・湿度キャッシュ | インメモリ → D1 永続化 |
| `sync_queue` | [sync_queue.sql](./sync_queue.sql) | クライアント同期 Outbox | 新規（Phase 3b） |

**クライアントのみ（DB 外）:**

| データ | 理由 |
|--------|------|
| `selectedShopId` | 認証・端末ローカル。Phase 3+ で `user_preferences` 検討 |
| DIE 計算結果 | 揮発性。Run 保存時に必要フィールドのみ `learning_runs` へ |
| master JSON | `data/*.json` は引き続きリポジトリ配布 |

---

## 4. インデックス案

### shops

| インデックス | 列 | 用途 |
|-------------|-----|------|
| `idx_shops_deleted_at` | `deleted_at` | 有効店舗一覧（`WHERE deleted_at IS NULL`） |
| `idx_shops_updated_at` | `updated_at DESC` | 同期差分取得 |

### shop_profiles

| インデックス | 列 | 用途 |
|-------------|-----|------|
| （PK のみ） | `shop_id` | 1:1 のため追加不要 |

### learning_runs

| インデックス | 列 | 用途 |
|-------------|-----|------|
| `idx_learning_runs_shop_recorded` | `shop_id`, `recorded_at DESC` | Run History 一覧 |
| `idx_learning_runs_shop_mixer` | `shop_id`, `mixer_key`, `recorded_at DESC` | ミキサー別集計 |
| `idx_learning_runs_created_at` | `created_at DESC` | 同期・監査 |

### knowledge_entries

| インデックス | 列 | 用途 |
|-------------|-----|------|
| `idx_knowledge_tier_category` | `tier`, `category` | Tier / カテゴリフィルタ |
| `idx_knowledge_shop_id` | `shop_id` | Tier 5 店舗記事 |
| `idx_knowledge_relative_path` | `relative_path` UNIQUE | Markdown ソース ↔ DB 同期 |
| `idx_knowledge_updated_at` | `updated_at DESC` | 差分同期 |

### weather_cache

| インデックス | 列 | 用途 |
|-------------|-----|------|
| `idx_weather_cache_expires_at` | `expires_at` | TTL 切れエントリ削除 |
| `idx_weather_cache_lat_lon` | `latitude`, `longitude` | 座標検索（cache_key 以外の参照用） |

### sync_queue

| インデックス | 列 | 用途 |
|-------------|-----|------|
| `idx_sync_queue_status_created` | `status`, `created_at` | pending 処理順 |
| `idx_sync_queue_shop_entity` | `shop_id`, `entity_type`, `entity_id` | 重複検出・冪等 |
| `idx_sync_queue_client_id` | `client_id`, `created_at DESC` | 端末別同期 |

**PostgreSQL 追加候補（移行時）:**

- `knowledge_entries`: GIN on `keywords_json` / `tags_json`（JSONB 化後）
- `learning_runs`: BRIN on `recorded_at`（大量 Run 時）

---

## 5. localStorage → D1 マッピング（Phase 3b 参考）

```
pizzalab-profiles-v1.profiles[]
  → shops（id, name, location.*, timestamps）
  → shop_profiles（flour/mixer/method/ddt/presets/learning → JSON 列）

pizzalab-learning-runs-v1.runs[]
  → learning_runs（1:1 フィールドマップ）

content/knowledge/**/*.md
  → knowledge_entries（frontmatter + body、relative_path UNIQUE）

（新規）weather API キャッシュ
  → weather_cache（Workers 側で TTL 管理）
```

**learning_json の扱い:** DB 上はキャッシュ。真のソースは `learning_runs`。保存・削除時に `buildLearningSummariesByMixer()` で再計算（既存ロジック踏襲）。

---

## 6. Phase 3a 実装状態（2026-07-07）

| # | 項目 | 状態 |
|---|------|------|
| 1 | 6 テーブル DDL（本ディレクトリ・論理名） | ✅ |
| 2 | `migrations/0001_initial.sql`（`pizza_lab_*`） | ✅ local 適用済み |
| 3 | `wrangler.toml` + binding `DB` | ✅ |
| 4 | `lib/db/` Repository 層 | ✅ |
| 5 | API（weather / profile / learning-runs / sync-queue / sync-worker / ask） | ✅ |
| 6 | sync Worker（`lib/sync/`） | ✅ Phase 3b |
| 7 | DIE / Learning / Weather / Knowledge 純粋ロジック | ✅ 未変更 |
| 8 | UI localStorage 継続 / dual write なし | ✅ |
| 9 | remote D1 / UI D1 切替 / Ask LLM | ⬜ Phase 4–5 |

**実装サマリー:** [docs/phase-3a-summary.md](../phase-3a-summary.md) · [docs/phase-3b-summary.md](../phase-3b-summary.md)

**テーブル名対応:** 設計正本は論理名（`shops` 等）。D1 migration 実体は `pizza_lab_*` prefix（NALIPO 分離）。

---

## 7. 関連ファイル

| ファイル | 内容 |
|----------|------|
| [shop.sql](./shop.sql) | `shops` |
| [profile.sql](./profile.sql) | `shop_profiles` |
| [learning_run.sql](./learning_run.sql) | `learning_runs` |
| [knowledge.sql](./knowledge.sql) | `knowledge_entries` |
| [weather_cache.sql](./weather_cache.sql) | `weather_cache` |
| [sync_queue.sql](./sync_queue.sql) | `sync_queue` |

---

## 変更履歴

| Date | 変更内容 |
|------|----------|
| 2026-07-06 | 初版 — Phase 3 データモデル設計固定 |
| 2026-07-06 | ROADMAP / PIZZALAB_MASTER v0.8 / README へ反映 |
