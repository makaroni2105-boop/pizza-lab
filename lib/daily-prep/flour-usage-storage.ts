/**
 * 毎日の仕込み — 粉量使用頻度（localStorage）。
 *
 * ブラウザの localStorage のため、端末・ブラウザごとにデータは共有されない。
 * 記録は「仕込み確定」API のみ。粉量の選択だけではカウントしない。
 */

import {
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
} from "@/types/daily-prep";
import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

export const FLOUR_USAGE_STORAGE_KEY = "pizzalab-daily-prep-flour-usage-v1";

export const FLOUR_USAGE_STORAGE_VERSION = 1 as const;

export interface FlourUsageStorageState {
  version: typeof FLOUR_USAGE_STORAGE_VERSION;
  counts: Record<string, number>;
  /** 同一確定操作の二重記録防止用トークン（古いものから捨てる） */
  recentConfirmTokens: string[];
}

const MAX_RECENT_CONFIRM_TOKENS = 100;

const EMPTY_STATE: FlourUsageStorageState = {
  version: FLOUR_USAGE_STORAGE_VERSION,
  counts: {},
  recentConfirmTokens: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidKg(kg: number): boolean {
  return (
    Number.isInteger(kg) &&
    kg >= DAILY_PREP_FLOUR_KG_MIN &&
    kg <= DAILY_PREP_FLOUR_KG_MAX
  );
}

function sanitizeCounts(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) {
    return {};
  }

  const counts: Record<string, number> = {};

  for (const [key, value] of Object.entries(raw)) {
    const kg = Number(key);

    if (!isValidKg(kg)) {
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      continue;
    }

    counts[String(kg)] = Math.floor(value);
  }

  return counts;
}

function sanitizeTokens(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function parseFlourUsageStorageState(raw: string | null): FlourUsageStorageState {
  if (!raw) {
    return { ...EMPTY_STATE, counts: {}, recentConfirmTokens: [] };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return { ...EMPTY_STATE, counts: {}, recentConfirmTokens: [] };
    }

    return {
      version: FLOUR_USAGE_STORAGE_VERSION,
      counts: sanitizeCounts(parsed.counts),
      recentConfirmTokens: sanitizeTokens(parsed.recentConfirmTokens),
    };
  } catch {
    return { ...EMPTY_STATE, counts: {}, recentConfirmTokens: [] };
  }
}

export function serializeFlourUsageStorageState(state: FlourUsageStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): FlourUsageStorageState {
  return parseFlourUsageStorageState(storage.getItem(FLOUR_USAGE_STORAGE_KEY));
}

function writeState(storage: StorageLike, state: FlourUsageStorageState): boolean {
  try {
    storage.setItem(FLOUR_USAGE_STORAGE_KEY, serializeFlourUsageStorageState(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFlourUsageState(storage?: StorageLike): FlourUsageStorageState {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { ...EMPTY_STATE, counts: {}, recentConfirmTokens: [] };
  }

  return readState(store);
}

export type FlourUsageConfirmResult =
  | { ok: true; state: FlourUsageStorageState; recorded: true }
  | { ok: true; state: FlourUsageStorageState; recorded: false; reason: "duplicate" | "invalid_kg" }
  | { ok: false; state: FlourUsageStorageState; reason: "no_storage" | "write_failed" };

export interface RecordFlourUsageOnConfirmInput {
  totalFlourKg: number;
  /** UI が確定操作ごとに一意に付与（同一トークンは再記録しない） */
  confirmToken: string;
}

/**
 * 「この粉量で仕込む」確定時のみ呼ぶ。粉量選択だけでは呼ばない。
 */
export function recordFlourUsageOnConfirm(
  input: RecordFlourUsageOnConfirmInput,
  storage?: StorageLike,
): FlourUsageConfirmResult {
  const store = storage ?? getBrowserStorage();
  const baseState = store ? readState(store) : { ...EMPTY_STATE, counts: { ...EMPTY_STATE.counts }, recentConfirmTokens: [] };

  if (!isValidKg(input.totalFlourKg)) {
    return { ok: true, state: baseState, recorded: false, reason: "invalid_kg" };
  }

  if (typeof input.confirmToken !== "string" || input.confirmToken.length === 0) {
    return { ok: true, state: baseState, recorded: false, reason: "invalid_kg" };
  }

  if (baseState.recentConfirmTokens.includes(input.confirmToken)) {
    return { ok: true, state: baseState, recorded: false, reason: "duplicate" };
  }

  const key = String(input.totalFlourKg);
  const prev = baseState.counts[key] ?? 0;
  const nextCounts = {
    ...baseState.counts,
    [key]: prev + 1,
  };

  let nextTokens = [...baseState.recentConfirmTokens, input.confirmToken];

  if (nextTokens.length > MAX_RECENT_CONFIRM_TOKENS) {
    nextTokens = nextTokens.slice(nextTokens.length - MAX_RECENT_CONFIRM_TOKENS);
  }

  const nextState: FlourUsageStorageState = {
    version: FLOUR_USAGE_STORAGE_VERSION,
    counts: nextCounts,
    recentConfirmTokens: nextTokens,
  };

  if (!store) {
    return { ok: false, state: baseState, reason: "no_storage" };
  }

  if (!writeState(store, nextState)) {
    return { ok: false, state: baseState, reason: "write_failed" };
  }

  return { ok: true, state: nextState, recorded: true };
}