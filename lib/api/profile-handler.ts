/**
 * /api/profile ハンドラー（テスト可能）。
 * D1（pizza_lab_shops + pizza_lab_profiles）optional。
 * 無い場合・失敗時はサーバーインメモリ ProfileMemoryStore にフォールバック。
 */

import type { D1Database } from "@/lib/db/d1-types";
import {
  findShopProfileById,
  listShopProfiles,
  softDeleteShopProfile,
  upsertShopProfile,
} from "@/lib/db/profile-repository";
import {
  getDefaultProfileMemoryStore,
  type ProfileMemoryStore,
} from "@/lib/profile/profile-memory-store";
import type { ShopProfile } from "@/types/profile";

export interface ProfileApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface ProfileApiListSuccessResponse {
  success: true;
  profiles: ShopProfile[];
}

export interface ProfileApiOneSuccessResponse {
  success: true;
  profile: ShopProfile;
}

export interface ProfileApiUpsertSuccessResponse {
  success: true;
  profile: ShopProfile;
}

export interface ProfileApiDeleteSuccessResponse {
  success: true;
  deleted: boolean;
}

export type ProfileApiResponse =
  | ProfileApiErrorResponse
  | ProfileApiListSuccessResponse
  | ProfileApiOneSuccessResponse
  | ProfileApiUpsertSuccessResponse
  | ProfileApiDeleteSuccessResponse;

export interface ProfileHandlerResult {
  status: number;
  body: ProfileApiResponse;
}

export interface ProfileHandlerDeps {
  db?: D1Database;
  memory?: ProfileMemoryStore;
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

export async function handleProfileListRequest(
  deps?: ProfileHandlerDeps,
): Promise<ProfileHandlerResult> {
  const memory = deps?.memory ?? getDefaultProfileMemoryStore();

  if (deps?.db) {
    try {
      const profiles = await listShopProfiles(deps.db);
      return { status: 200, body: { success: true, profiles } };
    } catch {
      // fall through to memory
    }
  }

  return {
    status: 200,
    body: { success: true, profiles: memory.list() },
  };
}

export async function handleProfileGetRequest(
  shopId: string,
  deps?: ProfileHandlerDeps,
): Promise<ProfileHandlerResult> {
  if (!shopId) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_SHOP_ID", message: "shopId が必要です" },
      },
    };
  }

  const memory = deps?.memory ?? getDefaultProfileMemoryStore();

  if (deps?.db) {
    try {
      const profile = await findShopProfileById(deps.db, shopId);
      if (profile) {
        return { status: 200, body: { success: true, profile } };
      }
    } catch {
      // fall through to memory
    }
  }

  const memoryProfile = memory.get(shopId);
  if (memoryProfile) {
    return { status: 200, body: { success: true, profile: memoryProfile } };
  }

  return {
    status: 404,
    body: {
      success: false,
      error: { code: "PROFILE_NOT_FOUND", message: "店舗プロファイルが見つかりません" },
    },
  };
}

export async function handleProfileUpsertRequest(
  body: unknown,
  deps?: ProfileHandlerDeps,
): Promise<ProfileHandlerResult> {
  if (!isShopProfile(body)) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_PROFILE", message: "ShopProfile 形式が不正です" },
      },
    };
  }

  const nowIso = new Date(deps?.now?.() ?? Date.now()).toISOString();
  const profile: ShopProfile = {
    ...body,
    updatedAt: nowIso,
    createdAt: body.createdAt ?? nowIso,
  };

  const memory = deps?.memory ?? getDefaultProfileMemoryStore();

  if (deps?.db) {
    try {
      await upsertShopProfile(deps.db, profile);
      return { status: 200, body: { success: true, profile } };
    } catch {
      // fall through to memory
    }
  }

  const saved = memory.upsert(profile);
  return { status: 200, body: { success: true, profile: saved } };
}

export async function handleProfileDeleteRequest(
  shopId: string,
  deps?: ProfileHandlerDeps,
): Promise<ProfileHandlerResult> {
  if (!shopId) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_SHOP_ID", message: "shopId が必要です" },
      },
    };
  }

  const memory = deps?.memory ?? getDefaultProfileMemoryStore();
  const nowIso = new Date(deps?.now?.() ?? Date.now()).toISOString();

  if (deps?.db) {
    try {
      const deleted = await softDeleteShopProfile(deps.db, shopId, nowIso);
      if (deleted) {
        return { status: 200, body: { success: true, deleted: true } };
      }
    } catch {
      // fall through to memory
    }
  }

  const deleted = memory.delete(shopId);
  if (deleted) {
    return { status: 200, body: { success: true, deleted: true } };
  }

  return {
    status: 404,
    body: {
      success: false,
      error: { code: "PROFILE_NOT_FOUND", message: "店舗プロファイルが見つかりません" },
    },
  };
}
