/**
 * Master JSON 読み込み・参照ヘルパー。
 */

import mixerMasterData from "@/data/mixer-master.json";
import flourMasterData from "@/data/flour-master.json";
import methodPresetsData from "@/data/method-presets.json";

import type { MethodType, MixerType } from "@/types/profile";
import type {
  FlourEntry,
  FlourMaster,
  MethodPresetsMaster,
  MixerMaster,
  MixerModelEntry,
  MixerTypeEntry,
  RegionalMethodEntry,
} from "./master-types";

const mixerMaster = mixerMasterData as MixerMaster;
const flourMaster = flourMasterData as FlourMaster;
const methodPresets = methodPresetsData as MethodPresetsMaster;

export function getMixerMaster(): MixerMaster {
  return mixerMaster;
}

export function getFlourMaster(): FlourMaster {
  return flourMaster;
}

export function getMethodPresetsMaster(): MethodPresetsMaster {
  return methodPresets;
}

export function getMixerTypeEntry(type: MixerType): MixerTypeEntry {
  return mixerMaster.types[type];
}

export function getMixerModel(modelId: string): MixerModelEntry | undefined {
  return mixerMaster.models.find((model) => model.id === modelId);
}

export function getFlourById(flourId: string): FlourEntry | undefined {
  return flourMaster.flours.find((flour) => flour.id === flourId);
}

export function getRegionalMethod(method: MethodType): RegionalMethodEntry {
  return methodPresets.regionalMethods[method];
}

export function buildMixerKey(type: MixerType, modelId: string | null | undefined): string {
  return `${type}:${modelId ?? ""}`;
}
