/**
 * ミキサー摩擦温度の純粋関数。
 * effectiveFrictionC = baseFrictionC + manualFrictionOffsetC + learnedFrictionOffsetC
 *
 * base / manual / learned の解決は lib/defaults/ の責務。
 * 本モジュールは加算と frictionSource 判定のみ行う。
 */

import type { FrictionSource } from "@/types/die";

export interface FrictionComponentsInput {
  baseFrictionC?: number | null;
  manualFrictionOffsetC?: number | null;
  learnedFrictionOffsetC?: number | null;
}

export interface FrictionComputeResult {
  baseFrictionC: number;
  manualFrictionOffsetC: number;
  learnedFrictionOffsetC: number;
  effectiveFrictionC: number;
  frictionRiseC: number;
  frictionSource: FrictionSource;
}

/** null / undefined / NaN を 0 に正規化する */
export function normalizeFrictionComponent(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * 摩擦の主な取得元を判定する。
 * manual > learning > master の優先順（いずれも 0 のとき master）。
 */
export function determineFrictionSource(
  manualFrictionOffsetC: number,
  learnedFrictionOffsetC: number,
): FrictionSource {
  if (manualFrictionOffsetC !== 0) {
    return "manual";
  }
  if (learnedFrictionOffsetC !== 0) {
    return "learning";
  }
  return "master";
}

export function computeFriction(input: FrictionComponentsInput): FrictionComputeResult {
  const baseFrictionC = normalizeFrictionComponent(input.baseFrictionC);
  const manualFrictionOffsetC = normalizeFrictionComponent(input.manualFrictionOffsetC);
  const learnedFrictionOffsetC = normalizeFrictionComponent(input.learnedFrictionOffsetC);

  const effectiveFrictionC =
    baseFrictionC + manualFrictionOffsetC + learnedFrictionOffsetC;

  const frictionSource = determineFrictionSource(
    manualFrictionOffsetC,
    learnedFrictionOffsetC,
  );

  return {
    baseFrictionC,
    manualFrictionOffsetC,
    learnedFrictionOffsetC,
    effectiveFrictionC,
    frictionRiseC: effectiveFrictionC,
    frictionSource,
  };
}
