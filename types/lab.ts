/**
 * Lab Mode 型定義（Phase 4）。
 * 正本: docs/lab-mode/
 * DNA 正式スキーマ: docs/schemas/dna.schema.json
 *
 * DIE / Learning / Calculator / Ask の既存型を import 参照のみ。
 */

import type { DieOutput, LabModeRequest } from "./die";
import type { PresetType } from "./profile";

/** localStorage キー（Phase 4a 実装時） */
export const LAB_STORAGE_KEYS = {
  sessions: "pizzalab-lab-sessions-v1",
  dna: "pizzalab-dna-v1",
  blends: "pizzalab-flour-blends-v1",
  journal: "pizzalab-journal-v1",
  comparisons: "pizzalab-comparisons-v1",
} as const;

// ---------------------------------------------------------------------------
// Dough DNA（dna.schema.json 準拠）
// ---------------------------------------------------------------------------

export type DNAPresetType = PresetType;

export type DNAKey =
  | "lightness"
  | "chewiness"
  | "bite"
  | "extensibility"
  | "elasticity"
  | "aroma"
  | "crustColor"
  | "bakeTolerance"
  | "cornicioneForm"
  | "airiness"
  | "centerTexture"
  | "crustTexture"
  | "mouthfeel"
  | "digestibility"
  | "crispness"
  | "moistness"
  | "reheatTolerance";

/** 0–100。その店の100点基準（グローバル正解値ではない） */
export type DNAScore = number;

export type DNAScores = Partial<Record<DNAKey, DNAScore | null>>;

export type DNALearningSource =
  | "craftsman-self-eval"
  | "run-actual"
  | "photo-analysis"
  | "manual";

export interface DNATargetParams {
  hydrationPct?: number;
  targetDdtC?: number;
  saltPct?: number;
  yeastType?: "dry" | "fresh" | "sourdough";
  yeastPct?: number;
  fermentationType?: "room" | "cold" | "mixed";
  fermentationHours?: number;
  methodId?: string;
  prefermentId?: "biga" | "poolish" | "lievito_madre" | "hybrid" | null;
}

export interface DNALearningRecord {
  source: DNALearningSource;
  runId?: string | null;
  photoId?: string | null;
  previousScores?: DNAScores;
  updatedScores?: DNAScores;
  craftsmanConfirmed: boolean;
  updatedAt: string;
}

export interface DoughDNA {
  id: string;
  shopId: string;
  name: string;
  presetType: DNAPresetType;
  presetId?: string | null;
  scores: DNAScores;
  targetParams?: DNATargetParams;
  description?: string;
  isDefault?: boolean;
  learningHistory?: DNALearningRecord[];
  linkedFlourIds?: string[];
  linkedMixerKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DNASnapshot {
  dnaId: string;
  scores: DNAScores;
  targetParams?: DNATargetParams;
  capturedAt: string;
}

export const DNA_KEYS: readonly DNAKey[] = [
  "lightness",
  "chewiness",
  "bite",
  "extensibility",
  "elasticity",
  "aroma",
  "crustColor",
  "bakeTolerance",
  "cornicioneForm",
  "airiness",
  "centerTexture",
  "crustTexture",
  "mouthfeel",
  "digestibility",
  "crispness",
  "moistness",
  "reheatTolerance",
] as const;

// ---------------------------------------------------------------------------
// Flour Blend
// ---------------------------------------------------------------------------

/** 製法コンテキスト — STG/VPN/APN 等。唯一解にしない参照用 */
export type FlourBlendMethodContext =
  | "napoli"
  | "ny"
  | "roma"
  | "stg"
  | "vpn"
  | "apn"
  | "custom";

/** flour-master personality 軸（0–100 個性。優劣ではない） */
export type PersonalityVector = Record<string, number>;

export interface FlourSpecs {
  wValue?: number;
  proteinPercent?: number;
  absorptionFactor?: number;
}

export interface FlourBlendComponent {
  flourId: string;
  percent: number;
  label?: string;
}

export interface FlourBlend {
  id: string;
  shopId: string;
  name: string;
  components: FlourBlendComponent[];
  targetPersonality?: PersonalityVector;
  predictedSpecs?: FlourSpecs;
  methodContext?: FlourBlendMethodContext;
  dnaId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlourBlendSnapshot {
  blendId: string;
  name: string;
  components: FlourBlendComponent[];
  predictedSpecs?: FlourSpecs;
  methodContext?: FlourBlendMethodContext;
  capturedAt: string;
}

// ---------------------------------------------------------------------------
// Dough Journal
// ---------------------------------------------------------------------------

export type JournalEntryType =
  | "observation"
  | "hypothesis"
  | "procedure"
  | "reflection"
  | "reference";

export type CraftsmanMood = "curious" | "satisfied" | "unsure" | "breakthrough";

export interface DoughJournal {
  id: string;
  shopId: string;
  title: string;
  body: string;
  entryType: JournalEntryType;
  labSessionId?: string | null;
  runId?: string | null;
  craftsmanMood?: CraftsmanMood;
  tags?: string[];
  dnaSnapshotId?: string | null;
  photoIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Comparison Run
// ---------------------------------------------------------------------------

export type ComparisonStatus = "draft" | "ready" | "concluded";

/** DIE 結果要点（Compare 表示用スナップショット） */
export interface DieOutputSummary {
  totalDoughWeightG?: number;
  hydrationPct?: number;
  targetDdtC?: number;
  predictedDoughTempC?: number;
  recommendedWaterTempC?: number;
  flourG?: number;
  waterG?: number;
}

export interface ComparisonSide {
  label: string;
  runId?: string | null;
  labSessionId?: string | null;
  dnaSnapshot?: DNASnapshot;
  blendSnapshot?: FlourBlendSnapshot;
  dieOutputSummary?: DieOutputSummary;
}

export interface ComparisonDimension {
  key: string;
  label: string;
  valueA?: string | number | null;
  valueB?: string | number | null;
  valueC?: string | number | null;
  unit?: string;
}

export interface ComparisonRun {
  id: string;
  shopId: string;
  title: string;
  status: ComparisonStatus;
  sideA: ComparisonSide;
  sideB: ComparisonSide;
  sideC?: ComparisonSide;
  dimensions: ComparisonDimension[];
  hypothesis?: string | null;
  conclusion?: string | null;
  nextSteps?: string | null;
  journalEntryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Lab Session
// ---------------------------------------------------------------------------

export type LabSessionStatus = "draft" | "running" | "completed" | "archived";

/** LabModeRequest + 計算結果のスナップショット */
export interface LabSessionDieSnapshot {
  request: LabModeRequest;
  output?: DieOutput;
  calculatedAt?: string;
}

export interface LabSession {
  id: string;
  shopId: string;
  title?: string;
  status: LabSessionStatus;
  presetType?: DNAPresetType;
  hypothesis?: string | null;
  dieSnapshot?: LabSessionDieSnapshot;
  dnaSnapshot?: DNASnapshot;
  blendSnapshot?: FlourBlendSnapshot;
  runIds: string[];
  journalEntryIds: string[];
  comparisonIds: string[];
  summary?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}
