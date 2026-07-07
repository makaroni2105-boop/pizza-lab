/**
 * 発酵スケジュール補正（推奨仕込み開始時刻・補正後発酵時間）。
 *
 * 暑い / 生地温が高い → 発酵時間を短めに補正
 * 寒い / 生地温が低い → 発酵時間を長めに補正
 */

import type { ConfidenceLevel, FermentationScheduleOutput } from "@/types/die";
import type { FermentationType } from "@/types/profile";

export const REFERENCE_ROOM_TEMP_C = 20;

/** 発酵時間の合計補正率上限（%） */
export const FERMENT_DURATION_ADJUSTMENT_MIN_PCT = -30;
export const FERMENT_DURATION_ADJUSTMENT_MAX_PCT = 30;

/** 室温: 1°C あたり ±2%（上限 ±16%） */
export const FERMENT_ROOM_ADJUSTMENT_PER_C = 2;
export const FERMENT_ROOM_ADJUSTMENT_CAP_PCT = 16;

/** 予想生地温差: 1°C あたり ±6%（上限 ±18%） */
export const FERMENT_DDT_ADJUSTMENT_PER_C = 6;
export const FERMENT_DDT_ADJUSTMENT_CAP_PCT = 18;

const VALID_FERMENTATION_TYPES: FermentationType[] = ["room", "cold", "mixed"];

export interface FermentationAdjustInput {
  fermentationType?: FermentationType | null;
  baseHours?: number | null;
  useTime?: string | null;
  roomTempDuringFermentC?: number | null;
  targetDdtC?: number | null;
  predictedDoughTempC?: number | null;
  ddtDeltaC?: number | null;
  referenceRoomTempC?: number | null;
}

export interface FermentationAdjustResult extends FermentationScheduleOutput {
  confidence: ConfidenceLevel;
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isValidPositive(value: number | null | undefined): value is number {
  return isValidNumber(value) && value > 0;
}

function isValidFermentationType(value: unknown): value is FermentationType {
  return (
    typeof value === "string" &&
    VALID_FERMENTATION_TYPES.includes(value as FermentationType)
  );
}

function isValidIsoDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMinutes(value: number): number {
  return Math.round(value);
}

export function resolveDdtDeltaC(input: FermentationAdjustInput): number | null {
  if (isValidNumber(input.ddtDeltaC)) {
    return input.ddtDeltaC;
  }

  if (isValidNumber(input.predictedDoughTempC) && isValidNumber(input.targetDdtC)) {
    return input.predictedDoughTempC - input.targetDdtC;
  }

  return null;
}

export function computeRoomDurationAdjustmentPct(
  roomTempDuringFermentC: number,
  referenceRoomTempC: number = REFERENCE_ROOM_TEMP_C,
): number {
  const delta = referenceRoomTempC - roomTempDuringFermentC;
  return clamp(
    delta * FERMENT_ROOM_ADJUSTMENT_PER_C,
    -FERMENT_ROOM_ADJUSTMENT_CAP_PCT,
    FERMENT_ROOM_ADJUSTMENT_CAP_PCT,
  );
}

export function computeDdtDurationAdjustmentPct(ddtDeltaC: number): number {
  return clamp(
    -ddtDeltaC * FERMENT_DDT_ADJUSTMENT_PER_C,
    -FERMENT_DDT_ADJUSTMENT_CAP_PCT,
    FERMENT_DDT_ADJUSTMENT_CAP_PCT,
  );
}

export function determineFermentationAdjustConfidence(
  adjustmentMinutes: number,
  hasDdtDelta: boolean,
): ConfidenceLevel {
  const absMinutes = Math.abs(adjustmentMinutes);

  if (absMinutes <= 30 && hasDdtDelta) {
    return "high";
  }

  if (absMinutes <= 180) {
    return "medium";
  }

  return "low";
}

export function subtractHoursFromIsoTime(isoTime: string, hours: number): string | null {
  if (!isValidIsoDateTime(isoTime)) {
    return null;
  }

  const timestamp = Date.parse(isoTime) - hours * 60 * 60 * 1000;
  return new Date(timestamp).toISOString();
}

function buildAdjustmentReason(
  adjustmentMinutes: number,
  roomAdjustmentPct: number,
  ddtAdjustmentPct: number,
  ddtDeltaC: number | null,
): string {
  if (adjustmentMinutes === 0) {
    if (ddtDeltaC === null) {
      return "推奨スケジュール（標準条件・予想生地温差は未使用）";
    }
    return "推奨スケジュール（補正不要）";
  }

  const parts: string[] = [];

  if (roomAdjustmentPct !== 0) {
    parts.push(roomAdjustmentPct < 0 ? "発酵室温が高い" : "発酵室温が低い");
  }

  if (ddtAdjustmentPct !== 0 && ddtDeltaC !== null) {
    parts.push(
      ddtDeltaC > 0
        ? `予想生地温が目標より+${ddtDeltaC.toFixed(1)}°C`
        : `予想生地温が目標より${ddtDeltaC.toFixed(1)}°C`,
    );
  }

  const direction = adjustmentMinutes < 0 ? "発酵時間を短縮" : "発酵時間を延長";
  const sign = adjustmentMinutes > 0 ? "+" : "";
  return `推奨: ${parts.join("、")}のため${direction}（${sign}${adjustmentMinutes}分）`;
}

export function adjustFermentationSchedule(
  input: FermentationAdjustInput,
): FermentationAdjustResult | null {
  if (
    !isValidFermentationType(input.fermentationType) ||
    !isValidPositive(input.baseHours) ||
    typeof input.useTime !== "string" ||
    !isValidIsoDateTime(input.useTime) ||
    !isValidNumber(input.roomTempDuringFermentC)
  ) {
    return null;
  }

  const referenceRoomTempC = isValidNumber(input.referenceRoomTempC)
    ? input.referenceRoomTempC
    : REFERENCE_ROOM_TEMP_C;

  const roomAdjustmentPct = computeRoomDurationAdjustmentPct(
    input.roomTempDuringFermentC,
    referenceRoomTempC,
  );

  const ddtDeltaC = resolveDdtDeltaC(input);
  const ddtAdjustmentPct =
    ddtDeltaC === null ? 0 : computeDdtDurationAdjustmentPct(ddtDeltaC);

  const durationAdjustmentPct = clamp(
    roomAdjustmentPct + ddtAdjustmentPct,
    FERMENT_DURATION_ADJUSTMENT_MIN_PCT,
    FERMENT_DURATION_ADJUSTMENT_MAX_PCT,
  );

  const adjustedHours = roundHours(input.baseHours * (1 + durationAdjustmentPct / 100));
  const adjustmentMinutes = roundMinutes((adjustedHours - input.baseHours) * 60);

  const mixStartTime = subtractHoursFromIsoTime(input.useTime, adjustedHours);
  if (!mixStartTime) {
    return null;
  }

  const confidence = determineFermentationAdjustConfidence(
    adjustmentMinutes,
    ddtDeltaC !== null,
  );

  return {
    fermentationType: input.fermentationType,
    baseHours: input.baseHours,
    adjustedHours,
    adjustmentMinutes,
    mixStartTime,
    useTime: input.useTime,
    adjustmentReason: buildAdjustmentReason(
      adjustmentMinutes,
      roomAdjustmentPct,
      ddtAdjustmentPct,
      ddtDeltaC,
    ),
    confidence,
  };
}
