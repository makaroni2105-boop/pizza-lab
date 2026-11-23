/**
 * 仕込み記録の永続化ポリシー（本番相当は D1 必須、メモリは開発・テスト限定）。
 */

export type DailyPrepPersistenceMode = "test" | "development" | "production";

export function detectDailyPrepPersistenceMode(): DailyPrepPersistenceMode {
  if (process.env.VITEST === "true" || process.env.VITEST === "1") {
    return "test";
  }

  if (process.env.NODE_ENV === "development") {
    return "development";
  }

  return "production";
}

export function canUseMemoryPersistence(
  mode: DailyPrepPersistenceMode,
  options?: { allowMemoryPersistence?: boolean },
): boolean {
  if (options?.allowMemoryPersistence === true) {
    return true;
  }

  if (mode === "test") {
    return true;
  }

  if (
    mode === "development" &&
    process.env.PIZZA_LAB_ALLOW_MEMORY_PERSISTENCE === "1"
  ) {
    return true;
  }

  return false;
}

export function isD1RequiredForDailyPrep(
  mode: DailyPrepPersistenceMode,
  hasDb: boolean,
  options?: { allowMemoryPersistence?: boolean },
): boolean {
  if (hasDb) {
    return false;
  }

  return !canUseMemoryPersistence(mode, options);
}

export const D1_REQUIRED_ERROR = {
  code: "DB_UNAVAILABLE",
  message:
    "データベース（D1）に接続できないため保存できません。Cloudflare 営業環境では永続保存が必須です。",
} as const;

export const DB_PERSIST_ERROR = {
  code: "DB_PERSIST_FAILED",
  message: "データベースへの保存に失敗しました。入力内容はそのまま残しています。",
} as const;