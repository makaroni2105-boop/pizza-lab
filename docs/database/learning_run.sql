-- Pizza-Lab: learning_runs
-- Phase 3 設計 DDL（未実行）
-- 対応: lib/learning/learning-types.ts LearningRun
-- localStorage: pizzalab-learning-runs-v1

CREATE TABLE IF NOT EXISTS learning_runs (
  id                      TEXT PRIMARY KEY NOT NULL,

  shop_id                 TEXT NOT NULL,
  mixer_key               TEXT NOT NULL,

  -- ISO 8601 — 仕込み・記録日時
  recorded_at             TEXT NOT NULL,

  -- LearningRunSnapshot
  flour_temp_c            REAL NOT NULL,
  water_temp_c            REAL NOT NULL,
  room_temp_c             REAL NOT NULL,

  -- DIE 予測値
  predicted_friction_c    REAL NOT NULL,
  predicted_dough_temp_c  REAL NOT NULL,

  -- 職人入力
  actual_dough_temp_c     REAL NOT NULL,
  target_ddt_c            REAL,
  craftsman_score         INTEGER,
  memo                    TEXT,

  created_at              TEXT NOT NULL,

  FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CHECK (craftsman_score IS NULL OR (craftsman_score >= 1 AND craftsman_score <= 5)),
  CHECK (actual_dough_temp_c >= -40.0 AND actual_dough_temp_c <= 80.0)
);

CREATE INDEX IF NOT EXISTS idx_learning_runs_shop_recorded
  ON learning_runs (shop_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_runs_shop_mixer
  ON learning_runs (shop_id, mixer_key, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_runs_created_at
  ON learning_runs (created_at DESC);

-- PG 移行メモ:
--   recorded_at / created_at → TIMESTAMPTZ
--   大量 Run 時: BRIN INDEX ON learning_runs (recorded_at)
