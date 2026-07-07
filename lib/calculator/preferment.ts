/**
 * ビガ / ポーリッシュの簡易計算（純粋関数）。
 * 全体粉・全体加水率から preferment 分と main 分を按分する。
 */

import {
  type CalculatorOutcome,
  type PrefermentDefaults,
  type PrefermentInput,
  type PrefermentResult,
  type PrefermentType,
  isPositiveNumber,
  isValidPercent,
  isValidPrefermentFlourPercent,
} from "./calculator-types";
import { roundGrams } from "./bakers-percent";

export const PREFERMENT_DEFAULTS: Record<PrefermentType, PrefermentDefaults> = {
  biga: {
    hydrationPercent: 50,
    yeastPercent: 0.3,
  },
  poolish: {
    hydrationPercent: 100,
    yeastPercent: 0.2,
  },
};

function resolvePrefermentHydration(
  type: PrefermentType,
  override: number | null | undefined,
): number | null {
  if (override === null || override === undefined) {
    return PREFERMENT_DEFAULTS[type].hydrationPercent;
  }

  return isValidPercent(override) ? override : null;
}

function resolvePrefermentYeast(
  type: PrefermentType,
  override: number | null | undefined,
): number | null {
  if (override === null || override === undefined) {
    return PREFERMENT_DEFAULTS[type].yeastPercent;
  }

  return isValidPercent(override) ? override : null;
}

/** ビガ / ポーリッシュを main 生地と按分 */
export function computePreferment(input: PrefermentInput): PrefermentResult | null {
  if (
    !isPositiveNumber(input.totalFlourG) ||
    !isValidPrefermentFlourPercent(input.prefermentFlourPercent) ||
    !isValidPercent(input.totalHydrationPercent)
  ) {
    return null;
  }

  const prefermentHydrationPercent = resolvePrefermentHydration(
    input.prefermentType,
    input.prefermentHydrationPercent,
  );
  const prefermentYeastPercent = resolvePrefermentYeast(
    input.prefermentType,
    input.prefermentYeastPercent,
  );

  if (prefermentHydrationPercent === null || prefermentYeastPercent === null) {
    return null;
  }

  const prefermentFlourG = roundGrams(
    (input.totalFlourG * input.prefermentFlourPercent) / 100,
  );
  const mainFlourG = roundGrams(input.totalFlourG - prefermentFlourG);

  if (mainFlourG <= 0) {
    return null;
  }

  const totalWaterG = roundGrams(
    (input.totalFlourG * input.totalHydrationPercent) / 100,
  );
  const prefermentWaterG = roundGrams(
    (prefermentFlourG * prefermentHydrationPercent) / 100,
  );
  const mainWaterG = roundGrams(totalWaterG - prefermentWaterG);

  if (mainWaterG < 0) {
    return null;
  }

  const prefermentYeastG = roundGrams(
    (prefermentFlourG * prefermentYeastPercent) / 100,
  );

  return {
    prefermentType: input.prefermentType,
    prefermentFlourPercent: input.prefermentFlourPercent,
    prefermentFlourG,
    prefermentWaterG,
    prefermentYeastG,
    mainFlourG,
    mainWaterG,
    totalWaterG,
    prefermentHydrationPercent,
    prefermentYeastPercent,
  };
}

function describePrefermentError(input: PrefermentInput): string | null {
  if (!isPositiveNumber(input.totalFlourG)) {
    return "全体粉量 (g) を正の数値で入力してください";
  }

  if (!isValidPrefermentFlourPercent(input.prefermentFlourPercent)) {
    return "preferment 粉比率は 0 より大きく 100 未満で入力してください";
  }

  if (!isValidPercent(input.totalHydrationPercent)) {
    return "全体加水率は 0 以上の数値を入力してください";
  }

  if (
    input.prefermentHydrationPercent !== null &&
    input.prefermentHydrationPercent !== undefined &&
    !isValidPercent(input.prefermentHydrationPercent)
  ) {
    return "preferment 加水率は 0 以上の数値を入力してください";
  }

  if (
    input.prefermentYeastPercent !== null &&
    input.prefermentYeastPercent !== undefined &&
    !isValidPercent(input.prefermentYeastPercent)
  ) {
    return "preferment 酵母率は 0 以上の数値を入力してください";
  }

  return null;
}

export function computePrefermentOutcome(
  input: PrefermentInput,
): CalculatorOutcome<PrefermentResult> {
  const error = describePrefermentError(input);
  if (error) {
    return { result: null, error };
  }

  const result = computePreferment(input);
  if (!result) {
    return {
      result: null,
      error:
        "preferment を按分できません。加水率と preferment 比率の組み合わせを確認してください",
    };
  }

  return { result, error: null };
}

export function prefermentTypeLabel(type: PrefermentType): string {
  return type === "biga" ? "ビガ (Biga)" : "ポーリッシュ (Poolish)";
}
