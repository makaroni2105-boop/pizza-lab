/**
 * /api/sync-queue ハンドラー（Outbox API 土台）。
 * D1（pizza_lab_sync_queue）optional。
 * 無い場合・失敗時は SyncQueueMemoryStore にフォールバック。
 * Worker 処理本体は lib/sync/sync-worker.ts（POST /api/sync-worker）。
 */

import type {
  D1Database,
  SyncQueueEnqueueInput,
  SyncQueueEntityType,
  SyncQueueOperation,
  SyncQueueStatus,
} from "@/lib/db/d1-types";
import {
  getDefaultSyncQueueMemoryStore,
  rowToSyncQueueItem,
  type SyncQueueItem,
  type SyncQueueMemoryStore,
} from "@/lib/db/sync-queue-memory-store";
import {
  enqueueSyncItem,
  listPendingSyncItems,
  updateSyncItemStatus,
} from "@/lib/db/sync-queue-repository";

const ENTITY_TYPES: SyncQueueEntityType[] = [
  "shop",
  "shop_profile",
  "learning_run",
  "knowledge_entry",
];

const OPERATIONS: SyncQueueOperation[] = ["upsert", "delete"];

const STATUSES: SyncQueueStatus[] = ["pending", "processing", "done", "failed"];

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export interface SyncQueueApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface SyncQueueApiListSuccessResponse {
  success: true;
  items: SyncQueueItem[];
}

export interface SyncQueueApiEnqueueSuccessResponse {
  success: true;
  item: SyncQueueItem;
}

export interface SyncQueueApiUpdateSuccessResponse {
  success: true;
  updated: boolean;
}

export type SyncQueueApiResponse =
  | SyncQueueApiErrorResponse
  | SyncQueueApiListSuccessResponse
  | SyncQueueApiEnqueueSuccessResponse
  | SyncQueueApiUpdateSuccessResponse;

export interface SyncQueueHandlerResult {
  status: number;
  body: SyncQueueApiResponse;
}

export interface SyncQueueHandlerDeps {
  db?: D1Database;
  memory?: SyncQueueMemoryStore;
  now?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseListLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIST_LIMIT;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIST_LIMIT);
}

export function isSyncQueueEnqueueInput(value: unknown): value is SyncQueueEnqueueInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.entityType === "string" &&
    ENTITY_TYPES.includes(value.entityType as SyncQueueEntityType) &&
    typeof value.entityId === "string" &&
    value.entityId.length > 0 &&
    typeof value.operation === "string" &&
    OPERATIONS.includes(value.operation as SyncQueueOperation) &&
    typeof value.clientId === "string" &&
    value.clientId.length > 0 &&
    typeof value.createdAt === "string" &&
    value.createdAt.length > 0 &&
    (value.shopId === undefined ||
      value.shopId === null ||
      typeof value.shopId === "string") &&
    (value.payloadJson === undefined ||
      value.payloadJson === null ||
      typeof value.payloadJson === "string")
  );
}

export function isSyncQueueStatusUpdateBody(
  value: unknown,
): value is { id: string; status: SyncQueueStatus; errorMessage?: string | null } {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.status === "string" &&
    STATUSES.includes(value.status as SyncQueueStatus) &&
    value.status !== "pending" &&
    (value.errorMessage === undefined ||
      value.errorMessage === null ||
      typeof value.errorMessage === "string")
  );
}

export async function handleSyncQueueListRequest(
  limit: number,
  deps?: SyncQueueHandlerDeps,
): Promise<SyncQueueHandlerResult> {
  const memory = deps?.memory ?? getDefaultSyncQueueMemoryStore();

  if (deps?.db) {
    try {
      const rows = await listPendingSyncItems(deps.db, limit);
      return {
        status: 200,
        body: { success: true, items: rows.map(rowToSyncQueueItem) },
      };
    } catch {
      // fall through to memory
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      items: memory.listPending(limit).map(rowToSyncQueueItem),
    },
  };
}

export async function handleSyncQueueEnqueueRequest(
  body: unknown,
  deps?: SyncQueueHandlerDeps,
): Promise<SyncQueueHandlerResult> {
  if (!isSyncQueueEnqueueInput(body)) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_SYNC_ITEM", message: "sync queue 形式が不正です" },
      },
    };
  }

  const memory = deps?.memory ?? getDefaultSyncQueueMemoryStore();

  if (deps?.db) {
    try {
      await enqueueSyncItem(deps.db, body);
      const rows = await listPendingSyncItems(deps.db, MAX_LIST_LIMIT);
      const row = rows.find((item) => item.id === body.id);
      if (row) {
        return { status: 200, body: { success: true, item: rowToSyncQueueItem(row) } };
      }
    } catch {
      // fall through to memory
    }
  }

  const row = memory.enqueue(body);
  return { status: 200, body: { success: true, item: rowToSyncQueueItem(row) } };
}

export async function handleSyncQueueUpdateStatusRequest(
  body: unknown,
  deps?: SyncQueueHandlerDeps,
): Promise<SyncQueueHandlerResult> {
  if (!isSyncQueueStatusUpdateBody(body)) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_STATUS_UPDATE",
          message: "id と status（pending 以外）が必要です",
        },
      },
    };
  }

  const processedAt = new Date(deps?.now?.() ?? Date.now()).toISOString();
  const memory = deps?.memory ?? getDefaultSyncQueueMemoryStore();

  if (deps?.db) {
    try {
      const updated = await updateSyncItemStatus(
        deps.db,
        body.id,
        body.status,
        processedAt,
        body.errorMessage ?? null,
      );
      if (updated) {
        return { status: 200, body: { success: true, updated: true } };
      }
    } catch {
      // fall through to memory
    }
  }

  const updated = memory.updateStatus(
    body.id,
    body.status,
    processedAt,
    body.errorMessage ?? null,
  );

  if (updated) {
    return { status: 200, body: { success: true, updated: true } };
  }

  return {
    status: 404,
    body: {
      success: false,
      error: { code: "SYNC_ITEM_NOT_FOUND", message: "同期キュー項目が見つかりません" },
    },
  };
}
