/**
 * 仕込み記録 API の Cloudflare Access 認証ゲート。
 */

import {
  loadAccessConfigFromEnv,
  readAccessJwtFromRequest,
  verifyCloudflareAccessJwt,
  type AccessJwtVerifyResult,
} from "@/lib/auth/cloudflare-access-jwt";
import {
  detectDailyPrepPersistenceMode,
  type DailyPrepPersistenceMode,
} from "@/lib/runtime/daily-prep-persistence";

export interface DailyPrepAccessAuth {
  ok: boolean;
  email?: string;
  reason?: string;
}

export interface DailyPrepAuthOptions {
  request?: Request;
  persistenceMode?: DailyPrepPersistenceMode;
  /** 単体テスト用 — 本番相当では使用不可 */
  accessAuthOverride?: DailyPrepAccessAuth;
}

const UNAUTHENTICATED = {
  code: "UNAUTHENTICATED",
  message: "認証が必要です（Cloudflare Access）。",
} as const;

export function unauthenticatedResponseBody() {
  return {
    success: false as const,
    error: UNAUTHENTICATED,
  };
}

export async function authenticateDailyPrepApi(
  options: DailyPrepAuthOptions,
): Promise<DailyPrepAccessAuth> {
  const mode = options.persistenceMode ?? detectDailyPrepPersistenceMode();

  if (mode === "test" && options.accessAuthOverride) {
    return options.accessAuthOverride;
  }

  if (mode === "test") {
    return { ok: true, email: "vitest@local" };
  }

  if (
    mode === "development" &&
    process.env.PIZZA_LAB_DEV_SKIP_ACCESS_AUTH === "1"
  ) {
    return { ok: true, email: "dev@local" };
  }

  const request = options.request;
  if (!request) {
    return { ok: false, reason: "missing_request" };
  }

  const token = readAccessJwtFromRequest(request);
  const config = loadAccessConfigFromEnv();

  if (!config) {
    return { ok: false, reason: "auth_not_configured" };
  }

  const verified: AccessJwtVerifyResult = await verifyCloudflareAccessJwt(
    token,
    config,
  );

  if (!verified.ok) {
    return { ok: false, reason: verified.reason ?? "unauthorized" };
  }

  return { ok: true, email: verified.email, reason: undefined };
}