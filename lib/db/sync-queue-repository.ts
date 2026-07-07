/**
 * pizza_lab_sync_queue Repository（Outbox）。
 */

import { queryAll, execute } from "./d1-client";
import {
  PIZZA_LAB_TABLES,
  type D1Database,
  type PizzaLabSyncQueueRow,
  type SyncQueueEnqueueInput,
  type SyncQueueStatus,
} from "./d1-types";

const TABLE = PIZZA_LAB_TABLES.syncQueue;

export async function enqueueSyncItem(
  db: D1Database,
  input: SyncQueueEnqueueInput,
): Promise<void> {
  await execute(
    db,
    `INSERT OR REPLACE INTO ${TABLE} (
      id, shop_id, entity_type, entity_id, operation,
      payload_json, client_id, status, retry_count,
      error_message, created_at, processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id,
    input.shopId ?? null,
    input.entityType,
    input.entityId,
    input.operation,
    input.payloadJson ?? null,
    input.clientId,
    "pending",
    0,
    null,
    input.createdAt,
    null,
  );
}

export async function listPendingSyncItems(
  db: D1Database,
  limit: number,
): Promise<PizzaLabSyncQueueRow[]> {
  return queryAll<PizzaLabSyncQueueRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE status = ? ORDER BY created_at ASC LIMIT ?`,
    "pending",
    limit,
  );
}

export async function updateSyncItemStatus(
  db: D1Database,
  id: string,
  status: SyncQueueStatus,
  processedAt: string,
  errorMessage?: string | null,
): Promise<boolean> {
  const result = await execute(
    db,
    `UPDATE ${TABLE} SET status = ?, processed_at = ?, error_message = ? WHERE id = ?`,
    status,
    processedAt,
    errorMessage ?? null,
    id,
  );

  return result.meta.changes > 0;
}

export async function incrementSyncRetry(
  db: D1Database,
  id: string,
  errorMessage: string,
): Promise<boolean> {
  const result = await execute(
    db,
    `UPDATE ${TABLE}
     SET retry_count = retry_count + 1, status = 'failed', error_message = ?
     WHERE id = ?`,
    errorMessage,
    id,
  );

  return result.meta.changes > 0;
}
