/**
 * ミキサー関連フィールドの補完。
 * 正本: docs/defaults-fallback.md §3.3
 */

import type { MixerInput } from "@/types/die";
import type { LearningSummary, MixerType, ShopProfile } from "@/types/profile";

import {
  buildMixerKey,
  getMixerModel,
  getMixerTypeEntry,
} from "./masters";
import { FieldResolutionTracker, resolveNumber } from "./resolve-field";

export interface ResolvedMixerDefaults {
  type: MixerType | null;
  modelId: string | null;
  lowSpeedMin: number | null;
  highSpeedMin: number | null;
  lowRpm: number | null;
  highRpm: number | null;
  baseFrictionC: number | null;
  manualFrictionOffsetC: number;
  learnedFrictionOffsetC: number;
}

function findLearningEntry(
  learning: LearningSummary[] | undefined,
  mixerKey: string,
): LearningSummary | undefined {
  return learning?.find((entry) => entry.mixerKey === mixerKey);
}

function resolveMixerType(
  input: MixerInput | undefined,
  profile: ShopProfile,
  tracker: FieldResolutionTracker,
): MixerType | null {
  const userType = input?.type;
  const profileType = profile.mixer.type;

  if (userType && userType !== "unknown") {
    tracker.record("mixer.type", {
      value: userType,
      resolution: { value: userType, source: "user", wasEstimated: false },
      isUnresolved: false,
    });
    return userType;
  }

  if (profileType && profileType !== "unknown") {
    tracker.record("mixer.type", {
      value: profileType,
      resolution: { value: profileType, source: "profile", wasEstimated: true },
      isUnresolved: false,
    });
    return profileType;
  }

  const fallbackType: MixerType = "unknown";
  tracker.record("mixer.type", {
    value: fallbackType,
    resolution: {
      value: fallbackType,
      source: "master",
      sourceDetail: "mixer-master:types.unknown",
      wasEstimated: true,
    },
    isUnresolved: false,
  });
  return fallbackType;
}

function resolveBaseFrictionC(
  type: MixerType,
  modelId: string | null,
  tracker: FieldResolutionTracker,
): number | null {
  if (modelId) {
    const model = getMixerModel(modelId);
    if (model) {
      tracker.record("mixer.baseFrictionC", {
        value: model.frictionC,
        resolution: {
          value: model.frictionC,
          source: "master",
          sourceDetail: `mixer-master:models.${modelId}`,
          wasEstimated: true,
        },
        isUnresolved: false,
      });
      return model.frictionC;
    }
  }

  const typeEntry = getMixerTypeEntry(type);
  tracker.record("mixer.baseFrictionC", {
    value: typeEntry.avgFrictionC,
    resolution: {
      value: typeEntry.avgFrictionC,
      source: "master",
      sourceDetail: `mixer-master:types.${type}.avgFrictionC`,
      wasEstimated: true,
    },
    isUnresolved: false,
  });
  return typeEntry.avgFrictionC;
}

function resolveMixerNumericField(
  fieldKey: string,
  userValue: number | null | "unknown" | undefined,
  profileValue: number | null | "unknown" | undefined,
  modelValue: number | null | undefined,
  typeValue: number | null | undefined,
  modelSourceDetail: string | undefined,
  typeSourceDetail: string,
  tracker: FieldResolutionTracker,
): number | null {
  const fromModel = resolveNumber({
    fieldKey,
    userValue,
    profileValue,
    masterValue: modelValue ?? null,
    masterSourceDetail: modelSourceDetail,
  });

  if (!fromModel.isUnresolved) {
    tracker.record(fieldKey, fromModel);
    return fromModel.value;
  }

  const fromType = resolveNumber({
    fieldKey,
    userValue,
    profileValue,
    masterValue: typeValue ?? null,
    masterSourceDetail: typeSourceDetail,
  });
  tracker.record(fieldKey, fromType);
  return fromType.value;
}

export function resolveMixerDefaults(
  input: MixerInput | undefined,
  profile: ShopProfile,
  tracker: FieldResolutionTracker,
): ResolvedMixerDefaults {
  const type = resolveMixerType(input, profile, tracker);

  const userModelId = input?.modelId;
  const profileModelId = profile.mixer.modelId ?? null;
  const modelId =
    userModelId !== undefined && userModelId !== null
      ? userModelId
      : profileModelId;

  tracker.record("mixer.modelId", {
    value: modelId,
    resolution: {
      value: modelId,
      source: userModelId !== undefined && userModelId !== null ? "user" : "profile",
      wasEstimated: !(userModelId !== undefined && userModelId !== null),
    },
    isUnresolved: false,
  });

  const effectiveType = type ?? "unknown";
  const model = modelId ? getMixerModel(modelId) : undefined;
  const typeEntry = getMixerTypeEntry(effectiveType);

  const lowSpeedMin = resolveMixerNumericField(
    "mixer.lowSpeedMin",
    input?.lowSpeedMin,
    profile.mixer.lowSpeedMin,
    model?.lowSpeedMin,
    typeEntry.lowSpeedMin,
    model ? `mixer-master:models.${modelId}.lowSpeedMin` : undefined,
    `mixer-master:types.${effectiveType}.lowSpeedMin`,
    tracker,
  );

  const highSpeedMin = resolveMixerNumericField(
    "mixer.highSpeedMin",
    input?.highSpeedMin,
    profile.mixer.highSpeedMin,
    model?.highSpeedMin,
    typeEntry.highSpeedMin,
    model ? `mixer-master:models.${modelId}.highSpeedMin` : undefined,
    `mixer-master:types.${effectiveType}.highSpeedMin`,
    tracker,
  );

  const lowRpm = resolveMixerNumericField(
    "mixer.lowRpm",
    input?.lowRpm,
    profile.mixer.lowRpm,
    model?.lowRpm,
    typeEntry.lowRpm,
    model ? `mixer-master:models.${modelId}.lowRpm` : undefined,
    `mixer-master:types.${effectiveType}.lowRpm`,
    tracker,
  );

  const highRpm = resolveMixerNumericField(
    "mixer.highRpm",
    input?.highRpm,
    profile.mixer.highRpm,
    model?.highRpm,
    typeEntry.highRpm,
    model ? `mixer-master:models.${modelId}.highRpm` : undefined,
    `mixer-master:types.${effectiveType}.highRpm`,
    tracker,
  );

  const baseFrictionC = resolveBaseFrictionC(effectiveType, modelId, tracker);

  const manualResult = resolveNumber({
    fieldKey: "mixer.manualFrictionOffsetC",
    userValue: input?.manualFrictionOffsetC,
    profileValue: profile.mixer.manualFrictionOffset ?? 0,
    masterValue: 0,
    masterSourceDetail: "default-zero",
  });
  tracker.record("mixer.manualFrictionOffsetC", manualResult);

  const mixerKey = buildMixerKey(effectiveType, modelId);
  const learningEntry = findLearningEntry(profile.learning, mixerKey);
  const learnedFrictionOffsetC =
    learningEntry && learningEntry.runCount >= 5 ? learningEntry.learnedFrictionOffset : 0;

  if (learnedFrictionOffsetC !== 0) {
    tracker.record("mixer.learnedFrictionOffsetC", {
      value: learnedFrictionOffsetC,
      resolution: {
        value: learnedFrictionOffsetC,
        source: "learning",
        sourceDetail: mixerKey,
        wasEstimated: true,
      },
      isUnresolved: false,
    });
  } else {
    tracker.record("mixer.learnedFrictionOffsetC", {
      value: 0,
      resolution: {
        value: 0,
        source: "learning",
        sourceDetail: "run-count-below-threshold",
        wasEstimated: true,
      },
      isUnresolved: false,
    });
  }

  return {
    type,
    modelId,
    lowSpeedMin,
    highSpeedMin,
    lowRpm,
    highRpm,
    baseFrictionC,
    manualFrictionOffsetC: manualResult.value ?? 0,
    learnedFrictionOffsetC,
  };
}
