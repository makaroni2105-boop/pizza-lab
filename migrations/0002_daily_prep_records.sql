-- Pizza Lab: 毎日の仕込み記録（計算スナップショット + 編集履歴）
-- 既存 pizza_lab_* 命名。NALIPO 予約 DB とは無関係。

CREATE TABLE pizza_lab_daily_prep_records (
  id                      TEXT PRIMARY KEY NOT NULL,
  prep_date_jst           TEXT NOT NULL,
  shop_id                 TEXT,
  total_flour_kg          INTEGER NOT NULL,
  baseline_formula_json   TEXT NOT NULL,
  session_adjustment_json TEXT,
  computed_formula_json   TEXT NOT NULL,
  computed_materials_json TEXT NOT NULL,
  actual_materials_json   TEXT NOT NULL,
  room_temp_c             REAL,
  memo                    TEXT,
  dough_state_11am        TEXT,
  weather_snapshot_json   TEXT NOT NULL,
  ai_search_json          TEXT NOT NULL,
  current_revision        INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  CHECK (total_flour_kg >= 1 AND total_flour_kg <= 20),
  CHECK (current_revision >= 1)
);

CREATE TABLE pizza_lab_daily_prep_record_revisions (
  id                    TEXT PRIMARY KEY NOT NULL,
  record_id             TEXT NOT NULL,
  revision_number       INTEGER NOT NULL,
  created_at            TEXT NOT NULL,
  change_kind           TEXT NOT NULL,
  record_snapshot_json  TEXT NOT NULL,
  FOREIGN KEY (record_id) REFERENCES pizza_lab_daily_prep_records (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CHECK (change_kind IN ('create', 'update')),
  CHECK (revision_number >= 1)
);

CREATE UNIQUE INDEX idx_pizza_lab_daily_prep_record_revisions_record_rev
  ON pizza_lab_daily_prep_record_revisions (record_id, revision_number);

CREATE INDEX idx_pizza_lab_daily_prep_records_prep_date
  ON pizza_lab_daily_prep_records (prep_date_jst DESC);

CREATE INDEX idx_pizza_lab_daily_prep_records_updated_at
  ON pizza_lab_daily_prep_records (updated_at DESC);