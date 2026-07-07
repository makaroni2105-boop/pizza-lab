/**
 * sync_queue Worker — pending レコードを dequeue し D1 に反映。
 * lib/db Repository のみ使用。UI / localStorage / dual write は触らない。
 */

import { isLearningRun } from "@/lib/api/learning-run-handler";
import type { D1Database, PizzaLabSyncQueueRow } from "@/lib/db/d1-types";
import {
  deleteLearningRunById,
  findLearningRunById,
  insertLearningRun,
} from "@/lib/db/learning-run-repository";
import {
  findShopProfileById,
  softDeleteShopProfile,
  upsertShopProfile,
} from "@/lib/db/profile-repository";
import {
  listPendingSyncItems,
  updateSyncItemStatus,
} from "@/lib/db/sync-queue-repository";
import type { LearningRun } from "@/lib/learning/learning-types";
import type { ShopProfile } from "@/types/profile";

import {
  DEFAULT_SYNC_WORKER_BATCH_SIZE,
  MAX_SYNC_WORKER_BATCH_SIZE,
  SyncProcessError,
  type SyncItemProcessOutcome,
  type SyncWorkerOptions,
  type SyncWorkerResult,
} from "./sync-types";

export interface SyncWorkerDeps extends SyncWorkerOptions {
  db?: D1Database;
  now?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShopProfile(value: unknown): value is ShopProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isRecord(value.flour) &&
    isRecord(value.mixer) &&
    isRecord(value.method) &&
    isRecord(value.ddt) &&
    Array.isArray(value.presets)
  );
}

function parsePayloadJson(payloadJson: string | null): unknown {
  if (payloadJson === null || payloadJson === "") {
    return null;
  }

  try {
    return JSON.parse(payloadJson) as unknown;
  } catch {
    throw new SyncProcessError("INVALID_PAYLOAD", "payload_json の JSON が不正です");
  }
}

function requireShopProfilePayload(
  item: PizzaLabSyncQueueRow,
): ShopProfile {
  const payload = parsePayloadJson(item.payload_json);

  if (!isShopProfile(payload)) {
    throw new SyncProcessError("INVALID_PAYLOAD", "ShopProfile payload が必要です");
  }

  if (payload.id !== item.entity_id) {
    throw new SyncProcessError(
      "ENTITY_ID_MISMATCH",
      "payload.id と entity_id が一致しません",
    );
  }

  return payload;
}

function requireLearningRunPayload(item: PizzaLabSyncQueueRow): LearningRun {
  const payload = parsePayloadJson(item.payload_json);

  if (!isLearningRun(payload)) {
    throw new SyncProcessError("INVALID_PAYLOAD", "LearningRun payload が必要です");
  }

  if (payload.id !== item.entity_id) {
    throw new SyncProcessError(
      "ENTITY_ID_MISMATCH",
      "payload.id と entity_id が一致しません",
    );
  }

  return payload;
}

export function parseSyncWorkerLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_SYNC_WORKER_BATCH_SIZE;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SYNC_WORKER_BATCH_SIZE;
  }

  return Math.min(Math.floor(parsed), MAX_SYNC_WORKER_BATCH_SIZE);
}

async function dispatchSyncItem(
  db: D1Database,
  item: PizzaLabSyncQueueRow,
  processedAt: string,
): Promise<void> {
  switch (item.entity_type) {
    case "shop_profile":
      await processShopProfile(db, item, processedAt);
      return;
    case "learning_run":
      await processLearningRun(db, item);
      return;
    default:
      throw new SyncProcessError(
        "UNSUPPORTED_ENTITY",
        `entity_type ${item.entity_type} は Phase 3b 未対応です`,
      );
  }
}

async function processShopProfile(
  db: D1Database,
  item: PizzaLabSyncQueueRow,
  processedAt: string,
): Promise<void> {
  if (item.operation === "upsert") {
    const profile = requireShopProfilePayload(item);
    await upsertShopProfile(db, profile);
    return;
  }

  if (item.operation === "delete") {
    const deleted = await softDeleteShopProfile(db, item.entity_id, processedAt);
    if (!deleted) {
      throw new SyncProcessError("ENTITY_NOT_FOUND", "削除対象の shop_profile が見つかりません");
    }
    return;
  }

  throw new SyncProcessError(
    "UNSUPPORTED_OPERATION",
    `shop_profile に operation ${item.operation} は未対応です`,
  );
}

async function processLearningRun(
  db: D1Database,
  item: PizzaLabSyncQueueRow,
): Promise<void> {
  if (item.operation === "upsert") {
    const run = requireLearningRunPayload(item);
    await insertLearningRun(db, run);
    return;
  }

  if (item.operation === "delete") {
    const deleted = await deleteLearningRunById(db, item.entity_id);
    if (!deleted) {
      throw new SyncProcessError("ENTITY_NOT_FOUND", "削除対象の learning_run が見つかりません");
    }
    return;
  }

  throw new SyncProcessError(
    "UNSUPPORTED_OPERATION",
    `learning_run に operation ${item.operation} は未対応です`,
  );
}

export async function processSyncQueueItem(
  db: D1Database,
  item: PizzaLabSyncQueueRow,
  now?: () => number,
): Promise<SyncItemProcessOutcome> {
  const processedAt = new Date(now?.() ?? Date.now()).toISOString();
  const baseOutcome = {
    id: item.id,
    entityType: item.entity_type,
    entityId: item.entity_id,
    operation: item.operation,
  };

  const claimed = await updateSyncItemStatus(db, item.id, "processing", processedAt);
  if (!claimed) {
    return { ...baseOutcome, status: "skipped", errorCode: "CLAIM_FAILED" };
  }

  try {
    await dispatchSyncItem(db, item, processedAt);
    await updateSyncItemStatus(db, item.id, "done", processedAt);
    return { ...baseOutcome, status: "done" };
  } catch (error) {
    const errorCode = error instanceof SyncProcessError ? error.code : "PROCESS_FAILED";
    const errorMessage =
      error instanceof Error ? error.message : "sync item の処理に失敗しました";

    await updateSyncItemStatus(db, item.id, "failed", processedAt, errorMessage);

    return {
      ...baseOutcome,
      status: "failed",
      errorCode,
      errorMessage,
    };
  }
}

/**
 * pending レコードを順に処理する。
 * D1 binding が無い場合は DB_UNAVAILABLE（memory fallback なし — 永続化先が D1 のため）。
 */
export async function processSyncQueue(deps: SyncWorkerDeps): Promise<SyncWorkerResult> {
  if (!deps.db) {
    return {
      success: false,
      error: {
        code: "DB_UNAVAILABLE",
        message: "D1 binding (DB) が無いため sync Worker を実行できません",
      },
    };
  }

  const limit = deps.limit ?? DEFAULT_SYNC_WORKER_BATCH_SIZE;
  const pending = await listPendingSyncItems(deps.db, limit);
  const outcomes: SyncItemProcessOutcome[] = [];

  for (const item of pending) {
    outcomes.push(await processSyncQueueItem(deps.db, item, deps.now));
  }

  const done = outcomes.filter((outcome) => outcome.status === "done").length;
  const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
  const skipped = outcomes.filter((outcome) => outcome.status === "skipped").length;

  return {
    success: true,
    processed: outcomes.length,
    done,
    failed,
    skipped,
    outcomes,
  };
}

/** テスト・検証用 — 処理結果が D1 に反映されたか確認 */
export async function verifyShopProfileSynced(
  db: D1Database,
  shopId: string,
): Promise<ShopProfile | null> {
  return findShopProfileById(db, shopId);
}

export async function verifyLearningRunSynced(
  db: D1Database,
  runId: string,
): Promise<LearningRun | null> {
  return findLearningRunById(db, runId);
}
