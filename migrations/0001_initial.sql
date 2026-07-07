-- Pizza-Lab D1 initial migration
-- 設計正本: docs/database/
-- テーブル名: pizza_lab_* （NALIPO 等の他プロジェクトと混同しない）
-- SQLite 3 / Cloudflare D1 互換

-- ---------------------------------------------------------------------------
-- pizza_lab_shops
-- 対応: types/profile.ts ShopProfile.id, name, location
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_shops (
  id                  TEXT PRIMARY KEY NOT NULL,
  name                TEXT NOT NULL,
  city                TEXT,
  country             TEXT,
  latitude            REAL,
  longitude           REAL,
  setup_completed_at  TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT,
  CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

CREATE INDEX idx_pizza_lab_shops_deleted_at
  ON pizza_lab_shops (deleted_at);

CREATE INDEX idx_pizza_lab_shops_updated_at
  ON pizza_lab_shops (updated_at DESC);

-- ---------------------------------------------------------------------------
-- pizza_lab_profiles
-- 対応: ShopProfile 設定 JSON（shops と 1:1）
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_profiles (
  shop_id             TEXT PRIMARY KEY NOT NULL,
  default_preset_id   TEXT,
  flour_json          TEXT NOT NULL DEFAULT '{}',
  mixer_json          TEXT NOT NULL DEFAULT '{}',
  method_json         TEXT NOT NULL DEFAULT '{}',
  ddt_json            TEXT NOT NULL DEFAULT '{}',
  presets_json        TEXT NOT NULL DEFAULT '[]',
  learning_json       TEXT NOT NULL DEFAULT '[]',
  schema_version      INTEGER NOT NULL DEFAULT 1,
  updated_at          TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES pizza_lab_shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
-- pizza_lab_learning_runs
-- 対応: lib/learning/learning-types.ts LearningRun
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_learning_runs (
  id                      TEXT PRIMARY KEY NOT NULL,
  shop_id                 TEXT NOT NULL,
  mixer_key               TEXT NOT NULL,
  recorded_at             TEXT NOT NULL,
  flour_temp_c            REAL NOT NULL,
  water_temp_c            REAL NOT NULL,
  room_temp_c             REAL NOT NULL,
  predicted_friction_c    REAL NOT NULL,
  predicted_dough_temp_c  REAL NOT NULL,
  actual_dough_temp_c     REAL NOT NULL,
  target_ddt_c            REAL,
  craftsman_score         INTEGER,
  memo                    TEXT,
  created_at              TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES pizza_lab_shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CHECK (craftsman_score IS NULL OR (craftsman_score >= 1 AND craftsman_score <= 5)),
  CHECK (actual_dough_temp_c >= -40.0 AND actual_dough_temp_c <= 80.0)
);

CREATE INDEX idx_pizza_lab_learning_runs_shop_recorded
  ON pizza_lab_learning_runs (shop_id, recorded_at DESC);

CREATE INDEX idx_pizza_lab_learning_runs_shop_mixer
  ON pizza_lab_learning_runs (shop_id, mixer_key, recorded_at DESC);

CREATE INDEX idx_pizza_lab_learning_runs_created_at
  ON pizza_lab_learning_runs (created_at DESC);

-- ---------------------------------------------------------------------------
-- pizza_lab_knowledge_entries
-- 対応: lib/knowledge/knowledge-types.ts KnowledgeEntry
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_knowledge_entries (
  id              TEXT PRIMARY KEY NOT NULL,
  tier            INTEGER NOT NULL,
  category        TEXT NOT NULL,
  title_ja        TEXT NOT NULL,
  summary_type    TEXT NOT NULL,
  tags_json       TEXT NOT NULL DEFAULT '[]',
  keywords_json   TEXT NOT NULL DEFAULT '[]',
  ai_usable       INTEGER NOT NULL DEFAULT 1,
  body            TEXT NOT NULL,
  relative_path   TEXT NOT NULL,
  shop_id         TEXT,
  content_hash    TEXT,
  published_at    TEXT,
  updated_at      TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES pizza_lab_shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CHECK (tier >= 1 AND tier <= 5),
  CHECK (ai_usable IN (0, 1)),
  CHECK (
    (tier = 5 AND shop_id IS NOT NULL)
    OR (tier <> 5 AND shop_id IS NULL)
  )
);

CREATE UNIQUE INDEX idx_pizza_lab_knowledge_relative_path
  ON pizza_lab_knowledge_entries (relative_path);

CREATE INDEX idx_pizza_lab_knowledge_tier_category
  ON pizza_lab_knowledge_entries (tier, category);

CREATE INDEX idx_pizza_lab_knowledge_shop_id
  ON pizza_lab_knowledge_entries (shop_id)
  WHERE shop_id IS NOT NULL;

CREATE INDEX idx_pizza_lab_knowledge_updated_at
  ON pizza_lab_knowledge_entries (updated_at DESC);

-- ---------------------------------------------------------------------------
-- pizza_lab_weather_cache
-- 対応: lib/weather/weather-types.ts WeatherCurrent
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_weather_cache (
  cache_key             TEXT PRIMARY KEY NOT NULL,
  latitude              REAL NOT NULL,
  longitude             REAL NOT NULL,
  ambient_temp_c        REAL NOT NULL,
  ambient_humidity_pct  REAL NOT NULL,
  source                TEXT NOT NULL DEFAULT 'open-meteo',
  fetched_at            TEXT NOT NULL,
  expires_at            TEXT NOT NULL,
  CHECK (latitude >= -90.0 AND latitude <= 90.0),
  CHECK (longitude >= -180.0 AND longitude <= 180.0),
  CHECK (ambient_humidity_pct >= 0.0 AND ambient_humidity_pct <= 100.0)
);

CREATE INDEX idx_pizza_lab_weather_cache_expires_at
  ON pizza_lab_weather_cache (expires_at);

CREATE INDEX idx_pizza_lab_weather_cache_lat_lon
  ON pizza_lab_weather_cache (latitude, longitude);

-- ---------------------------------------------------------------------------
-- pizza_lab_sync_queue
-- localStorage → D1 Outbox（Phase 3b で Worker 処理）
-- ---------------------------------------------------------------------------

CREATE TABLE pizza_lab_sync_queue (
  id              TEXT PRIMARY KEY NOT NULL,
  shop_id         TEXT,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  operation       TEXT NOT NULL,
  payload_json    TEXT,
  client_id       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  retry_count     INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TEXT NOT NULL,
  processed_at    TEXT,
  FOREIGN KEY (shop_id) REFERENCES pizza_lab_shops (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CHECK (operation IN ('upsert', 'delete')),
  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  CHECK (entity_type IN ('shop', 'shop_profile', 'learning_run', 'knowledge_entry')),
  CHECK (retry_count >= 0)
);

CREATE INDEX idx_pizza_lab_sync_queue_status_created
  ON pizza_lab_sync_queue (status, created_at);

CREATE INDEX idx_pizza_lab_sync_queue_shop_entity
  ON pizza_lab_sync_queue (shop_id, entity_type, entity_id);

CREATE INDEX idx_pizza_lab_sync_queue_client_id
  ON pizza_lab_sync_queue (client_id, created_at DESC);
