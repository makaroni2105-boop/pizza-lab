/**
 * 店舗プロファイル・用途別プロファイルの型定義。
 * 正本: docs/schemas/profile.schema.json
 */

/** 数値、null（未設定→補完）、または "unknown"（わからない→補完） */
export type UnknownOrNumber = number | null | "unknown";

/** 文字列、null、または "unknown" */
export type UnknownOrString = string | null | "unknown";

export type MixerType = "hand" | "spiral" | "fork" | "double_arm" | "unknown";

export type MethodType = "napoli" | "ny" | "roma" | "custom";

export type YeastType = "dry" | "fresh" | "sourdough";

export type PresetType = "business" | "competition" | "research";

export type FermentationType = "room" | "cold" | "mixed";

export interface FlourSettings {
  primaryFlourId: string;
  defaultFlourTemp?: UnknownOrNumber;
  proteinPercent?: UnknownOrNumber;
  wValue?: UnknownOrNumber;
  absorptionFactor?: UnknownOrNumber;
}

export interface MixerSettings {
  type: MixerType;
  modelId?: string | null;
  lowSpeedMin?: UnknownOrNumber;
  highSpeedMin?: UnknownOrNumber;
  lowRpm?: UnknownOrNumber;
  highRpm?: UnknownOrNumber;
  manualFrictionOffset?: number;
}

export interface MethodSettings {
  method: MethodType;
  hydrationPercent?: number;
  saltPercent?: number;
  yeastType?: YeastType;
  yeastPercent?: number;
  oilPercent?: number;
  ballWeightG?: number;
  fermentationType?: FermentationType;
  fermentationHours?: number;
}

export interface DdtSettings {
  defaultDdt?: number;
  summerDdt?: UnknownOrNumber;
  winterDdt?: UnknownOrNumber;
}

export interface PresetProfile {
  id: string;
  name: string;
  type: PresetType;
  method: MethodSettings;
  targetDdt: number;
  ballWeightG: number;
  dnaId?: string | null;
  isDefault?: boolean;
}

export interface LearningSummary {
  mixerKey: string;
  runCount: number;
  learnedFrictionOffset: number;
  isLearningComplete: boolean;
  lastUpdatedAt?: string;
}

export interface ShopLocation {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ShopProfile {
  id: string;
  name: string;
  location?: ShopLocation;
  defaultPresetId?: string;
  flour: FlourSettings;
  mixer: MixerSettings;
  method: MethodSettings;
  ddt: DdtSettings;
  presets: PresetProfile[];
  learning?: LearningSummary[];
  setupCompletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Quick Mode 毎日の入力（2〜4項目） */
export interface QuickModeInput {
  presetId: string;
  pizzaCount: number;
  shopRoomTemp?: UnknownOrNumber;
  memo?: string | null;
}

export interface SetupWizardLocation {
  city?: string;
}

/** 初回セットアップの最小入力 */
export interface SetupWizardInput {
  shopName: string;
  location?: SetupWizardLocation;
  primaryFlourId: string;
  mixerType: MixerType;
  mixerModelId?: string | null;
  method: MethodType;
  targetDdt: number;
  hydrationPercent?: number;
  ballWeightG: number;
  pizzaCountDaily: number;
}
