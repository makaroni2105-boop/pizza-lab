/**
 * 室温・予想生地温・発酵時間に基づくイースト量補正。
 *
 * 暑い / 生地温が高い / 発酵時間が長い → 減らす
 * 寒い / 生地温が低い / 発酵時間が短い → 増やす
 */

import type { ConfidenceLevel, YeastAdjustmentOutput } from "@/types/die";

export const REFERENCE_ROOM_TEMP_C = 20;
export const DEFAULT_BASELINE_FERMENTATION_HOURS = 24;

/** 合計補正率の安全上限（%） */
export const YEAST_ADJUSTMENT_MIN_PCT = -50;
export const YEAST_ADJUSTMENT_MAX_PCT = 50;

/** 室温: 1°C あたり ±2.5%（上限 ±15%） */
export const ROOM_TEMP_ADJUSTMENT_PER_C = 2.5;
export const ROOM_TEMP_ADJUSTMENT_CAP_PCT = 15;

/** 予想生地温差: 1°C あたり ±8%（上限 ±20%） */
export const DDT_DELTA_ADJUSTMENT_PER_C = 8;
export const DDT_DELTA_ADJUSTMENT_CAP_PCT = 20;

/** 発酵時間: 基準比 100% あたり ±25%（上限 ±25%） */
export const FERMENT_HOURS_ADJUSTMENT_FACTOR = 25;
export const FERMENT_HOURS_ADJUSTMENT_CAP_PCT = 25;

export interface YeastAdjustInput {
  baseYeastPct?: number | null;
  baseYeastWeightG?: number | null;
  roomTempDuringFermentC?: number | null;
  targetDdtC?: number | null;
  predictedDoughTempC?: number | null;
  ddtDeltaC?: number | null;
  fermentationHours?: number | null;
  baselineFermentationHours?: number | null;
  referenceRoomTempC?: number | null;
}

export interface YeastAdjustResult extends YeastAdjustmentOutput {
  confidence: ConfidenceLevel;
  adjustedYeastWeightG: number | null;
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isValidNonNegative(value: number | null | undefined): value is number {
  return isValidNumber(value) && value >= 0;
}

function isValidPositive(value: number | null | undefined): value is number {
  return isValidNumber(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPct(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundGrams(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeRoomTempAdjustmentPct(
  roomTempDuringFermentC: number,
  referenceRoomTempC: number = REFERENCE_ROOM_TEMP_C,
): number {
  const delta = referenceRoomTempC - roomTempDuringFermentC;
  return clamp(
    delta * ROOM_TEMP_ADJUSTMENT_PER_C,
    -ROOM_TEMP_ADJUSTMENT_CAP_PCT,
    ROOM_TEMP_ADJUSTMENT_CAP_PCT,
  );
}

export function computeDdtDeltaAdjustmentPct(ddtDeltaC: number): number {
  return clamp(
    -ddtDeltaC * DDT_DELTA_ADJUSTMENT_PER_C,
    -DDT_DELTA_ADJUSTMENT_CAP_PCT,
    DDT_DELTA_ADJUSTMENT_CAP_PCT,
  );
}

export function resolveDdtDeltaC(input: YeastAdjustInput): number | null {
  if (isValidNumber(input.ddtDeltaC)) {
    return input.ddtDeltaC;
  }

  if (isValidNumber(input.predictedDoughTempC) && isValidNumber(input.targetDdtC)) {
    return input.predictedDoughTempC - input.targetDdtC;
  }

  return null;
}

export function computeFermentationHoursAdjustmentPct(
  fermentationHours: number,
  baselineFermentationHours: number,
): number {
  if (baselineFermentationHours <= 0) {
    return 0;
  }

  const ratioDelta = (fermentationHours - baselineFermentationHours) / baselineFermentationHours;
  return clamp(
    -ratioDelta * FERMENT_HOURS_ADJUSTMENT_FACTOR,
    -FERMENT_HOURS_ADJUSTMENT_CAP_PCT,
    FERMENT_HOURS_ADJUSTMENT_CAP_PCT,
  );
}

export function determineYeastAdjustConfidence(
  adjustmentPct: number,
  hasDdtDelta: boolean,
): ConfidenceLevel {
  const absAdjustment = Math.abs(adjustmentPct);

  if (absAdjustment <= 5 && hasDdtDelta) {
    return "high";
  }

  if (absAdjustment <= 20) {
    return "medium";
  }

  return "low";
}

function buildAdjustmentReason(
  adjustmentPct: number,
  roomAdjustmentPct: number,
  ddtAdjustmentPct: number,
  fermentAdjustmentPct: number,
  ddtDeltaC: number | null,
): string {
  if (adjustmentPct === 0) {
    if (ddtDeltaC === null) {
      return "標準条件のため補正なし（予想生地温差は未使用）";
    }
    return "予想生地温は目標と一致";
  }

  const parts: string[] = [];

  if (roomAdjustmentPct !== 0) {
    parts.push(
      roomAdjustmentPct < 0
        ? `発酵室温が高い（+${Math.abs(roomAdjustmentPct).toFixed(1)}%相当）`
        : `発酵室温が低い（+${roomAdjustmentPct.toFixed(1)}%相当）`,
    );
  }

  if (ddtAdjustmentPct !== 0 && ddtDeltaC !== null) {
    parts.push(
      ddtDeltaC > 0
        ? `予想生地温が目標より+${ddtDeltaC.toFixed(1)}°C`
        : `予想生地温が目標より${ddtDeltaC.toFixed(1)}°C`,
    );
  }

  if (fermentAdjustmentPct !== 0) {
    parts.push(
      fermentAdjustmentPct < 0
        ? "発酵時間が長い"
        : "発酵時間が短い",
    );
  }

  const direction = adjustmentPct < 0 ? "酵母を減量" : "酵母を増量";
  return `${parts.join("、")}のため${direction}（${adjustmentPct > 0 ? "+" : ""}${adjustmentPct.toFixed(1)}%）`;
}

export function adjustYeast(input: YeastAdjustInput): YeastAdjustResult | null {
  if (
    !isValidNonNegative(input.baseYeastPct) ||
    !isValidNumber(input.roomTempDuringFermentC) ||
    !isValidPositive(input.fermentationHours)
  ) {
    return null;
  }

  const referenceRoomTempC = isValidNumber(input.referenceRoomTempC)
    ? input.referenceRoomTempC
    : REFERENCE_ROOM_TEMP_C;

  const baselineFermentationHours = isValidPositive(input.baselineFermentationHours)
    ? input.baselineFermentationHours
    : DEFAULT_BASELINE_FERMENTATION_HOURS;

  const roomAdjustmentPct = computeRoomTempAdjustmentPct(
    input.roomTempDuringFermentC,
    referenceRoomTempC,
  );

  const ddtDeltaC = resolveDdtDeltaC(input);
  const ddtAdjustmentPct =
    ddtDeltaC === null ? 0 : computeDdtDeltaAdjustmentPct(ddtDeltaC);

  const fermentAdjustmentPct = computeFermentationHoursAdjustmentPct(
    input.fermentationHours,
    baselineFermentationHours,
  );

  const adjustmentPct = roundPct(
    clamp(
      roomAdjustmentPct + ddtAdjustmentPct + fermentAdjustmentPct,
      YEAST_ADJUSTMENT_MIN_PCT,
      YEAST_ADJUSTMENT_MAX_PCT,
    ),
  );

  const adjustedYeastPct = roundPct(input.baseYeastPct * (1 + adjustmentPct / 100));

  const adjustedYeastWeightG = isValidNonNegative(input.baseYeastWeightG)
    ? roundGrams(input.baseYeastWeightG * (1 + adjustmentPct / 100))
    : null;

  const confidence = determineYeastAdjustConfidence(adjustmentPct, ddtDeltaC !== null);

  return {
    adjustmentPct,
    adjustedYeastPct,
    adjustedYeastWeightG,
    confidence,
    reason: buildAdjustmentReason(
      adjustmentPct,
      roomAdjustmentPct,
      ddtAdjustmentPct,
      fermentAdjustmentPct,
      ddtDeltaC,
    ),
  };
}
