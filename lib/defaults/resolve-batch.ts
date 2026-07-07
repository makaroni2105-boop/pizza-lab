/**
 * バッチ（枚数・1枚重量）の補完。
 * 正本: docs/defaults-fallback.md §3.4, §3.5
 */

import type { BatchInput } from "@/types/die";
import type { PresetProfile } from "@/types/profile";

import { FieldResolutionTracker, resolveNumber } from "./resolve-field";

export interface ResolvedBatchDefaults {
  pizzaCount: number;
  ballWeightG: number | null;
}

export function resolveBatchDefaults(
  input: BatchInput,
  preset: PresetProfile,
  tracker: FieldResolutionTracker,
): ResolvedBatchDefaults {
  tracker.record("batch.pizzaCount", {
    value: input.pizzaCount,
    resolution: {
      value: input.pizzaCount,
      source: "user",
      wasEstimated: false,
    },
    isUnresolved: false,
  });

  const ballWeightResult = resolveNumber({
    fieldKey: "batch.ballWeightG",
    userValue: input.ballWeightG,
    presetValue: preset.ballWeightG,
    profileValue: preset.method.ballWeightG,
    masterValue: 250,
    masterSourceDetail: "global-default-250g",
  });
  tracker.record("batch.ballWeightG", ballWeightResult);

  return {
    pizzaCount: input.pizzaCount,
    ballWeightG: ballWeightResult.value,
  };
}
