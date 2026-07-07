/**
 * POST /api/sync-worker — sync_queue Worker トリガー（最小 API）。
 * D1 必須。Node dev（binding 無し）では 503。
 */

import type { D1Database } from "@/lib/db/d1-types";
import {
  parseSyncWorkerLimit,
  processSyncQueue,
  type SyncWorkerResult,
} from "@/lib/sync";

export interface SyncWorkerHandlerResult {
  status: number;
  body: SyncWorkerResult;
}

export interface SyncWorkerHandlerDeps {
  db?: D1Database;
  limit?: number;
  now?: () => number;
}

export async function handleSyncWorkerProcessRequest(
  deps?: SyncWorkerHandlerDeps,
): Promise<SyncWorkerHandlerResult> {
  const result = await processSyncQueue({
    db: deps?.db,
    limit: deps?.limit,
    now: deps?.now,
  });

  if (!result.success) {
    return { status: 503, body: result };
  }

  return { status: 200, body: result };
}

export { parseSyncWorkerLimit };
