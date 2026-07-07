/**
 * 推奨水温が実用水温域を下回る場合の氷量推奨。
 *
 * recommendedWaterTempC < 4°C のとき useIce = true。
 * 氷量は比熱・潜熱の安全な近似式:
 *   iceAmountG ≈ waterWeightG × (tapWaterTempC − targetEffectiveTempC) / 80
 */

export const WATER_ICE_THRESHOLD_C = 4;

/** 1g 氷が約 80g 水を 1°C 冷却する近似 */
export const ICE_LATENT_HEAT_DIVISOR = 80;

/** 氷不使用時の実用水温（tap 未指定時の既定） */
export const DEFAULT_TAP_WATER_TEMP_C = 4;

export interface RecommendIceInput {
  recommendedWaterTempC?: number | null;
  waterWeightG?: number | null;
  tapWaterTempC?: number | null;
}

export interface RecommendIceResult {
  useIce: boolean;
  iceAmountG: number | null;
  effectiveWaterTempC: number | null;
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function shouldUseIce(recommendedWaterTempC: number): boolean {
  return recommendedWaterTempC < WATER_ICE_THRESHOLD_C;
}

export function recommendIce(input: RecommendIceInput): RecommendIceResult {
  if (!isValidNumber(input.recommendedWaterTempC)) {
    return {
      useIce: false,
      iceAmountG: null,
      effectiveWaterTempC: null,
    };
  }

  const recommendedWaterTempC = input.recommendedWaterTempC;

  if (!shouldUseIce(recommendedWaterTempC)) {
    return {
      useIce: false,
      iceAmountG: 0,
      effectiveWaterTempC: recommendedWaterTempC,
    };
  }

  if (!isValidNumber(input.waterWeightG) || input.waterWeightG <= 0) {
    return {
      useIce: true,
      iceAmountG: null,
      effectiveWaterTempC: recommendedWaterTempC,
    };
  }

  const tapWaterTempC = isValidNumber(input.tapWaterTempC)
    ? input.tapWaterTempC
    : DEFAULT_TAP_WATER_TEMP_C;
  const targetEffectiveTempC = recommendedWaterTempC;

  if (tapWaterTempC <= targetEffectiveTempC) {
    return {
      useIce: true,
      iceAmountG: 0,
      effectiveWaterTempC: tapWaterTempC,
    };
  }

  const rawIceAmountG =
    (input.waterWeightG * (tapWaterTempC - targetEffectiveTempC)) /
    ICE_LATENT_HEAT_DIVISOR;

  return {
    useIce: true,
    iceAmountG: Math.max(0, Math.round(rawIceAmountG)),
    effectiveWaterTempC: targetEffectiveTempC,
  };
}
