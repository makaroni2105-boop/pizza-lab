-- Pizza-Lab: knowledge_entries
-- Phase 3 設計 DDL（未実行）
-- 対応: lib/knowledge/knowledge-types.ts KnowledgeEntry
-- 正本: docs/schemas/knowledge-entry.schema.json
-- Markdown ソース: content/knowledge/

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id              TEXT PRIMARY KEY NOT NULL,

  -- 1=official, 2=science, 3=intelligence, 4=glossary, 5=craftsman
  tier            INTEGER NOT NULL,

  category        TEXT NOT NULL,
  title_ja        TEXT NOT NULL,
  summary_type    TEXT NOT NULL,

  -- JSON 配列文字列: string[]
  tags_json       TEXT NOT NULL DEFAULT '[]',
  keywords_json   TEXT NOT NULL DEFAULT '[]',

  -- 0=false, 1=true
  ai_usable       INTEGER NOT NULL DEFAULT 1,

  -- Frontmatter 以降の Markdown 本文
  body            TEXT NOT NULL,

  -- リポジトリ内相対パス（同期キー）
  relative_path   TEXT NOT NULL,

  -- Tier 5 のみ NOT NULL。Tier 1-4 は NULL（グローバル）
  shop_id         TEXT,

  -- Markdown 変更検知（SHA-256 hex）
  content_hash    TEXT,

  published_at    TEXT,
  updated_at      TEXT NOT NULL,

  FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CHECK (tier >= 1 AND tier <= 5),
  CHECK (ai_usable IN (0, 1)),
  CHECK (
    (tier = 5 AND shop_id IS NOT NULL)
    OR (tier <> 5 AND shop_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_relative_path
  ON knowledge_entries (relative_path);

CREATE INDEX IF NOT EXISTS idx_knowledge_tier_category
  ON knowledge_entries (tier, category);

CREATE INDEX IF NOT EXISTS idx_knowledge_shop_id
  ON knowledge_entries (shop_id)
  WHERE shop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_updated_at
  ON knowledge_entries (updated_at DESC);

-- PG 移行メモ:
--   tags_json / keywords_json → JSONB + GIN
--   body は Phase 5 RAG まで TEXT のまま（embedding テーブルは別途）
--   Tier 5 CHECK は PG でも同等の CONSTRAINT 可能
