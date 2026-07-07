/**
 * Baker's % から配合重量 (g) を逆算する純粋関数。
 *
 * totalDoughWeightG = doughBallWeightG × ballCount
 * flourWeightG = totalDoughWeightG / ((100 + 各%) / 100)
 */

import type { RecipeOutput } from "@/types/die";

export interface RecipeInput {
  doughBallWeightG?: number | null;
  ballCount?: number | null;
  hydrationPercent?: number | null;
  saltPercent?: number | null;
  yeastPercent?: number | null;
  oilPercent?: number | null;
}

function isValidPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function isValidNonNegativeNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0;
}

function roundGrams(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeRecipe(input: RecipeInput): RecipeOutput | null {
  if (
    !isValidPositiveNumber(input.doughBallWeightG) ||
    !isValidPositiveNumber(input.ballCount) ||
    !isValidNonNegativeNumber(input.hydrationPercent) ||
    !isValidNonNegativeNumber(input.saltPercent) ||
    !isValidNonNegativeNumber(input.yeastPercent)
  ) {
    return null;
  }

  const oilPercent = input.oilPercent ?? 0;
  if (!isValidNonNegativeNumber(oilPercent)) {
    return null;
  }

  const totalDoughWeightG = roundGrams(input.doughBallWeightG * input.ballCount);
  const totalPercent =
    100 +
    input.hydrationPercent +
    input.saltPercent +
    input.yeastPercent +
    oilPercent;

  if (totalPercent <= 0) {
    return null;
  }

  const flourG = roundGrams(totalDoughWeightG / (totalPercent / 100));
  const waterG = roundGrams((flourG * input.hydrationPercent) / 100);
  const saltG = roundGrams((flourG * input.saltPercent) / 100);
  const yeastG = roundGrams((flourG * input.yeastPercent) / 100);
  const oilG = roundGrams((flourG * oilPercent) / 100);

  return {
    flourG,
    waterG,
    saltG,
    yeastG,
    ...(oilG > 0 ? { oilG } : { oilG: 0 }),
    totalDoughWeightG,
    hydrationPct: input.hydrationPercent,
    saltPct: input.saltPercent,
    yeastPct: input.yeastPercent,
  };
}

/** 配合合計が totalDoughWeightG とおおむね一致するか検証（テスト用） */
export function sumRecipeWeightG(recipe: RecipeOutput): number {
  return recipe.flourG + recipe.waterG + recipe.saltG + recipe.yeastG + (recipe.oilG ?? 0);
}
