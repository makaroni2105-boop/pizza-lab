/**
 * /api/learning-runs ハンドラー（テスト可能）。
 * D1（pizza_lab_learning_runs）optional。
 * 無い場合・失敗時は LearningRunMemoryStore にフォールバック。
 * profile.learning 更新は行わない（Phase 3a スコープ外）。
 */

import type { D1Database } from "@/lib/db/d1-types";
import {
  deleteLearningRunById,
  insertLearningRun,
  listLearningRunsByShopId,
} from "@/lib/db/learning-run-repository";
import type { CraftsmanScore, LearningRun } from "@/lib/learning/learning-types";
import {
  CRAFTSMAN_SCORE_MAX,
  CRAFTSMAN_SCORE_MIN,
} from "@/lib/learning/learning-types";
import {
  getDefaultLearningRunMemoryStore,
  type LearningRunMemoryStore,
} from "@/lib/learning/learning-run-memory-store";

export interface LearningRunApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface LearningRunApiListSuccessResponse {
  success: true;
  runs: LearningRun[];
}

export interface LearningRunApiUpsertSuccessResponse {
  success: true;
  run: LearningRun;
}

export interface LearningRunApiDeleteSuccessResponse {
  success: true;
  deleted: boolean;
}

export type LearningRunApiResponse =
  | LearningRunApiErrorResponse
  | LearningRunApiListSuccessResponse
  | LearningRunApiUpsertSuccessResponse
  | LearningRunApiDeleteSuccessResponse;

export interface LearningRunHandlerResult {
  status: number;
  body: LearningRunApiResponse;
}

export interface LearningRunHandlerDeps {
  db?: D1Database;
  memory?: LearningRunMemoryStore;
  now?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLearningRunSnapshot(value: unknown): value is LearningRun["snapshot"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.flourTempC === "number" &&
    typeof value.waterTempC === "number" &&
    typeof value.roomTempC === "number"
  );
}

export function isLearningRun(value: unknown): value is LearningRun {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.shopId !== "string" ||
    typeof value.mixerKey !== "string" ||
    typeof value.recordedAt !== "string" ||
    !isLearningRunSnapshot(value.snapshot) ||
    typeof value.predictedFrictionC !== "number" ||
    typeof value.predictedDoughTempC !== "number" ||
    typeof value.actualDoughTempC !== "number"
  ) {
    return false;
  }

  if (value.craftsmanScore !== undefined) {
    const score = value.craftsmanScore;
    if (
      typeof score !== "number" ||
      score < CRAFTSMAN_SCORE_MIN ||
      score > CRAFTSMAN_SCORE_MAX
    ) {
      return false;
    }
  }

  return true;
}

export async function handleLearningRunListRequest(
  shopId: string,
  deps?: LearningRunHandlerDeps,
): Promise<LearningRunHandlerResult> {
  if (!shopId) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_SHOP_ID", message: "shopId が必要です" },
      },
    };
  }

  const memory = deps?.memory ?? getDefaultLearningRunMemoryStore();

  if (deps?.db) {
    try {
      const runs = await listLearningRunsByShopId(deps.db, shopId);
      return { status: 200, body: { success: true, runs } };
    } catch {
      // fall through to memory
    }
  }

  return {
    status: 200,
    body: { success: true, runs: memory.listByShopId(shopId) },
  };
}

export async function handleLearningRunUpsertRequest(
  body: unknown,
  deps?: LearningRunHandlerDeps,
): Promise<LearningRunHandlerResult> {
  if (!isLearningRun(body)) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_LEARNING_RUN", message: "LearningRun 形式が不正です" },
      },
    };
  }

  const run: LearningRun = {
    ...body,
    craftsmanScore: body.craftsmanScore as CraftsmanScore | undefined,
  };

  const memory = deps?.memory ?? getDefaultLearningRunMemoryStore();

  if (deps?.db) {
    try {
      await insertLearningRun(deps.db, run);
      return { status: 200, body: { success: true, run } };
    } catch {
      // fall through to memory
    }
  }

  const saved = memory.upsert(run);
  return { status: 200, body: { success: true, run: saved } };
}

export async function handleLearningRunDeleteRequest(
  id: string,
  deps?: LearningRunHandlerDeps,
): Promise<LearningRunHandlerResult> {
  if (!id) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_RUN_ID", message: "id が必要です" },
      },
    };
  }

  const memory = deps?.memory ?? getDefaultLearningRunMemoryStore();

  if (deps?.db) {
    try {
      const deleted = await deleteLearningRunById(deps.db, id);
      if (deleted) {
        return { status: 200, body: { success: true, deleted: true } };
      }
    } catch {
      // fall through to memory
    }
  }

  const deleted = memory.delete(id);
  if (deleted) {
    return { status: 200, body: { success: true, deleted: true } };
  }

  return {
    status: 404,
    body: {
      success: false,
      error: { code: "RUN_NOT_FOUND", message: "研究記録が見つかりません" },
    },
  };
}
