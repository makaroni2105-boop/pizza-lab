/**
 * POST /api/die/quick ハンドラー（テスト可能な純粋ロジック）。
 */

import type { DieOutput, QuickModeRequest } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import type { WeatherSnapshot } from "@/lib/defaults";
import { computeDie } from "@/lib/die";
import { resolveShopProfile } from "@/lib/profile/demo-profiles";

export interface DieQuickApiRequestBody extends QuickModeRequest {
  /** DB 未実装時は body に含めて送信可能。省略時は demo shopId のみ解決 */
  profile?: ShopProfile;
  useTime?: string | null;
  weather?: WeatherSnapshot;
}

export interface DieQuickApiSuccessResponse {
  success: true;
  output: DieOutput;
  incompleteBlocks: string[];
}

export interface DieQuickApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type DieQuickApiResponse = DieQuickApiSuccessResponse | DieQuickApiErrorResponse;

export interface DieQuickHandlerResult {
  status: number;
  body: DieQuickApiResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidQuickModeRequest(value: unknown): value is QuickModeRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (value.mode !== "quick") {
    return false;
  }

  if (typeof value.shopId !== "string" || value.shopId.length === 0) {
    return false;
  }

  if (typeof value.presetId !== "string" || value.presetId.length === 0) {
    return false;
  }

  if (!isRecord(value.batch)) {
    return false;
  }

  if (
    typeof value.batch.pizzaCount !== "number" ||
    Number.isNaN(value.batch.pizzaCount) ||
    value.batch.pizzaCount <= 0
  ) {
    return false;
  }

  return true;
}

function parseRequestBody(body: unknown): DieQuickApiRequestBody | null {
  if (!isValidQuickModeRequest(body)) {
    return null;
  }

  return body as DieQuickApiRequestBody;
}

export function handleDieQuickRequest(body: unknown, calculatedAt?: string): DieQuickHandlerResult {
  const request = parseRequestBody(body);

  if (!request) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "QuickModeRequest の形式が不正です",
        },
      },
    };
  }

  const profile = resolveShopProfile(request.shopId, request.profile);

  if (!profile) {
    return {
      status: 404,
      body: {
        success: false,
        error: {
          code: "PROFILE_NOT_FOUND",
          message: `shopId "${request.shopId}" のプロファイルが見つかりません`,
        },
      },
    };
  }

  try {
    const { output, incompleteBlocks } = computeDie({
      request,
      profile,
      weather: request.weather,
      useTime: request.useTime,
      calculatedAt,
    });

    return {
      status: 200,
      body: {
        success: true,
        output,
        incompleteBlocks,
      },
    };
  } catch {
    return {
      status: 200,
      body: {
        success: false,
        error: {
          code: "COMPUTE_FAILED",
          message: "DIE 計算中にエラーが発生しました",
        },
      },
    };
  }
}
