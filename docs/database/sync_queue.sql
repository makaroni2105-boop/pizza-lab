-- Pizza-Lab: sync_queue
-- Phase 3 設計 DDL（未実行）
-- localStorage → D1 同期の Outbox パターン
-- クライアントがオフラインで書き込み → オンライン復帰時に Worker が処理

CREATE TABLE IF NOT EXISTS sync_queue (
  id              TEXT PRIMARY KEY NOT NULL,

  -- NULL = グローバル操作（knowledge 同期等）
  shop_id         TEXT,

  -- shop | shop_profile | learning_run | knowledge_entry
  entity_type     TEXT NOT NULL,

  entity_id       TEXT NOT NULL,

  -- upsert | delete
  operation       TEXT NOT NULL,

  -- エンティティ JSON スナップショット（delete 時は NULL 可）
  payload_json    TEXT,

  -- 端末識別子（UUID、localStorage 生成）
  client_id       TEXT NOT NULL,

  -- pending | processing | done | failed
  status          TEXT NOT NULL DEFAULT 'pending',

  retry_count     INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,

  created_at      TEXT NOT NULL,
  processed_at    TEXT,

  FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CHECK (operation IN ('upsert', 'delete')),
  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  CHECK (entity_type IN ('shop', 'shop_profile', 'learning_run', 'knowledge_entry')),
  CHECK (retry_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created
  ON sync_queue (status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_queue_shop_entity
  ON sync_queue (shop_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_queue_client_id
  ON sync_queue (client_id, created_at DESC);

-- 冪等性: 同一 client_id + entity_type + entity_id + operation の pending は
-- アプリ層でマージ（Phase 3b 実装）。DB UNIQUE は過剰制約を避けインデックスのみ。

-- PG 移行メモ:
--   status='pending' 部分インデックスで dequeue 高速化
--   processed_at IS NOT NULL の古い行をアーカイブ / 削除
