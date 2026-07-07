/**
 * 製法・配合・DDT・発酵関連フィールドの補完。
 * 正本: docs/defaults-fallback.md §3.2, §3.4
 */

import type {
  FermentationScheduleInput,
  MethodInput,
  YeastInput,
} from "@/types/die";
import type {
  FermentationType,
  MethodType,
  PresetProfile,
  ShopProfile,
  YeastType,
} from "@/types/profile";

import { getRegionalMethod } from "./masters";
import { FieldResolutionTracker, resolveNumber, resolveString } from "./resolve-field";

export interface ResolvedMethodDefaults {
  method: MethodType | null;
  hydrationPct: number | null;
  saltPct: number | null;
  oilPct: number | null;
  yeastType: YeastType | null;
  yeastPct: number | null;
  fermentationType: FermentationType | null;
  fermentationHours: number | null;
  targetDdtC: number | null;
  roomTempDuringFermentC: number | null;
}

function resolveMethodType(
  input: MethodInput | undefined,
  preset: PresetProfile,
  profile: ShopProfile,
  tracker: FieldResolutionTracker,
): MethodType | null {
  const result = resolveString({
    fieldKey: "method.method",
    userValue: input?.method,
    presetValue: preset.method.method,
    profileValue: profile.method.method,
    masterValue: "napoli",
    masterSourceDetail: "method-presets:default-napoli",
  });
  tracker.record("method.method", result);
  return result.value as MethodType | null;
}

function resolveSeasonalDdt(
  ambientTempC: number | null,
  userValue: number | null | "unknown" | undefined,
  presetTargetDdt: number,
  profileDdt: ShopProfile["ddt"],
  regionalTargetDdt: number,
  regionalSeasonal: { summer: number; winter: number },
  tracker: FieldResolutionTracker,
): number | null {
  const direct = resolveNumber({
    fieldKey: "temperature.targetDdtC",
    userValue,
    presetValue: presetTargetDdt,
    profileValue: profileDdt.defaultDdt,
    masterValue: null,
  });

  if (!direct.isUnresolved) {
    tracker.record("temperature.targetDdtC", direct);
    return direct.value;
  }

  if (ambientTempC === null) {
    const fallback = resolveNumber({
      fieldKey: "temperature.targetDdtC",
      userValue,
      presetValue: presetTargetDdt,
      profileValue: profileDdt.defaultDdt,
      masterValue: regionalTargetDdt,
      masterSourceDetail: "method-presets:regionalMethod.targetDdtC",
    });
    tracker.record("temperature.targetDdtC", fallback);
    return fallback.value;
  }

  let seasonalValue: number;
  let sourceDetail: string;

  if (ambientTempC >= 25) {
    seasonalValue =
      (typeof profileDdt.summerDdt === "number" ? profileDdt.summerDdt : null) ??
      regionalSeasonal.summer;
    sourceDetail = "seasonal-summer";
  } else if (ambientTempC < 10) {
    seasonalValue =
      (typeof profileDdt.winterDdt === "number" ? profileDdt.winterDdt : null) ??
      regionalSeasonal.winter;
    sourceDetail = "seasonal-winter";
  } else {
    seasonalValue = profileDdt.defaultDdt ?? regionalTargetDdt;
    sourceDetail = "seasonal-default";
  }

  tracker.recordComputed("temperature.targetDdtC", seasonalValue, sourceDetail);
  return seasonalValue;
}

export function resolveMethodDefaults(
  methodInput: MethodInput | undefined,
  yeastInput: YeastInput | undefined,
  fermentationInput: FermentationScheduleInput | undefined,
  profile: ShopProfile,
  preset: PresetProfile,
  ambientTempC: number | null,
  shopRoomTempC: number | null,
  tracker: FieldResolutionTracker,
  targetDdtUserValue?: number | null | "unknown",
): ResolvedMethodDefaults {
  const method = resolveMethodType(methodInput, preset, profile, tracker);
  const regional = method ? getRegionalMethod(method) : getRegionalMethod("napoli");

  const hydrationResult = resolveNumber({
    fieldKey: "method.hydrationPct",
    userValue: methodInput?.hydrationPct,
    presetValue: preset.method.hydrationPercent,
    profileValue: profile.method.hydrationPercent,
    masterValue: regional.hydrationPct,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.hydrationPct`,
  });
  tracker.record("method.hydrationPct", hydrationResult);

  const saltResult = resolveNumber({
    fieldKey: "method.saltPct",
    userValue: methodInput?.saltPct,
    presetValue: preset.method.saltPercent,
    profileValue: profile.method.saltPercent,
    masterValue: regional.saltPct,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.saltPct`,
  });
  tracker.record("method.saltPct", saltResult);

  const oilResult = resolveNumber({
    fieldKey: "method.oilPct",
    userValue: methodInput?.oilPct,
    presetValue: preset.method.oilPercent,
    profileValue: profile.method.oilPercent,
    masterValue: regional.oilPct,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.oilPct`,
  });
  tracker.record("method.oilPct", oilResult);

  const yeastTypeResult = resolveString({
    fieldKey: "yeast.yeastType",
    userValue: yeastInput?.yeastType,
    presetValue: preset.method.yeastType,
    profileValue: profile.method.yeastType,
    masterValue: regional.yeastType,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.yeastType`,
  });
  tracker.record("yeast.yeastType", yeastTypeResult);

  const yeastPctResult = resolveNumber({
    fieldKey: "yeast.yeastPct",
    userValue: yeastInput?.yeastPct,
    presetValue: preset.method.yeastPercent,
    profileValue: profile.method.yeastPercent,
    masterValue: regional.yeastPct,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.yeastPct`,
  });
  tracker.record("yeast.yeastPct", yeastPctResult);

  const fermentationTypeResult = resolveString({
    fieldKey: "fermentation.fermentationType",
    userValue: fermentationInput?.fermentationType,
    presetValue: preset.method.fermentationType,
    profileValue: profile.method.fermentationType,
    masterValue: regional.fermentationType,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.fermentationType`,
  });
  tracker.record("fermentation.fermentationType", fermentationTypeResult);

  const fermentationHoursResult = resolveNumber({
    fieldKey: "fermentation.fermentationHours",
    userValue: fermentationInput?.fermentationHours,
    presetValue: preset.method.fermentationHours,
    profileValue: profile.method.fermentationHours,
    masterValue: regional.fermentationHours,
    masterSourceDetail: `method-presets:regionalMethods.${regional.id}.fermentationHours`,
  });
  tracker.record("fermentation.fermentationHours", fermentationHoursResult);

  const targetDdtC = resolveSeasonalDdt(
    ambientTempC,
    targetDdtUserValue,
    preset.targetDdt,
    profile.ddt,
    regional.targetDdtC,
    regional.ddtSeasonal,
    tracker,
  );

  const roomTempResult = resolveNumber({
    fieldKey: "fermentation.roomTempDuringFermentC",
    userValue: fermentationInput?.roomTempDuringFermentC,
    profileValue: undefined,
    masterValue: shopRoomTempC,
    masterSourceDetail: "shopRoomTempC",
  });
  tracker.record("fermentation.roomTempDuringFermentC", roomTempResult);

  return {
    method,
    hydrationPct: hydrationResult.value,
    saltPct: saltResult.value,
    oilPct: oilResult.value,
    yeastType: yeastTypeResult.value as YeastType | null,
    yeastPct: yeastPctResult.value,
    fermentationType: fermentationTypeResult.value as FermentationType | null,
    fermentationHours: fermentationHoursResult.value,
    targetDdtC,
    roomTempDuringFermentC: roomTempResult.value,
  };
}
