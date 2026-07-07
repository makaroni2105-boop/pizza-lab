/**
 * sync_queue Worker 型定義。
 * pizza_lab_sync_queue の pending → processing → done | failed。
 */

import type {
  SyncQueueEntityType,
  SyncQueueOperation,
} from "@/lib/db/d1-types";

/** 1 件の処理結果 */
export type SyncItemProcessStatus = "done" | "failed" | "skipped";

export interface SyncItemProcessOutcome {
  id: string;
  entityType: SyncQueueEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  status: SyncItemProcessStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface SyncWorkerSuccessResult {
  success: true;
  processed: number;
  done: number;
  failed: number;
  skipped: number;
  outcomes: SyncItemProcessOutcome[];
}

export interface SyncWorkerErrorResult {
  success: false;
  error: {
    code: "DB_UNAVAILABLE";
    message: string;
  };
}

export type SyncWorkerResult = SyncWorkerSuccessResult | SyncWorkerErrorResult;

export interface SyncWorkerOptions {
  /** 1 バッチで処理する pending 上限（デフォルト 10） */
  limit?: number;
}

export const DEFAULT_SYNC_WORKER_BATCH_SIZE = 10;
export const MAX_SYNC_WORKER_BATCH_SIZE = 50;

/** entity 処理中の検証・分岐エラー */
export class SyncProcessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SyncProcessError";
  }
}
