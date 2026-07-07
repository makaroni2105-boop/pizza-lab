/**
 * DIE 入力前の defaults 補完オーケストレーター。
 * 計算式（水温逆算・effectiveFriction 合算等）は lib/die/ に委譲。
 */

import type { DieRequest, ResolvedValue } from "@/types/die";
import type { PresetProfile, ShopProfile } from "@/types/profile";

import { resolveBatchDefaults } from "./resolve-batch";
import { resolveEnvironment, type WeatherSnapshot } from "./resolve-environment";
import { resolveFlourDefaults } from "./resolve-flour";
import { FieldResolutionTracker } from "./resolve-field";
import { resolveMethodDefaults } from "./resolve-method";
import { resolveMixerDefaults } from "./resolve-mixer";
import { buildMixerKey } from "./masters";

export interface DefaultsResolveOptions {
  request: DieRequest;
  profile: ShopProfile;
  preset: PresetProfile;
  weather?: WeatherSnapshot;
}

export interface DefaultsResolveResult {
  fieldResolution: Record<string, ResolvedValue>;
  estimatedFieldCount: number;
  unresolvedFields: string[];
  batch: ReturnType<typeof resolveBatchDefaults>;
  environment: ReturnType<typeof resolveEnvironment>;
  flour: ReturnType<typeof resolveFlourDefaults>;
  mixer: ReturnType<typeof resolveMixerDefaults>;
  method: ReturnType<typeof resolveMethodDefaults>;
  /** 水温は DIE が逆算するため常に null */
  waterTempC: null;
  learningRunCount: number;
}

export function resolveDefaults(options: DefaultsResolveOptions): DefaultsResolveResult {
  const { request, profile, preset, weather } = options;
  const tracker = new FieldResolutionTracker();

  const environmentInput = request.environment;
  const environment = resolveEnvironment(environmentInput, profile, weather, tracker);

  const batch = resolveBatchDefaults(request.batch, preset, tracker);

  const flourInput = request.mode === "lab" ? request.flour : undefined;
  const flourTempOverride =
    request.mode === "lab" ? request.temperature?.flourTempC : undefined;
  const flour = resolveFlourDefaults(
    flourInput,
    profile,
    environment.ambientTempC,
    tracker,
    flourTempOverride,
  );

  const mixerInput = request.mode === "lab" ? request.mixer : undefined;
  const mixer = resolveMixerDefaults(mixerInput, profile, tracker);

  const methodInput = request.mode === "lab" ? request.method : undefined;
  const yeastInput = request.mode === "lab" ? request.yeast : undefined;
  const fermentationInput = request.mode === "lab" ? request.fermentation : undefined;
  const targetDdtUserValue =
    request.mode === "lab" ? request.temperature?.targetDdtC : undefined;

  const method = resolveMethodDefaults(
    methodInput,
    yeastInput,
    fermentationInput,
    profile,
    preset,
    environment.ambientTempC,
    environment.shopRoomTempC,
    tracker,
    targetDdtUserValue,
  );

  return {
    fieldResolution: tracker.getFieldResolution(),
    estimatedFieldCount: tracker.getEstimatedFieldCount(),
    unresolvedFields: tracker.unresolvedFields,
    batch,
    environment,
    flour,
    mixer,
    method,
    waterTempC: null,
    learningRunCount:
      profile.learning?.find(
        (entry) => entry.mixerKey === buildMixerKey(mixer.type ?? "unknown", mixer.modelId),
      )?.runCount ?? 0,
  };
}

export function findPreset(profile: ShopProfile, presetId: string): PresetProfile | undefined {
  return profile.presets.find((preset) => preset.id === presetId);
}
