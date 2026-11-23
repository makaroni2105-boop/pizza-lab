/**
 * 計算結果 → 仕込み記録スナップショット（純関数）。
 */

import { isDailyPrepAdjustmentActive } from "@/lib/daily-prep/daily-prep-confirm-flow";
import { computeNalipoDailyPrep } from "@/lib/daily-prep/poolish-daily-recipe";
import {
  KURE_WEATHER_COORDINATES,
  type DailyPrepMaterialsSnapshot,
  type DailyPrepRecordAiSearchDocument,
  type DailyPrepRecordCreateInput,
  type DailyPrepRecordWeatherSnapshot,
  PIZZA_LAB_DAILY_PREP_RECORD_SCHEMA_VERSION,
  type DailyPrepRecord,
} from "@/types/daily-prep-record";
import {
  NALIPO_DAILY_PREP_BASELINE,
  type DailyPrepComputeResult,
  type DailyPrepSessionAdjustment,
} from "@/types/daily-prep";
import { WEATHER_PROVIDER } from "@/lib/weather/weather-constants";
import type { WeatherCurrent } from "@/lib/weather/weather-types";

import { getPrepDateJstString, isValidPrepDateJst } from "./jst-date";

export function mergeActualMaterials(
  computed: DailyPrepMaterialsSnapshot,
  partial?: Partial<DailyPrepMaterialsSnapshot>,
): DailyPrepMaterialsSnapshot {
  if (!partial) {
    return {
      dayBefore: { ...computed.dayBefore },
      dayOf: { ...computed.dayOf },
    };
  }

  return {
    dayBefore: { ...computed.dayBefore, ...partial.dayBefore },
    dayOf: { ...computed.dayOf, ...partial.dayOf },
  };
}

export function materialsDifferFromComputed(
  computed: DailyPrepMaterialsSnapshot,
  actual: DailyPrepMaterialsSnapshot,
): boolean {
  const keysBefore = ["flourG", "waterG", "yeastG"] as const;
  const keysOf = [
    "flourG",
    "firstWaterG",
    "finishWaterG",
    "yeastG",
    "saltG",
  ] as const;

  for (const key of keysBefore) {
    if (computed.dayBefore[key] !== actual.dayBefore[key]) {
      return true;
    }
  }

  for (const key of keysOf) {
    if (computed.dayOf[key] !== actual.dayOf[key]) {
      return true;
    }
  }

  return false;
}

export function buildWeatherSnapshot(
  weather: WeatherCurrent,
  observationTimeIso?: string | null,
): DailyPrepRecordWeatherSnapshot {
  const observed =
    observationTimeIso === undefined
      ? weather.observationTimeIso
      : observationTimeIso;

  return {
    provider: weather.source,
    coordinates: {
      latitude: KURE_WEATHER_COORDINATES.latitude,
      longitude: KURE_WEATHER_COORDINATES.longitude,
      labelJa: KURE_WEATHER_COORDINATES.labelJa,
    },
    fetchedAtIso: weather.fetchedAt,
    observationTimeIso: observed,
    fetchStatus: "ok",
    fetchErrorCode: null,
    ambientTempC: weather.ambientTempC,
    ambientHumidityPct: weather.ambientHumidityPct,
  };
}

export function buildUnavailableWeatherSnapshot(
  nowIso: string,
  errorCode: string,
): DailyPrepRecordWeatherSnapshot {
  return {
    provider: WEATHER_PROVIDER,
    coordinates: {
      latitude: KURE_WEATHER_COORDINATES.latitude,
      longitude: KURE_WEATHER_COORDINATES.longitude,
      labelJa: KURE_WEATHER_COORDINATES.labelJa,
    },
    fetchedAtIso: nowIso,
    observationTimeIso: null,
    fetchStatus: "unavailable",
    fetchErrorCode: errorCode,
    ambientTempC: null,
    ambientHumidityPct: null,
  };
}

export function buildAiSearchDocument(
  prepDateJst: string,
  totalFlourKg: number,
  compute: DailyPrepComputeResult,
  actual: DailyPrepMaterialsSnapshot,
  adjustment: DailyPrepSessionAdjustment | undefined,
  roomTempC: number | null,
  weather: DailyPrepRecordWeatherSnapshot,
  processReadings: DailyPrepRecord["processReadings"],
  doughState11am: string | null,
  memo: string | null,
): DailyPrepRecordAiSearchDocument {
  const totalYeastG =
    actual.dayBefore.yeastG + actual.dayOf.yeastG;

  const memoPreview =
    memo && memo.trim().length > 0
      ? memo.trim().slice(0, 240)
      : null;

  return {
    schemaVersion: PIZZA_LAB_DAILY_PREP_RECORD_SCHEMA_VERSION,
    prepDateJst,
    totalFlourKg,
    totalFlourG: compute.totalFlourG,
    poolishPercent: compute.applied.poolishPercentOfTotalFlour,
    totalHydrationPercent: compute.applied.totalHydrationPercent,
    poolishYeastG: actual.dayBefore.yeastG,
    mainYeastG: actual.dayOf.yeastG,
    totalYeastG,
    roomTempC,
    prepWaterTempC: processReadings.prepWaterTempC,
    finalDoughTempC: processReadings.finalDoughTempC,
    ambientTempC:
      weather.fetchStatus === "ok" ? weather.ambientTempC : null,
    ambientTempAvailable: weather.fetchStatus === "ok",
    doughState11am,
    memoPreview,
    baselinePoolishPercent: NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour,
    baselineHydrationPercent: NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent,
    adjustmentActive: isDailyPrepAdjustmentActive(adjustment),
  };
}

export interface BuildPrepRecordParams {
  id: string;
  input: DailyPrepRecordCreateInput;
  weather: DailyPrepRecordWeatherSnapshot;
  nowIso: string;
}

export function buildDailyPrepRecordFromCompute(
  params: BuildPrepRecordParams,
): { ok: true; record: DailyPrepRecord } | { ok: false; reason: string } {
  const prepDateJst = params.input.prepDateJst ?? getPrepDateJstString();

  if (!isValidPrepDateJst(prepDateJst)) {
    return { ok: false, reason: "invalid_prep_date_jst" };
  }

  const compute = computeNalipoDailyPrep({
    totalFlourKg: params.input.totalFlourKg,
    adjustment: params.input.sessionAdjustment,
  });

  if (!compute) {
    return { ok: false, reason: "compute_failed" };
  }

  const computedMaterials: DailyPrepMaterialsSnapshot = {
    dayBefore: { ...compute.dayBefore },
    dayOf: { ...compute.dayOf },
  };

  const actualMaterials = mergeActualMaterials(
    computedMaterials,
    params.input.actualMaterials,
  );

  const roomTempC =
    params.input.roomTempC === undefined || params.input.roomTempC === null
      ? null
      : params.input.roomTempC;

  const memo =
    params.input.memo === undefined || params.input.memo === null
      ? null
      : String(params.input.memo).trim().slice(0, 2000) || null;

  const doughState11am = params.input.doughState11am ?? null;

  const processReadings: DailyPrepRecord["processReadings"] =
    params.input.processReadings ?? {
      prepWaterTempC: null,
      finalDoughTempC: null,
    };

  const aiSearch = buildAiSearchDocument(
    prepDateJst,
    params.input.totalFlourKg,
    compute,
    actualMaterials,
    params.input.sessionAdjustment,
    roomTempC,
    params.weather,
    processReadings,
    doughState11am,
    memo,
  );

  const record: DailyPrepRecord = {
    id: params.id,
    prepDateJst,
    shopId: params.input.shopId ?? null,
    totalFlourKg: params.input.totalFlourKg,
    baselineFormula: NALIPO_DAILY_PREP_BASELINE,
    sessionAdjustment: params.input.sessionAdjustment ?? null,
    computedFormula: { ...compute.applied },
    computedMaterials,
    actualMaterials,
    roomTempC,
    processReadings,
    memo,
    doughState11am,
    weather: params.weather,
    idempotencyKey: params.input.idempotencyKey ?? null,
    aiSearch,
    currentRevision: 1,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };

  return { ok: true, record };
}

export function cloneDailyPrepRecord(record: DailyPrepRecord): DailyPrepRecord {
  return JSON.parse(JSON.stringify(record)) as DailyPrepRecord;
}