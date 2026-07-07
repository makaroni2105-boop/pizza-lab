/**
 * Baker's % Calculator — 公開 API。
 * Quick Mode / DIE とは独立した研究用計算機。
 */

export {
  type BakersPercentInput,
  type BakersPercentMode,
  type BakersPercentResult,
  type CalculatorOutcome,
  type PrefermentDefaults,
  type PrefermentInput,
  type PrefermentResult,
  type PrefermentType,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidPercent,
  isValidPrefermentFlourPercent,
  parseCalculatorNumber,
} from "./calculator-types";

export {
  computeBakersPercent,
  computeBakersPercentOutcome,
  computeFlourFromWater,
  computeFromFlourWeight,
  computeFromTotalDough,
  computeWaterFromFlour,
  roundGrams,
  sumBakersPercentWeightG,
} from "./bakers-percent";

export {
  PREFERMENT_DEFAULTS,
  computePreferment,
  computePrefermentOutcome,
  prefermentTypeLabel,
} from "./preferment";
