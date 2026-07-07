/**
 * Baker's % 配合計算（純粋関数）。
 * DIE の computeRecipe とは独立 — 単純な Baker's % 算術のみ。
 *
 * flour = totalDough / (totalBakersPercent / 100)
 * water = flour × hydration% / 100
 */

import {
  type BakersPercentInput,
  type BakersPercentResult,
  type CalculatorOutcome,
  isPositiveNumber,
  isValidPercent,
} from "./calculator-types";

export function roundGrams(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveOilPercent(oilPercent: number | null | undefined): number | null {
  if (oilPercent === null || oilPercent === undefined) {
    return 0;
  }

  return isValidPercent(oilPercent) ? oilPercent : null;
}

function resolveTotalDoughWeightG(input: BakersPercentInput): number | null {
  if (isPositiveNumber(input.totalDoughWeightG)) {
    return roundGrams(input.totalDoughWeightG);
  }

  if (
    isPositiveNumber(input.ballWeightG) &&
    isPositiveNumber(input.ballCount)
  ) {
    return roundGrams(input.ballWeightG * input.ballCount);
  }

  return null;
}

function buildResult(
  flourG: number,
  hydrationPercent: number,
  saltPercent: number,
  yeastPercent: number,
  oilPercent: number,
): BakersPercentResult {
  const waterG = roundGrams((flourG * hydrationPercent) / 100);
  const saltG = roundGrams((flourG * saltPercent) / 100);
  const yeastG = roundGrams((flourG * yeastPercent) / 100);
  const oilG = roundGrams((flourG * oilPercent) / 100);
  const totalBakersPercent =
    100 + hydrationPercent + saltPercent + yeastPercent + oilPercent;
  const totalDoughWeightG = roundGrams(
    flourG + waterG + saltG + yeastG + oilG,
  );

  return {
    flourG,
    waterG,
    saltG,
    yeastG,
    oilG,
    totalDoughWeightG,
    hydrationPercent,
    saltPercent,
    yeastPercent,
    oilPercent,
    totalBakersPercent,
  };
}

function validatePercents(input: BakersPercentInput): {
  hydrationPercent: number;
  saltPercent: number;
  yeastPercent: number;
  oilPercent: number;
} | null {
  if (
    !isValidPercent(input.hydrationPercent) ||
    !isValidPercent(input.saltPercent) ||
    !isValidPercent(input.yeastPercent)
  ) {
    return null;
  }

  const oilPercent = resolveOilPercent(input.oilPercent);
  if (oilPercent === null) {
    return null;
  }

  const totalBakersPercent =
    100 +
    input.hydrationPercent +
    input.saltPercent +
    input.yeastPercent +
    oilPercent;

  if (totalBakersPercent <= 0) {
    return null;
  }

  return {
    hydrationPercent: input.hydrationPercent,
    saltPercent: input.saltPercent,
    yeastPercent: input.yeastPercent,
    oilPercent,
  };
}

/** 総生地量から粉・水・塩・酵母・油を逆算 */
export function computeFromTotalDough(
  input: BakersPercentInput,
): BakersPercentResult | null {
  const percents = validatePercents(input);
  const totalDoughWeightG = resolveTotalDoughWeightG(input);

  if (!percents || !totalDoughWeightG) {
    return null;
  }

  const totalPercent =
    100 +
    percents.hydrationPercent +
    percents.saltPercent +
    percents.yeastPercent +
    percents.oilPercent;

  const flourG = roundGrams(totalDoughWeightG / (totalPercent / 100));

  return buildResult(
    flourG,
    percents.hydrationPercent,
    percents.saltPercent,
    percents.yeastPercent,
    percents.oilPercent,
  );
}

/** 粉量から各材料と総生地量を算出 */
export function computeFromFlourWeight(
  input: BakersPercentInput,
): BakersPercentResult | null {
  const percents = validatePercents(input);

  if (!percents || !isPositiveNumber(input.flourWeightG)) {
    return null;
  }

  return buildResult(
    roundGrams(input.flourWeightG),
    percents.hydrationPercent,
    percents.saltPercent,
    percents.yeastPercent,
    percents.oilPercent,
  );
}

/** mode に応じて Baker's % 配合を計算 */
export function computeBakersPercent(
  input: BakersPercentInput,
): BakersPercentResult | null {
  if (input.mode === "flour_weight") {
    return computeFromFlourWeight(input);
  }

  return computeFromTotalDough(input);
}

/** 粉量と加水率から水量 (g) */
export function computeWaterFromFlour(
  flourG: number | null,
  hydrationPercent: number | null,
): number | null {
  if (!isPositiveNumber(flourG) || !isValidPercent(hydrationPercent)) {
    return null;
  }

  return roundGrams((flourG * hydrationPercent) / 100);
}

/** 水量と加水率から粉量 (g) を逆算 */
export function computeFlourFromWater(
  waterG: number | null,
  hydrationPercent: number | null,
): number | null {
  if (!isPositiveNumber(waterG) || !isPositiveNumber(hydrationPercent)) {
    return null;
  }

  return roundGrams((waterG * 100) / hydrationPercent);
}

/** 配合合計重量（検証用） */
export function sumBakersPercentWeightG(result: BakersPercentResult): number {
  return result.flourG + result.waterG + result.saltG + result.yeastG + result.oilG;
}

function describeBakersPercentError(input: BakersPercentInput): string | null {
  if (
    !isValidPercent(input.hydrationPercent) ||
    !isValidPercent(input.saltPercent) ||
    !isValidPercent(input.yeastPercent)
  ) {
    return "加水率・塩・酵母は 0 以上の数値を入力してください";
  }

  const oilPercent = resolveOilPercent(input.oilPercent);
  if (oilPercent === null) {
    return "油量は 0 以上の数値を入力してください";
  }

  if (input.mode === "flour_weight") {
    if (!isPositiveNumber(input.flourWeightG)) {
      return "粉量 (g) を正の数値で入力してください";
    }
    return null;
  }

  const hasTotal = isPositiveNumber(input.totalDoughWeightG);
  const hasBalls =
    isPositiveNumber(input.ballWeightG) && isPositiveNumber(input.ballCount);

  if (!hasTotal && !hasBalls) {
    return "総生地量 (g) または 1 枚重量 × 枚数を入力してください";
  }

  if (
    (input.ballWeightG !== null &&
      input.ballWeightG !== undefined &&
      !isPositiveNumber(input.ballWeightG)) ||
    (input.ballCount !== null &&
      input.ballCount !== undefined &&
      !isPositiveNumber(input.ballCount))
  ) {
    return "1 枚重量と枚数は正の数値で入力してください";
  }

  return null;
}

/** 結果と UI 向けエラーメッセージ */
export function computeBakersPercentOutcome(
  input: BakersPercentInput,
): CalculatorOutcome<BakersPercentResult> {
  const error = describeBakersPercentError(input);
  if (error) {
    return { result: null, error };
  }

  const result = computeBakersPercent(input);
  if (!result) {
    return { result: null, error: "計算できません。入力値を確認してください" };
  }

  return { result, error: null };
}
