-- Pizza-Lab: shop_profiles
-- Phase 3 設計 DDL（未実行）
-- 対応: ShopProfile.flour, mixer, method, ddt, presets, learning, defaultPresetId
-- shops と 1:1。JSON 列は docs/schemas/profile.schema.json 準拠

CREATE TABLE IF NOT EXISTS shop_profiles (
  shop_id           TEXT PRIMARY KEY NOT NULL,

  default_preset_id TEXT,

  -- JSON 文字列（ShopProfile サブオブジェクト）
  flour_json        TEXT NOT NULL DEFAULT '{}',
  mixer_json        TEXT NOT NULL DEFAULT '{}',
  method_json       TEXT NOT NULL DEFAULT '{}',
  ddt_json          TEXT NOT NULL DEFAULT '{}',
  presets_json      TEXT NOT NULL DEFAULT '[]',

  -- LearningSummary[] のキャッシュ（learning_runs から再計算可能）
  learning_json     TEXT NOT NULL DEFAULT '[]',

  -- profile.schema.json のバージョン追跡
  schema_version    INTEGER NOT NULL DEFAULT 1,

  updated_at        TEXT NOT NULL,

  FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- PG 移行メモ:
--   *_json → JSONB + GIN（presets / learning 検索が必要になった場合）
--   schema_version でアプリ側マイグレーションを制御
