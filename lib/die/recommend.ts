/**
 * DDT 4要素モデルによる推奨水温の逆算。
 *
 * 推奨水温 = 目標DDT × 4 − 粉温 − 室温 − 摩擦
 * 予想生地温 = (粉温 + 推奨水温 + 室温 + 摩擦) / 4
 *
 * 氷補正は lib/die/ice.ts の責務。
 */

import type { FrictionSource } from "@/types/die";

import {
  computeFriction,
  type FrictionComponentsInput,
  type FrictionComputeResult,
} from "./friction";

export interface RecommendWaterTempInput {
  targetDdtC?: number | null;
  flourTempC?: number | null;
  roomTempC?: number | null;
  effectiveFrictionC?: number | null;
  friction?: FrictionComponentsInput;
}

export interface RecommendWaterTempResult {
  recommendedWaterTempC: number | null;
  predictedDoughTempC: number | null;
  targetDdtC: number | null;
  ddtDeltaC: number | null;
  frictionRiseC: number | null;
  frictionSource: FrictionSource | null;
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function resolveFriction(input: RecommendWaterTempInput): FrictionComputeResult | null {
  if (input.friction) {
    return computeFriction(input.friction);
  }

  if (!isValidNumber(input.effectiveFrictionC)) {
    return null;
  }

  return computeFriction({
    baseFrictionC: input.effectiveFrictionC,
    manualFrictionOffsetC: 0,
    learnedFrictionOffsetC: 0,
  });
}

export function recommendWaterTemp(input: RecommendWaterTempInput): RecommendWaterTempResult {
  const empty: RecommendWaterTempResult = {
    recommendedWaterTempC: null,
    predictedDoughTempC: null,
    targetDdtC: null,
    ddtDeltaC: null,
    frictionRiseC: null,
    frictionSource: null,
  };

  if (
    !isValidNumber(input.targetDdtC) ||
    !isValidNumber(input.flourTempC) ||
    !isValidNumber(input.roomTempC)
  ) {
    return empty;
  }

  const friction = resolveFriction(input);
  if (!friction) {
    return empty;
  }

  const recommendedWaterTempC =
    input.targetDdtC * 4 -
    input.flourTempC -
    input.roomTempC -
    friction.effectiveFrictionC;

  const predictedDoughTempC =
    (input.flourTempC +
      recommendedWaterTempC +
      input.roomTempC +
      friction.effectiveFrictionC) /
    4;

  return {
    recommendedWaterTempC,
    predictedDoughTempC,
    targetDdtC: input.targetDdtC,
    ddtDeltaC: predictedDoughTempC - input.targetDdtC,
    frictionRiseC: friction.frictionRiseC,
    frictionSource: friction.frictionSource,
  };
}
