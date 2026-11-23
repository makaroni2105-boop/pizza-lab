/**
 * 毎日の仕込み — D1 記録型（計算値 vs 実使用量・気象・AI 検索用）。
 */

import type {
  DailyPrepAppliedFormula,
  DailyPrepDayBefore,
  DailyPrepDayOf,
  DailyPrepSessionAdjustment,
} from "@/types/daily-prep";
import { NALIPO_DAILY_PREP_BASELINE } from "@/types/daily-prep";

export const PIZZA_LAB_DAILY_PREP_RECORD_SCHEMA_VERSION = 1 as const;

/** 呉市（広島）周辺 — Open-Meteo 取得用 */
export const KURE_WEATHER_COORDINATES = {
  latitude: 34.2386,
  longitude: 132.5616,
  labelJa: "広島県呉市周辺",
} as const;

export type DailyPrepDoughState11am =
  | "good"
  | "slow"
  | "fast"
  | "wet"
  | "dry"
  | "other";

export interface DailyPrepMaterialsSnapshot {
  dayBefore: DailyPrepDayBefore;
  dayOf: DailyPrepDayOf;
}

export type DailyPrepWeatherFetchStatus = "ok" | "unavailable";

export interface DailyPrepRecordWeatherSnapshot {
  provider: string;
  coordinates: {
    latitude: number;
    longitude: number;
    labelJa: string;
  };
  /** 気象 API 呼び出し時刻（ISO UTC） */
  fetchedAtIso: string;
  /** 取得データの対象時刻（Open-Meteo current.time、ISO） */
  observationTimeIso: string | null;
  fetchStatus: DailyPrepWeatherFetchStatus;
  fetchErrorCode?: string | null;
  ambientTempC: number | null;
  ambientHumidityPct: number | null;
}

export interface DailyPrepProcessReadings {
  prepWaterTempC: number | null;
  finalDoughTempC: number | null;
}

export interface DailyPrepRecordAiSearchDocument {
  schemaVersion: typeof PIZZA_LAB_DAILY_PREP_RECORD_SCHEMA_VERSION;
  prepDateJst: string;
  totalFlourKg: number;
  totalFlourG: number;
  poolishPercent: number;
  totalHydrationPercent: number;
  poolishYeastG: number;
  mainYeastG: number;
  totalYeastG: number;
  roomTempC: number | null;
  prepWaterTempC: number | null;
  finalDoughTempC: number | null;
  ambientTempC: number | null;
  ambientTempAvailable: boolean;
  doughState11am: string | null;
  memoPreview: string | null;
  baselinePoolishPercent: number;
  baselineHydrationPercent: number;
  adjustmentActive: boolean;
}

export interface DailyPrepRecord {
  id: string;
  prepDateJst: string;
  shopId: string | null;
  totalFlourKg: number;
  baselineFormula: typeof NALIPO_DAILY_PREP_BASELINE;
  sessionAdjustment: DailyPrepSessionAdjustment | null;
  computedFormula: DailyPrepAppliedFormula;
  computedMaterials: DailyPrepMaterialsSnapshot;
  actualMaterials: DailyPrepMaterialsSnapshot;
  roomTempC: number | null;
  processReadings: DailyPrepProcessReadings;
  memo: string | null;
  doughState11am: DailyPrepDoughState11am | null;
  weather: DailyPrepRecordWeatherSnapshot;
  aiSearch: DailyPrepRecordAiSearchDocument;
  currentRevision: number;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPrepRecordRevision {
  id: string;
  recordId: string;
  revisionNumber: number;
  createdAt: string;
  changeKind: "create" | "update";
  recordSnapshot: DailyPrepRecord;
}

export interface DailyPrepRecordCreateInput {
  totalFlourKg: number;
  sessionAdjustment?: DailyPrepSessionAdjustment;
  actualMaterials?: Partial<DailyPrepMaterialsSnapshot>;
  prepDateJst?: string;
  roomTempC?: number | null;
  memo?: string | null;
  doughState11am?: DailyPrepDoughState11am | null;
  processReadings?: DailyPrepProcessReadings;
  shopId?: string | null;
  idempotencyKey?: string | null;
}

export interface DailyPrepRecordUpdateInput {
  id: string;
  prepDateJst?: string;
  actualMaterials?: DailyPrepMaterialsSnapshot;
  roomTempC?: number | null;
  memo?: string | null;
  doughState11am?: DailyPrepDoughState11am | null;
  processReadings?: DailyPrepProcessReadings;
  expectedRevision?: number;
}