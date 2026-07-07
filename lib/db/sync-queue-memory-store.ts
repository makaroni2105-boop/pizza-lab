/**
 * サーバー側インメモリ sync_queue ストア（API fallback 用）。
 * pizza_lab_sync_queue 行構造に準拠。
 */

import type {
  PizzaLabSyncQueueRow,
  SyncQueueEnqueueInput,
  SyncQueueStatus,
} from "./d1-types";

export class SyncQueueMemoryStore {
  private items = new Map<string, PizzaLabSyncQueueRow>();

  enqueue(input: SyncQueueEnqueueInput): PizzaLabSyncQueueRow {
    const row: PizzaLabSyncQueueRow = {
      id: input.id,
      shop_id: input.shopId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      operation: input.operation,
      payload_json: input.payloadJson ?? null,
      client_id: input.clientId,
      status: "pending",
      retry_count: 0,
      error_message: null,
      created_at: input.createdAt,
      processed_at: null,
    };

    this.items.set(row.id, row);
    return row;
  }

  listPending(limit: number): PizzaLabSyncQueueRow[] {
    return Array.from(this.items.values())
      .filter((item) => item.status === "pending")
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .slice(0, limit);
  }

  updateStatus(
    id: string,
    status: SyncQueueStatus,
    processedAt: string,
    errorMessage?: string | null,
  ): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }

    item.status = status;
    item.processed_at = processedAt;
    item.error_message = errorMessage ?? null;
    this.items.set(id, item);
    return true;
  }

  clear(): void {
    this.items.clear();
  }
}

let defaultStore: SyncQueueMemoryStore | null = null;

export function getDefaultSyncQueueMemoryStore(): SyncQueueMemoryStore {
  if (!defaultStore) {
    defaultStore = new SyncQueueMemoryStore();
  }

  return defaultStore;
}

export function resetDefaultSyncQueueMemoryStore(): void {
  defaultStore = null;
}

export function rowToSyncQueueItem(row: PizzaLabSyncQueueRow): SyncQueueItem {
  return {
    id: row.id,
    shopId: row.shop_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadJson: row.payload_json,
    clientId: row.client_id,
    status: row.status,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  };
}

export interface SyncQueueItem {
  id: string;
  shopId: string | null;
  entityType: PizzaLabSyncQueueRow["entity_type"];
  entityId: string;
  operation: PizzaLabSyncQueueRow["operation"];
  payloadJson: string | null;
  clientId: string;
  status: SyncQueueStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}
