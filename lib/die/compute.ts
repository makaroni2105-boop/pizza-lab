/**
 * DIE オーケストレーター — defaults 補完と各純粋関数を束ねて DieOutput を返す。
 */

import type {
  DieOutput,
  DieRequest,
  DieResolvedInput,
  FermentationScheduleOutput,
  RecipeOutput,
  TemperatureOutput,
  YeastAdjustmentOutput,
} from "@/types/die";
import type { PresetProfile, ShopProfile } from "@/types/profile";

import {
  findPreset,
  resolveDefaults,
  type DefaultsResolveResult,
  type WeatherSnapshot,
} from "@/lib/defaults";

import { adjustFermentationSchedule } from "./fermentation-adjust";
import { computeFriction, type FrictionComputeResult } from "./friction";
import { recommendIce } from "./ice";
import { recommendWaterTemp } from "./recommend";
import { computeRecipe } from "./recipe";
import { adjustYeast } from "./yeast-adjust";

export interface ComputeDieInput {
  request: DieRequest;
  profile: ShopProfile;
  preset?: PresetProfile;
  weather?: WeatherSnapshot;
  /** 発酵スケジュール逆算用。未指定時は Lab の fermentation.useTime のみ参照 */
  useTime?: string | null;
  calculatedAt?: string;
}

export interface ComputeDieResult {
  output: DieOutput;
  incompleteBlocks: string[];
}

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function computeDieConfidence(
  estimatedFieldCount: number,
  learningRunCount: number,
  forceLow: boolean,
): DieOutput["confidence"] {
  let level: DieOutput["confidence"]["level"] = "low";

  if (!forceLow) {
    if (estimatedFieldCount <= 1 && learningRunCount >= 20) {
      level = "high";
    } else if (estimatedFieldCount <= 2 && learningRunCount >= 5) {
      level = "medium";
    }
  }

  return {
    level,
    estimatedFieldCount,
    learningRunCount,
    isLearningComplete: learningRunCount >= 5,
  };
}

function createFallbackRecipe(defaults: DefaultsResolveResult): RecipeOutput {
  return {
    flourG: 0,
    waterG: 0,
    saltG: 0,
    yeastG: 0,
    oilG: 0,
    totalDoughWeightG: 0,
    hydrationPct: defaults.method.hydrationPct ?? 0,
    saltPct: defaults.method.saltPct ?? 0,
    yeastPct: defaults.method.yeastPct ?? 0,
  };
}

function createFallbackTemperature(
  defaults: DefaultsResolveResult,
  friction: FrictionComputeResult,
): TemperatureOutput {
  const targetDdtC = defaults.method.targetDdtC ?? 0;

  return {
    recommendedWaterTempC: 0,
    useIce: false,
    iceAmountG: 0,
    effectiveWaterTempC: 0,
    predictedDoughTempC: targetDdtC,
    targetDdtC,
    ddtDeltaC: 0,
    frictionRiseC: friction.frictionRiseC,
    frictionSource: friction.frictionSource,
  };
}

function createFallbackYeastAdjustment(defaults: DefaultsResolveResult): YeastAdjustmentOutput {
  return {
    adjustmentPct: 0,
    adjustedYeastPct: defaults.method.yeastPct ?? 0,
    reason: "入力不足のため酵母補正を算出できません",
  };
}

function createFallbackFermentationSchedule(
  defaults: DefaultsResolveResult,
  useTime: string | null,
): FermentationScheduleOutput {
  const baseHours = defaults.method.fermentationHours ?? 24;

  return {
    fermentationType: defaults.method.fermentationType ?? "cold",
    baseHours,
    adjustedHours: baseHours,
    adjustmentMinutes: 0,
    mixStartTime: useTime ?? "",
    useTime: useTime ?? "",
    adjustmentReason: "使用時刻が未設定のため推奨スケジュールを算出できません",
  };
}

function buildTemperatureOutput(
  defaults: DefaultsResolveResult,
  friction: FrictionComputeResult,
  recipe: RecipeOutput | null,
  incompleteBlocks: string[],
): TemperatureOutput {
  const waterRecommendation = recommendWaterTemp({
    targetDdtC: defaults.method.targetDdtC,
    flourTempC: defaults.flour.flourTempC,
    roomTempC: defaults.environment.shopRoomTempC,
    effectiveFrictionC: friction.effectiveFrictionC,
  });

  if (
    waterRecommendation.recommendedWaterTempC === null ||
    waterRecommendation.predictedDoughTempC === null ||
    waterRecommendation.targetDdtC === null ||
    waterRecommendation.ddtDeltaC === null
  ) {
    incompleteBlocks.push("temperature");
    return createFallbackTemperature(defaults, friction);
  }

  const iceRecommendation = recommendIce({
    recommendedWaterTempC: waterRecommendation.recommendedWaterTempC,
    waterWeightG: recipe?.waterG ?? null,
  });

  return {
    recommendedWaterTempC: waterRecommendation.recommendedWaterTempC,
    useIce: iceRecommendation.useIce,
    iceAmountG: iceRecommendation.iceAmountG ?? 0,
    effectiveWaterTempC:
      iceRecommendation.effectiveWaterTempC ?? waterRecommendation.recommendedWaterTempC,
    predictedDoughTempC: waterRecommendation.predictedDoughTempC,
    targetDdtC: waterRecommendation.targetDdtC,
    ddtDeltaC: waterRecommendation.ddtDeltaC,
    frictionRiseC: friction.frictionRiseC,
    frictionSource: friction.frictionSource,
  };
}

function buildRecipeOutput(
  defaults: DefaultsResolveResult,
  incompleteBlocks: string[],
): RecipeOutput {
  const recipe = computeRecipe({
    doughBallWeightG: defaults.batch.ballWeightG,
    ballCount: defaults.batch.pizzaCount,
    hydrationPercent: defaults.method.hydrationPct,
    saltPercent: defaults.method.saltPct,
    yeastPercent: defaults.method.yeastPct,
    oilPercent: defaults.method.oilPct,
  });

  if (!recipe) {
    incompleteBlocks.push("recipe");
    return createFallbackRecipe(defaults);
  }

  return recipe;
}

function buildYeastAdjustmentOutput(
  defaults: DefaultsResolveResult,
  recipe: RecipeOutput,
  temperature: TemperatureOutput,
  incompleteBlocks: string[],
): YeastAdjustmentOutput {
  const yeastAdjustment = adjustYeast({
    baseYeastPct: defaults.method.yeastPct,
    baseYeastWeightG: recipe.yeastG,
    roomTempDuringFermentC: defaults.method.roomTempDuringFermentC,
    predictedDoughTempC: temperature.predictedDoughTempC,
    targetDdtC: temperature.targetDdtC,
    fermentationHours: defaults.method.fermentationHours,
    baselineFermentationHours: defaults.method.fermentationHours ?? undefined,
  });

  if (!yeastAdjustment) {
    incompleteBlocks.push("yeastAdjustment");
    return createFallbackYeastAdjustment(defaults);
  }

  return {
    adjustmentPct: yeastAdjustment.adjustmentPct,
    adjustedYeastPct: yeastAdjustment.adjustedYeastPct,
    reason: yeastAdjustment.reason,
  };
}

function resolveUseTime(input: ComputeDieInput): string | null {
  if (typeof input.useTime === "string" && input.useTime.length > 0) {
    return input.useTime;
  }

  if (input.request.mode === "lab" && input.request.fermentation?.useTime) {
    return input.request.fermentation.useTime;
  }

  return null;
}

function buildFermentationScheduleOutput(
  defaults: DefaultsResolveResult,
  temperature: TemperatureOutput,
  useTime: string | null,
  incompleteBlocks: string[],
): FermentationScheduleOutput {
  if (!useTime) {
    incompleteBlocks.push("fermentationSchedule");
    return createFallbackFermentationSchedule(defaults, null);
  }

  const fermentationSchedule = adjustFermentationSchedule({
    fermentationType: defaults.method.fermentationType,
    baseHours: defaults.method.fermentationHours,
    useTime,
    roomTempDuringFermentC: defaults.method.roomTempDuringFermentC,
    predictedDoughTempC: temperature.predictedDoughTempC,
    targetDdtC: temperature.targetDdtC,
  });

  if (!fermentationSchedule) {
    incompleteBlocks.push("fermentationSchedule");
    return createFallbackFermentationSchedule(defaults, useTime);
  }

  return {
    fermentationType: fermentationSchedule.fermentationType,
    baseHours: fermentationSchedule.baseHours,
    adjustedHours: fermentationSchedule.adjustedHours,
    adjustmentMinutes: fermentationSchedule.adjustmentMinutes,
    mixStartTime: fermentationSchedule.mixStartTime,
    useTime: fermentationSchedule.useTime,
    adjustmentReason: fermentationSchedule.adjustmentReason,
  };
}

function buildResolvedInput(
  request: DieRequest,
  defaults: DefaultsResolveResult,
  friction: FrictionComputeResult,
  calculatedAt?: string,
): DieResolvedInput | undefined {
  const { batch, environment, flour, mixer, method } = defaults;

  if (
    batch.ballWeightG === null ||
    flour.flourTempC === null ||
    !isValidNumber(environment.ambientTempC) ||
    !isValidNumber(environment.shopRoomTempC) ||
    method.hydrationPct === null ||
    method.saltPct === null ||
    method.yeastPct === null ||
    method.oilPct === null ||
    method.targetDdtC === null ||
    !method.fermentationType ||
    method.fermentationHours === null ||
    method.roomTempDuringFermentC === null ||
    !mixer.type
  ) {
    return undefined;
  }

  return {
    mode: request.mode,
    shopId: request.shopId,
    presetId: request.presetId,
    resolvedAt: calculatedAt,
    batch: {
      pizzaCount: batch.pizzaCount,
      ballWeightG: batch.ballWeightG,
      totalDoughWeightG: batch.ballWeightG * batch.pizzaCount,
    },
    temperature: {
      flourTempC: flour.flourTempC,
      waterTempC: null,
      targetDdtC: method.targetDdtC,
    },
    environment: {
      ambientTempC: environment.ambientTempC,
      ambientHumidityPct: environment.ambientHumidityPct ?? 50,
      shopRoomTempC: environment.shopRoomTempC,
      shopHumidityPct: environment.shopHumidityPct ?? 50,
    },
    flour: {
      items: [
        {
          flourId: flour.primaryFlourId ?? "",
          ratioPct: flour.ratioPct,
          flourTempC: flour.flourTempC,
          proteinPercent: flour.proteinPercent ?? undefined,
          wValue: flour.wValue ?? undefined,
          absorptionFactor: flour.absorptionFactor ?? undefined,
        },
      ],
      effectiveFlourTempC: flour.flourTempC,
      effectiveAbsorptionFactor: flour.absorptionFactor ?? 1,
    },
    mixer: {
      type: mixer.type,
      modelId: mixer.modelId,
      lowSpeedMin: mixer.lowSpeedMin ?? 0,
      highSpeedMin: mixer.highSpeedMin ?? 0,
      lowRpm: mixer.lowRpm ?? 0,
      highRpm: mixer.highRpm ?? 0,
      baseFrictionC: friction.baseFrictionC,
      manualFrictionOffsetC: friction.manualFrictionOffsetC,
      learnedFrictionOffsetC: friction.learnedFrictionOffsetC,
      effectiveFrictionC: friction.effectiveFrictionC,
    },
    method: {
      method: method.method ?? "napoli",
      hydrationPct: method.hydrationPct,
      saltPct: method.saltPct,
      oilPct: method.oilPct,
    },
    yeast: {
      yeastType: method.yeastType ?? "dry",
      yeastPct: method.yeastPct,
    },
    fermentation: {
      fermentationType: method.fermentationType,
      fermentationHours: method.fermentationHours,
      roomTempDuringFermentC: method.roomTempDuringFermentC,
    },
    fieldResolution: defaults.fieldResolution,
    estimatedFieldCount: defaults.estimatedFieldCount,
    learningRunCount: defaults.learningRunCount,
  };
}

function createPresetMissingOutput(input: ComputeDieInput): ComputeDieResult {
  return {
    incompleteBlocks: ["preset", "defaults"],
    output: {
      recipe: createFallbackRecipe({
        method: { hydrationPct: 0, saltPct: 0, yeastPct: 0 },
      } as DefaultsResolveResult),
      temperature: createFallbackTemperature(
        { method: { targetDdtC: 0 } } as DefaultsResolveResult,
        computeFriction({ baseFrictionC: 0 }),
      ),
      yeastAdjustment: {
        adjustmentPct: 0,
        adjustedYeastPct: 0,
        reason: "プリセットが見つからないため酵母補正を算出できません",
      },
      fermentationSchedule: createFallbackFermentationSchedule(
        {
          method: { fermentationHours: 24, fermentationType: "cold" },
        } as DefaultsResolveResult,
        null,
      ),
      confidence: {
        level: "low",
        estimatedFieldCount: 0,
        learningRunCount: 0,
        isLearningComplete: false,
      },
      calculatedAt: input.calculatedAt,
    },
  };
}

export function computeDie(input: ComputeDieInput): ComputeDieResult {
  const preset =
    input.preset ?? findPreset(input.profile, input.request.presetId);

  if (!preset) {
    return createPresetMissingOutput(input);
  }

  const defaults = resolveDefaults({
    request: input.request,
    profile: input.profile,
    preset,
    weather: input.weather,
  });

  const incompleteBlocks: string[] = [...defaults.unresolvedFields];

  const friction = computeFriction({
    baseFrictionC: defaults.mixer.baseFrictionC,
    manualFrictionOffsetC: defaults.mixer.manualFrictionOffsetC,
    learnedFrictionOffsetC: defaults.mixer.learnedFrictionOffsetC,
  });

  const recipe = buildRecipeOutput(defaults, incompleteBlocks);
  const temperature = buildTemperatureOutput(defaults, friction, recipe, incompleteBlocks);
  const yeastAdjustment = buildYeastAdjustmentOutput(
    defaults,
    recipe,
    temperature,
    incompleteBlocks,
  );
  const useTime = resolveUseTime(input);
  const fermentationSchedule = buildFermentationScheduleOutput(
    defaults,
    temperature,
    useTime,
    incompleteBlocks,
  );

  const forceLowConfidence =
    incompleteBlocks.length > defaults.unresolvedFields.length ||
    defaults.unresolvedFields.length >= 3 ||
    defaults.learningRunCount === 0;

  const output: DieOutput = {
    recipe,
    temperature,
    yeastAdjustment,
    fermentationSchedule,
    confidence: computeDieConfidence(
      defaults.estimatedFieldCount,
      defaults.learningRunCount,
      forceLowConfidence,
    ),
    resolvedInput: buildResolvedInput(
      input.request,
      defaults,
      friction,
      input.calculatedAt,
    ),
    calculatedAt: input.calculatedAt,
  };

  return {
    output,
    incompleteBlocks: [...new Set(incompleteBlocks)],
  };
}
