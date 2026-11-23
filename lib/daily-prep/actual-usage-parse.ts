/**
 * 実使用量の部分入力（イースト・水温）を計算値ベースにマージ。
 */

import type { DailyPrepComputeResult } from "@/types/daily-prep";
import type {
  DailyPrepMaterialsSnapshot,
  DailyPrepProcessReadings,
} from "@/types/daily-prep-record";

export interface DailyPrepActualUsageFormInput {
  poolishYeastG?: string;
  mainYeastG?: string;
  prepWaterTempC?: string;
  finalDoughTempC?: string;
}

function parseOptionalGrams(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    return undefined;
  }

  return Math.round(n * 10) / 10;
}

function parseOptionalTemp(value: string | undefined): number | null | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < -40 || n > 80) {
    return undefined;
  }

  return Math.round(n * 10) / 10;
}

export function buildActualUsageFromForm(
  result: DailyPrepComputeResult,
  form: DailyPrepActualUsageFormInput,
): {
  actualMaterials?: Partial<DailyPrepMaterialsSnapshot>;
  processReadings?: DailyPrepProcessReadings;
  hasActualOverrides: boolean;
} {
  const poolishYeast = parseOptionalGrams(form.poolishYeastG);
  const mainYeast = parseOptionalGrams(form.mainYeastG);
  const prepWater = parseOptionalTemp(form.prepWaterTempC);
  const finalDough = parseOptionalTemp(form.finalDoughTempC);

  const actualMaterials: Partial<DailyPrepMaterialsSnapshot> = {};
  let hasMaterialOverride = false;

  if (poolishYeast !== undefined) {
    actualMaterials.dayBefore = {
      ...result.dayBefore,
      yeastG: poolishYeast,
    };
    hasMaterialOverride = true;
  }

  if (mainYeast !== undefined) {
    actualMaterials.dayOf = {
      ...result.dayOf,
      yeastG: mainYeast,
    };
    hasMaterialOverride = true;
  }

  const processReadings: DailyPrepProcessReadings = {
    prepWaterTempC: prepWater === undefined ? null : prepWater,
    finalDoughTempC: finalDough === undefined ? null : finalDough,
  };

  const hasProcessOverride =
    prepWater !== undefined || finalDough !== undefined;

  return {
    actualMaterials: hasMaterialOverride ? actualMaterials : undefined,
    processReadings: hasProcessOverride ? processReadings : undefined,
    hasActualOverrides: hasMaterialOverride || hasProcessOverride,
  };
}