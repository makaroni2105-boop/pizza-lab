/**
 * 仕込み確定 UI の純関数（記録タイミング・連打防止）。
 * 同一粉量・同一配合でも別仕込みなら新しいトークンで再記録できる。
 */

import {
  NALIPO_DAILY_PREP_BASELINE,
  type DailyPrepSessionAdjustment,
} from "@/types/daily-prep";

import type { FlourUsageConfirmResult } from "./flour-usage-storage";

export type DailyPrepConfirmUiState =
  | "idle"
  | "saved"
  | "storage_unavailable"
  | "write_failed"
  | "duplicate_operation";

export function buildDailyPrepSelectionKey(
  totalFlourKg: number,
  adjustment?: DailyPrepSessionAdjustment,
): string {
  const poolish =
    adjustment?.poolishPercentOfTotalFlour ??
    NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour;
  const hydration =
    adjustment?.totalHydrationPercent ??
    NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent;

  return `${totalFlourKg}|${poolish}|${hydration}`;
}

export function isDailyPrepAdjustmentActive(
  adjustment?: DailyPrepSessionAdjustment,
): boolean {
  if (!adjustment) {
    return false;
  }

  const poolish =
    adjustment.poolishPercentOfTotalFlour ??
    NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour;
  const hydration =
    adjustment.totalHydrationPercent ??
    NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent;

  return (
    poolish !== NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour ||
    hydration !== NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent
  );
}

/** 連打・処理中のみブロック（配合ごとの1回制限はしない） */
export function canStartConfirmRecord(confirmInFlight: boolean): boolean {
  return !confirmInFlight;
}

export function mapFlourUsageConfirmToUiState(
  result: FlourUsageConfirmResult,
): DailyPrepConfirmUiState {
  if (result.ok === true && result.recorded === true) {
    return "saved";
  }

  if (result.ok === true && result.recorded === false && result.reason === "duplicate") {
    return "duplicate_operation";
  }

  if (result.ok === false && result.reason === "no_storage") {
    return "storage_unavailable";
  }

  if (result.ok === false && result.reason === "write_failed") {
    return "write_failed";
  }

  return "idle";
}

export function createDailyPrepConfirmToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `daily-prep-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}