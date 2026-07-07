/**
 * 粉・ブレンド関連フィールドの補完。
 * 正本: docs/defaults-fallback.md §3.2
 */

import type { FlourBlendInput } from "@/types/die";
import type { ShopProfile } from "@/types/profile";

import { getFlourById } from "./masters";
import { FieldResolutionTracker, isResolvedNumber, resolveNumber } from "./resolve-field";

export interface ResolvedFlourDefaults {
  primaryFlourId: string | null;
  flourTempC: number | null;
  proteinPercent: number | null;
  wValue: number | null;
  absorptionFactor: number | null;
  ratioPct: number;
}

export function resolveFlourDefaults(
  input: FlourBlendInput | undefined,
  profile: ShopProfile,
  ambientTempC: number | null,
  tracker: FieldResolutionTracker,
  flourTempOverride?: number | null | "unknown",
): ResolvedFlourDefaults {
  const userItem = input?.items?.[0];
  const flourId = userItem?.flourId ?? profile.flour.primaryFlourId ?? null;
  const masterFlour = flourId ? getFlourById(flourId) : undefined;

  if (!flourId) {
    tracker.unresolvedFields.push("flour.primaryFlourId");
    return {
      primaryFlourId: null,
      flourTempC: null,
      proteinPercent: null,
      wValue: null,
      absorptionFactor: null,
      ratioPct: 100,
    };
  }

  tracker.record("flour.primaryFlourId", {
    value: flourId,
    resolution: {
      value: flourId,
      source: userItem?.flourId ? "user" : "profile",
      wasEstimated: !userItem?.flourId,
    },
    isUnresolved: false,
  });

  const effectiveFlourTemp = resolveNumber({
    fieldKey: "flour.flourTempC",
    userValue: flourTempOverride ?? input?.effectiveFlourTempC ?? userItem?.flourTempC,
    profileValue: profile.flour.defaultFlourTemp,
    masterValue: null,
  });

  let flourTempC = effectiveFlourTemp.value;

  if (effectiveFlourTemp.isUnresolved && ambientTempC !== null) {
    flourTempC = ambientTempC + 2;
    tracker.recordComputed("flour.flourTempC", flourTempC, "ambientTemp+2C");
  } else {
    tracker.record("flour.flourTempC", effectiveFlourTemp);
  }

  const proteinResult = resolveNumber({
    fieldKey: "flour.proteinPercent",
    userValue: userItem?.proteinPercent,
    profileValue: profile.flour.proteinPercent,
    masterValue: masterFlour?.proteinPercent ?? null,
    masterSourceDetail: masterFlour ? `flour-master:${flourId}` : undefined,
  });
  tracker.record("flour.proteinPercent", proteinResult);

  const wValueResult = resolveNumber({
    fieldKey: "flour.wValue",
    userValue: userItem?.wValue,
    profileValue: profile.flour.wValue,
    masterValue: masterFlour?.wValue ?? null,
    masterSourceDetail: masterFlour ? `flour-master:${flourId}` : undefined,
  });
  tracker.record("flour.wValue", wValueResult);

  const absorptionResult = resolveNumber({
    fieldKey: "flour.absorptionFactor",
    userValue: userItem?.absorptionFactor ?? input?.effectiveAbsorptionFactor,
    profileValue: profile.flour.absorptionFactor,
    masterValue: masterFlour?.absorptionFactor ?? null,
    masterSourceDetail: masterFlour ? `flour-master:${flourId}` : undefined,
  });
  tracker.record("flour.absorptionFactor", absorptionResult);

  const ratioPct = isResolvedNumber(userItem?.ratioPct) ? userItem.ratioPct : 100;

  return {
    primaryFlourId: flourId,
    flourTempC,
    proteinPercent: proteinResult.value,
    wValue: wValueResult.value,
    absorptionFactor: absorptionResult.value,
    ratioPct,
  };
}
