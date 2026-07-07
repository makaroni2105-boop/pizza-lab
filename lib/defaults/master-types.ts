/**
 * Master JSON の型定義（data/*.json 読み込み用）。
 * 正本: data/mixer-master.json, flour-master.json, method-presets.json
 */

import type { FermentationType, MethodType, MixerType, YeastType } from "@/types/profile";

export interface LocalizedLabel {
  ja: string;
  en: string;
  it?: string;
}

export interface MixerTypeEntry {
  label: LocalizedLabel;
  avgFrictionC: number;
  frictionPerMinC: number | null;
  lowSpeedMin: number | null;
  highSpeedMin: number | null;
  lowRpm: number | null;
  highRpm: number | null;
}

export interface MixerModelEntry {
  id: string;
  maker: string;
  model: string;
  type: MixerType;
  frictionC: number;
  lowSpeedMin: number | null;
  highSpeedMin: number | null;
  lowRpm: number | null;
  highRpm: number | null;
}

export interface MixerMaster {
  version: string;
  types: Record<MixerType, MixerTypeEntry>;
  models: MixerModelEntry[];
}

export interface FlourEntry {
  id: string;
  wValue: number;
  proteinPercent: number;
  absorptionFactor: number;
}

export interface FlourMaster {
  version: string;
  flours: FlourEntry[];
}

export interface RegionalMethodEntry {
  id: MethodType;
  hydrationPct: number;
  saltPct: number;
  yeastType: YeastType;
  yeastPct: number;
  oilPct: number;
  targetDdtC: number;
  ddtSeasonal: { summer: number; winter: number };
  fermentationType: FermentationType;
  fermentationHours: number;
  ballWeightG: number;
}

export interface MethodPresetsMaster {
  version: string;
  regionalMethods: Record<MethodType, RegionalMethodEntry>;
}
