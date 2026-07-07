/**
 * Dough Intelligence Engine（DIE）の入出力型定義。
 * 正本: docs/schemas/die-input.schema.json
 */

import type {
  FermentationType,
  MethodType,
  MixerType,
  UnknownOrNumber,
  YeastType,
} from "./profile";

export type { UnknownOrNumber } from "./profile";

export type ModeType = "quick" | "lab";

export type ConfidenceLevel = "high" | "medium" | "low";

export type FieldSource =
  | "user"
  | "profile"
  | "preset"
  | "master"
  | "learning"
  | "computed"
  | "weather";

export type FrictionSource = "master" | "learning" | "manual";

export interface ResolvedValue<T = unknown> {
  value: T;
  source: FieldSource;
  sourceDetail?: string;
  wasEstimated?: boolean;
}

export interface EnvironmentInput {
  ambientTempC?: UnknownOrNumber;
  ambientHumidityPct?: UnknownOrNumber;
  shopRoomTempC?: UnknownOrNumber;
  shopHumidityPct?: UnknownOrNumber;
}

export interface FlourItemInput {
  flourId: string;
  ratioPct?: number;
  flourTempC?: UnknownOrNumber;
  proteinPercent?: UnknownOrNumber;
  wValue?: UnknownOrNumber;
  absorptionFactor?: UnknownOrNumber;
}

export interface FlourBlendInput {
  items?: FlourItemInput[];
  effectiveFlourTempC?: UnknownOrNumber;
  effectiveAbsorptionFactor?: UnknownOrNumber;
}

export interface MixerInput {
  type?: MixerType;
  modelId?: string | null;
  lowSpeedMin?: UnknownOrNumber;
  highSpeedMin?: UnknownOrNumber;
  lowRpm?: UnknownOrNumber;
  highRpm?: UnknownOrNumber;
  manualFrictionOffsetC?: UnknownOrNumber;
}

export interface MethodInput {
  method?: MethodType;
  hydrationPct?: UnknownOrNumber;
  saltPct?: UnknownOrNumber;
  oilPct?: UnknownOrNumber;
}

export interface YeastInput {
  yeastType?: YeastType;
  yeastPct?: UnknownOrNumber;
}

export interface FermentationScheduleInput {
  fermentationType?: FermentationType;
  fermentationHours?: UnknownOrNumber;
  mixStartTime?: string | null;
  useTime?: string | null;
  roomTempDuringFermentC?: UnknownOrNumber;
}

export interface BatchInput {
  pizzaCount: number;
  ballWeightG?: UnknownOrNumber;
  totalDoughWeightG?: UnknownOrNumber;
}

export interface TemperatureInput {
  flourTempC?: UnknownOrNumber;
  waterTempC?: UnknownOrNumber;
  targetDdtC?: UnknownOrNumber;
}

export interface QuickModeRequest {
  mode: "quick";
  shopId: string;
  presetId: string;
  batch: {
    pizzaCount: number;
    ballWeightG?: UnknownOrNumber;
  };
  environment?: {
    shopRoomTempC?: UnknownOrNumber;
  };
  memo?: string | null;
}

export interface LabModeRequest {
  mode: "lab";
  shopId: string;
  presetId: string;
  experimentName?: string | null;
  dnaId?: string | null;
  batch: BatchInput;
  temperature?: TemperatureInput;
  environment?: EnvironmentInput;
  flour?: FlourBlendInput;
  mixer?: MixerInput;
  method?: MethodInput;
  yeast?: YeastInput;
  fermentation?: FermentationScheduleInput;
  memo?: string | null;
}

export type DieRequest = QuickModeRequest | LabModeRequest;

export interface ResolvedFlourItem {
  flourId: string;
  ratioPct: number;
  flourTempC: number;
  proteinPercent?: number;
  wValue?: number;
  absorptionFactor?: number;
}

export interface DieResolvedInput {
  mode: ModeType;
  shopId: string;
  presetId: string;
  resolvedAt?: string;
  batch: {
    pizzaCount: number;
    ballWeightG: number;
    totalDoughWeightG: number;
  };
  temperature: {
    flourTempC: number;
    waterTempC: number | null;
    targetDdtC: number;
  };
  environment: {
    ambientTempC: number;
    ambientHumidityPct: number;
    shopRoomTempC: number;
    shopHumidityPct: number;
  };
  flour: {
    items: ResolvedFlourItem[];
    effectiveFlourTempC: number;
    effectiveAbsorptionFactor: number;
  };
  mixer: {
    type: MixerType;
    modelId: string | null;
    lowSpeedMin: number;
    highSpeedMin: number;
    lowRpm: number;
    highRpm: number;
    baseFrictionC: number;
    manualFrictionOffsetC: number;
    learnedFrictionOffsetC: number;
    effectiveFrictionC: number;
  };
  method: {
    method: MethodType;
    hydrationPct: number;
    saltPct: number;
    oilPct: number;
    adjustedHydrationPct?: number;
  };
  yeast: {
    yeastType: YeastType;
    yeastPct: number;
  };
  fermentation: {
    fermentationType: FermentationType;
    fermentationHours: number;
    mixStartTime?: string | null;
    useTime?: string | null;
    roomTempDuringFermentC: number;
  };
  fieldResolution?: Record<string, ResolvedValue>;
  estimatedFieldCount?: number;
  learningRunCount?: number;
}

export interface RecipeOutput {
  flourG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
  oilG?: number;
  totalDoughWeightG: number;
  hydrationPct: number;
  saltPct: number;
  yeastPct: number;
}

export interface TemperatureOutput {
  recommendedWaterTempC: number;
  useIce: boolean;
  iceAmountG?: number;
  effectiveWaterTempC?: number;
  predictedDoughTempC: number;
  targetDdtC: number;
  ddtDeltaC: number;
  frictionRiseC: number;
  frictionSource?: FrictionSource;
}

export interface YeastAdjustmentOutput {
  adjustmentPct: number;
  adjustedYeastPct: number;
  reason: string;
}

export interface FermentationScheduleOutput {
  fermentationType: FermentationType;
  baseHours: number;
  adjustedHours: number;
  adjustmentMinutes?: number;
  mixStartTime: string;
  useTime: string;
  adjustmentReason?: string;
}

export interface DieConfidence {
  level: ConfidenceLevel;
  estimatedFieldCount: number;
  learningRunCount: number;
  isLearningComplete?: boolean;
}

export interface DieOutput {
  recipe: RecipeOutput;
  temperature: TemperatureOutput;
  yeastAdjustment: YeastAdjustmentOutput;
  fermentationSchedule: FermentationScheduleOutput;
  confidence: DieConfidence;
  resolvedInput?: DieResolvedInput;
  calculatedAt?: string;
}
