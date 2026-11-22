/**
 * NALIPO 毎日仕込み — ポーリッシュ配合の純関数計算。
 * DIE / Quick とは独立。Calculator の丸め規約のみ共有。
 */

import {
  DAILY_PREP_ADJUSTMENT_LIMITS,
  DAILY_PREP_FINISH_WATER_RULE,
  DAILY_PREP_FLOUR_KG_MAX,
  DAILY_PREP_FLOUR_KG_MIN,
  NALIPO_DAILY_PREP_BASELINE,
  type DailyPrepComputeInput,
  type DailyPrepComputeResult,
  type DailyPrepInvariantChecks,
} from "@/types/daily-prep";

import { roundGrams } from "./rounding";

function isValidTotalFlourKg(kg: number): boolean {
  return (
    Number.isFinite(kg) &&
    Number.isInteger(kg) &&
    kg >= DAILY_PREP_FLOUR_KG_MIN &&
    kg <= DAILY_PREP_FLOUR_KG_MAX
  );
}

function clampAdjustment(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number | null {
  const v = value ?? fallback;
  if (!Number.isFinite(v) || v < min || v > max) {
    return null;
  }
  return v;
}

function buildChecks(
  totalFlourG: number,
  poolishFlourG: number,
  mainFlourG: number,
  poolishWaterG: number,
  totalWaterG: number,
  firstWaterG: number,
  finishWaterG: number,
  poolishYeastG: number,
  mainYeastG: number,
  totalYeastG: number,
): DailyPrepInvariantChecks {
  const flourSum = roundGrams(poolishFlourG + mainFlourG);
  const waterSum = roundGrams(
    poolishWaterG + firstWaterG + finishWaterG,
  );
  const mainWater = roundGrams(firstWaterG + finishWaterG);
  const expectedMainWater = roundGrams(totalWaterG - poolishWaterG);
  const yeastSum = roundGrams(poolishYeastG + mainYeastG);

  const tolerance = 0.15;

  const allValues = [
    poolishFlourG,
    mainFlourG,
    poolishWaterG,
    firstWaterG,
    finishWaterG,
    poolishYeastG,
    mainYeastG,
  ];

  return {
    flourSumMatchesTotal: Math.abs(flourSum - totalFlourG) <= tolerance,
    waterSumMatchesTotalHydration:
      Math.abs(waterSum - totalWaterG) <= tolerance,
    mainWaterSplitMatches: Math.abs(mainWater - expectedMainWater) <= tolerance,
    yeastSumMatchesTotal: Math.abs(yeastSum - totalYeastG) <= tolerance,
    allNonNegative: allValues.every((v) => v >= 0),
  };
}

function checksPass(checks: DailyPrepInvariantChecks): boolean {
  return (
    checks.flourSumMatchesTotal &&
    checks.waterSumMatchesTotalHydration &&
    checks.mainWaterSplitMatches &&
    checks.yeastSumMatchesTotal &&
    checks.allNonNegative
  );
}

/**
 * 総小麦粉 kg から前日・当日の材料量を算出する。
 * 不正入力・負の水量・整合不能な丸めの場合は null。
 */
export function computeNalipoDailyPrep(
  input: DailyPrepComputeInput,
): DailyPrepComputeResult | null {
  if (!isValidTotalFlourKg(input.totalFlourKg)) {
    return null;
  }

  const poolishPct = clampAdjustment(
    input.adjustment?.poolishPercentOfTotalFlour,
    NALIPO_DAILY_PREP_BASELINE.poolishPercentOfTotalFlour,
    DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMin,
    DAILY_PREP_ADJUSTMENT_LIMITS.poolishPercentMax,
  );
  const hydrationPct = clampAdjustment(
    input.adjustment?.totalHydrationPercent,
    NALIPO_DAILY_PREP_BASELINE.totalHydrationPercent,
    DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMin,
    DAILY_PREP_ADJUSTMENT_LIMITS.totalHydrationPercentMax,
  );

  if (poolishPct === null || hydrationPct === null) {
    return null;
  }

  const totalFlourG = input.totalFlourKg * 1000;

  const poolishFlourG = roundGrams((totalFlourG * poolishPct) / 100);
  const mainFlourG = roundGrams(totalFlourG - poolishFlourG);

  const poolishWaterG = roundGrams(
    (poolishFlourG * NALIPO_DAILY_PREP_BASELINE.poolishHydrationPercent) / 100,
  );
  const totalWaterG = roundGrams((totalFlourG * hydrationPct) / 100);
  const mainWaterTotalG = roundGrams(totalWaterG - poolishWaterG);

  const finishWaterG = roundGrams(
    (totalFlourG * DAILY_PREP_FINISH_WATER_RULE.percentOfTotalFlour) / 100,
  );
  const firstWaterG = roundGrams(mainWaterTotalG - finishWaterG);

  if (mainFlourG < 0 || firstWaterG < 0 || finishWaterG < 0 || poolishWaterG < 0) {
    return null;
  }

  const totalYeastG = roundGrams(
    (totalFlourG * NALIPO_DAILY_PREP_BASELINE.totalYeastPercent) / 100,
  );
  const poolishYeastG = roundGrams(
    totalYeastG * NALIPO_DAILY_PREP_BASELINE.poolishYeastFraction,
  );
  const mainYeastG = roundGrams(totalYeastG - poolishYeastG);

  const saltG = roundGrams(
    (totalFlourG * NALIPO_DAILY_PREP_BASELINE.saltPercent) / 100,
  );

  if (
    poolishYeastG < 0 ||
    mainYeastG < 0 ||
    saltG < 0 ||
    mainFlourG <= 0 ||
    poolishFlourG <= 0
  ) {
    return null;
  }

  const checks = buildChecks(
    totalFlourG,
    poolishFlourG,
    mainFlourG,
    poolishWaterG,
    totalWaterG,
    firstWaterG,
    finishWaterG,
    poolishYeastG,
    mainYeastG,
    totalYeastG,
  );

  if (!checksPass(checks)) {
    return null;
  }

  return {
    totalFlourKg: input.totalFlourKg,
    totalFlourG,
    applied: {
      poolishPercentOfTotalFlour: poolishPct,
      poolishHydrationPercent: NALIPO_DAILY_PREP_BASELINE.poolishHydrationPercent,
      totalHydrationPercent: hydrationPct,
      saltPercent: NALIPO_DAILY_PREP_BASELINE.saltPercent,
      totalYeastPercent: NALIPO_DAILY_PREP_BASELINE.totalYeastPercent,
    },
    finishWaterRule: DAILY_PREP_FINISH_WATER_RULE,
    dayBefore: {
      flourG: poolishFlourG,
      waterG: poolishWaterG,
      yeastG: poolishYeastG,
    },
    dayOf: {
      flourG: mainFlourG,
      firstWaterG,
      finishWaterG,
      yeastG: mainYeastG,
      saltG,
    },
    checks,
  };
}