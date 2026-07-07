-- Pizza-Lab: shops
-- Phase 3 設計 DDL（未実行）
-- 対応: types/profile.ts ShopProfile.id, name, location
-- D1: SQLite 3 / PG 移行: shops テーブル名・列名そのまま

CREATE TABLE IF NOT EXISTS shops (
  -- UUID v4 または移行期間中の既存 ID（例: shop-1）
  id              TEXT PRIMARY KEY NOT NULL,

  name            TEXT NOT NULL,

  -- ShopLocation（types/profile.ts）
  city            TEXT,
  country         TEXT,
  latitude        REAL,
  longitude       REAL,

  -- ISO 8601 UTC
  setup_completed_at TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,

  -- soft delete（learning_runs 存在時は物理削除しない）
  deleted_at      TEXT,

  CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

CREATE INDEX IF NOT EXISTS idx_shops_deleted_at
  ON shops (deleted_at);

CREATE INDEX IF NOT EXISTS idx_shops_updated_at
  ON shops (updated_at DESC);

-- PG 移行メモ:
--   created_at / updated_at → TIMESTAMPTZ
--   deleted_at IS NULL で有効店舗フィルタ（部分インデックス可）
